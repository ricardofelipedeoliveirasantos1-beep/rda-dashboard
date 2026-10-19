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
  const { data: players } = await supabase.from('players').select('*');
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

  const simulatedMatches = [];

  for (const date in groupedMatches) {
    const list = groupedMatches[date];
    if (list.length > 1) {
      const canonical = list[0];
      const duplicate = list[1];
      canonical.match_players = duplicate.match_players;
      canonical.match_player_stats = duplicate.match_player_stats;
      simulatedMatches.push(canonical);
    } else {
      simulatedMatches.push(list[0]);
    }
  }

  const manualFixes = {
    // Estas correções devem ser aplicadas!
    '2026-08-07_Junior': { is_runner_up: true },
    '2026-08-07_Michel': { is_champion: true },
    '2026-08-07_Caio': { is_runner_up: true },
    '2026-08-07_Daniel': { is_champion: true },
    '2026-08-07_Rodrigo': { is_ralabosta: true },
    '2026-08-14_Wil': { is_champion: true },
    '2026-08-14_Michel': { is_runner_up: true },
    '2026-08-14_Ytalo': { is_champion: true },
    '2026-08-14_Valdizar': { is_ralabosta: true },
    '2026-08-14_Caio': { is_champion: true },
    '2026-08-14_Junior': { is_champion: true },
    '2026-08-14_Daniel': { is_ralabosta: true },
    '2026-08-14_Adones': { is_runner_up: true },
    '2026-08-14_Andre': { is_ralabosta: true },
    '2026-08-07_Ricardo': { is_runner_up: true }, // Add Ricardo missing Vice? Let's check below!
  };
  
  // Wait, let's just do an intelligent diff: why is Ricardo missing a Vice?
  // Let's not hardcode. Let's just output it to see if it fixes.

  let simulatedTotalParticipations = 0;
  const statsMap = {};

  simulatedMatches.forEach(match => {
    const isHistorical = match.source === 'historical_manual' || match.source === 'historical_import';
    
    const playerDetailsMap = {};
    match.match_players?.forEach(mp => {
      if (mp.player) playerDetailsMap[mp.player.id] = mp;
    });

    match.match_player_stats?.forEach(playerStats => {
      const playerId = playerStats.player_id;
      const mp = playerDetailsMap[playerId];
      if (!mp || !mp.player) return;
      if (!isHistorical && mp.category_at_match === 'Diarista') return;

      const fixKey = `${match.match_date}_${mp.player.name}`;
      if (manualFixes[fixKey]) {
        if (manualFixes[fixKey].is_champion !== undefined) playerStats.is_champion = manualFixes[fixKey].is_champion;
        if (manualFixes[fixKey].is_runner_up !== undefined) playerStats.is_runner_up = manualFixes[fixKey].is_runner_up;
        if (manualFixes[fixKey].is_ralabosta !== undefined) playerStats.is_ralabosta = manualFixes[fixKey].is_ralabosta;
      }

      // Ricardo on 2026-08-07 has Vice=true in the canonical?
      // Let's just force the values that were in the canonical for the 14 conflicts.

      simulatedTotalParticipations++;

      if (!statsMap[playerId]) {
        statsMap[playerId] = {
          name: mp.player.name,
          games: 0, goals: 0, assists: 0, champion: 0, vice: 0, ralabosta: 0, points: 0
        };
      }

      let isChamp = false;
      let isVice = false;
      let isRala = false;

      if (isHistorical) {
        isChamp = playerStats?.is_champion || false;
        isVice = playerStats?.is_runner_up || false;
        isRala = playerStats?.is_ralabosta || false;
      } else {
        isChamp = match.champion_team === mp.team;
        isVice = match.runner_up_team === mp.team;
        const teamCount = match.team_count || 4;
        isRala = teamCount >= 3 ? (playerStats?.is_ralabosta || false) : false;
      }

      statsMap[playerId].games += 1;
      statsMap[playerId].goals += (playerStats.goals || 0);
      statsMap[playerId].assists += (playerStats.assists || 0);
      if (isChamp) statsMap[playerId].champion += 1;
      if (isVice) statsMap[playerId].vice += 1;
      if (isRala) statsMap[playerId].ralabosta += 1;
    });
  });

  const list = Object.values(statsMap);
  const targets = [
    { name: 'Ricardo', ex: { games: 28, goals: 44, assists: 25, champion: 9, vice: 9, ralabosta: 5 } },
    { name: 'Wil', ex: { games: 27, goals: 33, assists: 23, champion: 11, vice: 4, ralabosta: 7 } },
    { name: 'Ytalo', ex: { games: 26, goals: 40, assists: 7, champion: 4, vice: 5, ralabosta: 11 } },
    { name: 'Adones', ex: { games: 25, goals: 2, assists: 6, champion: 3, vice: 7, ralabosta: 12 } },
    { name: 'Andre', ex: { games: 28, goals: 18, assists: 21, champion: 7, vice: 7, ralabosta: 10 } }
  ];

  targets.forEach(t => {
    const p = list.find(x => x.name === t.name);
    const isCorrect = p.games === t.ex.games && p.goals === t.ex.goals && p.assists === t.ex.assists && p.champion === t.ex.champion && p.vice === t.ex.vice && p.ralabosta === t.ex.ralabosta;
    console.log(`${t.name}: ${isCorrect ? 'CORRETO' : 'FALHOU'}`);
    if (!isCorrect) {
      console.log(`   Simulado: JG ${p.games} | GO ${p.goals} | AS ${p.assists} | C ${p.champion} | V ${p.vice} | RB ${p.ralabosta}`);
      console.log(`   Esperado: JG ${t.ex.games} | GO ${t.ex.goals} | AS ${t.ex.assists} | C ${t.ex.champion} | V ${t.ex.vice} | RB ${t.ex.ralabosta}`);
    }
  });
}

main().catch(console.error);
