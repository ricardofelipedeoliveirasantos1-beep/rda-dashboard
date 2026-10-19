const fs = require('fs');
let content = fs.readFileSync('src/components/Partidas.tsx', 'utf8');

const targetStr = `{isDiarista ? (
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontStyle: 'italic', fontWeight: 500, backgroundColor: 'rgba(255,255,255,0.03)', padding: '2px 8px', borderRadius: '6px' }}>
                                  Diarista — não contabiliza estatísticas
                                </span>
                              ) : (`.replace(/\r/g, '');

const replacement = `{isDiarista ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontStyle: 'italic', fontWeight: 500, backgroundColor: 'rgba(255,255,255,0.03)', padding: '2px 8px', borderRadius: '6px' }}>
                                    Diarista — não contabiliza estatísticas
                                  </span>
                                  {mp.payment_status === 'paid' ? (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 700, color: '#22c55e', backgroundColor: 'rgba(34,197,94,0.15)', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(34,197,94,0.3)' }}>
                                      <CheckCircle2 size={12} /> PAGO
                                    </span>
                                  ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      {mp.payment_status === 'pending' ? (
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.15)', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)' }}>
                                          PENDENTE
                                        </span>
                                      ) : (
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.15)', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(245,158,11,0.3)' }}>
                                          ? DESCONHECIDO
                                        </span>
                                      )}
                                      
                                      <div style={{ display: 'flex', gap: '4px' }}>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleToggleDiaristaPayment(mp.player_id, mp.match_id, mp.payment_status || 'unknown', 'paid'); }}
                                          disabled={paymentUpdatingId === mp.player_id}
                                          style={{ padding: '4px 10px', borderRadius: '6px', backgroundColor: '#22c55e', border: 'none', color: '#ffffff', fontSize: '0.7rem', fontWeight: 700, cursor: paymentUpdatingId === mp.player_id ? 'not-allowed' : 'pointer', opacity: paymentUpdatingId === mp.player_id ? 0.5 : 1 }}
                                        >
                                          {paymentUpdatingId === mp.player_id ? '...' : 'MARCAR PAGO'}
                                        </button>
                                        
                                        {mp.payment_status !== 'pending' && (
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleToggleDiaristaPayment(mp.player_id, mp.match_id, mp.payment_status || 'unknown', 'pending'); }}
                                            disabled={paymentUpdatingId === mp.player_id}
                                            style={{ padding: '4px 10px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', fontSize: '0.7rem', fontWeight: 700, cursor: paymentUpdatingId === mp.player_id ? 'not-allowed' : 'pointer', opacity: paymentUpdatingId === mp.player_id ? 0.5 : 1 }}
                                          >
                                            PENDENTE
                                        </button>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (`;

let normalizedContent = content.replace(/\r/g, '');
if (normalizedContent.includes(targetStr)) {
  normalizedContent = normalizedContent.replace(targetStr, replacement);
  fs.writeFileSync('src/components/Partidas.tsx', normalizedContent);
  console.log('Replaced successfully');
} else {
  console.log('Target string not found!');
}
