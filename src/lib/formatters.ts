/**
 * Utilitários de Máscaras e Formatação de Dados em Tempo Real
 * Formata enquanto o usuário digita e garante validação estrita de dígitos.
 */

export const sanitizeDigits = (val: string): string => {
  return (val || '').replace(/\D/g, '');
};

/**
 * Máscara dinâmica de Telefone / WhatsApp:
 * - 10 dígitos: (XX) XXXX-XXXX (fixo)
 * - 11 dígitos: (XX) XXXXX-XXXX (celular)
 * Limite estrito: 11 dígitos
 */
export const formatPhone = (val: string): string => {
  const d = sanitizeDigits(val).slice(0, 11);
  if (!d) return '';
  if (d.length <= 2) {
    return `(${d}`;
  }
  if (d.length <= 6) {
    return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  }
  if (d.length <= 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

/**
 * Máscara estrita de CEP:
 * - 00000-000 (8 dígitos numéricos)
 * Limite estrito: 8 dígitos
 */
export const formatCep = (val: string): string => {
  const d = sanitizeDigits(val).slice(0, 8);
  if (!d) return '';
  if (d.length <= 5) {
    return d;
  }
  return `${d.slice(0, 5)}-${d.slice(5)}`;
};

/**
 * Máscara de CPF:
 * - 000.000.000-00 (11 dígitos)
 * Limite estrito: 11 dígitos
 */
export const formatCpf = (val: string): string => {
  const d = sanitizeDigits(val).slice(0, 11);
  if (!d) return '';
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

/**
 * Máscara de CNPJ:
 * - 00.000.000/0001-00 (14 dígitos)
 * Limite estrito: 14 dígitos
 */
export const formatCnpj = (val: string): string => {
  const d = sanitizeDigits(val).slice(0, 14);
  if (!d) return '';
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
};

/**
 * Máscara mista CPF ou CNPJ (conforme digita):
 * Até 11 dígitos aplica máscara de CPF, passando disso aplica máscara de CNPJ.
 */
export const formatCpfCnpj = (val: string): string => {
  const d = sanitizeDigits(val).slice(0, 14);
  if (d.length <= 11) {
    return formatCpf(d);
  }
  return formatCnpj(d);
};

// Funções de validação estrita de dígitos
export const isValidPhone = (val: string): boolean => {
  const d = sanitizeDigits(val);
  return d.length === 10 || d.length === 11;
};

export const isValidCep = (val: string): boolean => {
  const d = sanitizeDigits(val);
  return d.length === 8;
};

export const isValidCpf = (val: string): boolean => {
  const d = sanitizeDigits(val);
  return d.length === 11;
};

export const isValidCnpj = (val: string): boolean => {
  const d = sanitizeDigits(val);
  return d.length === 14;
};

export const isValidCpfOrCnpj = (val: string): boolean => {
  const d = sanitizeDigits(val);
  return d.length === 11 || d.length === 14;
};
