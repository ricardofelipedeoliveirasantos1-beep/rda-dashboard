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
    .select('id, match_date, source')
    .order('match_date', { ascending: true })
    .order('created_at', { ascending: true });

  const groupedMatches = {};
  matchesData.forEach(m => {
    if (!groupedMatches[m.match_date]) groupedMatches[m.match_date] = [];
    groupedMatches[m.match_date].push(m);
  });

  for (const date in groupedMatches) {
    const list = groupedMatches[date];
    if (list.length > 1) {
      console.log(`${date} - Canonical Source: ${list[0].source} | Duplicate Source: ${list[1].source}`);
    }
  }
}

main().catch(console.error);
