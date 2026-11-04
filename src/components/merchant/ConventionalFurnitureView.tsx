import React, { useState, useEffect } from 'react';
import { 
  Armchair, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Percent, 
  DollarSign, 
  Check, 
  Image as ImageIcon, 
  Ruler, 
  Landmark, 
  Layers, 
  CreditCard,
  AlertCircle,
  Loader2,
  Tag
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { 
  ConventionalFurnitureItem, 
  FinancialPartner, 
  fetchStoreFurniture, 
  saveStoreFurniture, 
  deleteStoreFurniture,
  fetchFinancialPartners,
  saveFinancialPartner,
  deleteFinancialPartner
} from '../../lib/conventionalFurnitureService';

interface ConventionalFurnitureViewProps {
  tenantId: string;
}

export const ConventionalFurnitureView: React.FC<ConventionalFurnitureViewProps> = ({ tenantId }) => {
  const { currentUser } = useApp();
  const isOwner = !currentUser?.role || currentUser?.role === 'store_owner' || currentUser?.role === 'platform_admin';

  const [activeSubTab, setActiveSubTab] = useState<'moveis' | 'financeiras'>('moveis');
  const [furnitureList, setFurnitureList] = useState<ConventionalFurnitureItem[]>([]);
  const [financialList, setFinancialList] = useState<FinancialPartner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');

  // Modal Novo Móvel
  const [isFurnitureModalOpen, setIsFurnitureModalOpen] = useState(false);
  const [editingFurniture, setEditingFurniture] = useState<ConventionalFurnitureItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Estofados');
  const [formDescription, setFormDescription] = useState('');
  const [formWidth, setFormWidth] = useState<string>('');
  const [formHeight, setFormHeight] = useState<string>('');
  const [formDepth, setFormDepth] = useState<string>('');
  const [formColor, setFormColor] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formCostPrice, setFormCostPrice] = useState<string>('1200');
  const [formMarkup, setFormMarkup] = useState<string>('70');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal Nova Financeira
  const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<FinancialPartner | null>(null);
  const [finName, setFinName] = useState('');
  const [finRetention, setFinRetention] = useState<string>('10.0');
  const [finMaxInstallments, setFinMaxInstallments] = useState<number>(24);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [furnitures, partners] = await Promise.all([
        fetchStoreFurniture(tenantId),
        fetchFinancialPartners(tenantId)
      ]);
      setFurnitureList(furnitures);
      setFinancialList(partners);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      loadData();
    }
  }, [tenantId]);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  // Preço de venda calculado em tempo real no formulário
  const parsedCost = Math.max(0, parseFloat(formCostPrice.replace(',', '.')) || 0);
  const parsedMarkup = Math.max(0, parseFloat(formMarkup.replace(',', '.')) || 0);
  const calculatedSalePrice = Math.round((parsedCost * (1 + parsedMarkup / 100)) * 100) / 100;

  const handleOpenAddFurniture = () => {
    setEditingFurniture(null);
    setFormName('');
    setFormCategory('Estofados');
    setFormDescription('');
    setFormWidth('');
    setFormHeight('');
    setFormDepth('');
    setFormColor('');
    setFormImageUrl('');
    setFormCostPrice('1200');
    setFormMarkup('70');
    setIsFurnitureModalOpen(true);
  };

  const handleOpenEditFurniture = (item: ConventionalFurnitureItem) => {
    setEditingFurniture(item);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormDescription(item.description || '');
    setFormWidth(item.widthCm ? String(item.widthCm) : '');
    setFormHeight(item.heightCm ? String(item.heightCm) : '');
    setFormDepth(item.depthCm ? String(item.depthCm) : '');
    setFormColor(item.colorFinish || '');
    setFormImageUrl(item.imageUrl || '');
    setFormCostPrice(String(item.costPrice));
    setFormMarkup(String(item.markupPercentage));
    setIsFurnitureModalOpen(true);
  };

  const handleSaveFurniture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showFeedback('Informe o nome do móvel.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await saveStoreFurniture({
        id: editingFurniture?.id,
        tenantId,
        name: formName,
        category: formCategory,
        description: formDescription,
        widthCm: formWidth ? parseFloat(formWidth) : undefined,
        heightCm: formHeight ? parseFloat(formHeight) : undefined,
        depthCm: formDepth ? parseFloat(formDepth) : undefined,
        colorFinish: formColor,
        imageUrl: formImageUrl,
        costPrice: parsedCost,
        markupPercentage: parsedMarkup
      });

      if (!res.success) {
        throw new Error(res.error || 'Erro ao salvar móvel.');
      }

      showFeedback(`Móvel "${formName}" salvo no catálogo com sucesso!`);
      setIsFurnitureModalOpen(false);
      await loadData();
    } catch (err: any) {
      showFeedback(err.message || 'Falha ao salvar produto.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFurniture = async (id: string, name: string) => {
    if (!window.confirm(`Deseja remover o móvel "${name}" do catálogo da loja?`)) return;
    const ok = await deleteStoreFurniture(id);
    if (ok) {
      showFeedback(`Móvel "${name}" removido.`);
      await loadData();
    } else {
      showFeedback('Erro ao excluir móvel.', 'error');
    }
  };

  const handleSaveFinancialPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finName.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await saveFinancialPartner({
        id: editingPartner?.id,
        tenantId,
        name: finName,
        retentionPercentage: parseFloat(finRetention.replace(',', '.')) || 10,
        maxInstallments: finMaxInstallments
      });

      if (!res.success) throw new Error(res.error);

      showFeedback(`Financeira "${finName}" salva com sucesso!`);
      setIsFinancialModalOpen(false);
      setEditingPartner(null);
      setFinName('');
      setFinRetention('10.0');
      setFinMaxInstallments(24);
      await loadData();
    } catch (err: any) {
      showFeedback(err.message || 'Erro ao salvar parceiro financeiro.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePartner = async (id: string, name: string) => {
    if (!window.confirm(`Deseja remover a financeira "${name}"?`)) return;
    const ok = await deleteFinancialPartner(id);
    if (ok) {
      showFeedback(`Financeira "${name}" removida.`);
      await loadData();
    }
  };

  const categories = ['todos', 'Estofados', 'Sala de Jantar', 'Quarto', 'Mesas & Aparadores', 'Cadeiras & Banquetas', 'Complementos'];

  const filteredFurniture = furnitureList.filter((f) => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (f.colorFinish && f.colorFinish.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'todos' || f.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 text-left font-sans">
      
      {/* Top Banner & Sub-Tabs */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-black text-amber-600 uppercase tracking-wider mb-1">
            <Armchair className="w-4 h-4" />
            <span>Móveis Convencionais & Condições Comerciais</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Catálogo de Móveis Prontos & Financeiras
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Cadastre estofados, salas de jantar e complementos com markup automático para compor orçamentos unificados.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center">
            <button
              onClick={() => setActiveSubTab('moveis')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'moveis'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Armchair className="w-4 h-4" />
              <span>Móveis ({furnitureList.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('financeiras')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'financeiras'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Landmark className="w-4 h-4 text-purple-400" />
              <span>Financeiras ({financialList.length})</span>
            </button>
          </div>

          {activeSubTab === 'moveis' ? (
            <button
              onClick={handleOpenAddFurniture}
              className="px-4 py-2 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs transition-all flex items-center gap-1.5 shadow-md hover:shadow-lg cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Móvel</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setEditingPartner(null);
                setFinName('');
                setFinRetention('10.0');
                setFinMaxInstallments(24);
                setIsFinancialModalOpen(true);
              }}
              className="px-4 py-2 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs transition-all flex items-center gap-1.5 shadow-md hover:shadow-lg cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Financeira</span>
            </button>
          )}
        </div>
      </div>

      {feedbackMsg && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 animate-in fade-in ${
          feedbackMsg.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <Check className="w-4 h-4 shrink-0" />
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* ABA 1: CATÁLOGO DE MÓVEIS CONVENCIONAIS */}
      {activeSubTab === 'moveis' && (
        <div className="space-y-4">
          
          {/* Barra de Filtros e Busca */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome ou acabamento..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid de Móveis */}
          {isLoading ? (
            <div className="py-16 text-center text-xs text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-amber-600 mx-auto mb-2" />
              Carregando catálogo de móveis...
            </div>
          ) : filteredFurniture.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-slate-200 p-8 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <Armchair className="w-7 h-7" />
              </div>
              <h3 className="text-base font-black text-slate-900">Nenhum móvel cadastrado no catálogo</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Cadastre sofás, mesas e cadeiras com custo e margem para inseri-los facilmente nos orçamentos dos clientes.
              </p>
              <button
                onClick={handleOpenAddFurniture}
                className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-black shadow-md cursor-pointer"
              >
                + Cadastrar Primeiro Móvel
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredFurniture.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Imagem do Móvel ou Fallback */}
                    <div className="h-44 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt={item.name} 
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as any).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="text-slate-300 flex flex-col items-center gap-1">
                          <ImageIcon className="w-8 h-8" />
                          <span className="text-[10px] font-bold">Sem Foto</span>
                        </div>
                      )}
                      <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-900/80 text-white backdrop-blur-xs">
                        {item.category}
                      </span>
                    </div>

                    {/* Dados do Móvel */}
                    <div className="p-4 space-y-2">
                      <h4 className="font-black text-sm text-slate-900 line-clamp-1">{item.name}</h4>
                      {item.colorFinish && (
                        <p className="text-[11px] text-slate-500 font-semibold line-clamp-1">
                          Acabamento: {item.colorFinish}
                        </p>
                      )}

                      {(item.widthCm || item.heightCm || item.depthCm) && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                          <Ruler className="w-3 h-3 text-slate-400" />
                          <span>
                            {item.widthCm ? `${item.widthCm}L` : ''} 
                            {item.heightCm ? ` × ${item.heightCm}A` : ''} 
                            {item.depthCm ? ` × ${item.depthCm}P cm` : ''}
                          </span>
                        </div>
                      )}

                      {/* Preço de Venda ao Cliente */}
                      <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Preço de Venda</span>
                          <span className="text-lg font-black text-emerald-700">
                            R$ {item.salePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        {isOwner && (
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Custo (Base)</span>
                            <span className="text-xs font-bold text-slate-600">
                              R$ {item.costPrice.toFixed(0)} <span className="text-emerald-600 font-black">+{item.markupPercentage}%</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ações do Card */}
                  <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => handleOpenEditFurniture(item)}
                      className="px-3 py-1 rounded-lg text-slate-600 hover:text-slate-900 font-bold text-xs flex items-center gap-1 hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => handleDeleteFurniture(item.id, item.name)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Excluir produto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA 2: FINANCEIRAS PARCEIRAS */}
      {activeSubTab === 'financeiras' && (
        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-start gap-3">
            <Landmark className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-black text-slate-900 block">Como funcionam as Financeiras no Sistema:</span>
              <span className="text-slate-600 mt-0.5 block">
                Cadastre os bancos parceiros (ex: BV, Santander, Losango) e o percentual de retenção/desconto da financeira. 
                Ao orçar propostas no CRM ou ERP, o vendedor poderá selecionar a financeira e o número de parcelas, calculando automaticamente as taxas de repasse.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {financialList.map((partner) => (
              <div 
                key={partner.id}
                className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black">
                      <Landmark className="w-5 h-5" />
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 text-[10px] font-black uppercase">
                      Até {partner.maxInstallments}x
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-900 mt-2">{partner.name}</h3>

                  <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Percentual de Retenção:</span>
                      <strong className="text-purple-900 font-black">{partner.retentionPercentage}%</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Parcelamento Máximo:</span>
                      <strong className="text-slate-900">{partner.maxInstallments} Parcelas</strong>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                  <button
                    onClick={() => handleDeletePartner(partner.id, partner.name)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Excluir parceiro"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL NOVO / EDITAR MÓVEL CONVENCIONAL */}
      {isFurnitureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-200 my-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {editingFurniture ? 'Editar Móvel Convencional' : 'Cadastrar Móvel Convencional'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Insira as especificações e a margem de ganho da loja.
                </p>
              </div>
              <button
                onClick={() => setIsFurnitureModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFurniture} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome do Produto *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Sofá Retrátil Living 3 Lugares 2.40m Linho"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Categoria *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    <option value="Estofados">Estofados & Sofás</option>
                    <option value="Sala de Jantar">Sala de Jantar & Mesas</option>
                    <option value="Cadeiras & Banquetas">Cadeiras & Banquetas</option>
                    <option value="Quarto">Quarto & Colchões</option>
                    <option value="Mesas & Aparadores">Mesas & Aparadores</option>
                    <option value="Complementos">Complementos & Decoração</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Acabamento / Cor / Tecido</label>
                  <input
                    type="text"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    placeholder="Ex: Linho Bege / Madeira Freijó"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              {/* Dimensões */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Dimensões em centímetros (L × A × P):</label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    value={formWidth}
                    onChange={(e) => setFormWidth(e.target.value)}
                    placeholder="Largura (cm)"
                    className="px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                  <input
                    type="number"
                    value={formHeight}
                    onChange={(e) => setFormHeight(e.target.value)}
                    placeholder="Altura (cm)"
                    className="px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                  <input
                    type="number"
                    value={formDepth}
                    onChange={(e) => setFormDepth(e.target.value)}
                    placeholder="Profund. (cm)"
                    className="px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">URL da Foto / Imagem do Produto</label>
                <input
                  type="url"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  placeholder="https://exemplo.com/foto-sofa.jpg"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              {/* BLOCO DE PREÇO BASE & MARKUP % COM CÁLCULO AUTOMÁTICO */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
                <div className="flex items-center gap-1.5 font-black uppercase text-amber-950 text-[11px]">
                  <DollarSign className="w-4 h-4 text-amber-700" />
                  <span>Precificação & Margem de Ganho da Loja</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-amber-900 mb-1">Custo Base de Fábrica (R$) *</label>
                    <input
                      type="text"
                      required
                      value={formCostPrice}
                      onChange={(e) => setFormCostPrice(e.target.value)}
                      placeholder="Ex: 1200.00"
                      className="w-full px-3 py-2 rounded-xl border border-amber-300 font-black text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-amber-900 mb-1">Margem de Lucro da Loja (%) *</label>
                    <input
                      type="text"
                      required
                      value={formMarkup}
                      onChange={(e) => setFormMarkup(e.target.value)}
                      placeholder="Ex: 70"
                      className="w-full px-3 py-2 rounded-xl border border-amber-300 font-black text-slate-900 bg-white"
                    />
                  </div>
                </div>

                {/* Resultado Automático */}
                <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-900">Preço de Venda Sugerido ao Cliente:</span>
                  <span className="text-base font-black text-emerald-800">
                    R$ {calculatedSalePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFurnitureModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Móvel no Catálogo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOVA FINANCEIRA */}
      {isFinancialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Landmark className="w-4 h-4 text-purple-600" />
                <span>Cadastrar Financeira Parceira</span>
              </h3>
              <button onClick={() => setIsFinancialModalOpen(false)} className="text-slate-400">✕</button>
            </div>

            <form onSubmit={handleSaveFinancialPartner} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome do Banco / Financeira *</label>
                <input
                  type="text"
                  required
                  value={finName}
                  onChange={(e) => setFinName(e.target.value)}
                  placeholder="Ex: Santander Financiamentos, BV Financeira, Losango"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Retenção da Financeira (%) *</label>
                  <input
                    type="text"
                    required
                    value={finRetention}
                    onChange={(e) => setFinRetention(e.target.value)}
                    placeholder="Ex: 10.5"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Parcelamento Máximo *</label>
                  <select
                    value={finMaxInstallments}
                    onChange={(e) => setFinMaxInstallments(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white"
                  >
                    {[12, 18, 24, 30, 36, 48].map((n) => (
                      <option key={n} value={n}>{n}x</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFinancialModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black shadow-md"
                >
                  Salvar Financeira
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
