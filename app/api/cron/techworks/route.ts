import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { sendTelegramMessage } from '@/lib/telegram-bot'
import { TECHWORKS_CAMPAIGNS, BroadcastCampaign } from '@/lib/notifications'

// Рассылка о техработах 24.11.2026. Vercel cron дёргает роут в дни кампаний;
// кампания выбирается по сегодняшней дате в Москве. Повторные запуски
// безопасны: notification_log UNIQUE(user_id, trigger) не даёт отправить дважды,
// поэтому cron стоит несколько раз в день — каждый запуск дошлёт остаток.
//
// Ручной запуск:  ?campaign=techworks_2026_11_17
// Тест на себе:   ?campaign=...&test_chat_id=123  (без записи в notification_log)

export const maxDuration = 60
export const dynamic = 'force-dynamic'

const TIME_BUDGET_MS = 50_000 // останавливаемся до таймаута функции
const CONCURRENCY = 8 // ~20 msg/sec — ниже лимита Telegram 30 msg/sec
const PAGE = 1000 // Supabase отдаёт максимум 1000 строк за запрос

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function safeEqual(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

function moscowToday(): string {
  // en-CA даёт формат YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' }).format(new Date())
}

async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1)
    if (error) throw error
    out.push(...(data ?? []))
    if (!data || data.length < PAGE) return out
  }
}

async function sendOne(
  supabase: SupabaseClient,
  campaign: BroadcastCampaign,
  user: { id: string; telegram_id: number }
): Promise<'sent' | 'failed' | 'taken'> {
  // Резервируем слот — UNIQUE(user_id, trigger) защищает от двойной отправки
  const { error: insertError } = await supabase.from('notification_log').insert({
    user_id: user.id,
    telegram_id: user.telegram_id,
    trigger: campaign.trigger,
    group_: 'treatment',
  })

  if (insertError) {
    // 23505 = unique_violation: другой запуск уже взял этого пользователя
    if (insertError.code !== '23505') {
      console.error('[cron/techworks] insert error for user', user.id, insertError)
    }
    return 'taken'
  }

  const result = await sendTelegramMessage(user.telegram_id, campaign.text, campaign.buttons)

  await supabase
    .from('notification_log')
    .update({
      sent_at: new Date().toISOString(),
      message_id: result.message_id ?? null,
      delivered: result.delivered,
      bot_blocked: result.bot_blocked,
    })
    .eq('user_id', user.id)
    .eq('trigger', campaign.trigger)

  if (!result.delivered && !result.bot_blocked) {
    console.warn('[cron/techworks] not delivered to', user.telegram_id, result.error)
  }
  return result.delivered ? 'sent' : 'failed'
}

export async function GET(request: Request) {
  const started = Date.now()
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!safeEqual(secret, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const params = new URL(request.url).searchParams
  const requested = params.get('campaign')
  const today = moscowToday()
  const campaign = requested
    ? TECHWORKS_CAMPAIGNS.find((c) => c.trigger === requested)
    : TECHWORKS_CAMPAIGNS.find((c) => c.date === today)

  if (!campaign) {
    return NextResponse.json({ skipped: true, reason: requested ? 'unknown campaign' : `no campaign for ${today}` })
  }

  // Тестовая отправка одному чату, без логирования
  const testChatId = params.get('test_chat_id')
  if (testChatId) {
    const result = await sendTelegramMessage(Number(testChatId), campaign.text, campaign.buttons)
    return NextResponse.json({ test: true, campaign: campaign.trigger, result })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  let users: { id: string; telegram_id: number }[]
  let logged: { user_id: string }[]
  try {
    users = await fetchAll((from, to) =>
      supabase.from('users').select('id, telegram_id').not('telegram_id', 'is', null).order('id').range(from, to)
    )
    logged = await fetchAll((from, to) =>
      supabase.from('notification_log').select('user_id').eq('trigger', campaign.trigger).order('user_id').range(from, to)
    )
  } catch (err) {
    console.error('[cron/techworks] query error:', err)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  const loggedIds = new Set(logged.map((r) => r.user_id))
  const queue = users.filter((u) => !loggedIds.has(u.id))
  const stats = { sent: 0, failed: 0, taken: 0 }
  let next = 0

  async function worker() {
    while (next < queue.length && Date.now() - started < TIME_BUDGET_MS) {
      const user = queue[next++]
      stats[await sendOne(supabase, campaign!, user)]++
      await sleep(300)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  const remaining = queue.length - next
  const summary = {
    campaign: campaign.trigger,
    total_users: users.length,
    already_done: loggedIds.size,
    ...stats,
    remaining, // > 0 → следующий запуск cron дошлёт
  }
  console.log('[cron/techworks]', JSON.stringify(summary))
  return NextResponse.json(summary)
}
