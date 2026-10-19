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

  let wilCanonical = 0;
  let wilDuplicate = 0;

  for (const date in groupedMatches) {
    const list = groupedMatches[date];
    if (list.length > 1) {
      const canonical = list[0];
      const duplicate = list[1];

      const cWil = canonical.match_player_stats?.find(s => canonical.match_players?.find(mp => mp.player_id === s.player_id)?.player?.name === 'Wil');
      const dWil = duplicate.match_player_stats?.find(s => duplicate.match_players?.find(mp => mp.player_id === s.player_id)?.player?.name === 'Wil');

      if (cWil) wilCanonical += cWil.goals;
      if (dWil) wilDuplicate += dWil.goals;

      if ((cWil?.goals || 0) !== (dWil?.goals || 0)) {
        console.log(`Diferença Wil em ${date}: Canônico=${cWil?.goals || 0}, Duplicado=${dWil?.goals || 0}`);
      }
    }
  }

  console.log(`Total Wil Canônico: ${wilCanonical}`);
  console.log(`Total Wil Duplicado: ${wilDuplicate}`);
}

main().catch(console.error);
