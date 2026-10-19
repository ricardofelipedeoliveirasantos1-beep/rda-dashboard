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
        if (dMap[s.player_id]) {
          const ds = dMap[s.player_id];
          if (s.goals !== ds.goals || s.assists !== ds.assists || s.is_champion !== ds.is_champion || s.is_runner_up !== ds.is_runner_up || s.is_ralabosta !== ds.is_ralabosta) {
            const playerName = canonical.match_players.find(mp => mp.player_id === s.player_id)?.player?.name || 'Unknown';
            conflicts.push({ date, playerName, canonical: s, duplicate: ds });
          }
        }
      });
    }
  }

  console.log("=== CONFLITOS ===");
  conflicts.forEach(c => {
    console.log(`- Data: ${c.date} | Jogador: ${c.playerName} | GO: ${c.canonical.goals} vs ${c.duplicate.goals} | AS: ${c.canonical.assists} vs ${c.duplicate.assists} | C: ${c.canonical.is_champion} vs ${c.duplicate.is_champion} | V: ${c.canonical.is_runner_up} vs ${c.duplicate.is_runner_up} | RB: ${c.canonical.is_ralabosta} vs ${c.duplicate.is_ralabosta}`);
  });
}

main().catch(console.error);
