import { supabase } from './supabase';

export interface StoreExpense {
  id: string;
  tenant_id: string;
  description: string;
  category: 'aluguel' | 'salarios' | 'comissao' | 'materia_prima' | 'energia_consumo' | 'marketing' | 'geral' | 'outros';
  amount: number;
  expense_type: 'fixo' | 'variavel';
  reference_month: string; // 'YYYY-MM'
  paid_at: string;
  created_at: string;
}

export interface StoreCommercialSettings {
  tenant_id: string;
  max_discount_percentage: number;
  card_tax_percentage: number;
  installment_tax_percentage: number;
}

export const CATEGORY_LABELS: Record<string, string> = {
  aluguel: 'Aluguel do Galpão / Ponto',
  salarios: 'Folha & Salários',
  comissao: 'Comissões de Venda',
  materia_prima: 'MDF & Ferragens',
  energia_consumo: 'Energia / Água / Internet',
  marketing: 'Marketing & Anúncios',
  geral: 'Despesas Administrativas',
  outros: 'Outros Custos',
};

export async function fetchStoreExpenses(tenantId: string, month?: string): Promise<{ success: boolean; expenses: StoreExpense[] }> {
  try {
    let query = supabase
      .from('store_expenses')
      .select('*')
      .order('paid_at', { ascending: false });

    if (tenantId && tenantId !== 'all') {
      query = query.eq('tenant_id', tenantId);
    }
    if (month) {
      query = query.eq('reference_month', month);
    }

    const { data, error } = await query;
    if (error) throw error;

    return {
      success: true,
      expenses: (data || []).map((e: any) => ({
        ...e,
        amount: Number(e.amount) || 0,
      })),
    };
  } catch (err: any) {
    console.error('Erro ao buscar despesas da loja:', err);
    return { success: false, expenses: [] };
  }
}

export async function createStoreExpense(expense: Omit<StoreExpense, 'id' | 'created_at'>): Promise<{ success: boolean; error?: string; expense?: StoreExpense }> {
  try {
    const { data, error } = await supabase
      .from('store_expenses')
      .insert({
        tenant_id: expense.tenant_id,
        description: expense.description.trim(),
        category: expense.category,
        amount: expense.amount,
        expense_type: expense.expense_type,
        reference_month: expense.reference_month,
        paid_at: expense.paid_at || new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, expense: data };
  } catch (err: any) {
    console.error('Erro ao salvar despesa:', err);
    return { success: false, error: err?.message || 'Falha ao salvar despesa.' };
  }
}

export async function deleteStoreExpense(expenseId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('store_expenses')
      .delete()
      .eq('id', expenseId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Erro ao excluir despesa:', err);
    return { success: false, error: err?.message || 'Falha ao excluir despesa.' };
  }
}

export async function fetchStoreCommercialSettings(tenantId: string): Promise<StoreCommercialSettings> {
  const defaultSettings: StoreCommercialSettings = {
    tenant_id: tenantId,
    max_discount_percentage: 10.0,
    card_tax_percentage: 3.5,
    installment_tax_percentage: 8.0,
  };

  if (!tenantId || tenantId === 'all') return defaultSettings;

  try {
    const { data, error } = await supabase
      .from('store_commercial_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error || !data) return defaultSettings;

    return {
      tenant_id: data.tenant_id,
      max_discount_percentage: Number(data.max_discount_percentage) || 10.0,
      card_tax_percentage: Number(data.card_tax_percentage) || 3.5,
      installment_tax_percentage: Number(data.installment_tax_percentage) || 8.0,
    };
  } catch {
    return defaultSettings;
  }
}

export async function saveStoreCommercialSettings(settings: StoreCommercialSettings): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('store_commercial_settings')
      .upsert({
        tenant_id: settings.tenant_id,
        max_discount_percentage: settings.max_discount_percentage,
        card_tax_percentage: settings.card_tax_percentage,
        installment_tax_percentage: settings.installment_tax_percentage,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Erro ao salvar regras comerciais da loja:', err);
    return { success: false, error: err?.message || 'Falha ao salvar regras.' };
  }
}
