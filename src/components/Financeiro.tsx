import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getCachedData, invalidateCache, CACHE_TTL } from '../services/dataCache';
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
  const [showYearSelect, setShowYearSelect] = useState(false);
  const YEARS_LIST = [2024, 2025, 2026, 2027, 2028, 2029, 2030];
  
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

      const allMatches = await getCachedData('matches', async () => {
        const { data } = await supabase.from('matches').select(`id, match_date, status, daily_total`);
        return data || [];
      }, CACHE_TTL.matches);
      
      const matchesRes = allMatches.filter((m: any) => m.status === 'finished' && m.match_date >= startOfMonth && m.match_date < endOfMonth);

      const allPayments = await getCachedData('monthly_payments', async () => {
        const { data } = await supabase.from('monthly_payments').select('id, payment_month, amount, status');
        return data || [];
      }, CACHE_TTL.monthly_payments);

      const paymentsRes = allPayments.filter((p: any) => p.payment_month === monthStr);

      const allExpenses = await getCachedData('expenses', async () => {
        const { data } = await supabase.from('expenses').select('*');
        return data || [];
      }, CACHE_TTL.expenses);
      
      const expensesRes = allExpenses.filter((e: any) => e.expense_date >= startOfMonth && e.expense_date < endOfMonth).sort((a: any, b: any) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());

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
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--danger)', fontSize: '0.85rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* SELETORES DE MÊS E ANO */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{ position: 'relative', width: '140px' }}>
          <button 
            onClick={() => setShowMonthSelect(!showMonthSelect)}
            style={{ 
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
              backgroundColor: '#171717', padding: '12px 16px', borderRadius: '12px',
              border: '1.5px solid rgba(255,255,255,0.08)', color: '#fff', fontWeight: 700, cursor: 'pointer'
            }}
          >
            <span>{MONTHS_NAMES[currentDate.getMonth()]}</span>
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
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ position: 'relative', width: '100px' }}>
          <button 
            onClick={() => setShowYearSelect(!showYearSelect)}
            style={{ 
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
              backgroundColor: '#171717', padding: '12px 16px', borderRadius: '12px',
              border: '1.5px solid rgba(255,255,255,0.08)', color: '#fff', fontWeight: 700, cursor: 'pointer'
            }}
          >
            <span>{currentDate.getFullYear()}</span>
            <ChevronDown size={18} style={{ transform: showYearSelect ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
          </button>
          
          {showYearSelect && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px',
              backgroundColor: '#171717', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px',
              maxHeight: '240px', overflowY: 'auto', zIndex: 10, boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
            }}>
              {YEARS_LIST.map((y, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setCurrentDate(new Date(y, currentDate.getMonth(), 1));
                    setShowYearSelect(false);
                  }}
                  style={{
                    width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none',
                    border: 'none', color: '#fff', fontSize: '0.9rem', cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    backgroundColor: currentDate.getFullYear() === y ? 'rgba(255,255,255,0.05)' : 'transparent'
                  }}
                >
                  {y}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CARDS DO FINANCEIRO */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '16px', borderRadius: '16px', backgroundColor: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a3a3a3', textTransform: 'uppercase' }}>Mensalidades Recebidas</span>
          <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#22c55e' }}>R$ {recebidosVal.toFixed(2)}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '16px', borderRadius: '16px', backgroundColor: 'rgba(234, 179, 8, 0.05)', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a3a3a3', textTransform: 'uppercase' }}>Diaristas Arrecadados</span>
          <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#eab308' }}>R$ {diaristasTotalVal.toFixed(2)}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '16px', borderRadius: '16px', backgroundColor: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a3a3a3', textTransform: 'uppercase' }}>Total de Entradas</span>
          <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#a855f7' }}>R$ {totalEntradasVal.toFixed(2)}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '16px', borderRadius: '16px', backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a3a3a3', textTransform: 'uppercase' }}>Despesas</span>
          <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ef4444' }}>R$ {totalDespesasVal.toFixed(2)}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '16px', borderRadius: '16px', backgroundColor: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.2)', justifyContent: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a3a3a3', textTransform: 'uppercase' }}>Saldo Líquido</span>
          <span style={{ fontSize: '1.4rem', fontWeight: 900, color: saldoFinalVal >= 0 ? '#22c55e' : '#ef4444' }}>R$ {saldoFinalVal.toFixed(2)}</span>
        </div>

        {(_userRole === 'admin' || _userRole === 'treasurer' || (_userRole === 'assistant' && _can('manage_expenses'))) ? (
          <button 
            onClick={() => setShowExpenseModal(true)}
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', 
              backgroundColor: '#f43f5e', color: '#fff', border: 'none', borderRadius: '16px', 
              fontSize: '1rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(244, 63, 94, 0.3)',
              width: '100%', height: '100%'
            }}
          >
            + Adicionar gasto
          </button>
        ) : (
          <div style={{ width: '100%', height: '100%' }}></div>
        )}
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
          <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 900, fontSize: '1.15rem', color: '#fff' }}>
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
                        <option value="Campo">Campo</option>
                        <option value="Árbitro">Árbitro</option>
                        <option value="Goleiro">Goleiro</option>
                        <option value="Material">Material</option>
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
                <div key={expense.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)' }}>{expense.category}</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{formattedDate} {expense.description ? `• ${expense.description}` : ''}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#f43f5e' }}>- R$ {Number(expense.amount).toFixed(2)}</span>
                    {(_userRole === 'admin' || _userRole === 'treasurer' || (_userRole === 'assistant' && _can('delete_expense'))) && (
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={() => {
                            setEditExpenseData({ category: expense.category, amount: String(expense.amount), description: expense.description || '', date: expense.expense_date });
                            setEditingExpenseId(expense.id);
                          }} style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 700, padding: '4px 8px', margin: '-4px -8px' }}>Editar</button>
                        <button onClick={async () => {
                            if (confirm('Tem certeza que deseja remover esta despesa?')) {
                              try {
                                const { error } = await supabase.from('expenses').delete().eq('id', expense.id);
                                if (error) throw error;
                                invalidateCache('expenses');
                                setExpenses(prev => prev.filter(e => e.id !== expense.id));
                                if (financeCache.current[currentMonthStr]) {
                                  financeCache.current[currentMonthStr].expenses = financeCache.current[currentMonthStr].expenses.filter(e => e.id !== expense.id);
                                }
                                setFeedback({ type: 'success', message: 'Despesa removida.' });
                              } catch (err) {
                                setFeedback({ type: 'error', message: 'Erro ao remover despesa.' });
                              }
                            }
                          }} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 700, padding: '4px 8px', margin: '-4px -8px' }}>Excluir</button>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '16px', marginTop: '8px' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '1rem' }}>Total gasto no mês:</span>
            <strong style={{ color: '#f43f5e', fontWeight: 900, fontSize: '1.3rem' }}>R$ {totalDespesasVal.toFixed(2)}</strong>
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
                <option value="Campo">Campo</option>
                <option value="Árbitro">Árbitro</option>
                <option value="Goleiro">Goleiro</option>
                <option value="Material">Material</option>
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
                    invalidateCache('expenses');
                    
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
