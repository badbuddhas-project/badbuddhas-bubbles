import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { sendTelegramMessage } from '@/lib/telegram-bot'
import { TRIAL_EXPIRED } from '@/lib/notifications'

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

export async function GET(request: Request) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!safeEqual(secret, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Users whose trial expired between 7 days ago and 1 hour ago, still not premium
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, telegram_id')
    .lt('trial_ends_at', oneHourAgo)
    .gt('trial_ends_at', sevenDaysAgo)
    .eq('is_premium', false)
    .not('telegram_id', 'is', null)

  if (usersError) {
    console.error('[cron/trial-expired] query error:', usersError)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  if (!users?.length) {
    return NextResponse.json({ sent: 0, skipped: 0 })
  }

  // Exclude users already in notification_log for this trigger
  const { data: alreadyLogged } = await supabase
    .from('notification_log')
    .select('user_id')
    .eq('trigger', TRIAL_EXPIRED.trigger)
    .in('user_id', users.map((u) => u.id))

  const loggedIds = new Set(alreadyLogged?.map((r) => r.user_id) ?? [])
  const eligible = users.filter((u) => !loggedIds.has(u.id))

  if (!eligible.length) {
    return NextResponse.json({ sent: 0, skipped: users.length })
  }

  let sent = 0
  const skipped = users.length - eligible.length

  for (const user of eligible) {
    // Reserve the slot — UNIQUE(user_id, trigger) prevents double processing
    const { error: insertError } = await supabase
      .from('notification_log')
      .insert({
        user_id: user.id,
        telegram_id: user.telegram_id,
        trigger: TRIAL_EXPIRED.trigger,
        group_: 'treatment',
      })

    if (insertError) {
      // 23505 = unique_violation: another cron run beat us to it
      if (insertError.code !== '23505') {
        console.error('[cron/trial-expired] insert error for user', user.id, insertError)
      }
      continue
    }

    const result = await sendTelegramMessage(
      user.telegram_id,
      TRIAL_EXPIRED.text,
      TRIAL_EXPIRED.button
    )

    await supabase
      .from('notification_log')
      .update({
        sent_at: new Date().toISOString(),
        message_id: result.message_id ?? null,
        delivered: result.delivered,
        bot_blocked: result.bot_blocked,
      })
      .eq('user_id', user.id)
      .eq('trigger', TRIAL_EXPIRED.trigger)

    if (result.delivered) {
      sent++
    } else {
      console.warn('[cron/trial-expired] not delivered to', user.telegram_id, result.error)
    }

    await sleep(35) // stay under Telegram's 30 msg/sec rate limit
  }

  console.log(`[cron/trial-expired] sent=${sent} skipped=${skipped}`)
  return NextResponse.json({ sent, skipped })
}
