const fs = require('fs');

let confContent = fs.readFileSync('src/components/Configuracoes.tsx', 'utf-8');

// Replace setEditPerms block
confContent = confContent.replace(
  `manage_finance: perms.manage_finance ?? false,`,
  `manage_finance: perms.manage_finance ?? false,
        manage_expenses: perms.manage_expenses ?? false,`
);

confContent = confContent.replace(
  `edit_players: false, manage_finance: false, create_notices: false,`,
  `edit_players: false, manage_finance: false, manage_expenses: false, create_notices: false,`
);

// Add the checkbox in the permissions modal
const permDivToFind = `
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="checkbox" 
                      id="perm_manage_finance" 
                      checked={editPerms.manage_finance}
                      onChange={(e) => setEditPerms({...editPerms, manage_finance: e.target.checked})}
                      style={{ accentColor: '#38bdf8' }}
                    />
                    <label htmlFor="perm_manage_finance" style={{ fontSize: '0.8rem', color: '#e5e5e5', cursor: 'pointer' }}>Gerenciar Financeiro (Receitas)</label>
                  </div>`;
                  
const permDivNew = permDivToFind + `
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="checkbox" 
                      id="perm_manage_expenses" 
                      checked={editPerms.manage_expenses}
                      onChange={(e) => setEditPerms({...editPerms, manage_expenses: e.target.checked})}
                      style={{ accentColor: '#38bdf8' }}
                    />
                    <label htmlFor="perm_manage_expenses" style={{ fontSize: '0.8rem', color: '#e5e5e5', cursor: 'pointer' }}>Lançar Despesas</label>
                  </div>`;
                  
confContent = confContent.replace(permDivToFind, permDivNew);

fs.writeFileSync('src/components/Configuracoes.tsx', confContent, 'utf-8');
console.log('Update Configuracoes permissions modal done.');
