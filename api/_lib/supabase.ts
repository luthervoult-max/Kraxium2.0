import { createClient } from '@supabase/supabase-js'
import { getBearerToken, HttpError, type ApiRequest } from './http.js'

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL e obrigatoria nas funcoes da Vercel.')
}

if (!serviceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY e obrigatoria nas funcoes da Vercel.')
}

export const serviceSupabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

export async function requireUser(req: ApiRequest) {
  const token = getBearerToken(req)
  const { data, error } = await serviceSupabase.auth.getUser(token)

  if (error || !data.user) {
    throw new HttpError(401, 'Sessao invalida. Faca login novamente.')
  }

  return data.user
}
