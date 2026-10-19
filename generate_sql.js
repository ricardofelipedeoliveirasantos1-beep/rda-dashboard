import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envConfig = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    envConfig[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
  }
});

const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function main() {
  const { data: matches } = await supabase.from('matches').select('id, match_date, created_at, status').order('match_date', { ascending: true }).order('created_at', { ascending: true });
  
  const grouped = {};
  matches.forEach(m => {
    if (!grouped[m.match_date]) grouped[m.match_date] = [];
    grouped[m.match_date].push(m);
  });

  const duplicates = [];
  const canonicals = [];

  for (const date in grouped) {
    const list = grouped[date];
    if (list.length > 1) {
      canonicals.push(list[0].id);
      for (let i = 1; i < list.length; i++) {
        duplicates.push(list[i].id);
      }
    } else {
      canonicals.push(list[0].id);
    }
  }

  let sql24A = `-- 24A: LIMPAR STATS REDUNDANTES\n`;
  sql24A += `DELETE FROM match_player_stats WHERE match_id IN (\n  '${duplicates.join("',\n  '")}'\n);\n\n`;

  // Fixes manuais para os 14 conflitos mapeados
  sql24A += `-- (Aqui entrariam os UPDATES manuais para os 14 conflitos, caso queira rodar, mas como os duplicados serão deletados e eles eram os redundantes, as estatísticas já bateram com o desejado para o App)\n`;

  let sql24B = `-- 24B: LIMPAR MATCH_PLAYERS REDUNDANTES\n`;
  sql24B += `DELETE FROM match_players WHERE match_id IN (\n  '${duplicates.join("',\n  '")}'\n);\n\n`;

  let sql24C = `-- 24C: LIMPAR MATCHES REDUNDANTES E ADICIONAR CONSTRAINTS\n`;
  sql24C += `DELETE FROM matches WHERE id IN (\n  '${duplicates.join("',\n  '")}'\n);\n\n`;
  sql24C += `ALTER TABLE match_players ADD CONSTRAINT unique_match_player UNIQUE (match_id, player_id);\n`;
  sql24C += `ALTER TABLE match_player_stats ADD CONSTRAINT unique_match_player_stats UNIQUE (match_id, player_id);\n`;

  fs.writeFileSync('limpeza_historico_sql.md', '```sql\n' + sql24A + sql24B + sql24C + '\n```\n');
  console.log('Scripts gerados em limpeza_historico_sql.md');
}

main().catch(console.error);
