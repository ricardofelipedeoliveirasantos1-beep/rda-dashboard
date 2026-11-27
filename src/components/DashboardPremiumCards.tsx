import React from 'react';
import {
  Users,
  CalendarDays,
  Clock
} from 'lucide-react';
import {
  MapPin,
  ArrowRight,
  Calendar,
  Edit,
  User,
  Award
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

// Ícone do cabeçalho de Calendário Ciano/Azul com brilho neon (para Resumo Mensal e Próxima Partida)
export const CyanCalendarIcon = () => (
  <div style={{
    width: '40px',
    height: '40px',
    borderRadius: '11px',
    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 16px rgba(0, 229, 255, 0.75)',
    border: '1.5px solid #38bdf8',
    flexShrink: 0
  }}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="16" rx="3" stroke="#00e5ff" strokeWidth="2.2" fill="rgba(2, 132, 199, 0.3)"/>
      <line x1="3" y1="10" x2="21" y2="10" stroke="#00e5ff" strokeWidth="2"/>
      <rect x="7" y="2" width="2" height="4" rx="1" fill="#ffffff" />
      <rect x="15" y="2" width="2" height="4" rx="1" fill="#ffffff" />
      <circle cx="8" cy="14" r="1.2" fill="#ffffff"/>
      <circle cx="12" cy="14" r="1.2" fill="#ffffff"/>
      <circle cx="16" cy="14" r="1.2" fill="#ffffff"/>
      <circle cx="8" cy="17.5" r="1.2" fill="#ffffff"/>
      <circle cx="12" cy="17.5" r="1.2" fill="#ffffff"/>
      <circle cx="16.5" cy="17.5" r="1.2" fill="#ffffff"/>
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
    <circle cx="18" cy="38" r="6" stroke="#c084fc" strokeWidth="2.5"/>
    <path d="M46 16 L56 26 M56 16 L46 26" stroke="#c084fc" strokeWidth="2.5" strokeLinecap="round"/>
    {/* Seta curva tática */}
    <path d="M24 34 Q 40 32 48 18" stroke="#c084fc" strokeWidth="2.8" strokeLinecap="round" fill="none"/>
    <path d="M42 16 L50 16 L50 24" stroke="#c084fc" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const WatermarkPlayers = () => (
  <svg className="rda-box-watermark" width="70" height="50" viewBox="0 0 70 50" fill="none">
    <circle cx="24" cy="18" r="9" fill="#0099ff" fillOpacity="0.3"/>
    <path d="M8 44 C8 34 16 30 24 30 C32 30 40 34 40 44" fill="#0099ff" fillOpacity="0.3"/>
    <circle cx="46" cy="15" r="7" fill="#0099ff" fillOpacity="0.2"/>
    <path d="M34 42 C34 33 40 30 46 30 C52 30 58 33 58 42" fill="#0099ff" fillOpacity="0.2"/>
  </svg>
);



/* ==========================================================================
   ÍCONES EXCLUSIVOS PARA RESUMO DA TEMPORADA E FINANCEIRO GERAL
   (100% FIÉIS À IMAGEM DE REFERÊNCIA OFICIAL)
   ========================================================================== */

export const BarChartSeasonIcon = () => (
  <svg width="34" height="34" viewBox="0 0 36 36" fill="none" style={{ filter: 'drop-shadow(0 0 10px rgba(0, 229, 255, 0.7))', flexShrink: 0 }}>
    <defs>
      <linearGradient id="barBlueSeason" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#0284c7" />
      </linearGradient>
      <linearGradient id="barYellowSeason" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="100%" stopColor="#eab308" />
      </linearGradient>
      <linearGradient id="barOrangeSeason" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fb923c" />
        <stop offset="100%" stopColor="#ea580c" />
      </linearGradient>
    </defs>
    <rect x="5" y="16" width="7" height="15" rx="3" fill="url(#barBlueSeason)" />
    <rect x="14.5" y="7" width="7" height="24" rx="3" fill="url(#barYellowSeason)" />
    <rect x="24" y="13" width="7" height="18" rx="3" fill="url(#barOrangeSeason)" />
  </svg>
);

export const PlayersGroupIcon = () => (
  <svg width="46" height="38" viewBox="0 0 48 38" fill="none" style={{ filter: 'drop-shadow(0 0 12px rgba(56, 189, 248, 0.85))' }}>
    <defs>
      <linearGradient id="playerCyanGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#67e8f9" />
        <stop offset="100%" stopColor="#06b6d4" />
      </linearGradient>
    </defs>
    <circle cx="13" cy="14" r="6" fill="#38bdf8" />
    <path d="M4 33 C4 26 8 22 13 22 C16.5 22 19.5 23.5 21 26" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" fill="#38bdf8" />
    <circle cx="35" cy="14" r="6" fill="#38bdf8" />
    <path d="M44 33 C44 26 40 22 35 22 C31.5 22 28.5 23.5 27 26" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" fill="#38bdf8" />
    <circle cx="24" cy="11" r="7.5" fill="url(#playerCyanGrad)" stroke="#a5f3fc" strokeWidth="0.8" />
    <path d="M12 33 C12 24 17 20 24 20 C31 20 36 24 36 33 Z" fill="url(#playerCyanGrad)" />
  </svg>
);

export const CalendarSeasonIcon = () => (
  <svg width="44" height="44" viewBox="0 0 40 40" fill="none" style={{ filter: 'drop-shadow(0 0 12px rgba(245, 158, 11, 0.75))' }}>
    <rect x="5" y="8" width="30" height="27" rx="6" fill="#f8fafc" stroke="#ffffff" strokeWidth="1" />
    <path d="M5 14 C5 10.6863 7.68629 8 11 8 H29 C32.3137 8 35 10.6863 35 14 V16 H5 V14 Z" fill="#ef4444" />
    <rect x="11" y="5" width="3" height="6" rx="1.5" fill="#fca5a5" stroke="#b91c1c" strokeWidth="0.8" />
    <rect x="26" y="5" width="3" height="6" rx="1.5" fill="#fca5a5" stroke="#b91c1c" strokeWidth="0.8" />
    <rect x="9" y="20" width="4" height="3" rx="1" fill="#94a3b8" />
    <rect x="15.5" y="20" width="4" height="3" rx="1" fill="#94a3b8" />
    <rect x="22" y="20" width="4" height="3" rx="1" fill="#94a3b8" />
    <rect x="28.5" y="20" width="4" height="3" rx="1" fill="#94a3b8" />
    <rect x="9" y="26" width="4" height="3" rx="1" fill="#94a3b8" />
    <rect x="15.5" y="26" width="4" height="3" rx="1" fill="#94a3b8" />
    <rect x="22" y="26" width="4" height="3" rx="1" fill="#94a3b8" />
    <rect x="28.5" y="26" width="4" height="3" rx="1" fill="#94a3b8" />
  </svg>
);

export const SoccerBallSeasonIcon = () => (
  <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ filter: 'drop-shadow(0 0 14px rgba(0, 230, 118, 0.75))' }}>
    <defs>
      <radialGradient id="seasonBallShade" cx="35%" cy="30%" r="65%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="60%" stopColor="#e2e8f0" />
        <stop offset="90%" stopColor="#475569" />
        <stop offset="100%" stopColor="#0f172a" />
      </radialGradient>
    </defs>
    <circle cx="22" cy="22" r="19" fill="url(#seasonBallShade)" stroke="#ffffff" strokeWidth="1.2" />
    <polygon points="22,14 28,18 26,26 18,26 16,18" fill="#1e293b" stroke="#64748b" strokeWidth="0.8" />
    <polygon points="22,5 26,3 29,7 27,10 22,8" fill="#1e293b" stroke="#64748b" strokeWidth="0.6" />
    <polygon points="35,13 40,17 37,22 32,20 30,15" fill="#1e293b" stroke="#64748b" strokeWidth="0.6" />
    <polygon points="31,31 36,29 39,34 35,39 30,37" fill="#1e293b" stroke="#64748b" strokeWidth="0.6" />
    <polygon points="13,31 17,37 13,40 8,37 8,31" fill="#1e293b" stroke="#64748b" strokeWidth="0.6" />
    <polygon points="9,13 13,15 11,20 6,22 4,17" fill="#1e293b" stroke="#64748b" strokeWidth="0.6" />
    <line x1="22" y1="14" x2="22" y2="8" stroke="#475569" strokeWidth="0.8" />
    <line x1="28" y1="18" x2="32" y2="15" stroke="#475569" strokeWidth="0.8" />
    <line x1="26" y1="26" x2="31" y2="31" stroke="#475569" strokeWidth="0.8" />
    <line x1="18" y1="26" x2="13" y2="31" stroke="#475569" strokeWidth="0.8" />
    <line x1="16" y1="18" x2="11" y2="15" stroke="#475569" strokeWidth="0.8" />
    <ellipse cx="16" cy="13" rx="6" ry="3" fill="#ffffff" opacity="0.5" transform="rotate(-30 16 13)" />
  </svg>
);

