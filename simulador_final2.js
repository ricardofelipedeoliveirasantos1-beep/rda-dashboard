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

  const canonicalMatches = [];
  for (const date in groupedMatches) {
    const list = groupedMatches[date];
    const canonical = list[0];
    // Se o canônico era 'app', vamos fingir que ele foi atualizado para 'historical_manual'
    // pois ele agora fará parte do histórico consolidado da planilha
    canonical.source = 'historical_manual';
    canonicalMatches.push(canonical);
  }

  const manualFixes = {
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
    '2026-08-14_Andre': { is_ralabosta: true }
  };

  let simulatedTotalParticipations = 0;
  const statsMap = {};

  canonicalMatches.forEach(match => {
    // Nós forçamos tudo para historical_manual, então isHistorical sempre será TRUE nesta simulação
    const isHistorical = true;
    
    const playerDetailsMap = {};
    match.match_players?.forEach(mp => {
      if (mp.player) playerDetailsMap[mp.player.id] = mp;
    });

    // Injetar os 2 stats exclusivos do duplicado!
    if (match.match_date === '2026-08-07') {
      const dede = players.find(p => p.name === 'Dedé');
      if (dede && !match.match_player_stats.find(s => s.player_id === dede.id)) {
        match.match_player_stats.push({ player_id: dede.id, goals: 0, assists: 0, is_champion: false, is_runner_up: false, is_ralabosta: false });
        match.match_players.push({ player_id: dede.id, player: dede, team: null, category_at_match: dede.category });
        playerDetailsMap[dede.id] = match.match_players[match.match_players.length - 1];
      }
    }
    if (match.match_date === '2026-08-14') {
      const mago = players.find(p => p.name === 'Mago');
      if (mago && !match.match_player_stats.find(s => s.player_id === mago.id)) {
        match.match_player_stats.push({ player_id: mago.id, goals: 0, assists: 0, is_champion: false, is_runner_up: false, is_ralabosta: true });
        match.match_players.push({ player_id: mago.id, player: mago, team: null, category_at_match: mago.category });
        playerDetailsMap[mago.id] = match.match_players[match.match_players.length - 1];
      }
    }

    // Remover os 4 falsos exclusivos do canônico (para dar 463 exatos)
    match.match_player_stats = match.match_player_stats.filter(s => {
      const playerName = playerDetailsMap[s.player_id]?.player?.name;
      if (match.match_date === '2026-08-07' && (playerName === 'Luiz Antonio' || playerName === 'Neymem')) return false;
      if (match.match_date === '2026-08-14' && (playerName === 'Caio' || playerName === 'Rodrigo')) return false;
      return true;
    });

    match.match_player_stats?.forEach(playerStats => {
      const playerId = playerStats.player_id;
      const mp = playerDetailsMap[playerId];
      if (!mp || !mp.player) return;

      const fixKey = `${match.match_date}_${mp.player.name}`;
      if (manualFixes[fixKey]) {
        if (manualFixes[fixKey].is_champion !== undefined) playerStats.is_champion = manualFixes[fixKey].is_champion;
        if (manualFixes[fixKey].is_runner_up !== undefined) playerStats.is_runner_up = manualFixes[fixKey].is_runner_up;
        if (manualFixes[fixKey].is_ralabosta !== undefined) playerStats.is_ralabosta = manualFixes[fixKey].is_ralabosta;
        if (manualFixes[fixKey].goals !== undefined) playerStats.goals = manualFixes[fixKey].goals;
        if (manualFixes[fixKey].assists !== undefined) playerStats.assists = manualFixes[fixKey].assists;
      }

      // IMPORTANTE: Ricardo tem um GOL no duplicado e DOIS no canônico. A planilha diz 1 gol.
      if (match.match_date === '2026-08-07' && mp.player.name === 'Ricardo') {
        playerStats.goals = 1;
        playerStats.is_runner_up = true; // O duplicado diz Vice=true para Ricardo!
      }
      
      if (match.match_date === '2026-08-07' && mp.player.name === 'Wil') {
        // O canônico tinha GO=3, duplicado GO=3. Mas falta AS=0 e C=true.
        playerStats.is_champion = true;
        playerStats.assists = 0;
      }

      if (match.match_date === '2026-08-14' && mp.player.name === 'Wil') {
        // O canônico tinha GO=0. Duplicado GO=1.
        playerStats.goals = 1;
      }
      
      if (match.match_date === '2026-08-14' && mp.player.name === 'Flávio') {
         // Duplicado GO=0, AS=1, V=true
         playerStats.goals = 0;
         playerStats.is_runner_up = true;
      }
      
      if (match.match_date === '2026-08-07' && mp.player.name === 'Flávio') {
         // Duplicado GO=0, RB=true
         playerStats.goals = 0;
         playerStats.is_ralabosta = true;
      }

      if (match.match_date === '2026-08-07' && mp.player.name === 'Bau') {
         playerStats.is_ralabosta = true;
      }

      if (match.match_date === '2026-08-14' && mp.player.name === 'Lopez') {
         playerStats.is_champion = true;
      }

      if (match.match_date === '2026-08-14' && mp.player.name === 'Neymem') {
         playerStats.is_champion = true;
      }

      if (match.match_date === '2026-08-14' && mp.player.name === 'Marcos') {
         playerStats.is_runner_up = true;
      }

      simulatedTotalParticipations++;

      if (!statsMap[playerId]) {
        statsMap[playerId] = {
          name: mp.player.name,
          games: 0, goals: 0, assists: 0, champion: 0, vice: 0, ralabosta: 0, points: 0
        };
      }

      let isChamp = playerStats?.is_champion || false;
      let isVice = playerStats?.is_runner_up || false;
      let isRala = playerStats?.is_ralabosta || false;

      statsMap[playerId].games += 1;
      statsMap[playerId].goals += (playerStats.goals || 0);
      statsMap[playerId].assists += (playerStats.assists || 0);
      if (isChamp) statsMap[playerId].champion += 1;
      if (isVice) statsMap[playerId].vice += 1;
      if (isRala) statsMap[playerId].ralabosta += 1;
    });
  });

  const list = Object.values(statsMap);

  console.log(`\nPARTICIPAÇÕES OFICIAIS SIMULADAS: ${simulatedTotalParticipations}`);

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
