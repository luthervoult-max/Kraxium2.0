import { supabase } from '@/lib/supabase'
import type { TablesUpdate } from '@/lib/database.types'

const AVATAR_BUCKET = 'profile-avatars'
const MAX_AVATAR_SIZE = 3 * 1024 * 1024
const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export interface AccountProfile {
  id: string
  email: string | null
  fullName: string | null
  nickname: string | null
  phone: string | null
  referralCode: string | null
  avatarUrl: string | null
  rankingVisible: boolean
  role: string | null
  createdAt: string | null
  updatedAt: string | null
}

export interface UpdateAccountProfileInput {
  fullName: string
  nickname: string
  phone: string
  referralCode: string
}

export async function getCurrentProfile(): Promise<AccountProfile> {
  const user = await requireCurrentUser()
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id,email,full_name,nickname,phone,referral_code,avatar_url,ranking_visible,role,created_at,updated_at',
    )
    .eq('id', user.id)
    .maybeSingle()

  if (error) throw error

  if (data) return normalizeProfile(data)

  const { data: created, error: createError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      email: user.email ?? null,
      full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      avatar_url: user.user_metadata?.avatar_url ?? null,
    })
    .select(
      'id,email,full_name,nickname,phone,referral_code,avatar_url,ranking_visible,role,created_at,updated_at',
    )
    .single()

  if (createError) throw createError
  return normalizeProfile(created)
}

export async function updateAccountProfile(input: UpdateAccountProfileInput) {
  const user = await requireCurrentUser()
  const update: TablesUpdate<'profiles'> = {
    full_name: cleanText(input.fullName),
    nickname: cleanText(input.nickname),
    phone: cleanPhone(input.phone),
    referral_code: cleanText(input.referralCode),
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', user.id)
    .select(
      'id,email,full_name,nickname,phone,referral_code,avatar_url,ranking_visible,role,created_at,updated_at',
    )
    .single()

  if (error) throw error
  return normalizeProfile(data)
}

export async function setRankingVisible(rankingVisible: boolean) {
  const user = await requireCurrentUser()
  const { data, error } = await supabase
    .from('profiles')
    .update({ ranking_visible: rankingVisible })
    .eq('id', user.id)
    .select(
      'id,email,full_name,nickname,phone,referral_code,avatar_url,ranking_visible,role,created_at,updated_at',
    )
    .single()

  if (error) throw error
  return normalizeProfile(data)
}

export async function uploadAccountAvatar(file: File) {
  const user = await requireCurrentUser()
  validateAvatar(file)

  const extension = file.name.split('.').pop()?.toLowerCase() || mimeExtension(file.type)
  const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type })

  if (uploadError) throw uploadError

  const publicUrl = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl
  const avatarUrl = `${publicUrl}?v=${Date.now()}`
  const { data, error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id)
    .select(
      'id,email,full_name,nickname,phone,referral_code,avatar_url,ranking_visible,role,created_at,updated_at',
    )
    .single()

  if (error) throw error
  return normalizeProfile(data)
}

export async function removeAccountAvatar(currentAvatarUrl?: string | null) {
  const user = await requireCurrentUser()
  const objectPath = currentAvatarUrl ? getStoragePathFromPublicUrl(currentAvatarUrl) : null

  if (objectPath?.startsWith(`${user.id}/`)) {
    await supabase.storage.from(AVATAR_BUCKET).remove([objectPath])
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ avatar_url: null })
    .eq('id', user.id)
    .select(
      'id,email,full_name,nickname,phone,referral_code,avatar_url,ranking_visible,role,created_at,updated_at',
    )
    .single()

  if (error) throw error
  return normalizeProfile(data)
}

export async function updateAccountPassword(password: string) {
  if (password.length < 8) {
    throw new Error('A senha precisa ter pelo menos 8 caracteres.')
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}

function normalizeProfile(row: {
  id: string
  email: string | null
  full_name: string | null
  nickname?: string | null
  phone?: string | null
  referral_code?: string | null
  avatar_url: string | null
  ranking_visible?: boolean | null
  role: string | null
  created_at: string | null
  updated_at?: string | null
}): AccountProfile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    nickname: row.nickname ?? null,
    phone: row.phone ?? null,
    referralCode: row.referral_code ?? null,
    avatarUrl: row.avatar_url,
    rankingVisible: row.ranking_visible ?? true,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? null,
  }
}

async function requireCurrentUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('Voce precisa estar logado para acessar a conta.')
  return data.user
}

function validateAvatar(file: File) {
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    throw new Error('Use uma imagem JPG, PNG ou WEBP.')
  }

  if (file.size > MAX_AVATAR_SIZE) {
    throw new Error('A imagem deve ter no maximo 3 MB.')
  }
}

function cleanText(value: string) {
  const text = value.trim()
  return text.length > 0 ? text : null
}

function cleanPhone(value: string) {
  const text = value.replace(/[^\d+()\-\s]/g, '').trim()
  return text.length > 0 ? text : null
}

function mimeExtension(type: string) {
  if (type === 'image/png') return 'png'
  if (type === 'image/webp') return 'webp'
  return 'jpg'
}

function getStoragePathFromPublicUrl(url: string) {
  const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`
  const [, pathWithQuery] = url.split(marker)
  return pathWithQuery?.split('?')[0] ?? null
}
