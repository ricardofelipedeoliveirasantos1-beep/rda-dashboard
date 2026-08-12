const fs = require('fs');
let content = fs.readFileSync("src/components/Financeiro.tsx", "utf-8");

// 1. Add editingExpense states
if (!content.includes("editingExpenseId")) {
    content = content.replace(
        "const [showExpenseModal, setShowExpenseModal] = useState(false);",
        `const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editExpenseData, setEditExpenseData] = useState<{ category: string; amount: string; description: string; date: string }>({ category: 'Campo', amount: '', description: '', date: '' });`
    );
}

// 2. Fix the Modal Box Sizing (width 100% -> 100% minus padding or just boxSizing)
content = content.replace(
    `backgroundColor: 'var(--card-bg)', width: '100%', maxWidth: '400px',`,
    `backgroundColor: 'var(--card-bg)', width: '90%', maxWidth: '400px', boxSizing: 'border-box',`
);

content = content.replace(
    /style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: '#0b0b0b', border: '1px solid rgba\(255,255,255,0.1\), color: '#fff' }}/g,
    `style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '8px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}`
);

// 3. Replace the expense rendering in the list with Edit/Save/Delete logic
const oldExpenseItem = `{expenses.length > 0 ? (
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
          ) : (`;

const newExpenseItem = `{expenses.length > 0 ? (
            expenses.map((expense) => {
              const formattedDate = expense.expense_date.split('-').reverse().join('/');
              const isEditing = editingExpenseId === expense.id;
              
              if (isEditing) {
                return (
                  <div 
                    key={expense.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      padding: '12px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)'
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <select 
                        value={editExpenseData.category}
                        onChange={e => setEditExpenseData({...editExpenseData, category: e.target.value})}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '6px', borderRadius: '6px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.8rem' }}
                      >
                        <option value="Campo">Campo</option>
                        <option value="Árbitro">Árbitro</option>
                        <option value="Goleiro">Goleiro</option>
                        <option value="Material">Material</option>
                        <option value="Uber">Uber</option>
                        <option value="Frutas">Frutas</option>
                        <option value="Outros">Outros</option>
                      </select>
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="Valor"
                        value={editExpenseData.amount}
                        onChange={e => setEditExpenseData({...editExpenseData, amount: e.target.value})}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '6px', borderRadius: '6px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.8rem' }}
                      />
                      <input 
                        type="date" 
                        value={editExpenseData.date}
                        onChange={e => setEditExpenseData({...editExpenseData, date: e.target.value})}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '6px', borderRadius: '6px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.8rem' }}
                      />
                      <input 
                        type="text" 
                        placeholder="Descrição"
                        value={editExpenseData.description}
                        onChange={e => setEditExpenseData({...editExpenseData, description: e.target.value})}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '6px', borderRadius: '6px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.8rem' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                      <button 
                        onClick={() => setEditingExpenseId(null)}
                        style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#a3a3a3', fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={async () => {
                          if (!editExpenseData.amount || isNaN(Number(editExpenseData.amount))) {
                            alert('Digite um valor válido.');
                            return;
                          }
                          try {
                            const { error } = await supabase.from('expenses').update({
                              category: editExpenseData.category,
                              amount: Number(editExpenseData.amount),
                              description: editExpenseData.description,
                              expense_date: editExpenseData.date
                            }).eq('id', expense.id);
                            
                            if (error) throw error;
                            
                            const updatedExpense = {
                              ...expense,
                              category: editExpenseData.category,
                              amount: Number(editExpenseData.amount),
                              description: editExpenseData.description,
                              expense_date: editExpenseData.date
                            };
                            
                            setExpenses(prev => prev.map(e => e.id === expense.id ? updatedExpense : e));
                            if (financeCache.current[currentMonthStr]) {
                              financeCache.current[currentMonthStr].expenses = financeCache.current[currentMonthStr].expenses.map(e => e.id === expense.id ? updatedExpense : e);
                            }
                            
                            setFeedback({ type: 'success', message: 'Despesa atualizada!' });
                            setEditingExpenseId(null);
                          } catch (err) {
                            alert('Erro ao atualizar despesa.');
                          }
                        }}
                        style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: '#f43f5e', border: 'none', color: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                );
              }

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

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f43f5e' }}>
                      - R$ {Number(expense.amount).toFixed(2)}
                    </span>
                    {(_userRole === 'admin' || _userRole === 'treasurer' || (_userRole === 'assistant' && _can('delete_expense'))) && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => {
                            setEditExpenseData({
                              category: expense.category,
                              amount: String(expense.amount),
                              description: expense.description || '',
                              date: expense.expense_date
                            });
                            setEditingExpenseId(expense.id);
                          }}
                          style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.65rem', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Editar
                        </button>
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
                          style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.65rem', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (`;

content = content.replace(oldExpenseItem, newExpenseItem);
// Make sure all select and inputs have boxSizing set correctly inside the modal as well
content = content.replace(/style={{ width: '100%', padding: '10px'/g, "style={{ width: '100%', boxSizing: 'border-box', padding: '10px'");

fs.writeFileSync("src/components/Financeiro.tsx", content, "utf-8");
console.log("Updated UI for Expenses");
