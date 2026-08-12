const fs = require('fs');
const file = 'src/App.tsx';
let text = fs.readFileSync(file, 'utf8');

const cardsText = fs.readFileSync('c:\\Users\\WINDOWS-11\\.gemini\\antigravity\\brain\\8a0dcc51-d4f9-4661-849e-a2e47ea5babc\\scratch\\cards.txt', 'utf8');
const cards = cardsText.split(/\\[C\\d+\\]/).map(c => c.split(/\\[\\/C\\d+\\]/)[0].trim()).filter(Boolean);

const fixExtraClose = (c) => {
  if (c.endsWith('</div>')) {
    return c.substring(0, c.lastIndexOf('</div>')).trim();
  }
  return c;
};

const c1 = cards[0];
const c2 = cards[1];
const c3 = fixExtraClose(cards[2]);
const c4 = cards[3];
const c5 = fixExtraClose(cards[4]);
const c6 = fixExtraClose(cards[5]);
const c7 = cards[6];
const c8 = fixExtraClose(cards[7]);
const c9 = cards[8];

const c3_flex = c3.replace('<div className="dashboard-card">', '<div className="dashboard-card" style={{ display: "flex", flexDirection: "column" }}>');
const c6_flex = c6.replace('<div className="dashboard-card">', '<div className="dashboard-card" style={{ display: "flex", flexDirection: "column" }}>');

const c10_correct = `
                {dashboardNotices.length > 0 && (
                  <div className="dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="card-header">
                      <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle size={18} /> Quadro de Avisos
                      </span>
                    </div>
                    <div className="notices-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {(() => {
                        const importanceWeight: Record<string, number> = { urgent: 1, important: 2, attention: 3, normal: 4 };
                        const sorted = [...dashboardNotices].sort((a, b) => {
                          const weightA = importanceWeight[a.importance] || 4;
                          const weightB = importanceWeight[b.importance] || 4;
                          if (weightA !== weightB) return weightA - weightB;
                          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                        });
                        const top5 = sorted.slice(0, 5);
  
                        if (top5.length === 0) {
                          return (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '16px' }}>
                              Nenhum aviso ativo.
                            </div>
                          );
                        }
  
                        const getRemainingText = (expiresAtStr: string): string => {
                          const now = new Date();
                          const expiresAt = new Date(expiresAtStr);
                          const diffMs = expiresAt.getTime() - now.getTime();
                          if (diffMs <= 0) return 'Expirado';
  
                          const diffMins = Math.floor(diffMs / 60000);
                          const diffHours = Math.floor(diffMins / 60);
                          const diffDays = Math.floor(diffHours / 24);
  
                          if (diffDays > 0) return \\\`Expira em \\\${diffDays} \\\${diffDays === 1 ? 'dia' : 'dias'}\\\`;
                          if (diffHours > 0) return \\\`Expira em \\\${diffHours}h \\\${diffMins % 60}min\\\`;
                          return \\\`Expira em \\\${diffMins}min\\\`;
                        };
  
                        const getImportanceConfig = (imp: string) => {
                          if (imp === 'urgent') return { label: 'URGENTE', color: '#ef4444', border: '1.5px solid rgba(239,68,68,0.3)' };
                          if (imp === 'important') return { label: 'IMPORTANTE', color: '#f97316', border: '1px solid rgba(249,115,22,0.2)' };
                          if (imp === 'attention') return { label: 'ATENÇÃO', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' };
                          return { label: 'NORMAL', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.2)' };
                        };
  
                        return (
                          <>
                            {top5.map((aviso) => {
                              const conf = getImportanceConfig(aviso.importance);
                              const isUrgent = aviso.importance === 'urgent';
                              return (
                                <div 
                                  key={aviso.id}
                                  className={isUrgent ? 'card-urgent-animated' : ''}
                                  style={{
                                    padding: '10px 12px',
                                    backgroundColor: 'rgba(255,255,255,0.015)',
                                    border: isUrgent ? '2px solid transparent' : conf.border,
                                    borderRadius: '10px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                    position: 'relative'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{
                                      fontSize: '0.58rem',
                                      fontWeight: 850,
                                      color: conf.color,
                                      letterSpacing: '0.2px'
                                    }}>
                                      {conf.label}
                                    </span>
                                    {isUrgent && (
                                      <div className="siren-animated" style={{ color: '#ef4444', display: 'flex', alignItems: 'center' }}>
                                        <Siren size={14} />
                                      </div>
                                    )}
                                  </div>
                                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#ffffff' }}>
                                    {aviso.title}
                                  </span>
                                  <p style={{
                                    fontSize: '0.78rem',
                                    color: 'var(--text-secondary)',
                                    margin: 0,
                                    lineHeight: '1.35',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}>
                                    {aviso.message}
                                  </p>
                                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '4px', marginTop: '2px' }}>
                                    <span style={{ color: isUrgent ? '#ef4444' : '#fbbf24', fontWeight: 600 }}>
                                      {getRemainingText(aviso.expires_at)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                            {dashboardNotices.length > 5 && (
                              <button
                                onClick={() => setActiveTab('avisos')}
                                style={{
                                  alignSelf: 'center',
                                  background: 'none',
                                  border: 'none',
                                  color: '#818cf8',
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  padding: '4px 8px',
                                  marginTop: '2px',
                                  transition: 'var(--transition)'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#a5b4fc'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#818cf8'}
                              >
                                Ver todos
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
`.trim();

const newLayout = `
              <>
                ${c1}

                ${c10_correct}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                  ${c2}
                  ${c8}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                  ${c3_flex}
                  ${c6_flex}
                </div>

                ${c9}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                  ${c4}
                  ${c5}
                </div>

                ${c7}
              </>
            )}
          </>
`;

const blockStartStr = "            ) : (\\r\\n              <>";
const blockEndStr = "        ) : activeTab === 'jogadores' ? (";

let startIdx = text.indexOf(blockStartStr);
if (startIdx === -1) {
    startIdx = text.indexOf("            ) : (\\n              <>");
}
let endIdx = text.indexOf(blockEndStr);

if (startIdx !== -1 && endIdx !== -1) {
    console.log('Found blocks!');
    const before = text.substring(0, startIdx + 17); // up to the start of "              <>"
    const after = text.substring(endIdx);
    fs.writeFileSync(file, before + "\\n" + newLayout + "\\n" + after);
    console.log('Wrote file.');
} else {
    console.log('Could not find boundaries.', startIdx, endIdx);
}
