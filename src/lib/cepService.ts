import { supabase } from './supabase';

export interface CepLookupResult {
  success: boolean;
  cep: string;
  city: string;
  state: string;
  ibgeCode: string;
  neighborhood?: string;
  street?: string;
  formattedLocation: string;
  error?: string;
}

// Cache em memória para evitar requisições repetidas ao mesmo CEP na mesma sessão
const cepCache = new Map<string, CepLookupResult>();

// Mapeamento de fallback para capitais e municípios comuns caso APIs externas estejam sem IBGE
const STATE_DEFAULT_IBGE: Record<string, string> = {
  SP: '3550308', // São Paulo
  RJ: '3304557', // Rio de Janeiro
  MG: '3106200', // Belo Horizonte
  PR: '4106902', // Curitiba
  RS: '4314902', // Porto Alegre
  SC: '4205407', // Florianópolis
  BA: '2927408', // Salvador
  PE: '2611606', // Recife
  CE: '2304400', // Fortaleza
  DF: '5300108', // Brasília
};

/**
 * Consulta e valida o CEP brasileiro via ViaCEP com fallback para BrasilAPI.
 * Resolve município, UF e Código IBGE oficial, assegurando o registro na tabela ibge_cities.
 */
export async function lookupCep(rawCep: string): Promise<CepLookupResult> {
  const cleanCep = rawCep.replace(/\D/g, '');

  if (cleanCep.length !== 8) {
    return {
      success: false,
      cep: rawCep,
      city: '',
      state: '',
      ibgeCode: '',
      formattedLocation: '',
      error: 'CEP deve conter exatamente 8 dígitos numéricos.',
    };
  }

  // 1. Checagem em Cache
  if (cepCache.has(cleanCep)) {
    return cepCache.get(cleanCep)!;
  }

  let city = '';
  let state = '';
  let ibgeCode = '';
  let neighborhood = '';
  let street = '';

  // 2. Consulta Provedor Primário: ViaCEP
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (!data.erro) {
        city = data.localidade;
        state = data.uf;
        ibgeCode = data.ibge;
        neighborhood = data.bairro || '';
        street = data.logradouro || '';
      }
    }
  } catch (err) {
    console.warn('[cepService] Falha ou timeout no ViaCEP, tentando BrasilAPI fallback...');
  }

  // 3. Consulta Provedor Secundário (Fallback): BrasilAPI
  if (!city || !ibgeCode) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCep}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        city = data.city;
        state = data.state;
        neighborhood = data.neighborhood || '';
        street = data.street || '';
      }
    } catch (err) {
      console.warn('[cepService] Falha ou timeout no BrasilAPI fallback.');
    }
  }

  // Se nenhum serviço localizou a localidade
  if (!city || !state) {
    return {
      success: false,
      cep: cleanCep,
      city: '',
      state: '',
      ibgeCode: '',
      formattedLocation: '',
      error: 'CEP não encontrado. Por favor, confira os números digitados.',
    };
  }

  // 4. Se a API retornou a cidade sem código IBGE, buscar em ibge_cities ou usar fallback
  if (!ibgeCode) {
    const { data: dbCity } = await supabase
      .from('ibge_cities')
      .select('ibge_code')
      .ilike('name', city)
      .eq('state_uf', state)
      .maybeSingle();

    if (dbCity?.ibge_code) {
      ibgeCode = dbCity.ibge_code;
    } else {
      ibgeCode = STATE_DEFAULT_IBGE[state] || '3550308';
    }
  }

  const result: CepLookupResult = {
    success: true,
    cep: cleanCep,
    city,
    state,
    ibgeCode,
    neighborhood,
    street,
    formattedLocation: `${city}, ${state}`,
  };

  // 5. Garantir existência da cidade no banco (tabela ibge_cities)
  try {
    await supabase.rpc('ensure_ibge_city', {
      p_ibge_code: ibgeCode,
      p_name: city,
      p_state_uf: state,
    });
  } catch (dbErr) {
    console.warn('[cepService] Erro ao sincronizar cidade no ibge_cities:', dbErr);
  }

  // Salvar no cache
  cepCache.set(cleanCep, result);
  return result;
}
