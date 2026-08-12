const fs = require('fs');

// 1. Update App.tsx
let appContent = fs.readFileSync('src/App.tsx', 'utf-8');
if (!appContent.includes('manage_expenses: boolean')) {
  appContent = appContent.replace(
    'manage_finance: boolean;',
    'manage_finance: boolean;\n  manage_expenses: boolean;'
  );
  appContent = appContent.replace(
    'manage_finance: false,',
    'manage_finance: false,\n      manage_expenses: false,'
  );
  appContent = appContent.replace(
    'manage_finance: perms.manage_finance,',
    'manage_finance: perms.manage_finance,\n          manage_expenses: perms.manage_expenses,'
  );
  fs.writeFileSync('src/App.tsx', appContent, 'utf-8');
}

// 2. Update Configuracoes.tsx
let confContent = fs.readFileSync('src/components/Configuracoes.tsx', 'utf-8');
if (!confContent.includes('manage_expenses: boolean')) {
  confContent = confContent.replace(
    'manage_finance: boolean;',
    'manage_finance: boolean;\n  manage_expenses: boolean;'
  );
  
  // Add state for editAssistantPerms
  confContent = confContent.replace(
    'manage_finance: false,',
    'manage_finance: false,\n    manage_expenses: false,'
  );
  confContent = confContent.replace(
    'manage_finance: editAssistantPerms.manage_finance,',
    'manage_finance: editAssistantPerms.manage_finance,\n      manage_expenses: editAssistantPerms.manage_expenses,'
  );
  
  // Also we need to find where permissions are fetched and updated in Configuracoes.tsx
  confContent = confContent.replace(
    'manage_finance: perms.manage_finance,',
    'manage_finance: perms.manage_finance,\n            manage_expenses: perms.manage_expenses,'
  );
  
  // Add the checkbox in the UI
  const financeCheckbox = `
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="checkbox" 
                      id="perm_manage_finance" 
                      checked={editAssistantPerms.manage_finance}
                      onChange={(e) => setEditAssistantPerms({...editAssistantPerms, manage_finance: e.target.checked})}
                      style={{ accentColor: '#38bdf8' }}
                    />
                    <label htmlFor="perm_manage_finance" style={{ fontSize: '0.8rem', color: '#e5e5e5', cursor: 'pointer' }}>Gerenciar Financeiro (Receitas)</label>
                  </div>`;
  
  const newCheckboxes = financeCheckbox + `
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="checkbox" 
                      id="perm_manage_expenses" 
                      checked={editAssistantPerms.manage_expenses}
                      onChange={(e) => setEditAssistantPerms({...editAssistantPerms, manage_expenses: e.target.checked})}
                      style={{ accentColor: '#38bdf8' }}
                    />
                    <label htmlFor="perm_manage_expenses" style={{ fontSize: '0.8rem', color: '#e5e5e5', cursor: 'pointer' }}>Lançar Despesas</label>
                  </div>`;
                  
  confContent = confContent.replace(financeCheckbox, newCheckboxes);
  
  // We need to find the `createAssistant` / Edge function payload in Configuracoes
  confContent = confContent.replace(
    'manage_finance: addAssistantPerms.manage_finance,',
    'manage_finance: addAssistantPerms.manage_finance,\n        manage_expenses: addAssistantPerms.manage_expenses,'
  );
  
  // Handle adding assistant modal check boxes
  const financeCheckboxAdd = `
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="checkbox" 
                      id="add_perm_manage_finance" 
                      checked={addAssistantPerms.manage_finance}
                      onChange={(e) => setAddAssistantPerms({...addAssistantPerms, manage_finance: e.target.checked})}
                      style={{ accentColor: '#38bdf8' }}
                    />
                    <label htmlFor="add_perm_manage_finance" style={{ fontSize: '0.8rem', color: '#e5e5e5', cursor: 'pointer' }}>Gerenciar Financeiro (Receitas)</label>
                  </div>`;
  
  const newCheckboxesAdd = financeCheckboxAdd + `
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="checkbox" 
                      id="add_perm_manage_expenses" 
                      checked={addAssistantPerms.manage_expenses}
                      onChange={(e) => setAddAssistantPerms({...addAssistantPerms, manage_expenses: e.target.checked})}
                      style={{ accentColor: '#38bdf8' }}
                    />
                    <label htmlFor="add_perm_manage_expenses" style={{ fontSize: '0.8rem', color: '#e5e5e5', cursor: 'pointer' }}>Lançar Despesas</label>
                  </div>`;
  
  confContent = confContent.replace(financeCheckboxAdd, newCheckboxesAdd);
  
  fs.writeFileSync('src/components/Configuracoes.tsx', confContent, 'utf-8');
}

// 3. Update Financeiro.tsx
let finContent = fs.readFileSync('src/components/Financeiro.tsx', 'utf-8');
// Replace the button rendering to check for manage_expenses and hide from visitor
const buttonToReplace = `<button
            onClick={() => setShowExpenseModal(true)}
            style={{
              padding: '6px 16px',
              borderRadius: '8px',
              backgroundColor: '#f43f5e',
              border: 'none',
              color: '#fff',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(244, 63, 94, 0.3)'
            }}
          >
            + Lançar Despesa
          </button>`;

const newButton = `{_userRole !== 'visitor' && (_userRole === 'admin' || _can('manage_expenses')) && (
          <button
            onClick={() => setShowExpenseModal(true)}
            style={{
              padding: '6px 16px',
              borderRadius: '8px',
              backgroundColor: '#f43f5e',
              border: 'none',
              color: '#fff',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(244, 63, 94, 0.3)'
            }}
          >
            + Lançar Despesa
          </button>
        )}`;
        
finContent = finContent.replace(buttonToReplace, newButton);

fs.writeFileSync('src/components/Financeiro.tsx', finContent, 'utf-8');
console.log('Update finished.');
