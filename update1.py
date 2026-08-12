import re
import sys

with open("src/components/Financeiro.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Interface Expense
if "interface Expense" not in content:
    content = content.replace("interface Match {", """interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  expense_date: string;
}

interface Match {""")

# 2. States
if "const [expenses" not in content:
    content = content.replace("const [matches, setMatches] = useState<Match[]>([]);", """const [matches, setMatches] = useState<Match[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [newExpense, setNewExpense] = useState<{ category: string; amount: string; description: string; date: string }>({
    category: 'Campo',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });""")

# 3. Cache
content = content.replace(
    "const financeCache = useRef<Record<string, { payments: MonthlyPayment[]; matches: Match[] }>>({});",
    "const financeCache = useRef<Record<string, { payments: MonthlyPayment[]; matches: Match[]; expenses: Expense[] }>>({});"
)

# 4. In loadMonthData - use cache
content = content.replace(
    "setMatches(financeCache.current[monthStr].matches);",
    "setMatches(financeCache.current[monthStr].matches);\n        setExpenses(financeCache.current[monthStr].expenses);"
)

# 5. Fetch expenses
fetch_code = """
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .gte('expense_date', startOfMonth)
        .lt('expense_date', endOfMonth)
        .order('expense_date', { ascending: false });

      if (expensesError) console.error('Erro ao carregar despesas:', expensesError);
      const expensesRes = expensesData || [];
"""
content = content.replace(
    "const paymentsRes = paymentsData || [];",
    "const paymentsRes = paymentsData || [];\n" + fetch_code
)

# 6. Save cache
content = content.replace(
    "matches: matchesRes",
    "matches: matchesRes,\n        expenses: expensesRes"
)

# 7. Set state
content = content.replace(
    "setMatches(matchesRes);",
    "setMatches(matchesRes);\n        setExpenses(expensesRes);"
)

# 8. Math for saldo
saldo_code = """
  // Despesas e Saldo
  const totalDespesasVal = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const saldoFinalVal = totalEntradasVal - totalDespesasVal;
"""
content = content.replace(
    "const totalEntradasVal = recebidosVal + diaristasTotalVal;",
    "const totalEntradasVal = recebidosVal + diaristasTotalVal;\n" + saldo_code
)

# 9. Mini Cards
mini_cards = """
        {/* Card 5 — Despesas */}
        <div className="finance-mini-card card-despesas">
          <span className="finance-mini-card-title">Despesas</span>
          <span className="finance-mini-card-value">R$ {totalDespesasVal.toFixed(0)}</span>
          <span className="finance-mini-card-counter">{expenses.length} reg.</span>
        </div>

        {/* Card 6 — Saldo */}
        <div className="finance-mini-card card-saldo">
          <span className="finance-mini-card-title">Saldo Mês</span>
          <span className="finance-mini-card-value">R$ {saldoFinalVal.toFixed(0)}</span>
          <span className="finance-mini-card-counter">Líquido</span>
        </div>
"""
content = content.replace(
    """        {/* Card 5 — Entradas */}
        <div className="finance-mini-card card-entradas">
          <span className="finance-mini-card-title">Entradas</span>
          <span className="finance-mini-card-value">R$ {totalEntradasVal.toFixed(0)}</span>
          <span className="finance-mini-card-counter">Total</span>
        </div>""",
    """        {/* Card 5 — Entradas */}
        <div className="finance-mini-card card-entradas">
          <span className="finance-mini-card-title">Entradas</span>
          <span className="finance-mini-card-value">R$ {totalEntradasVal.toFixed(0)}</span>
          <span className="finance-mini-card-counter">Total</span>
        </div>
""" + mini_cards
)

with open("src/components/Financeiro.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated basic logic")