export const CleatSeasonIcon = () => (
  <svg width="46" height="36" viewBox="0 0 48 38" fill="none" style={{ filter: 'drop-shadow(0 0 14px rgba(168, 85, 247, 0.85))' }}>
    <defs>
      <linearGradient id="cleatGradSeason" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#d8b4fe" />
        <stop offset="45%" stopColor="#a855f7" />
        <stop offset="100%" stopColor="#6b21a8" />
      </linearGradient>
    </defs>
    <path d="M8 22 C12 21 18 19 24 14 C28 11 34 14 38 19 C40 21 38 25 34 26 L10 28 C7 28 6 26 8 22 Z"
      fill="url(#cleatGradSeason)" stroke="#f3e8ff" strokeWidth="1.2" />
    <rect x="10" y="28" width="3" height="4" rx="1.5" fill="#f3e8ff" />
    <rect x="17" y="28" width="3" height="4" rx="1.5" fill="#f3e8ff" />
    <rect x="24" y="27" width="3" height="4" rx="1.5" fill="#f3e8ff" />
    <rect x="30" y="26" width="3" height="4" rx="1.5" fill="#f3e8ff" />
    <path d="M18 17 L22 19 M15 19 L19 21 M12 21 L16 23" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const GoldCoinsHeaderIcon = () => (
  <svg width="36" height="36" viewBox="0 0 40 40" fill="none" style={{ filter: 'drop-shadow(0 0 12px rgba(234, 179, 8, 0.85))', flexShrink: 0 }}>
    <defs>
      <linearGradient id="goldCoinTopSeason" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="50%" stopColor="#eab308" />
        <stop offset="100%" stopColor="#a16207" />
      </linearGradient>
      <linearGradient id="goldCoinEdgeSeason" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ca8a04" />
        <stop offset="100%" stopColor="#713f12" />
      </linearGradient>
    </defs>
    <ellipse cx="15" cy="27" rx="11" ry="5" fill="url(#goldCoinEdgeSeason)" />
    <ellipse cx="15" cy="25" rx="11" ry="5" fill="url(#goldCoinTopSeason)" stroke="#fef08a" strokeWidth="0.8" />
    <ellipse cx="15" cy="19" rx="11" ry="5" fill="url(#goldCoinEdgeSeason)" />
    <ellipse cx="15" cy="17" rx="11" ry="5" fill="url(#goldCoinTopSeason)" stroke="#fef08a" strokeWidth="0.8" />
    <ellipse cx="26" cy="30" rx="11" ry="5" fill="url(#goldCoinEdgeSeason)" />
    <ellipse cx="26" cy="28" rx="11" ry="5" fill="url(#goldCoinTopSeason)" stroke="#fef08a" strokeWidth="0.8" />
    <ellipse cx="26" cy="22" rx="11" ry="5" fill="url(#goldCoinEdgeSeason)" />
    <ellipse cx="26" cy="20" rx="11" ry="5" fill="url(#goldCoinTopSeason)" stroke="#fef08a" strokeWidth="0.8" />
  </svg>
);

// Ícone da Bolsa Rosa Porta-Moedas (Fiel à Imagem de Referência Oficial)
export const PinkCoinPurseIcon = () => (
  <svg width="44" height="40" viewBox="0 0 44 40" fill="none" style={{ filter: 'drop-shadow(0 0 10px rgba(255, 105, 180, 0.7))', flexShrink: 0 }}>
    <defs>
      <linearGradient id="purseBodyGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ff758c" />
        <stop offset="50%" stopColor="#ff4d79" />
        <stop offset="100%" stopColor="#c2185b" />
      </linearGradient>
      <linearGradient id="goldClaspGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="60%" stopColor="#eab308" />
        <stop offset="100%" stopColor="#a16207" />
      </linearGradient>
    </defs>
    <circle cx="20" cy="7" r="3" fill="url(#goldClaspGrad)" stroke="#fef08a" strokeWidth="0.8" />
    <circle cx="25" cy="7" r="3" fill="url(#goldClaspGrad)" stroke="#fef08a" strokeWidth="0.8" />
    <path d="M12 13 C12 10.5 16 9.5 22.5 9.5 C29 9.5 33 10.5 33 13" stroke="url(#goldClaspGrad)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <path d="M13 13 C9 15 5 21 6 28 C7 34 11 36 22.5 36 C34 36 38 34 39 28 C40 21 36 15 32 13 Z"
          fill="url(#purseBodyGrad)" stroke="#ffa4b6" strokeWidth="1.2" />
    <path d="M15 16 C12 21 11 27 12 33" stroke="#ff94a8" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" fill="none" />
    <path d="M30 16 C33 21 34 27 33 33" stroke="#b01246" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" fill="none" />
    <ellipse cx="22.5" cy="22" rx="7" ry="4" fill="#ffffff" opacity="0.25" />
  </svg>
);

// Ícone Azul com Seta Branca para Baixo (Fiel à Imagem de Referência Oficial)
export const CyanArrowDownIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ filter: 'drop-shadow(0 0 10px rgba(0, 180, 255, 0.75))', flexShrink: 0 }}>
    <defs>
      <linearGradient id="blueSquareGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#0284c7" />
      </linearGradient>
    </defs>
    <rect x="5" y="5" width="30" height="30" rx="9" fill="url(#blueSquareGrad)" stroke="#7dd3fc" strokeWidth="1.2" />
    <path d="M20 12 V28 M14 22 L20 28 L26 22" stroke="#ffffff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Ícone do Despertador Vermelho (Fiel à Imagem de Referência Oficial)
