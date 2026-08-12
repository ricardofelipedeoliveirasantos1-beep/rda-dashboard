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

async function inspectData() {
  console.log("=== PROFILES ===");
  try {
    const { data, error } = await supabase.from('profiles').select('*').limit(5);
    console.log("Profiles sample:", data, error);
  } catch(e) { console.log(e); }

  console.log("=== USERS ===");
  try {
    const { data, error } = await supabase.from('users').select('*').limit(5);
    console.log("Users sample:", data, error);
  } catch(e) { console.log(e); }

  console.log("=== ROLES ===");
  try {
    const { data, error } = await supabase.from('roles').select('*').limit(5);
    console.log("Roles sample:", data, error);
  } catch(e) { console.log(e); }

  console.log("=== ASSISTANT PERMISSIONS ===");
  try {
    const { data, error } = await supabase.from('assistant_permissions').select('*').limit(5);
    console.log("Permissions sample:", data, error);
  } catch(e) { console.log(e); }

  console.log("=== SETTINGS ===");
  try {
    const { data, error } = await supabase.from('settings').select('*').limit(5);
    console.log("Settings sample:", data, error);
  } catch(e) { console.log(e); }
}

inspectData();
