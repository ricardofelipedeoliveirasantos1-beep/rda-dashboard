const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envConfig = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    envConfig[key] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
  }
});

const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function inspectSchema() {
  const tables = ['matches', 'match_players', 'match_player_stats', 'players'];
  for (const t of tables) {
    console.log(`=== Schema for ${t} ===`);
    try {
      const { data, error } = await supabase.from(t).select('*').limit(1);
      if (error) {
        console.log(`Error reading table ${t}:`, error.message);
      } else {
        console.log(`Columns in ${t}:`, data && data[0] ? Object.keys(data[0]) : "Empty table");
        console.log(`Sample row in ${t}:`, data && data[0] ? data[0] : "None");
      }
    } catch (e) {
      console.log(`Exception on table ${t}:`, e);
    }
  }
}

inspectSchema();
