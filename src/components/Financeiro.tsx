import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  AlertCircle, 
  CheckCircle2,
  ChevronDown
} from 'lucide-react';

interface MonthlyPayment {
  id?: string;
  payment_month: string;
  amount: number;
  status: 'paid' | 'pending';
}

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  expense_date: string;
}

interface Match {
  id: string;
  match_date: string;
  status: 'in_progress' | 'finished';
  daily_total: number;
}

const MONTHS_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function Financeiro({ userRole: _userRole, can: _can }: { userRole: 'admin' | 'assistant' | 'visitor' | 'treasurer'; can: (action: any) => boolean }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [showMonthSelect, setShowMonthSelect] = useState(false);
  
  const [payments, setPayments] = useState<MonthlyPayment[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editExpenseData, setEditExpenseData] = useState<{ category: string; amount: string; description: string; date: string }>({ category: 'Campo', amount: '', description: '', date: '' });
  const [newExpense, setNewExpense] = useState<{ category: string; amount: string; description: string; date: string }>({
    category: 'Campo',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => {
        setFeedback(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const financeCache = useRef<Record<string, { payments: MonthlyPayment[]; matches: Match[]; expenses: Expense[] }>>({});

  const getYearMonthString = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  };

  const currentMonthStr = getYearMonthString(currentDate);

  const loadMonthData = async (monthStr: string, dateObj: Date) => {
    if (financeCache.current[monthStr]) {
      setPayments(financeCache.current[monthStr].payments);
      setMatches(financeCache.current[monthStr].matches);
      setExpenses(financeCache.current[monthStr].expenses);
      setLoading(false);
      return;
    }

    try {
      const startOfMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-01`;
      const nextMonth = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 1);
      const endOfMonth = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;

      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select(`id, match_date, status, daily_total`)
        .eq('status', 'finished')
        .gte('match_date', startOfMonth)
        .lt('match_date', endOfMonth);

      if (matchesError) console.error('Erro ao carregar partidas:', matchesError);

      const { data: paymentsData, error: paymentsError } = await supabase
        .from('monthly_payments')
        .select('id, payment_month, amount, status')
        .eq('payment_month', monthStr);

      if (paymentsError && paymentsError.code !== 'PGRST116') {
        console.error('Erro ao carregar pagamentos:', paymentsError);
      }

      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .gte('expense_date', startOfMonth)
        .lt('expense_date', endOfMonth)
        .order('expense_date', { ascending: false });

      if (expensesError) console.error('Erro ao carregar despesas:', expensesError);

      const matchesRes = matchesData || [];
      const paymentsRes = paymentsData || [];
      const expensesRes = expensesData || [];

      financeCache.current[monthStr] = {
        payments: paymentsRes,
        matches: matchesRes,
        expenses: expensesRes
      };

      setPayments(paymentsRes);
      setMatches(matchesRes);
      setExpenses(expensesRes);
      setLoading(false);
    } catch (err) {
      console.error(`Erro ao carregar dados do mês ${monthStr}:`, err);
      setError('Erro ao carregar dados financeiros.');
    }
  };

  useEffect(() => {
    loadMonthData(currentMonthStr, currentDate);
  }, [currentMonthStr]);

  // Cálculos Financeiros
  const recebidosVal = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const diaristasTotalVal = matches.reduce((sum, m) => sum + Number(m.daily_total || 0), 0);
  const totalEntradasVal = recebidosVal + diaristasTotalVal;
  const totalDespesasVal = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const saldoFinalVal = totalEntradasVal - totalDespesasVal;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', color: 'var(--text-secondary)' }}>
        Carregando financeiro...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      <div style={{ padding: '0 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, background: 'linear-gradient(135deg, #ffffff, #a3a3a3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Financeiro</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>Balanço geral de arrecadação e gastos.</p>
        </div>
        {(_userRole === 'admin' || _userRole === 'treasurer' || (_userRole === 'assistant' && _can('manage_expenses'))) && (
          <button 
            onClick={() => setShowExpenseModal(true)}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', 
              backgroundColor: '#f43f5e', color: '#fff', border: 'none', borderRadius: '8px', 
              fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(244, 63, 94, 0.4)'
            }}
          >
            + Adicionar gasto
          </button>
        )}
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--danger)', fontSize: '0.85rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* SELETOR DE MÊS DROPDOWN */}
      <div style={{ position: 'relative', width: '200px' }}>
        <button 
          onClick={() => setShowMonthSelect(!showMonthSelect)}
          style={{ 
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
            backgroundColor: '#171717', padding: '12px 16px', borderRadius: '12px',
            border: '1.5px solid rgba(255,255,255,0.08)', color: '#fff', fontWeight: 700, cursor: 'pointer'
          }}
        >
          <span>{MONTHS_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
          <ChevronDown size={18} style={{ transform: showMonthSelect ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
        </button>
        
        {showMonthSelect && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px',
            backgroundColor: '#171717', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px',
            maxHeight: '240px', overflowY: 'auto', zIndex: 10, boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
          }}>
            {MONTHS_NAMES.map((m, i) => (
              <button
                key={i}
                onClick={() => {
                  setCurrentDate(new Date(currentDate.getFullYear(), i, 1));
                  setShowMonthSelect(false);
                }}
                style={{
                  width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none',
                  border: 'none', color: '#fff', fontSize: '0.9rem', cursor: 'pointer',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  backgroundColor: currentDate.getMonth() === i ? 'rgba(255,255,255,0.05)' : 'transparent'
                }}
              >
                {m} {currentDate.getFullYear()}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CARDS DO FINANCEIRO */}
      <div className="finance-grid-topo">
        <div className="finance-mini-card card-recebidas">
          <span className="finance-mini-card-title">Mensalidades Recebidas</span>
          <span className="finance-mini-card-value">R$ {recebidosVal.toFixed(2)}</span>
        </div>

        <div className="finance-mini-card card-diarias">
          <span className="finance-mini-card-title">Diaristas Arrecadados</span>
          <span className="finance-mini-card-value">R$ {diaristasTotalVal.toFixed(2)}</span>
        </div>

        <div className="finance-mini-card card-entradas">
          <span className="finance-mini-card-title">Total de Entradas</span>
          <span className="finance-mini-card-value">R$ {totalEntradasVal.toFixed(2)}</span>
        </div>

        <div className="finance-mini-card card-despesas">
          <span className="finance-mini-card-title">Despesas</span>
          <span className="finance-mini-card-value">R$ {totalDespesasVal.toFixed(2)}</span>
        </div>

        <div className="finance-mini-card card-saldo">
          <span className="finance-mini-card-title">Saldo Líquido</span>
          <span className="finance-mini-card-value">R$ {saldoFinalVal.toFixed(2)}</span>
        </div>
      </div>

      {feedback && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '12px', backgroundColor: feedback.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', border: feedback.type === 'success' ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(239,68,68,0.25)', color: feedback.type === 'success' ? 'var(--success)' : 'var(--danger)', fontSize: '0.85rem' }}>
          {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* RELATÓRIO DE GASTOS */}
      <section className="dashboard-card" style={{ gap: '12px' }}>
        <div className="card-header" style={{ marginBottom: '2px' }}>
          <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
            RELATÓRIO DE GASTOS DO MÊS
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {expenses.length > 0 ? (
            expenses.map((expense) => {
              const formattedDate = expense.expense_date.split('-').reverse().join('/');
              const isEditing = editingExpenseId === expense.id;
              
              if (isEditing) {
                return (
                  <div key={expense.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <select value={editExpenseData.category} onChange={e => setEditExpenseData({...editExpenseData, category: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '6px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.8rem' }}>
                        <option value="Arena / Campo">Arena / Campo</option>
                        <option value="Material esportivo">Material esportivo</option>
                        <option value="Água / Bebidas">Água / Bebidas</option>
                        <option value="Premiação">Premiação</option>
                        <option value="Manutenção">Manutenção</option>
                        <option value="Outros">Outros</option>
                      </select>
                      <input type="number" step="0.01" placeholder="Valor" value={editExpenseData.amount} onChange={e => setEditExpenseData({...editExpenseData, amount: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '6px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.8rem' }} />
                      <input type="date" value={editExpenseData.date} onChange={e => setEditExpenseData({...editExpenseData, date: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '6px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.8rem' }} />
                      <input type="text" placeholder="Descrição" value={editExpenseData.description} onChange={e => setEditExpenseData({...editExpenseData, description: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '6px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.8rem' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                      <button onClick={() => setEditingExpenseId(null)} style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#a3a3a3', fontSize: '0.75rem', cursor: 'pointer' }}>Cancelar</button>
                      <button onClick={async () => {
                          if (!editExpenseData.amount || isNaN(Number(editExpenseData.amount))) {
                            alert('Digite um valor válido.');
                            return;
                          }
                          try {
                            const { error } = await supabase.from('expenses').update({
                              category: editExpenseData.category, amount: Number(editExpenseData.amount),
                              description: editExpenseData.description, expense_date: editExpenseData.date
                            }).eq('id', expense.id);
                            
                            if (error) throw error;
                            
                            const updatedExpense = { ...expense, category: editExpenseData.category, amount: Number(editExpenseData.amount), description: editExpenseData.description, expense_date: editExpenseData.date };
                            
                            setExpenses(prev => prev.map(e => e.id === expense.id ? updatedExpense : e));
                            if (financeCache.current[currentMonthStr]) {
                              financeCache.current[currentMonthStr].expenses = financeCache.current[currentMonthStr].expenses.map(e => e.id === expense.id ? updatedExpense : e);
                            }
                            setFeedback({ type: 'success', message: 'Despesa atualizada!' });
                            setEditingExpenseId(null);
                          } catch (err) {
                            alert('Erro ao atualizar despesa.');
                          }
                        }} style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: '#f43f5e', border: 'none', color: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Salvar</button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={expense.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{expense.category}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{formattedDate} {expense.description ? `• ${expense.description}` : ''}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f43f5e' }}>- R$ {Number(expense.amount).toFixed(2)}</span>
                    {(_userRole === 'admin' || _userRole === 'treasurer' || (_userRole === 'assistant' && _can('delete_expense'))) && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => {
                            setEditExpenseData({ category: expense.category, amount: String(expense.amount), description: expense.description || '', date: expense.expense_date });
                            setEditingExpenseId(expense.id);
                          }} style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.65rem', cursor: 'pointer', fontWeight: 600 }}>Editar</button>
                        <button onClick={async () => {
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
                          }} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.65rem', cursor: 'pointer', fontWeight: 600 }}>Excluir</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Nenhuma despesa registrada no mês.
            </div>
          )}
        </div>
        
        {expenses.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px', marginTop: '4px', fontSize: '0.82rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Total gasto no mês:</span>
            <strong style={{ color: '#f43f5e', fontWeight: 800 }}>R$ {totalDespesasVal.toFixed(2)}</strong>
          </div>
        )}
      </section>

      {/* MODAL NOVA DESPESA */}
      {showExpenseModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: 'var(--card-bg)', width: '90%', maxWidth: '400px', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Nova Despesa</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Categoria</label>
              <select value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
                <option value="Arena / Campo">Arena / Campo</option>
                <option value="Material esportivo">Material esportivo</option>
                <option value="Água / Bebidas">Água / Bebidas</option>
                <option value="Premiação">Premiação</option>
                <option value="Manutenção">Manutenção</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Valor (R$)</label>
              <input type="number" step="0.01" placeholder="0.00" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Data</label>
              <input type="date" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Descrição (Opcional)</label>
              <input type="text" placeholder="Detalhes..." value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button onClick={() => setShowExpenseModal(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={async () => {
                  if (!newExpense.amount || isNaN(Number(newExpense.amount))) {
                    alert('Digite um valor válido.');
                    return;
                  }
                  try {
                    const { data, error } = await supabase.from('expenses').insert([{ category: newExpense.category, amount: Number(newExpense.amount), description: newExpense.description, expense_date: newExpense.date }]).select();
                    if (error) throw error;
                    
                    if (newExpense.date.startsWith(currentMonthStr)) {
                      setExpenses(prev => [data[0], ...prev].sort((a,b) => b.expense_date.localeCompare(a.expense_date)));
                      if (financeCache.current[currentMonthStr]) {
                        financeCache.current[currentMonthStr].expenses = [data[0], ...financeCache.current[currentMonthStr].expenses].sort((a,b) => b.expense_date.localeCompare(a.expense_date));
                      }
                    }
                    
                    setFeedback({ type: 'success', message: 'Despesa registrada!' });
                    setShowExpenseModal(false);
                    setNewExpense({ category: 'Campo', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
                  } catch (err) {
                    alert('Erro ao salvar despesa.');
                  }
                }} style={{ flex: 1, padding: '10px', borderRadius: '8px', backgroundColor: '#f43f5e', border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
