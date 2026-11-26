import React from 'react';
import {
  Users,
  CalendarDays,
  Wallet,
  Clock,
  CreditCard,
  BarChart3,
  TrendingDown
} from 'lucide-react';

/* ==========================================================================
   ILUSTRAÇÕES E ÍCONES SVG PERSONALIZADOS (ESTILO 3D & NEON GLOW)
   ========================================================================== */

// Ramo de louro dourado esquerdo
export const LaurelLeft = () => (
  <svg width="22" height="26" viewBox="0 0 24 30" fill="none" style={{ color: '#fbbf24', filter: 'drop-shadow(0 0 6px rgba(251, 191, 36, 0.6))' }}>
    <path d="M12 28C6 26 2 20 2 13C2 7 6 2 6 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M12 28C10 21 6 15 3 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M11 22C8 17 6 11 5 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M9 16C7 13 6 9 7 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

// Ramo de louro dourado direito
export const LaurelRight = () => (
  <svg width="22" height="26" viewBox="0 0 24 30" fill="none" style={{ color: '#fbbf24', filter: 'drop-shadow(0 0 6px rgba(251, 191, 36, 0.6))' }}>
    <path d="M12 28C18 26 22 20 22 13C22 7 18 2 18 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M12 28C14 21 18 15 21 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M13 22C16 17 18 11 19 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M15 16C17 13 18 9 17 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

// Ícone do cabeçalho de Resumo: Bar Chart estilizado azul com brilho
export const BlueChartIcon = () => (
  <div style={{
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 14px rgba(14, 165, 233, 0.7)',
    border: '1px solid rgba(56, 189, 248, 0.6)',
    flexShrink: 0
  }}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M18 20V10M12 20V4M6 20V14" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
);

// Bola de futebol 3D realista no canto superior direito com feixe de luz de estádio
export const SoccerBallCornerDecor = () => (
  <svg className="rda-header-soccer-ball-decor" viewBox="0 0 120 120" fill="none">
    <defs>
      {/* Feixe de luz azul de estádio */}
      <radialGradient id="stadiumGlow" cx="60%" cy="40%" r="55%">
        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.75" />
        <stop offset="50%" stopColor="#0284c7" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
      </radialGradient>
      {/* Esfera 3D da bola */}
      <radialGradient id="ballShading" cx="35%" cy="30%" r="65%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="60%" stopColor="#cbd5e1" />
        <stop offset="90%" stopColor="#475569" />
        <stop offset="100%" stopColor="#0f172a" />
      </radialGradient>
      <linearGradient id="patchGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#1e293b" />
        <stop offset="100%" stopColor="#020617" />
      </linearGradient>
    </defs>
    {/* Halo de luz de estádio */}
    <circle cx="80" cy="40" r="50" fill="url(#stadiumGlow)" />
    <path d="M0 45 Q 60 20 120 40" stroke="#00d2ff" strokeWidth="2" opacity="0.6" filter="blur(1px)"/>
    {/* Bola de futebol */}
    <g transform="translate(45, 0)">
      <circle cx="50" cy="50" r="40" fill="url(#ballShading)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
      {/* Gomos pretos da bola */}
      <polygon points="50,32 62,41 57,55 43,55 38,41" fill="url(#patchGrad)" stroke="#64748b" strokeWidth="1"/>
      <polygon points="50,15 58,11 63,18 58,25 50,21" fill="url(#patchGrad)" stroke="#64748b" strokeWidth="1"/>
      <polygon points="76,30 84,36 80,48 71,46 68,36" fill="url(#patchGrad)" stroke="#64748b" strokeWidth="1"/>
      <polygon points="68,67 78,63 85,73 78,82 68,78" fill="url(#patchGrad)" stroke="#64748b" strokeWidth="1"/>
      <polygon points="32,67 42,78 35,88 24,82 24,70" fill="url(#patchGrad)" stroke="#64748b" strokeWidth="1"/>
      <polygon points="24,35 33,36 30,46 20,48 16,38" fill="url(#patchGrad)" stroke="#64748b" strokeWidth="1"/>
      {/* Linhas de costura */}
      <line x1="50" y1="32" x2="50" y2="21" stroke="#475569" strokeWidth="1.2"/>
      <line x1="62" y1="41" x2="68" y2="36" stroke="#475569" strokeWidth="1.2"/>
      <line x1="57" y1="55" x2="68" y2="67" stroke="#475569" strokeWidth="1.2"/>
      <line x1="43" y1="55" x2="32" y2="67" stroke="#475569" strokeWidth="1.2"/>
      <line x1="38" y1="41" x2="33" y2="36" stroke="#475569" strokeWidth="1.2"/>
      {/* Brilho esférico */}
      <ellipse cx="40" cy="30" rx="15" ry="8" fill="#ffffff" opacity="0.35" transform="rotate(-25 40 30)"/>
    </g>
  </svg>
);

// Pilhas de moedas douradas em 3D (para o cabeçalho Financeiro Geral)
export const GoldCoinsIcon = () => (
  <div style={{
    width: '42px',
    height: '42px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    filter: 'drop-shadow(0 0 10px rgba(245, 158, 11, 0.6))',
    flexShrink: 0
  }}>
    <svg width="38" height="38" viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="coinGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="40%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#a16207" />
        </linearGradient>
        <linearGradient id="coinEdge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ca8a04" />
          <stop offset="100%" stopColor="#713f12" />
        </linearGradient>
      </defs>
      {/* Pilha 1 (trás) */}
      <ellipse cx="18" cy="36" rx="13" ry="5.5" fill="url(#coinEdge)" />
      <ellipse cx="18" cy="34" rx="13" ry="5.5" fill="url(#coinGold)" stroke="#fef08a" strokeWidth="0.8"/>
      <ellipse cx="18" cy="28" rx="13" ry="5.5" fill="url(#coinEdge)" />
      <ellipse cx="18" cy="26" rx="13" ry="5.5" fill="url(#coinGold)" stroke="#fef08a" strokeWidth="0.8"/>
      <ellipse cx="18" cy="20" rx="13" ry="5.5" fill="url(#coinEdge)" />
      <ellipse cx="18" cy="18" rx="13" ry="5.5" fill="url(#coinGold)" stroke="#fef08a" strokeWidth="0.8"/>
      
      {/* Pilha 2 (frente direita) */}
      <ellipse cx="32" cy="38" rx="12" ry="5" fill="url(#coinEdge)" />
      <ellipse cx="32" cy="36" rx="12" ry="5" fill="url(#coinGold)" stroke="#fef08a" strokeWidth="0.8"/>
      <ellipse cx="32" cy="31" rx="12" ry="5" fill="url(#coinEdge)" />
      <ellipse cx="32" cy="29" rx="12" ry="5" fill="url(#coinGold)" stroke="#fef08a" strokeWidth="0.8"/>
      <ellipse cx="32" cy="24" rx="12" ry="5" fill="url(#coinEdge)" />
      <ellipse cx="32" cy="22" rx="12" ry="5" fill="url(#coinGold)" stroke="#fef08a" strokeWidth="0.8"/>
    </svg>
  </div>
);

// Escudo dourado decorativo com louros e moedas (para o canto superior direito do Financeiro)
export const GoldShieldCornerDecor = () => (
  <svg className="rda-header-shield-decor" viewBox="0 0 100 100" fill="none">
    <defs>
      <radialGradient id="shieldBlueGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#00d2ff" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#00d2ff" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="shieldGold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="50%" stopColor="#eab308" />
        <stop offset="100%" stopColor="#854d0e" />
      </linearGradient>
    </defs>
    {/* Feixe azul inferior */}
    <circle cx="50" cy="50" r="45" fill="url(#shieldBlueGlow)" />
    {/* Ramo de louros dourados */}
    <path d="M22 65 C16 48 20 30 32 20" stroke="url(#shieldGold)" strokeWidth="3" strokeLinecap="round"/>
    <path d="M78 65 C84 48 80 30 68 20" stroke="url(#shieldGold)" strokeWidth="3" strokeLinecap="round"/>
    <path d="M20 54 C24 50 25 44 23 38" stroke="url(#shieldGold)" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M80 54 C76 50 75 44 77 38" stroke="url(#shieldGold)" strokeWidth="2.5" strokeLinecap="round"/>
    {/* Escudo */}
    <path d="M50 16 L72 26 C72 50 62 68 50 78 C38 68 28 50 28 26 Z"
          fill="#061226" stroke="url(#shieldGold)" strokeWidth="2.5" filter="drop-shadow(0 0 8px rgba(234, 179, 8, 0.6))"/>
    {/* Borda interna do escudo */}
    <path d="M50 22 L67 30 C67 48 58 63 50 71 C42 63 33 48 33 30 Z"
          fill="#081e3d" stroke="#fef08a" strokeWidth="1" opacity="0.7"/>
    {/* Moedas no centro do escudo */}
    <ellipse cx="50" cy="48" rx="8" ry="3.5" fill="#ca8a04" />
    <ellipse cx="50" cy="46" rx="8" ry="3.5" fill="#facc15" stroke="#fef08a" strokeWidth="0.8"/>
    <ellipse cx="50" cy="42" rx="8" ry="3.5" fill="#ca8a04" />
    <ellipse cx="50" cy="40" rx="8" ry="3.5" fill="#facc15" stroke="#fef08a" strokeWidth="0.8"/>
  </svg>
);

// Chuteira neon roxa (para Assistências)
export const PurpleCleatIcon = () => (
  <div style={{
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    background: 'rgba(168, 85, 247, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 14px rgba(168, 85, 247, 0.5)',
    border: '1.2px solid rgba(168, 85, 247, 0.5)',
    flexShrink: 0
  }}>
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
      <path d="M6 14 C10 13 14 11 18 8 C20 7 24 10 26 14 C27 16 26 19 23 20 L8 22 C6 22 5 20 6 18 Z"
            fill="#a855f7" stroke="#e9d5ff" strokeWidth="1.5"/>
      {/* Travas da chuteira */}
      <rect x="8" y="22" width="2" height="3" rx="1" fill="#c084fc"/>
      <rect x="13" y="22" width="2" height="3" rx="1" fill="#c084fc"/>
      <rect x="18" y="21" width="2" height="3" rx="1" fill="#c084fc"/>
      <rect x="22" y="20" width="2" height="3" rx="1" fill="#c084fc"/>
      {/* Linhas de cadarço */}
      <path d="M14 12 L17 14 M12 14 L15 16 M10 16 L13 18" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  </div>
);

// Bola verde neon (para Gols)
export const GreenBallIcon = () => (
  <div style={{
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, #22c55e 0%, #15803d 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 16px rgba(34, 197, 94, 0.7)',
    border: '1.5px solid #4ade80',
    flexShrink: 0
  }}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#14532d" strokeWidth="1.5" />
      <polygon points="12,7 15,10 14,14 10,14 9,10" fill="#14532d" stroke="#4ade80" strokeWidth="1"/>
      <line x1="12" y1="7" x2="12" y2="2" stroke="#14532d" strokeWidth="1.2"/>
      <line x1="15" y1="10" x2="20" y2="9" stroke="#14532d" strokeWidth="1.2"/>
      <line x1="14" y1="14" x2="18" y2="18" stroke="#14532d" strokeWidth="1.2"/>
      <line x1="10" y1="14" x2="6" y2="18" stroke="#14532d" strokeWidth="1.2"/>
      <line x1="9" y1="10" x2="4" y2="9" stroke="#14532d" strokeWidth="1.2"/>
    </svg>
  </div>
);

// Moedas verdes em 3D para o Saldo Líquido Acumulado
export const GreenCoinsHighlightIcon = () => (
  <div style={{
    width: '46px',
    height: '46px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    filter: 'drop-shadow(0 0 12px rgba(34, 197, 94, 0.8))',
    flexShrink: 0
  }}>
    <svg width="42" height="42" viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="coinGreen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="50%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#14532d" />
        </linearGradient>
        <linearGradient id="coinGreenEdge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#16a34a" />
          <stop offset="100%" stopColor="#052e16" />
        </linearGradient>
      </defs>
      {/* Pilha 1 */}
      <ellipse cx="18" cy="36" rx="13" ry="5.5" fill="url(#coinGreenEdge)" />
      <ellipse cx="18" cy="34" rx="13" ry="5.5" fill="url(#coinGreen)" stroke="#bbf7d0" strokeWidth="0.9"/>
      <ellipse cx="18" cy="27" rx="13" ry="5.5" fill="url(#coinGreenEdge)" />
      <ellipse cx="18" cy="25" rx="13" ry="5.5" fill="url(#coinGreen)" stroke="#bbf7d0" strokeWidth="0.9"/>
      <ellipse cx="18" cy="18" rx="13" ry="5.5" fill="url(#coinGreenEdge)" />
      <ellipse cx="18" cy="16" rx="13" ry="5.5" fill="url(#coinGreen)" stroke="#bbf7d0" strokeWidth="0.9"/>
      
      {/* Pilha 2 */}
      <ellipse cx="32" cy="38" rx="12" ry="5" fill="url(#coinGreenEdge)" />
      <ellipse cx="32" cy="36" rx="12" ry="5" fill="url(#coinGreen)" stroke="#bbf7d0" strokeWidth="0.9"/>
      <ellipse cx="32" cy="29" rx="12" ry="5" fill="url(#coinGreenEdge)" />
      <ellipse cx="32" cy="27" rx="12" ry="5" fill="url(#coinGreen)" stroke="#bbf7d0" strokeWidth="0.9"/>
      <ellipse cx="32" cy="20" rx="12" ry="5" fill="url(#coinGreenEdge)" />
      <ellipse cx="32" cy="18" rx="12" ry="5" fill="url(#coinGreen)" stroke="#bbf7d0" strokeWidth="0.9"/>
    </svg>
  </div>
);

// Marcas d'água sutis nos fundos dos cards de métrica
export const WatermarkGoal = () => (
  <svg className="rda-box-watermark" width="68" height="54" viewBox="0 0 68 54" fill="none">
    <path d="M4 8 L64 8 L64 50 L4 50 Z" stroke="#22c55e" strokeWidth="2.5" />
    <line x1="16" y1="8" x2="16" y2="50" stroke="#22c55e" strokeWidth="1" strokeDasharray="3 3"/>
    <line x1="28" y1="8" x2="28" y2="50" stroke="#22c55e" strokeWidth="1" strokeDasharray="3 3"/>
    <line x1="40" y1="8" x2="40" y2="50" stroke="#22c55e" strokeWidth="1" strokeDasharray="3 3"/>
    <line x1="52" y1="8" x2="52" y2="50" stroke="#22c55e" strokeWidth="1" strokeDasharray="3 3"/>
    <line x1="4" y1="20" x2="64" y2="20" stroke="#22c55e" strokeWidth="1" strokeDasharray="3 3"/>
    <line x1="4" y1="34" x2="64" y2="34" stroke="#22c55e" strokeWidth="1" strokeDasharray="3 3"/>
    {/* Bola na rede */}
    <circle cx="36" cy="32" r="7" fill="#22c55e" fillOpacity="0.4" stroke="#22c55e" strokeWidth="1.5"/>
  </svg>
);

export const WatermarkMatches = () => (
  <svg className="rda-box-watermark" width="68" height="54" viewBox="0 0 68 54" fill="none">
    <path d="M6 10 L62 10 L62 50 L6 50 Z" stroke="#f59e0b" strokeWidth="2" />
    <path d="M20 10 L20 50 M34 10 L34 50 M48 10 L48 50" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2 2"/>
    <path d="M6 24 L62 24 M6 38 L62 38" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2 2"/>
    <circle cx="34" cy="30" r="10" stroke="#f59e0b" strokeWidth="1.5"/>
  </svg>
);

export const WatermarkTactical = () => (
  <svg className="rda-box-watermark" width="65" height="55" viewBox="0 0 65 55" fill="none">
    {/* X e Círculos táticos */}
    <circle cx="18" cy="38" r="6" stroke="#c084fc" strokeWidth="2.5" />
    <path d="M46 16 L56 26 M56 16 L46 26" stroke="#c084fc" strokeWidth="2.5" strokeLinecap="round"/>
    {/* Seta curva tática */}
    <path d="M24 34 Q 40 32 48 18" stroke="#c084fc" strokeWidth="2.8" strokeLinecap="round" fill="none"/>
    <path d="M42 16 L50 16 L50 24" stroke="#c084fc" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const WatermarkPlayers = () => (
  <svg className="rda-box-watermark" width="70" height="50" viewBox="0 0 70 50" fill="none">
    <circle cx="24" cy="18" r="9" fill="#0099ff" fillOpacity="0.3" />
    <path d="M8 44 C8 34 16 30 24 30 C32 30 40 34 40 44" fill="#0099ff" fillOpacity="0.3"/>
    <circle cx="46" cy="15" r="7" fill="#0099ff" fillOpacity="0.2" />
    <path d="M34 42 C34 33 40 30 46 30 C52 30 58 33 58 42" fill="#0099ff" fillOpacity="0.2"/>
  </svg>
);


/* ==========================================================================
   COMPONENTE 1: RESUMO DA TEMPORADA
   ========================================================================== */

export interface ResumoTemporadaCardProps {
  totalPlayers: number;
  totalMensalistas: number;
  totalDiaristas: number;
  totalMatches: number;
  totalGoals: number;
  totalAssists: number;
}

export const ResumoTemporadaCard: React.FC<ResumoTemporadaCardProps> = ({
  totalPlayers,
  totalMensalistas,
  totalDiaristas,
  totalMatches,
  totalGoals,
  totalAssists
}) => {
  return (
    <div className="rda-premium-card" data-testid="card-resumo-temporada">
      {/* Decoração superior direita: Bola 3D com luz de estádio */}
      <SoccerBallCornerDecor />

      {/* Cabeçalho */}
      <div className="rda-premium-card-header">
        <LaurelLeft />
        <BlueChartIcon />
        <div className="rda-premium-card-title-wrap">
          <div className="rda-premium-card-title">
            <span>RESUMO DA TEMPORADA</span>
          </div>
          <span className="rda-premium-card-subtitle">DESEMPENHO GERAL DO RACHA</span>
        </div>
        <LaurelRight />
      </div>

      {/* Grid 2x2 com os 4 Blocos de Métricas */}
      <div className="rda-season-grid">
        {/* Bloco 1: Jogadores (Azul Neon) */}
        <div className="rda-season-box rda-season-box--players">
          <WatermarkPlayers />
          <div className="rda-season-box-top">
            <div className="rda-season-box-icon" style={{
              background: 'rgba(0, 153, 255, 0.2)',
              border: '1.2px solid rgba(0, 153, 255, 0.45)',
              boxShadow: '0 0 12px rgba(0, 153, 255, 0.5)'
            }}>
              <Users size={26} color="#38bdf8" />
            </div>
            <div className="rda-season-box-data">
              <span className="rda-season-box-number">{totalPlayers}</span>
              <span className="rda-season-box-label">Jogadores</span>
            </div>
          </div>
          <div className="rda-season-box-pills">
            <span className="rda-pill rda-pill--green">
              <Users size={12} color="#22c55e" />
              <span>{totalMensalistas} Mensalistas</span>
            </span>
            <span className="rda-pill rda-pill--red">
              <Users size={12} color="#ef4444" />
              <span>{totalDiaristas} Diaristas</span>
            </span>
          </div>
        </div>

        {/* Bloco 2: Partidas (Dourado / Laranja) */}
        <div className="rda-season-box rda-season-box--matches">
          <WatermarkMatches />
          <div className="rda-season-box-top">
            <div className="rda-season-box-icon" style={{
              background: 'rgba(245, 158, 11, 0.2)',
              border: '1.2px solid rgba(245, 158, 11, 0.45)',
              boxShadow: '0 0 12px rgba(245, 158, 11, 0.5)'
            }}>
              <CalendarDays size={26} color="#fbbf24" />
            </div>
            <div className="rda-season-box-data">
              <span className="rda-season-box-number">{totalMatches}</span>
              <span className="rda-season-box-label">Partidas</span>
            </div>
          </div>
        </div>

        {/* Bloco 3: Gols (Verde Neon) */}
        <div className="rda-season-box rda-season-box--goals">
          <WatermarkGoal />
          <div className="rda-season-box-top">
            <GreenBallIcon />
            <div className="rda-season-box-data">
              <span className="rda-season-box-number">{totalGoals}</span>
              <span className="rda-season-box-label">Gols</span>
            </div>
          </div>
        </div>

        {/* Bloco 4: Assistências (Roxo Neon) */}
        <div className="rda-season-box rda-season-box--assists">
          <WatermarkTactical />
          <div className="rda-season-box-top">
            <PurpleCleatIcon />
            <div className="rda-season-box-data">
              <span className="rda-season-box-number">{totalAssists}</span>
              <span className="rda-season-box-label">Assistências</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


/* ==========================================================================
   COMPONENTE 2: FINANCEIRO GERAL
   ========================================================================== */

export interface FinanceiroGeralCardProps {
  totalRevenue: number;
  totalExpenses: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  pendingAmount: number;
  accumulatedBalance: number;
}

const formatCurrencyBRL = (val: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

export const FinanceiroGeralCard: React.FC<FinanceiroGeralCardProps> = ({
  totalRevenue,
  totalExpenses,
  monthlyRevenue,
  monthlyExpenses,
  pendingAmount,
  accumulatedBalance
}) => {
  return (
    <div className="rda-premium-card" data-testid="card-financeiro-geral">
      {/* Decoração superior direita: Brasão dourado com louros e moedas */}
      <GoldShieldCornerDecor />

      {/* Cabeçalho */}
      <div className="rda-premium-card-header">
        <GoldCoinsIcon />
        <div className="rda-premium-card-title-wrap">
          <div className="rda-premium-card-title">
            <span>FINANCEIRO GERAL</span>
          </div>
          <span className="rda-premium-card-subtitle">CONTROLE DE RECEITAS, DESPESAS E SALDO</span>
        </div>
      </div>

      {/* Grid de 2 Colunas com 3 Linhas cada */}
      <div className="rda-finance-grid">
        {/* Coluna Esquerda */}
        <div className="rda-finance-col">
          {/* 1. Arrecadação Total */}
          <div className="rda-finance-row-item">
            <div className="rda-finance-row-icon" style={{
              background: 'rgba(0, 180, 255, 0.15)',
              border: '1px solid rgba(0, 180, 255, 0.35)',
              boxShadow: '0 0 10px rgba(0, 180, 255, 0.4)'
            }}>
              <Wallet size={20} color="#00d2ff" />
            </div>
            <div className="rda-finance-row-content">
              <span className="rda-finance-row-label">Arrecadação Total</span>
              <span className="rda-finance-row-val rda-val--green">
                {formatCurrencyBRL(totalRevenue)}
              </span>
            </div>
          </div>

          {/* 2. Recebido no mês */}
          <div className="rda-finance-row-item">
            <div className="rda-finance-row-icon" style={{
              background: 'rgba(0, 180, 255, 0.15)',
              border: '1px solid rgba(0, 180, 255, 0.35)',
              boxShadow: '0 0 10px rgba(0, 180, 255, 0.4)'
            }}>
              <TrendingDown size={20} color="#00d2ff" style={{ transform: 'rotate(180deg)' }} />
            </div>
            <div className="rda-finance-row-content">
              <span className="rda-finance-row-label">Recebido no mês</span>
              <span className="rda-finance-row-val rda-val--green">
                {formatCurrencyBRL(monthlyRevenue)}
              </span>
            </div>
          </div>

          {/* 3. Pendências (mês) */}
          <div className="rda-finance-row-item">
            <div className="rda-finance-row-icon" style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              boxShadow: '0 0 10px rgba(239, 68, 68, 0.4)'
            }}>
              <Clock size={20} color="#ef4444" />
            </div>
            <div className="rda-finance-row-content">
              <span className="rda-finance-row-label">Pendências (mês)</span>
              <span className="rda-finance-row-val rda-val--red">
                {formatCurrencyBRL(pendingAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Coluna Direita */}
        <div className="rda-finance-col">
          {/* 1. Despesas Totais */}
          <div className="rda-finance-row-item">
            <div className="rda-finance-row-icon" style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              boxShadow: '0 0 10px rgba(239, 68, 68, 0.4)'
            }}>
              <CreditCard size={20} color="#ef4444" />
            </div>
            <div className="rda-finance-row-content">
              <span className="rda-finance-row-label">Despesas Totais</span>
              <span className="rda-finance-row-val rda-val--red">
                {formatCurrencyBRL(totalExpenses)}
              </span>
            </div>
          </div>

          {/* 2. Despesas (mês) */}
          <div className="rda-finance-row-item">
            <div className="rda-finance-row-icon" style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              boxShadow: '0 0 10px rgba(239, 68, 68, 0.4)'
            }}>
              <BarChart3 size={20} color="#ef4444" />
            </div>
            <div className="rda-finance-row-content">
              <span className="rda-finance-row-label">Despesas (mês)</span>
              <span className="rda-finance-row-val rda-val--red">
                {formatCurrencyBRL(monthlyExpenses)}
              </span>
            </div>
          </div>

          {/* 3. Saldo Líquido Acumulado (Destaque Máximo da Imagem) */}
          <div className="rda-finance-row-item rda-finance-row-item--highlight">
            <GreenCoinsHighlightIcon />
            <div className="rda-finance-row-content">
              <span className="rda-finance-row-label">Saldo Líquido Acumulado</span>
              <span className="rda-finance-row-val rda-val--green">
                {formatCurrencyBRL(accumulatedBalance)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
