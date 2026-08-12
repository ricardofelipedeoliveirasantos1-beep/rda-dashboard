const fs = require('fs');

const cardsText = fs.readFileSync('c:\\Users\\WINDOWS-11\\.gemini\\antigravity\\brain\\8a0dcc51-d4f9-4661-849e-a2e47ea5babc\\scratch\\cards.txt', 'utf8');
const c1 = cardsText.split('[C1]')[1].split('[/C1]')[0].trim();
const c2 = cardsText.split('[C2]')[1].split('[/C2]')[0].trim();
let c3 = cardsText.split('[C3]')[1].split('[/C3]')[0].trim();
const c4 = cardsText.split('[C4]')[1].split('[/C4]')[0].trim();
let c5 = cardsText.split('[C5]')[1].split('[/C5]')[0].trim();
let c6 = cardsText.split('[C6]')[1].split('[/C6]')[0].trim();
const c7 = cardsText.split('[C7]')[1].split('[/C7]')[0].trim();
let c8 = cardsText.split('[C8]')[1].split('[/C8]')[0].trim();
const c9 = cardsText.split('[C9]')[1].split('[/C9]')[0].trim();

const fixExtraClose = (c) => {
  if (c.endsWith('</div>')) {
    return c.substring(0, c.lastIndexOf('</div>')).trim();
  }
  return c;
};

c3 = fixExtraClose(c3).replace('<div className="dashboard-card">', '<div className="dashboard-card" style={{ display: "flex", flexDirection: "column" }}>');
c5 = fixExtraClose(c5);
c6 = fixExtraClose(c6).replace('<div className="dashboard-card">', '<div className="dashboard-card" style={{ display: "flex", flexDirection: "column" }}>');
c8 = fixExtraClose(c8);

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
  
                          if (diffDays > 0) return \`Expira em \${diffDays} \${diffDays === 1 ? 'dia' : 'dias'}\`;
                          if (diffHours > 0) return \`Expira em \${diffHours}h \${diffMins % 60}min\`;
                          return \`Expira em \${diffMins}min\`;
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
            ) : dashboardError ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#ef4444' }}>
                <AlertCircle size={32} style={{ margin: '0 auto 8px auto' }} />
                <p>{dashboardError}</p>
              </div>
            ) : (
              <>
                ${c1}

                ${c10_correct}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                  ${c2}
                  ${c8}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                  ${c3}
                  ${c6}
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
        ) : activeTab === 'jogadores' ? (
`;

const file = 'c:\\Users\\WINDOWS-11\\.gemini\\antigravity\\brain\\8a0dcc51-d4f9-4661-849e-a2e47ea5babc\\scratch\\App_temp.txt';
let lines = fs.readFileSync(file, 'utf8').split('\n');

let startIdx = lines.findIndex(l => l.includes(') : dashboardError ? ('));
let endIdx = lines.findIndex(l => l.includes(") : activeTab === 'jogadores' ? ("));

if (startIdx !== -1 && endIdx !== -1) {
    let newLines = [];
    for (let i = 0; i < startIdx; i++) newLines.push(lines[i]);
    newLines.push(newLayout);
    for (let i = endIdx + 1; i < lines.length; i++) newLines.push(lines[i]);

    // Append export default App if missing
    if (!newLines[newLines.length - 1].includes('export default App;')) {
        newLines.push('');
        newLines.push('export default App;');
    }
    
    fs.writeFileSync('c:\\Users\\WINDOWS-11\\OneDrive\\Documentos\\FutCRM-01\\FutCRM- Six\\src\\App.tsx', newLines.join('\n'));
    console.log('Successfully rebuilt App.tsx');
} else {
    console.log('Error: Could not find markers in App_temp.txt');
}
