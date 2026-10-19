import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '..', '.env.local');
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
  console.log('Iniciando mapeamento de duplicatas...');

  // 1. Fetch all matches
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('*')
    .order('match_date', { ascending: true })
    .order('created_at', { ascending: true });

  if (matchesError) throw matchesError;

  // Group by date
  const matchesByDate = {};
  matches.forEach(m => {
    if (!matchesByDate[m.match_date]) matchesByDate[m.match_date] = [];
    matchesByDate[m.match_date].push(m);
  });

  // 2. Fetch all match_players and stats
  const { data: matchPlayers, error: mpError } = await supabase.from('match_players').select('*');
  if (mpError) throw mpError;

  const { data: matchStats, error: msError } = await supabase.from('match_player_stats').select('*');
  if (msError) throw msError;

  const mpByMatch = {};
  matchPlayers.forEach(mp => {
    if (!mpByMatch[mp.match_id]) mpByMatch[mp.match_id] = [];
    mpByMatch[mp.match_id].push(mp);
  });

  const msByMatch = {};
  matchStats.forEach(ms => {
    if (!msByMatch[ms.match_id]) msByMatch[ms.match_id] = [];
    msByMatch[ms.match_id].push(ms);
  });

  let output = '# MAPA DE DUPLICATAS DE PARTIDAS\n\n';
  let specialOutput = '# AUDITORIA ESPECIAL (Mistura App/Histórico)\n\n';

  for (const [date, dateMatches] of Object.entries(matchesByDate)) {
    if (dateMatches.length === 1) {
      if (date === '2026-08-21') continue; // Rodada unica esperada
      output += `Data: ${date} - INESPERADO: Apenas 1 partida.\n\n`;
      continue;
    }

    if (dateMatches.length > 2) {
      output += `Data: ${date} - ALERTA: Mais de 2 partidas (${dateMatches.length}).\n\n`;
    }

    // Identificar Canônico vs Duplicado
    // Regra heurística inicial: 
    // O que tem "source='app'" ou tem mais preenchimento estrutural tem preferência.
    // Entre dois importados iguais, o mais antigo ou o que tem mais dados de stats.
    
    let canonical = dateMatches[0];
    let duplicate = dateMatches[1];
    let motivo = "Decisão baseada em created_at (o mais antigo mantido)";

    // Se um é app e outro historical
    if (canonical.source === 'historical_import' && duplicate.source === 'app') {
      canonical = dateMatches[1];
      duplicate = dateMatches[0];
      motivo = "Partida originada do App mantida como canônica.";
    } else if (canonical.source === 'app' && duplicate.source === 'historical_import') {
       motivo = "Partida originada do App mantida como canônica.";
    } else {
       // Checar qual tem mais dados estruturais
       const m1Players = mpByMatch[canonical.id]?.length || 0;
       const m2Players = mpByMatch[duplicate.id]?.length || 0;
       const m1Stats = msByMatch[canonical.id]?.length || 0;
       const m2Stats = msByMatch[duplicate.id]?.length || 0;

       if (m2Players > m1Players || m2Stats > m1Stats) {
           canonical = dateMatches[1];
           duplicate = dateMatches[0];
           motivo = "Registro com mais jogadores/estatísticas mantido como canônico.";
       }
    }

    const m1 = canonical;
    const m2 = duplicate;
    
    const p1 = mpByMatch[m1.id]?.length || 0;
    const p2 = mpByMatch[m2.id]?.length || 0;
    const s1 = msByMatch[m1.id]?.length || 0;
    const s2 = msByMatch[m2.id]?.length || 0;

    const relatorioData = `${date}

CANÔNICO:
${m1.id}
Criado em: ${m1.created_at}
Origem: ${m1.source || 'Não especificada'}
Status: ${m1.status}

DUPLICADO:
${m2.id}
Criado em: ${m2.created_at}
Origem: ${m2.source || 'Não especificada'}
Status: ${m2.status}

Motivo:
${motivo}

Jogadores canônico:
${p1}

Jogadores duplicado:
${p2}

Stats canônico:
${s1}

Stats duplicado:
${s2}

---
`;

    if (date === '2026-08-07' || date === '2026-08-14') {
        specialOutput += relatorioData;
        specialOutput += `Detalhes Adicionais do Canônico (App):
Champion Team: ${m1.champion_team}
Runner Up: ${m1.runner_up_team}
Times Definidos: ${m1.team_count || 'N/A'}
Cartões Amarelos/Azuis (estimativa via stats): ${
    msByMatch[m1.id]?.reduce((acc, s) => acc + (s.yellow_cards||0) + (s.blue_cards||0), 0) || 0
}

Detalhes Adicionais do Duplicado (Histórico):
Champion Team: ${m2.champion_team}
Runner Up: ${m2.runner_up_team}
Times Definidos: ${m2.team_count || 'N/A'}
Cartões Amarelos/Azuis (estimativa via stats): ${
    msByMatch[m2.id]?.reduce((acc, s) => acc + (s.yellow_cards||0) + (s.blue_cards||0), 0) || 0
}

==================================================\n\n`;
    } else {
        output += relatorioData;
    }
  }

  const finalStr = output + '\n' + specialOutput;
  fs.writeFileSync(path.join(__dirname, 'mapa_duplicatas.md'), finalStr);
  console.log('Mapa gerado em scratch/mapa_duplicatas.md');
}

main().catch(console.error);
