import { supabase } from './supabase';

export interface ConventionalFurnitureItem {
  id: string;
  tenantId: string;
  name: string;
  category: string;
  description?: string;
  widthCm?: number;
  heightCm?: number;
  depthCm?: number;
  colorFinish?: string;
  imageUrl?: string;
  costPrice: number;
  markupPercentage: number;
  salePrice: number;
  isActive: boolean;
  createdAt?: string;
}

export interface FinancialPartner {
  id: string;
  tenantId: string;
  name: string;
  retentionPercentage: number;
  maxInstallments: number;
  isActive: boolean;
}

export async function fetchStoreFurniture(tenantId: string): Promise<ConventionalFurnitureItem[]> {
  try {
    const { data, error } = await supabase
      .from('store_conventional_furniture')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      category: row.category || 'Geral',
      description: row.description || '',
      widthCm: row.width_cm ? Number(row.width_cm) : undefined,
      heightCm: row.height_cm ? Number(row.height_cm) : undefined,
      depthCm: row.depth_cm ? Number(row.depth_cm) : undefined,
      colorFinish: row.color_finish || '',
      imageUrl: row.image_url || '',
      costPrice: Number(row.cost_price || 0),
      markupPercentage: Number(row.markup_percentage || 70),
      salePrice: Number(row.sale_price || 0),
      isActive: row.is_active ?? true,
      createdAt: row.created_at
    }));
  } catch (err: any) {
    console.error('Erro ao buscar móveis convencionais:', err);
    return [];
  }
}

export async function saveStoreFurniture(item: {
  id?: string;
  tenantId: string;
  name: string;
  category: string;
  description?: string;
  widthCm?: number;
  heightCm?: number;
  depthCm?: number;
  colorFinish?: string;
  imageUrl?: string;
  costPrice: number;
  markupPercentage: number;
}): Promise<{ success: boolean; item?: ConventionalFurnitureItem; error?: string }> {
  try {
    const cost = Math.max(0, Number(item.costPrice || 0));
    const markup = Math.max(0, Number(item.markupPercentage || 0));
    const sale = Math.round((cost * (1 + markup / 100)) * 100) / 100;

    const payload = {
      tenant_id: item.tenantId,
      name: item.name.trim(),
      category: item.category.trim() || 'Geral',
      description: item.description?.trim() || null,
      width_cm: item.widthCm ? Number(item.widthCm) : null,
      height_cm: item.heightCm ? Number(item.heightCm) : null,
      depth_cm: item.depthCm ? Number(item.depthCm) : null,
      color_finish: item.colorFinish?.trim() || null,
      image_url: item.imageUrl?.trim() || null,
      cost_price: cost,
      markup_percentage: markup,
      sale_price: sale,
      is_active: true
    };

    let resultData;
    if (item.id) {
      const { data, error } = await supabase
        .from('store_conventional_furniture')
        .update(payload)
        .eq('id', item.id)
        .select()
        .single();
      if (error) throw error;
      resultData = data;
    } else {
      const { data, error } = await supabase
        .from('store_conventional_furniture')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      resultData = data;
    }

    return {
      success: true,
      item: {
        id: resultData.id,
        tenantId: resultData.tenant_id,
        name: resultData.name,
        category: resultData.category,
        description: resultData.description,
        widthCm: resultData.width_cm ? Number(resultData.width_cm) : undefined,
        heightCm: resultData.height_cm ? Number(resultData.height_cm) : undefined,
        depthCm: resultData.depth_cm ? Number(resultData.depth_cm) : undefined,
        colorFinish: resultData.color_finish,
        imageUrl: resultData.image_url,
        costPrice: Number(resultData.cost_price),
        markupPercentage: Number(resultData.markup_percentage),
        salePrice: Number(resultData.sale_price),
        isActive: resultData.is_active,
        createdAt: resultData.created_at
      }
    };
  } catch (err: any) {
    console.error('Erro ao salvar móvel convencional:', err);
    return { success: false, error: err.message || 'Erro ao salvar produto.' };
  }
}

export async function deleteStoreFurniture(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('store_conventional_furniture')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Erro ao excluir móvel:', err);
    return false;
  }
}

export async function fetchFinancialPartners(tenantId: string): Promise<FinancialPartner[]> {
  try {
    const { data, error } = await supabase
      .from('store_financial_partners')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name');

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      retentionPercentage: Number(row.retention_percentage || 0),
      maxInstallments: Number(row.max_installments || 24),
      isActive: row.is_active ?? true
    }));
  } catch (err) {
    console.error('Erro ao carregar parceiros financeiros:', err);
    return [];
  }
}

export async function saveFinancialPartner(partner: {
  id?: string;
  tenantId: string;
  name: string;
  retentionPercentage: number;
  maxInstallments: number;
}): Promise<{ success: boolean; partner?: FinancialPartner; error?: string }> {
  try {
    const payload = {
      tenant_id: partner.tenantId,
      name: partner.name.trim(),
      retention_percentage: Number(partner.retentionPercentage || 0),
      max_installments: Number(partner.maxInstallments || 24),
      is_active: true
    };

    let resultData;
    if (partner.id) {
      const { data, error } = await supabase
        .from('store_financial_partners')
        .update(payload)
        .eq('id', partner.id)
        .select()
        .single();
      if (error) throw error;
      resultData = data;
    } else {
      const { data, error } = await supabase
        .from('store_financial_partners')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      resultData = data;
    }

    return {
      success: true,
      partner: {
        id: resultData.id,
        tenantId: resultData.tenant_id,
        name: resultData.name,
        retentionPercentage: Number(resultData.retention_percentage),
        maxInstallments: Number(resultData.max_installments),
        isActive: resultData.is_active
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao salvar financeira parceira.' };
  }
}

export async function deleteFinancialPartner(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('store_financial_partners')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch {
    return false;
  }
}

export async function updateLeadConventionalItems(
  assignmentOrLeadId: string,
  items: Array<{
    id: string;
    name: string;
    category?: string;
    quantity: number;
    salePrice: number;
    total: number;
  }>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Tenta atualizar em lead_assignments
    const { error: assignError } = await supabase
      .from('lead_assignments')
      .update({ conventional_items: items })
      .eq('id', assignmentOrLeadId);

    // Também tenta atualizar na tabela leads se o ID for de lead
    await supabase
      .from('leads')
      .update({ conventional_items: items })
      .eq('id', assignmentOrLeadId);

    if (assignError) {
      console.warn('Atualizando leads diretamente com conventional_items:', assignError.message);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Erro ao atualizar móveis convencionais do lead:', err);
    return { success: false, error: err.message };
  }
}

