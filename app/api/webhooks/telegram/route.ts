import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { answerCallbackQuery } from '@/lib/telegram-bot'

const BOT_URL = `https://t.me/${process.env.NEXT_PUBLIC_BOT_USERNAME}`

export async function POST(request: Request) {
  const secret = request.headers.get('x-telegram-bot-api-secret-token')
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let update: Record<string, any>
  try {
    update = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!update.callback_query) {
    // We only subscribed to callback_query updates — nothing else expected
    return NextResponse.json({ ok: true })
  }

  const { id: queryId, from, data } = update.callback_query

  if (data === 'open_app') {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    await supabase
      .from('notification_log')
      .update({ clicked_at: new Date().toISOString() })
      .eq('telegram_id', from.id)
      .eq('trigger', 'trial_expired')
      .is('clicked_at', null)

    await answerCallbackQuery(queryId, BOT_URL)
  } else {
    await answerCallbackQuery(queryId)
  }

  return NextResponse.json({ ok: true })
}
