import React, { useState } from 'react';
import { 
  Building2, 
  MessageSquare, 
  Palette, 
  ShieldCheck, 
  User 
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'perfil' | 'usuarios' | 'logo' | 'integracoes'>('perfil');

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
      
      {/* Navigation Sub-tabs */}
      <div className="border-b border-slate-200 px-6 pt-4 flex space-x-6 overflow-x-auto">
        {[
          { id: 'perfil', label: 'Perfil da Empresa', icon: User },
          { id: 'usuarios', label: 'Usuários & Permissões', icon: ShieldCheck },
          { id: 'logo', label: 'Logotipo Oficial', icon: Palette },
          { id: 'integracoes', label: 'Integrações & WhatsApp', icon: MessageSquare },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-4 text-xs font-bold flex items-center space-x-2 border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="p-6 sm:p-8 max-w-3xl">
        {activeTab === 'perfil' && (
          <div className="space-y-5 text-left">
            <h3 className="text-lg font-bold text-slate-900">Perfil da Empresa</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome Comercial</label>
                <input
                  type="text"
                  defaultValue="PlanejaFácil - Móveis Sob Medida"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">E-mail Corporativo</label>
                <input
                  type="email"
                  defaultValue="contato@planejafacil.com.br"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">CNPJ</label>
                <input
                  type="text"
                  defaultValue="48.123.456/0001-90"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                />
              </div>
              <button className="px-6 py-2.5 rounded-xl bg-brand-600 text-white font-bold text-xs uppercase tracking-wider shadow-blue-glow">
                Salvar Alterações
              </button>
            </div>
          </div>
        )}

        {activeTab === 'usuarios' && (
          <div className="space-y-5 text-left">
            <h3 className="text-lg font-bold text-slate-900">Gestão de Equipe & Permissões</h3>
            <div className="space-y-3">
              {[
                { name: 'Gabriel Torres (Admin)', role: 'Super Admin', email: 'gabriel@planejafacil.com.br' },
                { name: 'Juliana Paes', role: 'Gerente Comercial', email: 'juliana@planejafacil.com.br' },
                { name: 'Lucas Amaral', role: 'Suporte Lojistas', email: 'lucas@planejafacil.com.br' },
              ].map((u) => (
                <div key={u.email} className="p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{u.name}</div>
                    <div className="text-xs text-slate-400">{u.email}</div>
                  </div>
                  <span className="px-3 py-1 bg-brand-50 text-brand-700 rounded-full text-xs font-bold border border-brand-200">
                    {u.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'logo' && (
          <div className="space-y-5 text-left">
            <h3 className="text-lg font-bold text-slate-900">Logotipo Oficial Ativo</h3>
            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 text-center space-y-4">
              <div className="p-4 bg-white rounded-2xl border border-slate-200 w-fit mx-auto shadow-sm">
                <img 
                  src="/logo.png" 
                  alt="PlanejaFácil Logo Oficial" 
                  className="h-20 w-auto object-contain mx-auto"
                />
              </div>
              <div className="text-xs font-bold text-slate-700">PlanejaFácil - Móveis Sob Medida</div>
              <p className="text-[11px] text-slate-500">Logotipo oficial configurado como padrão da plataforma.</p>
            </div>
          </div>
        )}

        {activeTab === 'integracoes' && (
          <div className="space-y-5 text-left">
            <h3 className="text-lg font-bold text-slate-900">Integrações com WhatsApp API</h3>
            <div className="space-y-4">
              <div className="p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl font-bold">WA</div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">WhatsApp Business API</div>
                    <div className="text-xs text-slate-400">Encaminhamento automático de leads aos parceiros.</div>
                  </div>
                </div>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200">
                  ● Conectado
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
