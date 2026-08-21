import React from 'react';
import { Sparkles, Eye, Box, Maximize2, Layers, Grid, CheckCircle2 } from 'lucide-react';
import { FINISHES, HARDWARE_OPTIONS, LAYOUT_OPTIONS, DOOR_TYPE_OPTIONS } from '../../data/mockData';

interface CabinetPreview3DProps {
  environmentId: string;
  selectedFurnitureModuleIds?: string[];
  layoutTypeId?: string;
  doorTypeId?: string;
  dimensions: {
    length: number;
    height: number;
    width: number;
  };
  finishId: string;
  hardwareId: string;
  additionalItemIds: string[];
  compact?: boolean;
}

export const CabinetPreview3D: React.FC<CabinetPreview3DProps> = ({
  environmentId,
  selectedFurnitureModuleIds = [],
  layoutTypeId = 'reta',
  doorTypeId = 'giro_soft',
  dimensions,
  finishId,
  hardwareId,
  additionalItemIds,
  compact = false,
}) => {
  const finish = FINISHES.find((f) => f.id === finishId) || FINISHES[0];
  const hardware = HARDWARE_OPTIONS.find((h) => h.id === hardwareId) || HARDWARE_OPTIONS[0];
  const layout = LAYOUT_OPTIONS.find((l) => l.id === layoutTypeId) || LAYOUT_OPTIONS[0];

  const hasLed = additionalItemIds.includes('led');
  const hasGlass = additionalItemIds.includes('vidro');
  const hasIsland = additionalItemIds.includes('ilha') || selectedFurnitureModuleIds.includes('cozinha_ilha');
  const hasTower = selectedFurnitureModuleIds.includes('cozinha_torre') || additionalItemIds.includes('torre_quente');
  const hasAereos = selectedFurnitureModuleIds.includes('cozinha_aereos') || selectedFurnitureModuleIds.includes('office_aereos');
  const hasBalcao = selectedFurnitureModuleIds.includes('cozinha_balcao') || selectedFurnitureModuleIds.includes('banheiro_gabinete');

  // Finish Color Palette
  const getFinishColors = () => {
    switch (finishId) {
      case 'madeirado':
        return {
          mainGrad: 'woodGrad',
          stroke: '#5c3311',
          accent: '#fae4cb',
          name: 'Madeirado Carvalho',
        };
      case 'premium':
        return {
          mainGrad: 'mattGrad',
          stroke: '#0f172a',
          accent: '#94a3b8',
          name: 'Cinza Grafite Premium',
        };
      case 'laca':
        return {
          mainGrad: 'lacaGrad',
          stroke: '#075985',
          accent: '#e0f2fe',
          name: 'Laca Azul Sereno',
        };
      case 'mdf_branco':
      default:
        return {
          mainGrad: 'whiteGrad',
          stroke: '#94a3b8',
          accent: '#334155',
          name: 'MDF Branco Silky',
        };
    }
  };

  const colors = getFinishColors();
  const areaM2 = (dimensions.length * dimensions.height).toFixed(1);

  return (
    <div className={`relative bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col justify-between ${compact ? 'p-4' : 'p-6'}`}>
      
      {/* Visual Header */}
      <div className="flex items-center justify-between mb-4 z-10">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-brand-500/20 rounded-xl text-brand-400 border border-brand-500/30">
            <Box className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Projeto 3D do Ambiente</div>
            <div className="text-xs font-bold text-white flex items-center space-x-1.5">
              <span>{colors.name}</span>
              <span className="text-slate-600">•</span>
              <span className="text-brand-400">{layout.title}</span>
            </div>
          </div>
        </div>

        {hasLed && (
          <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30 animate-pulse">
            <Sparkles className="w-3 h-3" />
            <span>Fita LED Acesa</span>
          </div>
        )}
      </div>

      {/* SVG 3D Ambient Visualizer Canvas */}
      <div className="relative w-full h-64 sm:h-72 flex items-center justify-center my-2 select-none overflow-hidden rounded-2xl bg-slate-900/50 border border-slate-800/80">
        
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />

        <svg viewBox="0 0 540 360" className="w-full h-full drop-shadow-2xl">
          <defs>
            <linearGradient id="whiteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="60%" stopColor="#f1f5f9" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>

            <linearGradient id="woodGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d49b67" />
              <stop offset="50%" stopColor="#b47b48" />
              <stop offset="100%" stopColor="#78471e" />
            </linearGradient>

            <linearGradient id="mattGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="70%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            <linearGradient id="lacaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>

            <linearGradient id="glassPattern" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.1" />
            </linearGradient>

            <linearGradient id="stoneSlab" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            <filter id="glowLed" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Room Background Wall */}
          <rect x="70" y="40" width="400" height="260" fill="#090d16" stroke="#1e293b" strokeWidth="1" />
          
          {/* L / U Wall Projections */}
          {(layoutTypeId === 'em_l' || layoutTypeId === 'em_u') && (
            <polygon points="20,70 70,40 70,300 20,330" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
          )}
          {layoutTypeId === 'em_u' && (
            <polygon points="470,40 520,70 520,330 470,300" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
          )}

          {/* Floor Line */}
          <line x1="20" y1="330" x2="520" y2="330" stroke="#334155" strokeWidth="1" strokeDasharray="3" />

          {/* TORRE QUENTE (Tall Tower Left) */}
          {hasTower && (
            <g>
              <rect x="80" y="55" width="75" height="235" rx="3" fill={`url(#${colors.mainGrad})`} stroke={colors.stroke} strokeWidth="1.5" />
              {/* Microwave Niche */}
              <rect x="88" y="100" width="59" height="38" rx="2" fill="#0f172a" stroke="#334155" strokeWidth="1" />
              <rect x="94" y="106" width="35" height="26" rx="1" fill="#020617" />
              {/* Oven Niche */}
              <rect x="88" y="146" width="59" height="42" rx="2" fill="#0f172a" stroke="#334155" strokeWidth="1" />
              <circle cx="138" cy="167" r="3" fill="#f59e0b" />
            </g>
          )}

          {/* ARMÁRIOS AÉREOS (Upper Wall Cabinets) */}
          {hasAereos && (
            <g>
              <rect x={hasTower ? "160" : "100"} y="55" width={hasTower ? "295" : "345"} height="75" rx="3" fill={`url(#${colors.mainGrad})`} stroke={colors.stroke} strokeWidth="1.5" />
              <line x1="220" y1="55" x2="220" y2="130" stroke={colors.stroke} strokeWidth="1.5" />
              <line x1="310" y1="55" x2="310" y2="130" stroke={colors.stroke} strokeWidth="1.5" />
              
              {/* Reflecta Glass doors */}
              {hasGlass && (
                <>
                  <rect x="225" y="62" width="80" height="61" rx="2" fill="url(#glassPattern)" stroke="#38bdf8" strokeWidth="1" />
                  <line x1="230" y1="67" x2="265" y2="118" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.5" />
                </>
              )}

              {/* Fita LED Glow Line */}
              {hasLed && (
                <line x1={hasTower ? "160" : "100"} y1="131" x2="455" y2="131" stroke="#f59e0b" strokeWidth="4" filter="url(#glowLed)" />
              )}
            </g>
          )}

          {/* BALCÃO INFERIOR (Lower Base Cabinet) */}
          {hasBalcao && (
            <g>
              <rect x={hasTower ? "160" : "100"} y="165" width={hasTower ? "295" : "345"} height="125" rx="3" fill={`url(#${colors.mainGrad})`} stroke={colors.stroke} strokeWidth="1.5" />
              <rect x={hasTower ? "156" : "96"} y="156" width={hasTower ? "303" : "353"} height="10" rx="2" fill="url(#stoneSlab)" stroke="#475569" strokeWidth="1" />

              {/* Drawers layout */}
              <rect x={hasTower ? "170" : "110"} y="172" width="85" height="32" rx="2" fill={`url(#${colors.mainGrad})`} stroke={colors.stroke} strokeWidth="1" />
              <rect x={hasTower ? "170" : "110"} y="208" width="85" height="32" rx="2" fill={`url(#${colors.mainGrad})`} stroke={colors.stroke} strokeWidth="1" />
              <rect x={hasTower ? "170" : "110"} y="244" width="85" height="38" rx="2" fill={`url(#${colors.mainGrad})`} stroke={colors.stroke} strokeWidth="1" />

              {/* Handles */}
              <line x1={hasTower ? "195" : "135"} y1="188" x2={hasTower ? "230" : "170"} y2="188" stroke={hardwareId === 'premium' ? '#fbbf24' : '#94a3b8'} strokeWidth="2.5" strokeLinecap="round" />
              <line x1={hasTower ? "195" : "135"} y1="224" x2={hasTower ? "230" : "170"} y2="224" stroke={hardwareId === 'premium' ? '#fbbf24' : '#94a3b8'} strokeWidth="2.5" strokeLinecap="round" />
              <line x1={hasTower ? "195" : "135"} y1="263" x2={hasTower ? "230" : "170"} y2="263" stroke={hardwareId === 'premium' ? '#fbbf24' : '#94a3b8'} strokeWidth="2.5" strokeLinecap="round" />

              <line x1="340" y1="165" x2="340" y2="290" stroke={colors.stroke} strokeWidth="1.5" />
              <rect x={hasTower ? "165" : "105"} y="290" width={hasTower ? "285" : "335"} height="8" fill="#020617" />
            </g>
          )}

          {/* ILHA CENTRAL (If island layout or island module selected) */}
          {hasIsland && (
            <g>
              <rect x="200" y="240" width="160" height="75" rx="4" fill={`url(#${colors.mainGrad})`} stroke={colors.stroke} strokeWidth="2" />
              <rect x="192" y="232" width="176" height="10" rx="2" fill="url(#stoneSlab)" stroke="#475569" strokeWidth="1" />
              <rect x="240" y="234" width="50" height="6" rx="1" fill="#020617" stroke="#38bdf8" strokeWidth="0.5" />
              <text x="280" y="280" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle">ILHA CENTRAL</text>
            </g>
          )}

          {/* Simple Dimension Indicators */}
          <line x1="70" y1="25" x2="470" y2="25" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3" />
          <line x1="70" y1="20" x2="70" y2="30" stroke="#38bdf8" strokeWidth="1.5" />
          <line x1="470" y1="20" x2="470" y2="30" stroke="#38bdf8" strokeWidth="1.5" />
          <text x="270" y="18" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle">
            Comprimento: {dimensions.length}m
          </text>

          <line x1="490" y1="40" x2="490" y2="300" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3" />
          <line x1="485" y1="40" x2="495" y2="40" stroke="#38bdf8" strokeWidth="1.5" />
          <line x1="485" y1="300" x2="495" y2="300" stroke="#38bdf8" strokeWidth="1.5" />
          <text x="505" y="175" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="start">
            Alt: {dimensions.height}m
          </text>
        </svg>

      </div>

      {/* Bottom Live Metrics Footer */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-medium">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1">
            <Maximize2 className="w-3.5 h-3.5 text-brand-400" />
            <strong className="text-white font-mono">{areaM2} m²</strong>
          </span>
          <span className="text-slate-700">•</span>
          <span>{layout.title}</span>
        </div>

        <div className="text-[11px] text-emerald-400 font-bold flex items-center space-x-1">
          <Eye className="w-3.5 h-3.5" />
          <span>Projeto Atualizado ao Vivo</span>
        </div>
      </div>

    </div>
  );
};