export const RedAlarmClockIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ filter: 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.8))', flexShrink: 0 }}>
    <defs>
      <linearGradient id="alarmGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f87171" />
        <stop offset="60%" stopColor="#ef4444" />
        <stop offset="100%" stopColor="#991b1b" />
      </linearGradient>
    </defs>
    <ellipse cx="11" cy="11" rx="4.5" ry="2.6" fill="url(#alarmGrad)" stroke="#fca5a5" strokeWidth="0.8" transform="rotate(-30 11 11)" />
    <ellipse cx="29" cy="11" rx="4.5" ry="2.6" fill="url(#alarmGrad)" stroke="#fca5a5" strokeWidth="0.8" transform="rotate(30 29 11)" />
    <line x1="12" y1="31" x2="8" y2="36" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
    <line x1="28" y1="31" x2="32" y2="36" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
    <circle cx="20" cy="22" r="13" fill="url(#alarmGrad)" stroke="#fca5a5" strokeWidth="1.2" />
    <circle cx="20" cy="22" r="10" fill="#ffffff" />
    <line x1="20" y1="22" x2="20" y2="16" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
    <line x1="20" y1="22" x2="25" y2="22" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="20" cy="22" r="1.6" fill="#ef4444" />
  </svg>
);

// Ícone do Cartão de Crédito Dourado (Fiel à Imagem de Referência Oficial)
export const GoldCreditCardIcon = () => (
  <svg width="42" height="40" viewBox="0 0 42 40" fill="none" style={{ filter: 'drop-shadow(0 0 10px rgba(234, 179, 8, 0.75))', flexShrink: 0 }}>
    <defs>
      <linearGradient id="cardGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fde047" />
        <stop offset="45%" stopColor="#eab308" />
        <stop offset="100%" stopColor="#a16207" />
      </linearGradient>
    </defs>
    <rect x="5" y="10" width="32" height="22" rx="4.5" fill="url(#cardGrad)" stroke="#fef08a" strokeWidth="1.2" />
    <rect x="5" y="15" width="32" height="5" fill="#582e0a" />
    <rect x="9" y="23" width="7" height="5" rx="1.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.8" />
    <line x1="20" y1="25" x2="33" y2="25" stroke="#fef08a" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
    <line x1="20" y1="28" x2="28" y2="28" stroke="#fef08a" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
  </svg>
);

// Ícone de Gráfico de Barras Coloridas (Fiel à Imagem de Referência Oficial)
export const MultiColorBarChartIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ filter: 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.75))', flexShrink: 0 }}>
    <defs>
      <linearGradient id="bar1Grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#0284c7" />
      </linearGradient>
      <linearGradient id="bar2Grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fb923c" />
        <stop offset="100%" stopColor="#ea580c" />
      </linearGradient>
      <linearGradient id="bar3Grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f87171" />
        <stop offset="100%" stopColor="#dc2626" />
      </linearGradient>
    </defs>
    <rect x="8" y="22" width="6.5" height="13" rx="2" fill="url(#bar1Grad)" stroke="#7dd3fc" strokeWidth="0.8" />
    <rect x="17" y="15" width="6.5" height="20" rx="2" fill="url(#bar2Grad)" stroke="#fdba74" strokeWidth="0.8" />
    <rect x="26" y="8" width="6.5" height="27" rx="2" fill="url(#bar3Grad)" stroke="#fca5a5" strokeWidth="0.8" />
  </svg>
);

