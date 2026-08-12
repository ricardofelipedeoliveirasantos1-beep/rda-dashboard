const fs = require('fs');
let content = fs.readFileSync("src/components/Financeiro.tsx", "utf-8");

const expensesSection = `
      {/* SEÇÃO DESPESAS */}
      <section className="dashboard-card" style={{ gap: '12px' }}>
        <div className="card-header" style={{ marginBottom: '2px' }}>
          <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
            DESPESAS
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {expenses.length > 0 ? (
            expenses.map((expense) => {
              const formattedDate = expense.expense_date.split('-').reverse().join('/');
              return (
                <div 
                  key={expense.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255,255,255,0.01)',
                    border: '1px solid rgba(255,255,255,0.03)'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{expense.category}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      {formattedDate} {expense.description ? \`• \${expense.description}\` : ''}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f43f5e' }}>
                      - R$ {Number(expense.amount).toFixed(2)}
                    </span>
                    {(_userRole === 'admin' || _userRole === 'treasurer' || (_userRole === 'assistant' && _can('delete_expense'))) && (
                      <button
                        onClick={async () => {
                          if (confirm('Tem certeza que deseja remover esta despesa?')) {
                            try {
                              const { error } = await supabase.from('expenses').delete().eq('id', expense.id);
                              if (error) throw error;
                              setExpenses(prev => prev.filter(e => e.id !== expense.id));
                              if (financeCache.current[currentMonthStr]) {
                                financeCache.current[currentMonthStr].expenses = financeCache.current[currentMonthStr].expenses.filter(e => e.id !== expense.id);
                              }
                              setFeedback({ type: 'success', message: 'Despesa removida.' });
                            } catch (err) {
                              setFeedback({ type: 'error', message: 'Erro ao remover despesa.' });
                            }
                          }
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.62rem', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Nenhuma despesa registrada.
            </div>
          )}
        </div>
      </section>

      {/* MODAL NOVA DESPESA */}
      {showExpenseModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--card-bg)', width: '100%', maxWidth: '400px',
            borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Nova Despesa</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Categoria</label>
              <select 
                value={newExpense.category}
                onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              >
                <option value="Campo">Campo</option>
                <option value="Árbitro">Árbitro</option>
                <option value="Goleiro">Goleiro</option>
                <option value="Material">Material</option>
                <option value="Uber">Uber</option>
                <option value="Frutas">Frutas</option>
                <option value="Outros">Outros</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Valor (R$)</label>
              <input 
                type="number" 
                step="0.01"
                placeholder="0.00"
                value={newExpense.amount}
                onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Data</label>
              <input 
                type="date" 
                value={newExpense.date}
                onChange={e => setNewExpense({...newExpense, date: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Descrição (Opcional)</label>
              <input 
                type="text" 
                placeholder="Detalhes..."
                value={newExpense.description}
                onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button 
                onClick={() => setShowExpenseModal(false)}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                onClick={async () => {
                  if (!newExpense.amount || isNaN(Number(newExpense.amount))) {
                    alert('Digite um valor válido.');
                    return;
                  }
                  try {
                    const { data, error } = await supabase.from('expenses').insert([{
                      category: newExpense.category,
                      amount: Number(newExpense.amount),
                      description: newExpense.description,
                      expense_date: newExpense.date
                    }]).select();
                    if (error) throw error;
                    
                    // Reload if added in current month
                    if (newExpense.date.startsWith(currentMonthStr)) {
                      setExpenses(prev => [data[0], ...prev].sort((a,b) => b.expense_date.localeCompare(a.expense_date)));
                      if (financeCache.current[currentMonthStr]) {
                        financeCache.current[currentMonthStr].expenses = [data[0], ...financeCache.current[currentMonthStr].expenses].sort((a,b) => b.expense_date.localeCompare(a.expense_date));
                      }
                    }
                    
                    setFeedback({ type: 'success', message: 'Despesa registrada!' });
                    setShowExpenseModal(false);
                    setNewExpense({
                      category: 'Campo',
                      amount: '',
                      description: '',
                      date: new Date().toISOString().split('T')[0]
                    });
                  } catch (err) {
                    alert('Erro ao salvar despesa.');
                  }
                }}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', backgroundColor: '#f43f5e', border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}`;

content = content.replace(/<\/section>\s*<\/div>\s*\);\s*}\s*$/, expensesSection + '\n}\n');

fs.writeFileSync("src/components/Financeiro.tsx", content, "utf-8");
console.log("Appended UI");
