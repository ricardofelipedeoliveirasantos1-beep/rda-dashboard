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
  const { data: matchesData } = await supabase
    .from('matches')
    .select(`
      *,
      match_players (
        *,
        player:players (id, name, category)
      ),
      match_player_stats (*)
    `)
    .eq('status', 'finished')
    .order('match_date', { ascending: true })
    .order('created_at', { ascending: true });

  const groupedMatches = {};
  matchesData.forEach(m => {
    if (!groupedMatches[m.match_date]) groupedMatches[m.match_date] = [];
    groupedMatches[m.match_date].push(m);
  });

  const canonicalExclusives = [];
  const duplicateExclusives = [];
  const conflicts = [];

  for (const date in groupedMatches) {
    const list = groupedMatches[date];
    if (list.length > 1) {
      const canonical = list[0];
      const duplicate = list[1];

      const cStats = canonical.match_player_stats || [];
      const dStats = duplicate.match_player_stats || [];

      const cMap = {}; cStats.forEach(s => cMap[s.player_id] = s);
      const dMap = {}; dStats.forEach(s => dMap[s.player_id] = s);

      cStats.forEach(s => {
        if (!dMap[s.player_id]) {
          const playerName = canonical.match_players.find(mp => mp.player_id === s.player_id)?.player?.name || 'Unknown';
          canonicalExclusives.push({ date, playerName, stats: s });
        } else {
          const ds = dMap[s.player_id];
          if (s.goals !== ds.goals || s.assists !== ds.assists || s.is_champion !== ds.is_champion || s.is_runner_up !== ds.is_runner_up || s.is_ralabosta !== ds.is_ralabosta) {
            const playerName = canonical.match_players.find(mp => mp.player_id === s.player_id)?.player?.name || 'Unknown';
            conflicts.push({ date, playerName, canonical: s, duplicate: ds });
          }
        }
      });

      dStats.forEach(s => {
        if (!cMap[s.player_id]) {
          const playerName = duplicate.match_players.find(mp => mp.player_id === s.player_id)?.player?.name || 'Unknown';
          duplicateExclusives.push({ date, playerName, stats: s });
        }
      });
    }
  }

  console.log("=== EXCLUSIVOS DO CANÔNICO (Devem ser removidos para dar 463) ===");
  canonicalExclusives.forEach(c => {
    console.log(`- Data: ${c.date} | Jogador: ${c.playerName} | GO: ${c.stats.goals}, AS: ${c.stats.assists}, RB: ${c.stats.is_ralabosta}`);
  });

  console.log("\n=== EXCLUSIVOS DO DUPLICADO (Devem ser adicionados ao canônico) ===");
  duplicateExclusives.forEach(d => {
    console.log(`- Data: ${d.date} | Jogador: ${d.playerName} | GO: ${d.stats.goals}, AS: ${d.stats.assists}, RB: ${d.stats.is_ralabosta}`);
  });

  console.log("\n=== CONFLITOS ===");
  conflicts.forEach(c => {
    console.log(`- Data: ${c.date} | Jogador: ${c.playerName} | C-GO: ${c.canonical.goals} / D-GO: ${c.duplicate.goals} | C-AS: ${c.canonical.assists} / D-AS: ${c.duplicate.assists}`);
  });
}

main().catch(console.error);
