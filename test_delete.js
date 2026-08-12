import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env.local
const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = envContent.split('\n').reduce((acc, line) => {
  const [key, val] = line.split('=');
  if (key && val) acc[key.trim()] = val.trim();
  return acc;
}, {});

const supabase = createClient(envVars['VITE_SUPABASE_URL'], envVars['VITE_SUPABASE_ANON_KEY']);

async function testDelete() {
  const { data, error } = await supabase.from('matches').delete().eq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Delete matches error:', error);

  const { error: err2 } = await supabase.from('match_players').delete().eq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Delete match_players error:', err2);
  
  const { error: err3 } = await supabase.from('match_player_stats').delete().eq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Delete match_player_stats error:', err3);
}

testDelete();
