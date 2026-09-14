import { createClient } from "@supabase/supabase-js";

// 1. Go to https://supabase.com → New project (free tier is fine to start)
// 2. Project Settings → API → copy "Project URL" and "anon public" key
// 3. Put them in a .env file at your project root (NOT committed to git):
//      VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
//      VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
// (Using Vite env var names here — rename the prefix if you're on Next.js
//  or Create React App: NEXT_PUBLIC_ / REACT_APP_)

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
