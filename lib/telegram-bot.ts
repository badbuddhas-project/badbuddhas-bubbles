const API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

export interface SendResult {
  ok: boolean
  message_id?: number
  delivered: boolean
  bot_blocked: boolean
  error?: string
}

export async function sendTelegramMessage(
  chatId: number,
  text: string,
  button?: { text: string; callbackData: string }
): Promise<SendResult> {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  }

  if (button) {
    body.reply_markup = {
      inline_keyboard: [[{ text: button.text, callback_data: button.callbackData }]],
    }
  }

  let res: Response
  try {
    res = await fetch(`${API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (err) {
    return { ok: false, delivered: false, bot_blocked: false, error: String(err) }
  }

  const data = await res.json()

  if (res.status === 403) {
    // User blocked the bot
    return { ok: false, delivered: false, bot_blocked: true, error: data.description }
  }

  if (!res.ok) {
    return { ok: false, delivered: false, bot_blocked: false, error: data.description }
  }

  return {
    ok: true,
    delivered: true,
    bot_blocked: false,
    message_id: data.result?.message_id,
  }
}

export async function answerCallbackQuery(queryId: string, url?: string): Promise<void> {
  await fetch(`${API}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: queryId, ...(url ? { url } : {}) }),
  })
}
