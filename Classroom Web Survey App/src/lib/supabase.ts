import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isConfigured = Boolean(url && anonKey)

// A placeholder URL keeps the app rendering (with a clear setup message) when env vars are missing.
export const supabase = createClient(url ?? 'http://localhost:54321', anonKey ?? 'missing-anon-key')