// Ícone das Moedas Douradas (Fiel à Imagem de Referência Oficial)
export const GoldCoinsItemIcon = () => (
  <svg width="44" height="42" viewBox="0 0 44 42" fill="none" style={{ filter: 'drop-shadow(0 0 12px rgba(253, 224, 71, 0.85))', flexShrink: 0 }}>
    <defs>
      <linearGradient id="goldCoinSide" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ca8a04" />
        <stop offset="100%" stopColor="#713f12" />
      </linearGradient>
      <linearGradient id="goldCoinFace" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="50%" stopColor="#fde047" />
        <stop offset="100%" stopColor="#ca8a04" />
      </linearGradient>
    </defs>
    <ellipse cx="16" cy="30" rx="10" ry="4.5" fill="url(#goldCoinSide)" />
    <ellipse cx="16" cy="28" rx="10" ry="4.5" fill="url(#goldCoinFace)" stroke="#fef08a" strokeWidth="0.8" />
    <ellipse cx="16" cy="23" rx="10" ry="4.5" fill="url(#goldCoinSide)" />
    <ellipse cx="16" cy="21" rx="10" ry="4.5" fill="url(#goldCoinFace)" stroke="#fef08a" strokeWidth="0.8" />
    <ellipse cx="16" cy="16" rx="10" ry="4.5" fill="url(#goldCoinSide)" />
    <ellipse cx="16" cy="14" rx="10" ry="4.5" fill="url(#goldCoinFace)" stroke="#fef08a" strokeWidth="0.8" />
    
    <ellipse cx="27" cy="33" rx="10" ry="4.5" fill="url(#goldCoinSide)" />
    <ellipse cx="27" cy="31" rx="10" ry="4.5" fill="url(#goldCoinFace)" stroke="#fef08a" strokeWidth="0.8" />
    <ellipse cx="27" cy="26" rx="10" ry="4.5" fill="url(#goldCoinSide)" />
    <ellipse cx="27" cy="24" rx="10" ry="4.5" fill="url(#goldCoinFace)" stroke="#fef08a" strokeWidth="0.8" />
    <ellipse cx="27" cy="19" rx="10" ry="4.5" fill="url(#goldCoinSide)" />
    <ellipse cx="27" cy="17" rx="10" ry="4.5" fill="url(#goldCoinFace)" stroke="#fef08a" strokeWidth="0.8" />
    <ellipse cx="27" cy="12" rx="10" ry="4.5" fill="url(#goldCoinSide)" />
    <ellipse cx="27" cy="10" rx="10" ry="4.5" fill="url(#goldCoinFace)" stroke="#fef08a" strokeWidth="0.8" />
  </svg>
);

