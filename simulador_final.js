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
  console.log('--- EXECUTANDO AUDITORIA E SIMULAÇÃO PÓS-LIMPEZA ---');

  const { data: players } = await supabase.from('players').select('*');
  console.log(`\n15. NORMALIZAÇÃO DE WIL E CAIO:`);
  const wils = players.filter(p => p.name.toLowerCase() === 'wil');
  console.log(`- Registros para 'Wil': ${wils.length} (Esperado 1)`);
  const caios = players.filter(p => p.name.toLowerCase() === 'caio');
  console.log(`- Registros para 'Caio': ${caios.length} (Esperado 1)`);
  
  const playerMap = {};
  players.forEach(p => playerMap[p.id] = p);

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

  // 1. Separar Canônicos e Duplicados
  const groupedMatches = {};
  matchesData.forEach(m => {
    if (!groupedMatches[m.match_date]) groupedMatches[m.match_date] = [];
    groupedMatches[m.match_date].push(m);
  });

  const canonicalMatches = [];
  const duplicateMatches = [];

  for (const date in groupedMatches) {
    const list = groupedMatches[date];
    canonicalMatches.push(list[0]);
    for (let i = 1; i < list.length; i++) {
      duplicateMatches.push(list[i]);
    }
  }

  console.log(`\n18/19. CONTAGEM POR DATA:`);
  let hasDuplicateDateError = false;
  for (const date in groupedMatches) {
    const list = groupedMatches[date];
    const canonicalStats = list[0].match_player_stats || [];
    let isDuplicated = list.length > 1;
    // Planilha = numero de participações do canônico
    console.log(`- ${date} | Simuladas (ap�s limpar duplicado): ${canonicalStats.length} | Status: ${isDuplicated ? 'DUPLICADO' : 'OK'}`);
  }

  // Identificar os 14 conflitos de estatísticas (já mapeados anteriormente)
  // Vamos aplicar as correções manuais baseadas na Planilha diretamente nos stats do Canônico
  // Isso é importante porque se não atualizarmos o canônico, perderemos os stats corretos
  
  const manualFixes = {
    // 07/08/2026 - Júnior
    '2026-08-07_Junior': { goals: 0, assists: 0, is_champion: false, is_runner_up: true, is_ralabosta: false },
    // 07/08/2026 - Michel
    '2026-08-07_Michel': { goals: 1, assists: 0, is_champion: true, is_runner_up: false, is_ralabosta: false },
    // 07/08/2026 - Caio
    '2026-08-07_Caio': { goals: 0, assists: 0, is_champion: false, is_runner_up: true, is_ralabosta: false },
    // 07/08/2026 - Daniel
    '2026-08-07_Daniel': { goals: 0, assists: 0, is_champion: true, is_runner_up: false, is_ralabosta: false },
    // 07/08/2026 - Rodrigo
    '2026-08-07_Rodrigo': { goals: 0, assists: 1, is_champion: false, is_runner_up: false, is_ralabosta: true },
    // 14/08/2026 - Wil
    '2026-08-14_Wil': { goals: 0, assists: 1, is_champion: true, is_runner_up: false, is_ralabosta: false },
    // 14/08/2026 - Michel
    '2026-08-14_Michel': { goals: 0, assists: 1, is_champion: false, is_runner_up: true, is_ralabosta: false },
    // 14/08/2026 - Ytalo
    '2026-08-14_Ytalo': { goals: 3, assists: 0, is_champion: true, is_runner_up: false, is_ralabosta: false },
    // 14/08/2026 - Valdizar
    '2026-08-14_Valdizar': { goals: 2, assists: 0, is_champion: false, is_runner_up: false, is_ralabosta: true },
    // 14/08/2026 - Caio
    '2026-08-14_Caio': { goals: 0, assists: 2, is_champion: true, is_runner_up: false, is_ralabosta: false },
    // 14/08/2026 - Junior
    '2026-08-14_Junior': { goals: 0, assists: 1, is_champion: true, is_runner_up: false, is_ralabosta: false },
    // 14/08/2026 - Daniel
    '2026-08-14_Daniel': { goals: 0, assists: 0, is_champion: false, is_runner_up: false, is_ralabosta: true },
    // 14/08/2026 - Adones
    '2026-08-14_Adones': { goals: 0, assists: 0, is_champion: false, is_runner_up: true, is_ralabosta: false },
    // 14/08/2026 - Andre
    '2026-08-14_Andre': { goals: 1, assists: 0, is_champion: false, is_runner_up: false, is_ralabosta: true },
    
    // Stats exclusivos que estavam faltando no canônico
    // 07/08/2026 - Luan
    '2026-08-07_Luan': { goals: 1, assists: 0, is_champion: false, is_runner_up: false, is_ralabosta: false },
    // 07/08/2026 - Wil
    '2026-08-07_Wil': { goals: 0, assists: 0, is_champion: false, is_runner_up: false, is_ralabosta: true }
  };

  let simulatedTotalParticipations = 0;
  const statsMap = {};

  console.log(`\n7. AUDITORIA DOS DADOS DE RICARDO NA SIMULAÇÃO`);
  const ricardoSimulations = [];

  canonicalMatches.forEach(match => {
    const isHistorical = match.source === 'historical_manual' || match.source === 'historical_import';
    
    const playerDetailsMap = {};
    match.match_players?.forEach(mp => {
      if (mp.player) playerDetailsMap[mp.player.id] = mp;
    });

    // Simular injeção dos stats exclusivos caso não existam no canônico
    if (match.match_date === '2026-08-07') {
      const wilPlayer = players.find(p => p.name === 'Wil');
      const luanPlayer = players.find(p => p.name === 'Luan');
      if (wilPlayer && !match.match_player_stats.find(s => s.player_id === wilPlayer.id)) {
        match.match_player_stats.push({ player_id: wilPlayer.id, goals: 0, assists: 0, is_champion: false, is_runner_up: false, is_ralabosta: true });
        match.match_players.push({ player_id: wilPlayer.id, player: wilPlayer, team: null, category_at_match: wilPlayer.category });
        playerDetailsMap[wilPlayer.id] = match.match_players[match.match_players.length - 1];
      }
      if (luanPlayer && !match.match_player_stats.find(s => s.player_id === luanPlayer.id)) {
        match.match_player_stats.push({ player_id: luanPlayer.id, goals: 1, assists: 0, is_champion: false, is_runner_up: false, is_ralabosta: false });
        match.match_players.push({ player_id: luanPlayer.id, player: luanPlayer, team: null, category_at_match: luanPlayer.category });
        playerDetailsMap[luanPlayer.id] = match.match_players[match.match_players.length - 1];
      }
    }

    match.match_player_stats?.forEach(playerStats => {
      const playerId = playerStats.player_id;
      const mp = playerDetailsMap[playerId];
      if (!mp || !mp.player) return;

      // Aplicar correções (14 conflitos + 2 exclusivos)
      const fixKey = `${match.match_date}_${mp.player.name}`;
      if (manualFixes[fixKey]) {
        playerStats.goals = manualFixes[fixKey].goals;
        playerStats.assists = manualFixes[fixKey].assists;
        playerStats.is_champion = manualFixes[fixKey].is_champion;
        playerStats.is_runner_up = manualFixes[fixKey].is_runner_up;
        playerStats.is_ralabosta = manualFixes[fixKey].is_ralabosta;
      }

      if (!isHistorical && mp.category_at_match === 'Diarista') return;

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

      if (mp.player.name === 'Ricardo') {
        ricardoSimulations.push({
          match_id: match.id,
          date: match.match_date,
          is_canonical: true,
          countForJg: 'SIM',
          gols: playerStats.goals || 0,
          assists: playerStats.assists || 0,
          status: match.status
        });
      }

      statsMap[playerId].games += 1;
      statsMap[playerId].goals += (playerStats.goals || 0);
      statsMap[playerId].assists += (playerStats.assists || 0);
      
      if (isChamp) statsMap[playerId].champion += 1;
      if (isVice) statsMap[playerId].vice += 1;
      if (isRala) statsMap[playerId].ralabosta += 1;
    });
  });

  ricardoSimulations.sort((a,b) => a.date.localeCompare(b.date));
  ricardoSimulations.forEach(r => {
    console.log(`- Ricardo | Data: ${r.date} | ID: ${r.match_id} | Canônico: Sim | Contou p/ JG: ${r.countForJg} | Gols: ${r.gols} | Ast: ${r.assists}`);
  });

  const list = Object.values(statsMap).map((ps) => ({
    ...ps,
    points: ps.goals + ps.assists + (ps.champion * 3) + (ps.vice * 1)
  }));

  console.log(`\n34. VALIDAÇÃO AUTOMÁTICA ESPERADA`);
  console.log(`- PLAYERS SIMULADOS: ${players.length} (Esperado 49)`);
  console.log(`- MATCHES SIMULADOS: ${canonicalMatches.length} (Esperado 30)`);
  console.log(`- PARTICIPAÇÕES OFICIAIS SIMULADAS: ${simulatedTotalParticipations} (Esperado 463)`);
  console.log(`- PARES DUPLICADOS RESTANTES: 0 (Esperado 0)`);

  const targets = [
    { name: 'Ricardo', ex: { games: 28, goals: 44, assists: 25, champion: 9, vice: 9, ralabosta: 5 } },
    { name: 'Wil', ex: { games: 27, goals: 33, assists: 23, champion: 11, vice: 4, ralabosta: 7 } },
    { name: 'Ytalo', ex: { games: 26, goals: 40, assists: 7, champion: 4, vice: 5, ralabosta: 11 } },
    { name: 'Adones', ex: { games: 25, goals: 2, assists: 6, champion: 3, vice: 7, ralabosta: 12 } },
    { name: 'Andre', ex: { games: 28, goals: 18, assists: 21, champion: 7, vice: 7, ralabosta: 10 } }
  ];

  console.log(`\n46. GABARITO`);
  targets.forEach(t => {
    const p = list.find(x => x.name === t.name);
    if (!p) {
      console.log(`${t.name}: FALHOU (Não encontrado)`);
      return;
    }
    
    const isCorrect = p.games === t.ex.games && p.goals === t.ex.goals && p.assists === t.ex.assists && p.champion === t.ex.champion && p.vice === t.ex.vice && p.ralabosta === t.ex.ralabosta;
    
    console.log(`${t.name}: ${isCorrect ? 'CORRETO' : 'FALHOU'}`);
    if (!isCorrect) {
      console.log(`   Simulado: JG ${p.games} | GO ${p.goals} | AS ${p.assists} | C ${p.champion} | V ${p.vice} | RB ${p.ralabosta}`);
      console.log(`   Esperado: JG ${t.ex.games} | GO ${t.ex.goals} | AS ${t.ex.assists} | C ${t.ex.champion} | V ${t.ex.vice} | RB ${t.ex.ralabosta}`);
    }
  });

  console.log('\nARTILHEIRO:');
  const topGols = [...list].sort((a,b) => b.goals - a.goals || b.assists - a.assists).slice(0, 3);
  topGols.forEach((x, i) => console.log(`${i+1}º ${x.name} - ${x.goals} gols`));

  console.log('\nASSISTÊNCIAS:');
  const topAssist = [...list].sort((a,b) => b.assists - a.assists || b.goals - a.goals).slice(0, 3);
  topAssist.forEach((x, i) => console.log(`${i+1}º ${x.name} - ${x.assists} ast`));

  console.log('\nRALABOSTA:');
  const topRb = [...list].sort((a,b) => b.ralabosta - a.ralabosta).slice(0, 3);
  topRb.forEach((x, i) => console.log(`${i+1}º ${x.name} - ${x.ralabosta} rb`));

}

main().catch(console.error);
