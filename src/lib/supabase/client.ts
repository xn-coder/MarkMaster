import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || supabaseUrl === "YOUR_SUPABASE_URL_HERE") {
  throw new Error("CRITICAL: NEXT_PUBLIC_SUPABASE_URL is missing or uses a placeholder. Please update it in your .env file with your actual Supabase Project URL (found in Supabase Dashboard > Project Settings > API) and restart your development server.");
}
if (!supabaseAnonKey || supabaseAnonKey === "YOUR_SUPABASE_ANON_KEY_HERE") {
  throw new Error("CRITICAL: NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or uses a placeholder. Please update it in your .env file with your actual Supabase Anon (public) Key (found in Supabase Dashboard > Project Settings > API) and restart your development server.");
}

let supabaseClient: ReturnType<typeof createBrowserClient>;

function getSupabaseBrowserClient() {
  if (!supabaseClient) {
    supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseClient;
}

export const supabase = getSupabaseBrowserClient();
