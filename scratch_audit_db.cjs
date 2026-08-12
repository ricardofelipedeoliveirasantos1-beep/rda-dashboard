const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envConfig = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    envConfig[key] = val;
  }
});

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseAnonKey = envConfig.VITE_SUPABASE_ANON_KEY;

console.log("Supabase URL:", supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runAudit() {
  console.log("=== DB AUDIT ===");
  
  // Test common tables
  const tablesToTest = ['profiles', 'users', 'roles', 'settings', 'avisos', 'matches', 'players', 'monthly_payments', 'assistant_permissions'];
  for (const t of tablesToTest) {
    try {
      const { error } = await supabase.from(t).select('count', { count: 'exact', head: true });
      if (error) {
        console.log(`Table '${t}' error: ${error.message} (code ${error.code})`);
      } else {
        console.log(`Table '${t}' exists!`);
      }
    } catch (e) {
      console.log(`Table '${t}' exception: ${e.message}`);
    }
  }

  // Check storage buckets
  try {
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    if (bucketsError) {
      console.log("Error listing buckets:", bucketsError.message);
    } else {
      console.log("Storage Buckets:", buckets.map(b => ({ name: b.name, public: b.public })));
    }
  } catch (err) {
    console.error("Error checking buckets:", err);
  }

  // Check settings columns
  try {
    const { data, error } = await supabase.from('settings').select('*').limit(1);
    if (error) {
      console.log("Error reading settings:", error.message);
    } else {
      console.log("Settings columns:", data && data[0] ? Object.keys(data[0]) : "No rows");
    }
  } catch (err) {
    console.error("Error reading settings schema:", err);
  }
}

runAudit();
