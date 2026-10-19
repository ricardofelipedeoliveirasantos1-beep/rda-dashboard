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
  console.log('--- VERIFICANDO DADOS PÓS-LIMPEZA ---');

  const { data: players } = await supabase.from('players').select('id, name');
  console.log('PLAYERS DEPOIS:', players?.length);

  const { data: matches } = await supabase.from('matches').select('id');
  console.log('MATCHES DEPOIS:', matches?.length);

  const { data: mp } = await supabase.from('match_players').select('id');
  console.log('MATCH_PLAYERS DEPOIS:', mp?.length);

  const { data: mps } = await supabase.from('match_player_stats').select('id');
  console.log('MATCH_PLAYER_STATS DEPOIS:', mps?.length);

  console.log('--- CALCULANDO RANKING PARA TESTE ---');
  
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
    .eq('status', 'finished');

  const statsMap = {};
  
  matchesData?.forEach(match => {
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

  const list = Object.values(statsMap).map((ps) => ({
    ...ps,
    points: ps.goals + ps.assists + (ps.champion * 3) + (ps.vice * 1)
  }));

  const targets = ['Ricardo', 'Wil', 'Ytalo', 'Adones', 'Andre'];
  targets.forEach(t => {
    const p = list.find(x => x.name === t);
    console.log(`\nJOGADOR: ${t}`);
    if (p) {
      console.log(`JG: ${p.games} | GO: ${p.goals} | AS: ${p.assists} | CAMPEAO: ${p.champion} | VICE: ${p.vice} | RB: ${p.ralabosta} | PT: ${p.points}`);
    } else {
      console.log('Não encontrado!');
    }
  });

  console.log('\nTOP 3 GOLS:');
  const topGols = [...list].sort((a,b) => b.goals - a.goals || b.assists - a.assists).slice(0, 3);
  topGols.forEach((x, i) => console.log(`${i+1}º ${x.name} - ${x.goals}`));

  console.log('\nTOP 3 ASSIST:');
  const topAssist = [...list].sort((a,b) => b.assists - a.assists || b.goals - a.goals).slice(0, 3);
  topAssist.forEach((x, i) => console.log(`${i+1}º ${x.name} - ${x.assists}`));

  console.log('\nTOP 3 RB:');
  const topRb = [...list].sort((a,b) => b.ralabosta - a.ralabosta).slice(0, 3);
  topRb.forEach((x, i) => console.log(`${i+1}º ${x.name} - ${x.ralabosta}`));

}

main().catch(console.error);
