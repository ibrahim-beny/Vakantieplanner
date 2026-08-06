import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anonKey) {
  throw new Error(
    'Supabase-configuratie ontbreekt: zet VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY in .env (zie README).',
  )
}

export const supabase = createClient(url, anonKey)
