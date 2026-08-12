const fs = require('fs');
let cjs = fs.readFileSync('fix_final_divs.cjs', 'utf8');
cjs = cjs.replace('cards[i] = c;', 'if (i === 1) {\n    c = c.split("{dashboardNotices")[0].trim();\n  }\n  cards[i] = c;');
fs.writeFileSync('fix_final_divs.cjs', cjs);
console.log('Replaced');
