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
  console.log('Iniciando auditoria Fase 2 pre-limpeza...\n');

  // Fetch matches
  const { data: matches } = await supabase.from('matches').select('*');
  const matchById = {};
  let rdaOrgId = null;

  matches.forEach(m => {
    matchById[m.id] = m;
    if (m.org_id && !rdaOrgId) rdaOrgId = m.org_id;
  });

  const { data: matchPlayers } = await supabase.from('match_players').select('*');
  const { data: matchStats } = await supabase.from('match_player_stats').select('*');
  const { data: players } = await supabase.from('players').select('id, name');

  const playerMap = {};
  players.forEach(p => playerMap[p.id] = p.name);

  // 1 & 2. Internal duplication
  let internalDuplicationMp = 0;
  let internalDuplicationMs = 0;

  const mpPairs = {};
  matchPlayers.forEach(mp => {
    const key = `${mp.match_id}_${mp.player_id}`;
    mpPairs[key] = (mpPairs[key] || 0) + 1;
  });
  for (const [key, count] of Object.entries(mpPairs)) {
    if (count > 1) {
      internalDuplicationMp++;
      const [mId, pId] = key.split('_');
      console.log(`Duplicacao Interna MP: Data ${matchById[mId]?.match_date}, Match ${mId}, Player ${playerMap[pId] || pId}, Qtd: ${count}`);
    }
  }

  const msPairs = {};
  matchStats.forEach(ms => {
    const key = `${ms.match_id}_${ms.player_id}`;
    msPairs[key] = (msPairs[key] || 0) + 1;
  });
  for (const [key, count] of Object.entries(msPairs)) {
    if (count > 1) {
      internalDuplicationMs++;
      const [mId, pId] = key.split('_');
      console.log(`Duplicacao Interna MS: Data ${matchById[mId]?.match_date}, Match ${mId}, Player ${playerMap[pId] || pId}, Qtd: ${count}`);
    }
  }

  // Helper for 07/08 and 14/08
  const auditDate = (dateStr, canonicalId, duplicateId) => {
    const m1Mp = matchPlayers.filter(mp => mp.match_id === canonicalId);
    const m2Mp = matchPlayers.filter(mp => mp.match_id === duplicateId);
    
    const p1Ids = new Set(m1Mp.map(p => p.player_id));
    const p2Ids = new Set(m2Mp.map(p => p.player_id));
    
    let oficiais = 0;
    let soEstrutura = 0;

    p1Ids.forEach(id => {
      if (p2Ids.has(id)) oficiais++;
      else soEstrutura++;
    });

    console.log(`\nAUDITORIA ${dateStr}`);
    console.log(`JOGADORES NO APP: ${p1Ids.size}`);
    console.log(`JOGADORES OFICIAIS (PLANILHA/DUPLICADO): ${p2Ids.size}`);
    console.log(`COINCIDENTES (OFICIAL NO APP): ${oficiais}`);
    console.log(`SOMENTE ESTRUTURA DO APP: ${soEstrutura}`);
    return { app: p1Ids.size, oficial: oficiais, estrutura: soEstrutura };
  };

  const audit0708 = auditDate('2026-08-07', '55aaf887-3505-48a8-a843-2c22a815d234', '2444f31e-85d4-458b-a2db-ef210154cd44');
  const audit1408 = auditDate('2026-08-14', '178bf9ee-7ffd-4469-ba57-b24d160366c4', '18e08f1b-b12e-4590-9cbd-22136411be91');

  // 9 & 10. Audit 21/08
  const match2108 = matches.find(m => m.match_date === '2026-08-21');
  const mp2108 = matchPlayers.filter(mp => mp.match_id === match2108.id).length;
  const ms2108 = matchStats.filter(ms => ms.match_id === match2108.id).length;
  
  console.log(`\nAUDITORIA 21/08`);
  console.log(`MATCH_PLAYERS 21/08: ${mp2108}`);
  console.log(`MATCH_PLAYER_STATS 21/08: ${ms2108}`);
  
  const mpTotalCheck = 476 + 451 + mp2108;
  const msTotalCheck = 453 + 451 + ms2108;
  
  console.log(`\nCONTAGEM TOTAL MP FECHA (943 = 476 + 451 + ${mp2108})? ${mpTotalCheck === 943 ? 'SIM' : 'NAO'}`);
  console.log(`CONTAGEM TOTAL MS FECHA (916 = 453 + 451 + ${ms2108})? ${msTotalCheck === 916 ? 'SIM' : 'NAO'}`);
  
  console.log(`\nORG_ID DO RDA: ${rdaOrgId}`);
  
  fs.writeFileSync(path.join(__dirname, 'audit_report_fase2.json'), JSON.stringify({
    internalDuplicationMp,
    internalDuplicationMs,
    audit0708,
    audit1408,
    mp2108,
    ms2108,
    mpTotalCheck: mpTotalCheck === 943,
    msTotalCheck: msTotalCheck === 916,
    rdaOrgId
  }));
}

main().catch(console.error);
