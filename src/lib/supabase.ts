import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isValidUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
};

if (!isValidUrl(supabaseUrl) || !supabaseAnonKey) {
  console.warn("Supabase URL ou Anon Key não configuradas ou inválidas no arquivo .env.local!");
}

export const supabase = createClient(
  isValidUrl(supabaseUrl) ? supabaseUrl! : "https://placeholder-project.supabase.co", 
  supabaseAnonKey || "placeholder-key"
);
