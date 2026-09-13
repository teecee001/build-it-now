import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Locked to the owned Supabase project. Lovable Cloud env must not override this.
const SUPABASE_URL = "https://vxcxwmhesgpncbkhwsej.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ceCUc9fqMwACxBU43yg43Q_nmKqkbmt";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});
