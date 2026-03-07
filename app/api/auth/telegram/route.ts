import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * Verify Telegram Login Widget hash.
 * https://core.telegram.org/widgets/login#checking-authorization
 *
 * secret_key = SHA256(bot_token)
 * expected   = HMAC_SHA256(secret_key, data_check_string)
 */
function verifyTelegramHash(params: Record<string, string>, botToken: string): boolean {
  const { hash, ...rest } = params
  if (!hash) return false

  const dataCheckString = Object.entries(rest)
    .filter(([, v]) => v !== '' && v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')

  const secretKey = crypto.createHash('sha256').update(botToken).digest()
  const expected  = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

  return expected === hash
}

// ── Shared core logic ─────────────────────────────────────────────────────────
async function handleTelegramAuth(fields: {
  id: string
  first_name?: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: string
  hash: string
}): Promise<{ action_link: string } | { error: string }> {
  const { id, first_name = '', last_name = '', username = '', photo_url = '', auth_date, hash } = fields
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://badbuddhas-breathwork.vercel.app'

  if (!id || !auth_date || !hash) return { error: 'Missing required fields' }

  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) {
    console.error('[api/auth/telegram] TELEGRAM_BOT_TOKEN not set')
    return { error: 'Server configuration error' }
  }

  // Verify hash
  const paramMap: Record<string, string> = { id, auth_date, hash }
  if (first_name) paramMap.first_name = first_name
  if (last_name)  paramMap.last_name  = last_name
  if (username)   paramMap.username   = username
  if (photo_url)  paramMap.photo_url  = photo_url

  if (!verifyTelegramHash(paramMap, botToken)) {
    console.error('[api/auth/telegram] Invalid hash')
    return { error: 'Invalid Telegram signature' }
  }

  // Check auth_date freshness (max 24 h)
  if (Math.floor(Date.now() / 1000) - parseInt(auth_date) > 86400) {
    return { error: 'Authorization expired — please try again' }
  }

  const telegramId     = parseInt(id)
  const syntheticEmail = `tg_${telegramId}@badbuddhas.app`

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Generate Supabase magic link (creates auth user if needed)
  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: syntheticEmail,
    options: {
      data: { telegram_id: telegramId, source: 'telegram_widget' },
      redirectTo: baseUrl,
    },
  })

  if (linkErr || !linkData?.properties?.action_link) {
    console.error('[api/auth/telegram] generateLink failed:', linkErr?.message)
    return { error: 'Failed to create session — please try again' }
  }

  const supabaseUserId = linkData.user.id

  // Find or create user in our users table
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id, supabase_user_id')
    .eq('telegram_id', telegramId)
    .maybeSingle()

  if (existingUser) {
    const updates: Record<string, unknown> = {
      first_name: first_name || null,
      last_name:  last_name  || null,
      username:   username   || null,
    }
    if (existingUser.supabase_user_id !== supabaseUserId) {
      updates.supabase_user_id = supabaseUserId
    }
    await supabaseAdmin.from('users').update(updates).eq('id', existingUser.id)
  } else {
    await supabaseAdmin.from('users').insert({
      telegram_id:      telegramId,
      supabase_user_id: supabaseUserId,
      first_name:       first_name || null,
      last_name:        last_name  || null,
      username:         username   || null,
    })
  }

  console.log('[api/auth/telegram] Success, telegramId:', telegramId)
  return { action_link: linkData.properties.action_link }
}

// ── POST — called by the data-onauth callback via fetch ───────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await handleTelegramAuth(body)

    if ('error' in result) {
      return NextResponse.json(result, { status: 400 })
    }
    return NextResponse.json(result)
  } catch (err) {
    console.error('[api/auth/telegram] POST error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// ── GET — kept as fallback for data-auth-url redirect flow ────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://badbuddhas-breathwork.vercel.app'

  const result = await handleTelegramAuth({
    id:         searchParams.get('id')         ?? '',
    first_name: searchParams.get('first_name') ?? '',
    last_name:  searchParams.get('last_name')  ?? '',
    username:   searchParams.get('username')   ?? '',
    photo_url:  searchParams.get('photo_url')  ?? '',
    auth_date:  searchParams.get('auth_date')  ?? '',
    hash:       searchParams.get('hash')       ?? '',
  })

  if ('error' in result) {
    const params = new URLSearchParams({ error: result.error })
    return NextResponse.redirect(new URL(`/login?${params}`, baseUrl))
  }
  return NextResponse.redirect(result.action_link)
}
