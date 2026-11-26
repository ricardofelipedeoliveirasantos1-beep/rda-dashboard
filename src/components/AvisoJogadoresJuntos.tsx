import React from 'react';
import { Users, Info, CheckCircle } from 'lucide-react';
import {
  getAllTeamsRepeatedPairs,
  type TeamRepeatedPairsReport,
  type DrawPlayer
} from '../services/sorteioService';

interface AvisoJogadoresJuntosProps {
  teamMap: Record<string, DrawPlayer[]>;
  activeTeams: string[];
  lastTeamMap: Map<string, string>;
  champTeamStr: string | null;
  hasFinishedMatchHistory: boolean;
  isDrawnOrPopulated: boolean;
}

// Escudos vetoriais SVG estilizados e oficiais dos times para o topo do card
export const TeamShield: React.FC<{ team: string }> = ({ team }) => {
  const normalized = team.toLowerCase();

  if (normalized === 'brasil') {
    return (
      <svg
        data-testid="shield-brasil"
        aria-label="Brasil"
        width="44"
        height="50"
        viewBox="0 0 46 52"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          flexShrink: 0,
          filter: 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.45)) drop-shadow(0 2px 4px rgba(0,0,0,0.8))'
        }}
      >
        {/* 5 Estrelas no topo em arco */}
        <polygon points="11,7 11.8,5 12.6,7 10.5,5.8 13.1,5.8" fill="#22c55e" stroke="#15803d" strokeWidth="0.4" />
        <polygon points="17,5 17.8,3 18.6,5 16.5,3.8 19.1,3.8" fill="#22c55e" stroke="#15803d" strokeWidth="0.4" />
        <polygon points="23,4 23.8,2 24.6,4 22.5,2.8 25.1,2.8" fill="#ffdf00" stroke="#ca8a04" strokeWidth="0.4" />
        <polygon points="29,5 29.8,3 30.6,5 28.5,3.8 31.1,3.8" fill="#22c55e" stroke="#15803d" strokeWidth="0.4" />
        <polygon points="35,7 35.8,5 36.6,7 34.5,5.8 37.1,5.8" fill="#22c55e" stroke="#15803d" strokeWidth="0.4" />

        {/* Contorno do Escudo / Brasão */}
        <path d="M7 11C7 11 23 8 23 8C23 8 39 11 39 11C39 31 23 48 23 48C23 48 7 31 7 11Z" fill="#002776" stroke="#38bdf8" strokeWidth="1.8" />
        {/* Borda interna dourada */}
        <path d="M9.5 13C9.5 13 23 10.5 23 10.5C23 10.5 36.5 13 36.5 13C36.5 29.5 23 44.5 23 44.5C23 44.5 9.5 29.5 9.5 13Z" stroke="#ffdf00" strokeWidth="1.2" fill="#002776" />
        {/* Faixa central amarela e verde */}
        <rect x="20" y="11" width="6" height="34" fill="#ffdf00" />
        <rect x="21.5" y="11" width="3" height="34" fill="#009b3a" />
        {/* Cruz CBF branca estilizada no centro */}
        <path d="M16 23.5H30M23 16.5V30.5" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="square" />
        <rect x="18" y="21" width="10" height="6" rx="1.2" fill="#ffffff" />
        <text x="23" y="25.8" textAnchor="middle" fill="#002776" fontSize="5.2" fontWeight="900" fontFamily="sans-serif" letterSpacing="0.4">CBF</text>
      </svg>
    );
  }

  if (normalized === 'uruguai') {
    return (
      <svg
        data-testid="shield-uruguai"
        aria-label="Uruguai"
        width="44"
        height="50"
        viewBox="0 0 46 52"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          flexShrink: 0,
          filter: 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.45)) drop-shadow(0 2px 4px rgba(0,0,0,0.8))'
        }}
      >
        {/* 4 Estrelas Douradas no topo */}
        <polygon points="12,6 12.7,4.2 13.4,6 11.5,4.9 13.9,4.9" fill="#ffdf00" stroke="#ca8a04" strokeWidth="0.4" />
        <polygon points="19,5 19.7,3.2 20.4,5 18.5,3.9 20.9,3.9" fill="#ffdf00" stroke="#ca8a04" strokeWidth="0.4" />
        <polygon points="27,5 27.7,3.2 28.4,5 26.5,3.9 28.9,3.9" fill="#ffdf00" stroke="#ca8a04" strokeWidth="0.4" />
        <polygon points="34,6 34.7,4.2 35.4,6 33.5,4.9 35.9,4.9" fill="#ffdf00" stroke="#ca8a04" strokeWidth="0.4" />

        {/* Contorno do Escudo AUF */}
        <path d="M7 10C7 10 23 9 23 9C23 9 39 10 39 10C39 31 23 48 23 48C23 48 7 31 7 10Z" fill="#ffffff" stroke="#38bdf8" strokeWidth="1.8" />
        {/* Borda interna azul */}
        <path d="M9.5 12C9.5 12 23 11 23 11C23 11 36.5 12 36.5 12C36.5 29.5 23 44.5 23 44.5C23 44.5 9.5 29.5 9.5 12Z" stroke="#0038a8" strokeWidth="1.2" fill="#ffffff" />
        {/* Listras Celestes verticais */}
        <rect x="13.5" y="12" width="3.8" height="27" fill="#5bc2e7" />
        <rect x="21.1" y="11.5" width="3.8" height="32" fill="#5bc2e7" />
        <rect x="28.7" y="12" width="3.8" height="27" fill="#5bc2e7" />
        {/* Faixa central preta com letras AUF douradas */}
        <rect x="12" y="21" width="22" height="7.5" rx="1.5" fill="#000000" stroke="#ffdf00" strokeWidth="0.7" />
        <text x="23" y="26.8" textAnchor="middle" fill="#ffdf00" fontSize="5.2" fontWeight="900" fontFamily="sans-serif" letterSpacing="0.8">AUF</text>
      </svg>
    );
  }

  if (normalized === 'portugal') {
    return (
      <svg
        data-testid="shield-portugal"
        aria-label="Portugal"
        width="44"
        height="50"
        viewBox="0 0 46 52"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          flexShrink: 0,
          filter: 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.45)) drop-shadow(0 2px 4px rgba(0,0,0,0.8))'
        }}
      >
        {/* Contorno do Escudo Português */}
        <path d="M7 9C7 9 23 9 23 9C23 9 39 9 39 9C39 31 23 48 23 48C23 48 7 31 7 9Z" fill="#006600" stroke="#38bdf8" strokeWidth="1.8" />
        {/* Metade Direita Vermelha */}
        <path d="M23 9H39C39 31 23 48 23 48V9Z" fill="#cc0000" />
        {/* Borda interna dourada */}
        <path d="M9.5 11.5H36.5C36.5 29.5 23 44.5 23 44.5C23 44.5 9.5 29.5 9.5 11.5Z" stroke="#ffdf00" strokeWidth="1.2" fill="none" />
        {/* Esfera armilar dourada */}
        <circle cx="23" cy="24" r="8.5" fill="#ffdf00" stroke="#b28900" strokeWidth="0.8" />
        <circle cx="23" cy="24" r="6" fill="none" stroke="#002776" strokeWidth="0.8" />
        <path d="M14.5 24H31.5M23 15.5V32.5M17 18L29 30M17 30L29 18" stroke="#b28900" strokeWidth="0.6" />
        {/* Escudo branco com quinas azuis */}
        <path d="M19.5 20H26.5C26.5 26.5 23 29.5 23 29.5C23 29.5 19.5 26.5 19.5 20Z" fill="#ffffff" stroke="#c00000" strokeWidth="0.8" />
        <circle cx="23" cy="23.5" r="0.9" fill="#002776" />
        <circle cx="21.2" cy="23.5" r="0.7" fill="#002776" />
        <circle cx="24.8" cy="23.5" r="0.7" fill="#002776" />
        <circle cx="23" cy="21.8" r="0.7" fill="#002776" />
        <circle cx="23" cy="25.2" r="0.7" fill="#002776" />
      </svg>
    );
  }

  if (normalized === 'japao') {
    return (
      <svg
        data-testid="shield-japao"
        aria-label="Japão"
        width="44"
        height="50"
        viewBox="0 0 46 52"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          flexShrink: 0,
          filter: 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.45)) drop-shadow(0 2px 4px rgba(0,0,0,0.8))'
        }}
      >
        {/* Contorno do Escudo JFA */}
        <path d="M7 10C7 10 23 9 23 9C23 9 39 10 39 10C39 31 23 48 23 48C23 48 7 31 7 10Z" fill="#001838" stroke="#38bdf8" strokeWidth="1.8" />
        {/* Borda interna dourada e fundo branco */}
        <path d="M9.5 12C9.5 12 23 11 23 11C23 11 36.5 12 36.5 12C36.5 29.5 23 44.5 23 44.5C23 44.5 9.5 29.5 9.5 12Z" stroke="#ffdf00" strokeWidth="1.2" fill="#ffffff" />
        {/* Topo Azul Marinho com JFA */}
        <path d="M10 12.5H36V22H10Z" fill="#001838" />
        <text x="23" y="19" textAnchor="middle" fill="#ffffff" fontSize="6.2" fontWeight="900" fontFamily="sans-serif" letterSpacing="0.8">JFA</text>
        {/* Círculo do Sol Vermelho e Faixa */}
        <circle cx="23" cy="30" r="7" fill="#bc002d" />
        <rect x="22" y="22" width="2" height="17" fill="#bc002d" />
      </svg>
    );
  }

  // Fallback
  return (
    <svg
      data-testid={`shield-${normalized}`}
      aria-label={team}
      width="44"
      height="50"
      viewBox="0 0 46 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        flexShrink: 0,
        filter: 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.45)) drop-shadow(0 2px 4px rgba(0,0,0,0.8))'
      }}
    >
      <path d="M7 10C7 10 23 9 23 9C23 9 39 10 39 10C39 31 23 48 23 48C23 48 7 31 7 10Z" fill="#050e1d" stroke="#38bdf8" strokeWidth="1.8" />
      <circle cx="23" cy="27" r="8" fill="#0284c7" />
    </svg>
  );
};