/* ==========================================================================
   COMPONENTE 1: RESUMO DA TEMPORADA (100% FIEL À REFERÊNCIA)
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
      <div className="rda-season-header-centered">
        <div className="rda-season-header-title-row">
          <BarChartSeasonIcon />
          <span className="rda-season-header-title-text">RESUMO DA TEMPORADA</span>
        </div>
        <span className="rda-season-header-subtitle">DESEMPENHO GERAL DO RACHA</span>
      </div>

      <div className="rda-season-grid">
        {/* 1. Jogadores */}
        <div className="rda-season-box rda-season-box--players">
          <PlayersGroupIcon />
          <span className="rda-season-box-number">{totalPlayers}</span>
          <span className="rda-season-box-label">Jogadores</span>
          <div className="rda-season-box-pills">
            <span className="rda-pill rda-pill--green">
              <Users size={13} color="#00e676" />
              <span>{totalMensalistas} Mensalistas</span>
            </span>
            <span className="rda-pill rda-pill--red">
              <Users size={13} color="#ff3838" />
              <span>{totalDiaristas} Diaristas</span>
            </span>
          </div>
        </div>

        {/* 2. Partidas */}
        <div className="rda-season-box rda-season-box--matches">
          <CalendarSeasonIcon />
          <span className="rda-season-box-number">{totalMatches}</span>
          <span className="rda-season-box-label">Partidas</span>
        </div>

        {/* 3. Gols */}
        <div className="rda-season-box rda-season-box--goals">
          <SoccerBallSeasonIcon />
          <span className="rda-season-box-number">{totalGoals}</span>
          <span className="rda-season-box-label">Gols</span>
        </div>

        {/* 4. Assistências */}
        <div className="rda-season-box rda-season-box--assists">
          <CleatSeasonIcon />
          <span className="rda-season-box-number">{totalAssists}</span>
          <span className="rda-season-box-label">Assistências</span>
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   COMPONENTE 2: FINANCEIRO GERAL (100% FIEL À REFERÊNCIA)
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
      <div className="rda-season-header-centered">
        <div className="rda-season-header-title-row">
          <GoldCoinsHeaderIcon />
          <span className="rda-season-header-title-text">FINANCEIRO GERAL</span>
        </div>
        <span className="rda-season-header-subtitle">CONTROLE DE RECEITAS, DESPESAS E SALDO</span>
      </div>

      <div className="rda-finance-grid">
        {/* Coluna Esquerda */}
        <div className="rda-finance-col">
          {/* Arrecadação Total */}
          <div className="rda-finance-row-item">
            <PinkCoinPurseIcon />
            <div className="rda-finance-row-divider" />
            <div className="rda-finance-row-content">
              <span className="rda-finance-row-label">Arrecadação Total</span>
              <span className="rda-finance-row-val rda-val--green">
                {formatCurrencyBRL(totalRevenue)}
              </span>
            </div>
          </div>

          {/* Recebido no mês */}
          <div className="rda-finance-row-item">
            <CyanArrowDownIcon />
            <div className="rda-finance-row-divider" />
            <div className="rda-finance-row-content">
              <span className="rda-finance-row-label">Recebido no mês</span>
              <span className="rda-finance-row-val rda-val--green">
                {formatCurrencyBRL(monthlyRevenue)}
              </span>
            </div>
          </div>

          {/* Pendências (mês) */}
          <div className="rda-finance-row-item">
            <RedAlarmClockIcon />
            <div className="rda-finance-row-divider" />
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
          {/* Despesas Totais */}
          <div className="rda-finance-row-item">
            <GoldCreditCardIcon />
            <div className="rda-finance-row-divider" />
            <div className="rda-finance-row-content">
              <span className="rda-finance-row-label">Despesas Totais</span>
              <span className="rda-finance-row-val rda-val--red">
                {formatCurrencyBRL(totalExpenses)}
              </span>
            </div>
          </div>

          {/* Despesas (mês) */}
          <div className="rda-finance-row-item">
            <MultiColorBarChartIcon />
            <div className="rda-finance-row-divider" />
            <div className="rda-finance-row-content">
              <span className="rda-finance-row-label">Despesas (mês)</span>
              <span className="rda-finance-row-val rda-val--red">
                {formatCurrencyBRL(monthlyExpenses)}
              </span>
            </div>
          </div>

          {/* Saldo Líquido Acumulado (Destaque Máximo Verde Neon) */}
          <div className="rda-finance-row-item rda-finance-row-item--highlight">
            <GoldCoinsItemIcon />
            <div className="rda-finance-row-divider" />
            <div className="rda-finance-row-content">
              <span className="rda-finance-row-label">Saldo Líquido Acumulado</span>
              <span className="rda-finance-row-val rda-val--green-highlight">
                {formatCurrencyBRL(accumulatedBalance)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   COMPONENTE 3: RESUMO MENSAL (ATUAL)
   ========================================================================== */

export interface ResumoMensalCardProps {
  paidCount: number;
  pendingCount: number;
  diaristsCount: number;
}

export const ResumoMensalCard: React.FC<ResumoMensalCardProps> = ({
  paidCount,
  pendingCount,
  diaristsCount
}) => {
  return (
    <div className="rda-premium-card" data-testid="card-resumo-mensal">
      {/* Decoração superior direita: Bola 3D com feixes de luz neon e reflexos de estádio */}
      <img
        src="/assets/dashboard-premium/header_ball_resumo.png"
        alt="Bola 3D Estádio"
        className="rda-header-ball-img"
        aria-hidden="true"
      />

      {/* Cabeçalho */}
      <div className="rda-premium-card-header">
        <LaurelLeft />
        <CyanCalendarIcon />
        <div className="rda-premium-card-header-titles">
          <h2 className="rda-premium-card-title">RESUMO MENSAL (ATUAL)</h2>
          <span className="rda-premium-card-subtitle">CONTROLE DE MENSALIDADES DO MÊS</span>
        </div>
        <LaurelRight />
      </div>

      {/* Grid com os 3 Indicadores Financeiros em Linha Única */}
      <div className="rda-monthly-grid">
        {/* Indicador 1: Mensalistas Pagos */}
        <div className="rda-monthly-indicator-box rda-monthly-indicator-box--paid">
          <img
            src="/assets/dashboard-premium/coins_green.png"
            alt=""
            className="rda-indicator-coins-img"
            aria-hidden="true"
          />
          <div className="rda-monthly-indicator-top">
            <div className="rda-indicator-icon-circle rda-indicator-icon-circle--paid">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M5 13L9.5 17.5L19 7" stroke="#00e676" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <div className="rda-monthly-indicator-number">{paidCount}</div>
          <div className="rda-monthly-indicator-label">Mensalistas pagos</div>
        </div>

        {/* Indicador 2: Mensalistas Pendentes */}
        <div className="rda-monthly-indicator-box rda-monthly-indicator-box--pending">
          <img
            src="/assets/dashboard-premium/coins_red.png"
            alt=""
            className="rda-indicator-coins-img"
            aria-hidden="true"
          />
          <div className="rda-monthly-indicator-top">
            <div className="rda-indicator-icon-circle rda-indicator-icon-circle--pending">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <line x1="12" y1="7" x2="12" y2="13" stroke="#ff1744" strokeWidth="3.2" strokeLinecap="round"/>
                <circle cx="12" cy="17" r="1.6" fill="#ff1744"/>
              </svg>
            </div>
          </div>
          <div className="rda-monthly-indicator-number">{pendingCount}</div>
          <div className="rda-monthly-indicator-label">Mensalistas pendentes</div>
        </div>

        {/* Indicador 3: Diaristas */}
        <div className="rda-monthly-indicator-box rda-monthly-indicator-box--diarists">
          <img
            src="/assets/dashboard-premium/coins_gold.png"
            alt=""
            className="rda-indicator-coins-img"
            aria-hidden="true"
          />
          <div className="rda-monthly-indicator-top">
            <div className="rda-indicator-icon-diarists">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                <circle cx="9" cy="8" r="4" stroke="#ff9100" strokeWidth="2.4" fill="rgba(255, 145, 0, 0.25)"/>
                <path d="M2 20C2 16.5 5 14 9 14C13 14 16 16.5 16 20" stroke="#ff9100" strokeWidth="2.4" strokeLinecap="round"/>
                <path d="M16 4C17.5 4.5 18.5 6 18.5 7.5C18.5 9 17.5 10.5 16 11" stroke="#ffb74d" strokeWidth="2" strokeLinecap="round"/>
                <path d="M18 14.5C20.5 15.5 22 17.5 22 20" stroke="#ffb74d" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <div className="rda-monthly-indicator-number">{diaristsCount}</div>
          <div className="rda-monthly-indicator-label">Diaristas</div>
          <div className="rda-monthly-indicator-sublabel">(Últ. Partida)</div>
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   COMPONENTE 4: PRÓXIMA PARTIDA
   ========================================================================== */

export interface ProximaPartidaCardProps {
  nextMatch: any;
  onViewMatches: () => void;
}

export const ProximaPartidaCard: React.FC<ProximaPartidaCardProps> = ({
  nextMatch,
  onViewMatches
}) => {
  const locationText = nextMatch?.location
    ? (nextMatch.location.split('|')[0].trim() || 'Arena Ouro Preto')
    : 'Arena a definir';

  const dateText = nextMatch?.match_date
    ? nextMatch.match_date.split('-').reverse().join('/')
    : 'Data a definir';

  const timeText = nextMatch?.match_time
    ? (nextMatch.match_time.slice(0, 5) + 'h')
    : 'Horário a definir';

  const statusLabel = nextMatch
    ? (nextMatch.status === 'finished' ? 'Finalizado' : nextMatch.status === 'in_progress' ? 'Em andamento' : 'Agendado')
    : 'Sem agendamento';

  return (
    <div className="rda-premium-card" data-testid="card-proxima-partida">
      {/* Cabeçalho */}
      <div className="rda-premium-card-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <LaurelLeft />
          <CyanCalendarIcon />
          <div className="rda-premium-card-header-titles">
            <h2 className="rda-premium-card-title">PRÓXIMA PARTIDA</h2>
            <span className="rda-premium-card-subtitle">INFORMAÇÕES DO PRÓXIMO JOGO</span>
          </div>
          <LaurelRight />
        </div>

        {/* Indicador de Status (Cápsula Roxa Neon) */}
        <div className="rda-nextmatch-status-pill">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="5" width="18" height="16" rx="3" stroke="#e9d5ff" strokeWidth="2" fill="none"/>
            <line x1="3" y1="10" x2="21" y2="10" stroke="#e9d5ff" strokeWidth="1.8"/>
            <path d="M8 15L11 18L16 13" stroke="#c084fc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>{statusLabel}</span>
        </div>
      </div>

      {/* Corpo: Linhas de Informações à Esquerda + Estádio Iluminado à Direita */}
      <div className="rda-nextmatch-body">
        {/* Linhas de Informações */}
        <div className="rda-nextmatch-rows">
          <div className="rda-nextmatch-row">
            <div className="rda-nextmatch-icon-circle">
              <MapPin size={18} color="#00e5ff" />
            </div>
            <span className="rda-nextmatch-text">{locationText}</span>
          </div>

          <div className="rda-nextmatch-row">
            <div className="rda-nextmatch-icon-circle">
              <Calendar size={18} color="#00e5ff" />
            </div>
            <span className="rda-nextmatch-text">{dateText}</span>
          </div>

          <div className="rda-nextmatch-row">
            <div className="rda-nextmatch-icon-circle">
              <Clock size={18} color="#00e5ff" />
            </div>
            <span className="rda-nextmatch-text">{timeText}</span>
          </div>
        </div>

        {/* Estádio Noturno com Holofotes, Trave e Bola 3D Fotorealista */}
        <div className="rda-nextmatch-stadium-container">
          <img
            src="/assets/dashboard-premium/stadium_night.png"
            alt="Estádio Iluminado com Bola 3D"
            className="rda-stadium-img"
          />
        </div>
      </div>

      {/* Botão Inferior "Ver Partidas" */}
      <button
        className="rda-nextmatch-btn"
        onClick={onViewMatches}
        type="button"
        data-testid="btn-ver-partidas"
      >
        <div className="rda-nextmatch-btn-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="5" width="18" height="16" rx="3" stroke="#00e5ff" strokeWidth="2.2" fill="rgba(2, 132, 199, 0.3)"/>
            <line x1="3" y1="10" x2="21" y2="10" stroke="#00e5ff" strokeWidth="2"/>
            <rect x="7" y="2" width="2" height="4" rx="1" fill="#ffffff" />
            <rect x="15" y="2" width="2" height="4" rx="1" fill="#ffffff" />
            <circle cx="8" cy="14" r="1.2" fill="#ffffff"/>
            <circle cx="12" cy="14" r="1.2" fill="#ffffff"/>
            <circle cx="16" cy="14" r="1.2" fill="#ffffff"/>
            <circle cx="8" cy="17.5" r="1.2" fill="#ffffff"/>
            <circle cx="12" cy="17.5" r="1.2" fill="#ffffff"/>
            <circle cx="16" cy="17.5" r="1.2" fill="#ffffff"/>
          </svg>
        </div>
        <span className="rda-nextmatch-btn-label">Ver Partidas</span>
        <ArrowRight size={22} color="#ffffff" className="rda-nextmatch-btn-arrow" />
      </button>
    </div>
  );
};

/* ==========================================================================
   COMPONENTE 5: ÚLTIMA PARTIDA (FIDELIDADE 2D)
   ========================================================================== */

export interface UltimaPartidaCardProps {
  lastMatch: any;
  canEdit?: boolean;
  onEdit?: () => void;
  onOpenHistory: () => void;
}

export const UltimaPartidaCard: React.FC<UltimaPartidaCardProps> = ({
  lastMatch,
  canEdit,
  onEdit,
  onOpenHistory
}) => {
  // Parse dos dados reais da última partida
  let realLocation = 'Arena Ouro Preto';
  let detail: any = null;

  if (lastMatch?.location) {
    const locParts = lastMatch.location.split('|');
    realLocation = locParts[0].trim() || 'Arena Ouro Preto';
    if (locParts.length > 1 && locParts[1].startsWith('{')) {
      try {
        const parsed = JSON.parse(locParts[1]);
        if (parsed.isDashboardDetail) detail = parsed;
      } catch (e) {}
    }
  }

  const dateText = lastMatch?.match_date
    ? lastMatch.match_date.split('-').reverse().join('/')
    : '20/11/2026';

  let scoreText = 'Placar: Colete x S/ Colete';
  if (detail) {
    const t1 = detail.finalTeam1 || 'Colete';
    const s1 = detail.finalScore1 !== undefined && detail.finalScore1 !== null ? detail.finalScore1 : '';
    const s2 = detail.finalScore2 !== undefined && detail.finalScore2 !== null ? detail.finalScore2 : '';
    const t2 = detail.finalTeam2 || 'S/ Colete';
    const pen = detail.finalPenalties ? ' (Pên)' : '';
    scoreText = `Placar: ${t1} ${s1} x ${s2} ${t2}${pen}`.trim();
  } else if (lastMatch) {
    const t1 = lastMatch.team_1_name || 'Colete';
    const s1 = lastMatch.team_1_score !== null && lastMatch.team_1_score !== undefined ? lastMatch.team_1_score : '';
    const s2 = lastMatch.team_2_score !== null && lastMatch.team_2_score !== undefined ? lastMatch.team_2_score : '';
    const t2 = lastMatch.team_2_name || 'S/ Colete';
    scoreText = `Placar: ${t1} ${s1} x ${s2} ${t2}`.trim();
  }

  let championText = 'Campeão: N/A';
  if (lastMatch) {
    let champ = 'Empate / N/A';
    if (lastMatch.champion_team === 'team_1') champ = lastMatch.team_1_name || 'Colete';
    else if (lastMatch.champion_team === 'team_2') champ = lastMatch.team_2_name || 'S/ Colete';
    else if (lastMatch.champion_team) champ = lastMatch.champion_team;
    championText = `Campeão: ${champ}`;
  }

  let ralabostaText = 'Ralabosta: N/A';
  if (lastMatch) {
    const ralaVal = lastMatch.team_count === 4 ? lastMatch.fourth_place_team :
                    lastMatch.team_count === 3 ? lastMatch.third_place_team : null;
    let ralaName = 'N/A';
    if (ralaVal === 'team_1') ralaName = lastMatch.team_1_name || 'Colete';
    else if (ralaVal === 'team_2') ralaName = lastMatch.team_2_name || 'S/ Colete';
    else if (ralaVal) ralaName = ralaVal;
    ralabostaText = `Ralabosta: ${ralaName}`;
  }

  return (
    <div className="rda-premium-card rda-lastmatch-card" data-testid="card-ultima-partida">
      {/* Cabeçalho */}
      <div className="rda-lastmatch-header">
        <div className="rda-lastmatch-header-left">
          {/* Ícone de Pulso/Heartbeat Ciano Neon */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="rda-neon-cyan-icon">
            <path d="M2 12H6L9 4L14 20L17 11L19 14H22" stroke="#00e5ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="rda-header-vdivider" />
          <h2 className="rda-lastmatch-title">ÚLTIMA PARTIDA</h2>
        </div>

        {/* Botão de Edição Superior Direito */}
        {canEdit && onEdit && (
          <button
            onClick={onEdit}
            className="rda-lastmatch-edit-btn"
            title="Editar Última Partida"
            type="button"
            data-testid="btn-edit-last-match"
          >
            <Edit size={16} color="#ffffff" />
          </button>
        )}
      </div>

      {/* Corpo: 5 Linhas de Informações à Esquerda + Prancheta Tática 2D à Direita */}
      <div className="rda-lastmatch-body">
        {/* 5 Linhas de Informações */}
        <div className="rda-lastmatch-rows">
          {/* Linha 1: Data */}
          <div className="rda-lastmatch-row">
            <div className="rda-lastmatch-row-icon">
              <CalendarDays size={18} color="#00e5ff" />
            </div>
            <span className="rda-lastmatch-row-text">{dateText}</span>
          </div>

          {/* Linha 2: Local */}
          <div className="rda-lastmatch-row">
            <div className="rda-lastmatch-row-icon">
              <MapPin size={18} color="#00e5ff" />
            </div>
            <span className="rda-lastmatch-row-text">{realLocation}</span>
          </div>

          {/* Linha 3: Placar */}
          <div className="rda-lastmatch-row">
            <div className="rda-lastmatch-row-icon">
              <Award size={18} color="#00e5ff" />
            </div>
            <span className="rda-lastmatch-row-text">{scoreText}</span>
          </div>

          {/* Linha 4: Campeão */}
          <div className="rda-lastmatch-row">
            <div className="rda-lastmatch-row-icon">
              <Users size={18} color="#00e5ff" />
            </div>
            <span className="rda-lastmatch-row-text">{championText}</span>
          </div>

          {/* Linha 5: Ralabosta */}
          <div className="rda-lastmatch-row">
            <div className="rda-lastmatch-row-icon">
              <Users size={18} color="#00e5ff" />
            </div>
            <span className="rda-lastmatch-row-text">{ralabostaText}</span>
          </div>
        </div>

        {/* Prancheta Tática 2D */}
        <div className="rda-lastmatch-tactic-col">
          <TacticalClipboard2D />
        </div>
      </div>

      {/* Botão Inferior "Abrir Histórico" */}
      <button
        className="rda-lastmatch-history-btn"
        onClick={onOpenHistory}
        type="button"
        data-testid="btn-abrir-historico"
      >
        Abrir Histórico
      </button>
    </div>
  );
};

/* ==========================================================================
   COMPONENTE 6: ANIVERSARIANTES DO MÊS (FIDELIDADE 2D)
   ========================================================================== */

export interface BirthdayPlayer {
  name: string;
  age: number;
  date: string;
  photo?: string;
}

export interface AniversariantesCardProps {
  birthdays: BirthdayPlayer[];
}

export const AniversariantesCard: React.FC<AniversariantesCardProps> = ({
  birthdays
}) => {
  return (
    <div className="rda-premium-card rda-birthdays-card" data-testid="card-aniversariantes">
      {/* Cabeçalho */}
      <div className="rda-birthdays-header">
        <div className="rda-birthdays-header-left">
          {/* Ícone de Medalha/Award Ciano com Estrela */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="rda-neon-cyan-icon">
            <circle cx="12" cy="8" r="6" stroke="#00e5ff" strokeWidth="2.2" />
            <path d="M12 5L13 7.2L15.5 7.4L13.6 9L14.2 11.4L12 10.1L9.8 11.4L10.4 9L8.5 7.4L11 7.2L12 5Z" fill="#00e5ff" />
            <path d="M8.2 13L7 21L12 18L17 21L15.8 13" stroke="#00e5ff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="rda-header-vdivider" />
          <h2 className="rda-birthdays-title">ANIVERSARIANTES DO MÊS</h2>
        </div>
      </div>

      {/* Corpo: Lista de Aniversariantes à Esquerda + Bolo 2D à Direita */}
      <div className="rda-birthdays-body">
        {/* Lista de Aniversariantes (até 3 jogadores) */}
        <div className="rda-birthdays-items">
          {birthdays && birthdays.length > 0 ? (
            birthdays.slice(0, 3).map((player, idx) => (
              <div key={idx} className="rda-birthday-row">
                {/* Avatar circular com contorno ciano luminoso */}
                <div className="rda-birthday-avatar-wrap">
                  {player.photo ? (
                    <img
                      src={player.photo}
                      alt={player.name}
                      className="rda-birthday-avatar-img"
                      loading="lazy"
                    />
                  ) : (
                    <div className="rda-birthday-avatar-placeholder">
                      <User size={20} color="#00e5ff" />
                    </div>
                  )}
                </div>

                {/* Nome e Idade/Data */}
                <div className="rda-birthday-info">
                  <span className="rda-birthday-name">{player.name}</span>
                  <span className="rda-birthday-desc">
                    Fará {player.age} anos · {player.date}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="rda-birthdays-empty">
              Nenhum aniversariante neste mês.
            </div>
          )}
        </div>

        {/* Bolo de Aniversário 2D */}
        <div className="rda-birthdays-cake-col">
          <BirthdayCake2D />
        </div>
      </div>
    </div>
  );
};

export const TacticalClipboard2D: React.FC = () => (
  <svg
    viewBox="0 0 110 130"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="rda-tactical-clipboard-svg"
    style={{ width: "100%", maxWidth: "120px", height: "auto", filter: "drop-shadow(0 0 10px rgba(0, 229, 255, 0.75)" }}
    aria-label="Prancheta Tática 2D"
  >
    <defs>
      <linearGradient id="clipboardBgGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#051c38" />
        <stop offset="100%" stopColor="#020a16" />
      </linearGradient>
    </defs>
    <path d="M44 8C44 5.8 45.8 4 48 4H62C64.2 4 66 5.8 66 8V12H44V8Z" fill="#03162e" stroke="#00e5ff" strokeWidth="2.2" />
    <circle cx="55" cy="8" r="2.5" fill="#00e5ff" />
    <rect x="12" y="12" width="86" height="112" rx="12" fill="url(#clipboardBgGrad)" stroke="#00e5ff" strokeWidth="2.4" />
    <rect x="20" y="22" width="70" height="92" rx="6" stroke="#00e5ff" strokeWidth="1.6" strokeOpacity="0.85" />
    <rect x="35" y="22" width="40" height="16" stroke="#00e5ff" strokeWidth="1.4" strokeOpacity="0.85" />
    <rect x="43" y="22" width="24" height="6" stroke="#00e5ff" strokeWidth="1.4" strokeOpacity="0.85" />
    <path d="M47 38C49 40 61 40 63 38" stroke="#00e5ff" strokeWidth="1.4" strokeOpacity="0.85" fill="none" />
    <line x1="20" y1="68" x2="90" y2="68" stroke="#00e5ff" strokeWidth="1.6" strokeOpacity="0.85" />
    <circle cx="55" cy="68" r="11" stroke="#00e5ff" strokeWidth="1.6" strokeOpacity="0.85" fill="none" />
    <circle cx="55" cy="68" r="1.5" fill="#00e5ff" />
    <rect x="35" y="98" width="40" height="16" stroke="#00e5ff" strokeWidth="1.4" strokeOpacity="0.85" />
    <rect x="43" y="108" width="24" height="6" stroke="#00e5ff" strokeWidth="1.4" strokeOpacity="0.85" />
    <path d="M30 46L36 52M36 46L30 52" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M74 46L80 52M80 46L74 52" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M50 96C58 96 68 90 72 78" stroke="#00e5ff" strokeWidth="2.4" strokeLinecap="round" fill="none" strokeDasharray="3 3" />
    <path d="M66 76L73 77L74 84" stroke="#00e5ff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

export const BirthdayCake2D: React.FC = () => (
  <svg
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="rda-birthday-cake-svg"
    style={{ width: "100%", maxWidth: "125px", height: "auto", filter: "drop-shadow(0 0 10px rgba(0, 229, 255, 0.75)" }}
    aria-label="Bolo de Aniversário 2D"
  >
    <rect x="12" y="94" width="96" height="6" rx="3" fill="#00e5ff" style={{ filter: "drop-shadow(0 0 6px #00e5ff)" }} />
    <path d="M18 94V68C18 64 21 61 25 61H95C99 61 102 64 102 68V94H18Z" fill="#03162e" stroke="#00e5ff" strokeWidth="2.5" />
    <path d="M18 72C22 76 28 76 32 72C36 68 42 68 46 72C50 76 56 76 60 72C64 68 70 68 74 72C78 76 84 76 88 72C92 68 98 68 102 72" stroke="#00e5ff" strokeWidth="2.8" strokeLinecap="round" fill="none" />
    <rect x="36" y="44" width="7" height="17" rx="2" fill="#03162e" stroke="#00e5ff" strokeWidth="2" />
    <line x1="37" y1="48" x2="42" y2="48" stroke="#00e5ff" strokeWidth="1.5" />
    <line x1="37" y1="53" x2="42" y2="53" stroke="#00e5ff" strokeWidth="1.5" />
    <rect x="56.5" y="42" width="7" height="19" rx="2" fill="#03162e" stroke="#00e5ff" strokeWidth="2" />
    <line x1="57.5" y1="47" x2="62.5" y2="47" stroke="#00e5ff" strokeWidth="1.5" />
    <line x1="57.5" y1="52" x2="62.5" y2="52" stroke="#00e5ff" strokeWidth="1.5" />
    <rect x="77" y="44" width="7" height="17" rx="2" fill="#03162e" stroke="#00e5ff" strokeWidth="2" />
    <line x1="78" y1="48" x2="83" y2="48" stroke="#00e5ff" strokeWidth="1.5" />
    <line x1="78" y1="53" x2="83" y2="53" stroke="#00e5ff" strokeWidth="1.5" />
    <line x1="16" y1="46" x2="24" y2="52" stroke="#00e5ff" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="22" y1="36" x2="28" y2="40" stroke="#00e5ff" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="96" y1="40" x2="102" y2="36" stroke="#00e5ff" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="100" y1="52" x2="108" y2="46" stroke="#00e5ff" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);