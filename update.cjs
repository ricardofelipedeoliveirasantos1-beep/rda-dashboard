const fs = require('fs');

let content = fs.readFileSync("src/components/Financeiro.tsx", "utf-8");

// 1. Interface Expense
if (!content.includes("interface Expense")) {
    content = content.replace("interface Match {", `interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  expense_date: string;
}

interface Match {`);
}

// 2. States
if (!content.includes("const [expenses")) {
    content = content.replace("const [matches, setMatches] = useState<Match[]>([]);", `const [matches, setMatches] = useState<Match[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [newExpense, setNewExpense] = useState<{ category: string; amount: string; description: string; date: string }>({
    category: 'Campo',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });`);
}

// 3. Cache
content = content.replace(
    "const financeCache = useRef<Record<string, { payments: MonthlyPayment[]; matches: Match[] }>>({});",
    "const financeCache = useRef<Record<string, { payments: MonthlyPayment[]; matches: Match[]; expenses: Expense[] }>>({});"
);

// 4. In loadMonthData - use cache
content = content.replace(
    "setMatches(financeCache.current[monthStr].matches);",
    "setMatches(financeCache.current[monthStr].matches);\n        setExpenses(financeCache.current[monthStr].expenses);"
);

// 5. Fetch expenses
const fetch_code = `
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .gte('expense_date', startOfMonth)
        .lt('expense_date', endOfMonth)
        .order('expense_date', { ascending: false });

      if (expensesError) console.error('Erro ao carregar despesas:', expensesError);
      const expensesRes = expensesData || [];
`;
content = content.replace(
    "const paymentsRes = paymentsData || [];",
    "const paymentsRes = paymentsData || [];\n" + fetch_code
);

// 6. Save cache
content = content.replace(
    "matches: matchesRes",
    "matches: matchesRes,\n        expenses: expensesRes"
);

// 7. Set state
content = content.replace(
    "setMatches(matchesRes);",
    "setMatches(matchesRes);\n        setExpenses(expensesRes);"
);

// 8. Math for saldo
const saldo_code = `
  // Despesas e Saldo
  const totalDespesasVal = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const saldoFinalVal = totalEntradasVal - totalDespesasVal;
`;
content = content.replace(
    "const totalEntradasVal = recebidosVal + diaristasTotalVal;",
    "const totalEntradasVal = recebidosVal + diaristasTotalVal;\n" + saldo_code
);

// 9. Mini Cards
const mini_cards = `        {/* Card 5 — Despesas */}
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
`;
content = content.replace(
    `        {/* Card 5 — Entradas */}
        <div className="finance-mini-card card-entradas">
          <span className="finance-mini-card-title">Entradas</span>
          <span className="finance-mini-card-value">R$ {totalEntradasVal.toFixed(0)}</span>
          <span className="finance-mini-card-counter">Total</span>
        </div>`,
    `        {/* Card 5 — Entradas */}
        <div className="finance-mini-card card-entradas">
          <span className="finance-mini-card-title">Entradas</span>
          <span className="finance-mini-card-value">R$ {totalEntradasVal.toFixed(0)}</span>
          <span className="finance-mini-card-counter">Total</span>
        </div>\n` + mini_cards
);

// 10. Add Add Expense Button to the header
const btn_html = `          <button 
            onClick={() => setShowExpenseModal(true)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '8px 12px', 
              backgroundColor: '#f43f5e', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '8px', 
              fontSize: '0.8rem', 
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(244, 63, 94, 0.4)'
            }}
          >
            + Lançar Despesa
          </button>`;
content = content.replace(
    `<p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>Controle de mensalidades e arrecadação das partidas.</p>
      </div>`,
    `<p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>Controle de mensalidades e arrecadação das partidas.</p>
      </div>
      <div style={{ padding: '0 4px', display: 'flex', justifyContent: 'flex-end' }}>
${btn_html}
      </div>`
);


fs.writeFileSync("src/components/Financeiro.tsx", content, "utf-8");
console.log("Updated basic logic");