// Mantém TeamFlag como alias para compatibilidade com quaisquer testes ou referências anteriores
export const TeamFlag = TeamShield;

export const AvisoJogadoresJuntos: React.FC<AvisoJogadoresJuntosProps> = ({
  teamMap,
  activeTeams,
  lastTeamMap,
  champTeamStr,
  hasFinishedMatchHistory,
  isDrawnOrPopulated
}) => {
  // Se os times estiverem limpos ou vazios, não exibe o relatório
  if (!isDrawnOrPopulated) {
    return null;
  }

  // Se não existir histórico anterior de partida finalizada
  if (!hasFinishedMatchHistory || lastTeamMap.size === 0) {
    return (
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          borderRadius: '16px',
          backgroundColor: '#070e1c',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          boxShadow: '0 0 14px rgba(56, 189, 248, 0.08)',
          color: '#94a3b8',
          fontSize: '0.88rem',
          fontWeight: 500,
          marginTop: '4px'
        }}
      >
        <Info size={18} style={{ color: '#38bdf8', flexShrink: 0 }} />
        <span>Ainda não existe uma partida finalizada para comparação de companheiros.</span>
      </div>
    );
  }

  // Calcula dinamicamente as duplas repetidas de todas as equipes (excluindo o time campeão que permaneceu intacto)
  const reports: TeamRepeatedPairsReport[] = getAllTeamsRepeatedPairs(
    teamMap,
    activeTeams,
    lastTeamMap,
    champTeamStr
  );

  return (
    <div 
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginTop: '6px'
      }}
    >
      {/* Cabeçalho fiel à identidade visual do RDA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '2px' }}>
        <Users size={22} style={{ color: '#38bdf8', flexShrink: 0 }} />
        <div style={{ width: '1.5px', height: '16px', backgroundColor: 'rgba(56, 189, 248, 0.65)' }} />
        <h3 
          style={{ 
            fontSize: '1.15rem', 
            fontWeight: 800, 
            color: '#ffffff', 
            letterSpacing: '-0.2px',
            margin: 0
          }}
        >
          Jogadores que voltaram a jogar juntos
        </h3>
      </div>

      {/* Conteúdo: Lista de Equipes ou Mensagem de Nenhuma Repetição */}
      {reports.length === 0 ? (
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            borderRadius: '16px',
            backgroundColor: '#070e1c',
            border: '1px solid rgba(34, 197, 94, 0.4)',
            boxShadow: '0 0 14px rgba(34, 197, 94, 0.1)',
            color: '#4ade80',
            fontSize: '0.88rem',
            fontWeight: 600
          }}
        >
          <CheckCircle size={18} style={{ color: '#22c55e', flexShrink: 0 }} />
          <span>Nenhum jogador voltou a jogar junto com seus antigos companheiros!</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {reports.map((report) => {
            const isSinglePair = report.pairs.length === 1;

            return (
              <div 
                key={report.teamName}
                data-testid={`team-card-${report.teamName}`}
                style={{
                  position: 'relative',
                  marginTop: '18px', // Espaço superior para acomodar o escudo sobreposto à borda
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '24px 12px 10px 12px', // Altura ultra-compacta, sem espaço vazio acima do escudo
                  borderRadius: '18px',
                  backgroundColor: '#040d1a',
                  border: '1px solid rgba(56, 189, 248, 0.55)',
                  boxShadow: '0 0 14px rgba(56, 189, 248, 0.12), inset 0 0 12px rgba(56, 189, 248, 0.02)',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              >
                {/* Linhas brilhantes superiores que continuam dos dois lados do escudo */}
                <div 
                  style={{
                    position: 'absolute',
                    top: '-1px',
                    left: '18px',
                    right: 'calc(50% + 24px)',
                    height: '2px',
                    background: 'linear-gradient(to right, rgba(56, 189, 248, 0.2), #38bdf8 80%, #ffffff 100%)',
                    boxShadow: '0 0 8px #38bdf8',
                    pointerEvents: 'none'
                  }} 
                />
                <div 
                  style={{
                    position: 'absolute',
                    top: '-1px',
                    left: 'calc(50% + 24px)',
                    right: '18px',
                    height: '2px',
                    background: 'linear-gradient(to left, rgba(56, 189, 248, 0.2), #38bdf8 80%, #ffffff 100%)',
                    boxShadow: '0 0 8px #38bdf8',
                    pointerEvents: 'none'
                  }} 
                />

                {/* Escudo centralizado horizontalmente e parcialmente sobreposto à borda superior */}
                <div 
                  style={{
                    position: 'absolute',
                    top: '-24px', // Metade ultrapassa a borda superior exatamente como na referência visual
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2,
                    backgroundColor: '#040d1a', // Interrompe a borda na região central do escudo
                    padding: '0 4px',
                    borderRadius: '8px'
                  }}
                >
                  <TeamShield team={report.teamName} />
                </div>

                {/* Cards das Duplas Repetidas */}
                {isSinglePair ? (
                  /* 1 Dupla: Card único centralizado horizontalmente */
                  <div 
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      width: '100%'
                    }}
                  >
                    <div 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '7px 16px',
                        borderRadius: '9999px',
                        backgroundColor: 'rgba(14, 165, 233, 0.08)',
                        border: '1px solid rgba(56, 189, 248, 0.55)',
                        boxShadow: '0 0 10px rgba(56, 189, 248, 0.08)',
                        width: 'min(100%, 360px)',
                        boxSizing: 'border-box'
                      }}
                    >
                      <Users size={16} style={{ color: '#38bdf8', flexShrink: 0 }} />
                      <span 
                        style={{
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {report.pairs[0].player1.name} + {report.pairs[0].player2.name}
                      </span>
                    </div>
                  </div>
                ) : (
                  /* 2 ou mais Duplas: 2 colunas com 50% de largura cada, alinhamento simétrico e mesma altura */
                  <div 
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                      gap: '10px',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  >
                    {report.pairs.map((pair, idx) => (
                      <div 
                        key={`${pair.player1.id}-${pair.player2.id}-${idx}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          padding: '7px 14px',
                          borderRadius: '9999px',
                          backgroundColor: 'rgba(14, 165, 233, 0.08)',
                          border: '1px solid rgba(56, 189, 248, 0.55)',
                          boxShadow: '0 0 10px rgba(56, 189, 248, 0.08)',
                          minWidth: 0,
                          boxSizing: 'border-box'
                        }}
                      >
                        <Users size={16} style={{ color: '#38bdf8', flexShrink: 0 }} />
                        <span 
                          style={{
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {pair.player1.name} + {pair.player2.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
