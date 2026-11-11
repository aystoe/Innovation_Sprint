import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? ''
function configurationError(): string | null {
  if (!url || !key) return 'Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local, then restart the app.'
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))) return 'Use an HTTPS Supabase project URL.'
  } catch { return 'VITE_SUPABASE_URL is not a valid URL.' }
  if (!key.startsWith('sb_publishable_')) return 'Use a Supabase publishable key (sb_publishable_…). Never use a secret or service-role key.'
  return null
}
export const supabaseConfigError = configurationError()
export const supabase = supabaseConfigError ? null : createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
})
export function requireSupabase() {
  if (!supabase) throw new Error(supabaseConfigError ?? 'Supabase is not configured.')
  return supabase
}
