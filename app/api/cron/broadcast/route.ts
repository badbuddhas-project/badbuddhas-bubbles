import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { sendTelegramMessage } from '@/lib/telegram-bot'
import { BROADCAST_NAVIGATION } from '@/lib/notifications'

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

const CAMPAIGN = BROADCAST_NAVIGATION

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

  // All users with a linked Telegram account
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, telegram_id')
    .not('telegram_id', 'is', null)

  if (usersError) {
    console.error('[cron/broadcast] query error:', usersError)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  if (!users?.length) {
    return NextResponse.json({ sent: 0, skipped: 0 })
  }

  // Exclude users already processed for this campaign (idempotent re-runs)
  const { data: alreadyLogged } = await supabase
    .from('notification_log')
    .select('user_id')
    .eq('trigger', CAMPAIGN.trigger)
    .in('user_id', users.map((u) => u.id))

  const loggedIds = new Set(alreadyLogged?.map((r) => r.user_id) ?? [])
  const eligible = users.filter((u) => !loggedIds.has(u.id))

  if (!eligible.length) {
    return NextResponse.json({ sent: 0, skipped: users.length })
  }

  let sent = 0
  const skipped = users.length - eligible.length

  for (const user of eligible) {
    // Reserve the slot — UNIQUE(user_id, trigger) prevents double sends
    const { error: insertError } = await supabase
      .from('notification_log')
      .insert({
        user_id: user.id,
        telegram_id: user.telegram_id,
        trigger: CAMPAIGN.trigger,
        group_: 'treatment',
      })

    if (insertError) {
      // 23505 = unique_violation: another run beat us to it
      if (insertError.code !== '23505') {
        console.error('[cron/broadcast] insert error for user', user.id, insertError)
      }
      continue
    }

    const result = await sendTelegramMessage(
      user.telegram_id,
      CAMPAIGN.text,
      CAMPAIGN.button
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
      .eq('trigger', CAMPAIGN.trigger)

    if (result.delivered) {
      sent++
    } else {
      console.warn('[cron/broadcast] not delivered to', user.telegram_id, result.error)
    }

    await sleep(35) // stay under Telegram's 30 msg/sec rate limit
  }

  console.log(`[cron/broadcast] sent=${sent} skipped=${skipped}`)
  return NextResponse.json({ sent, skipped })
}
