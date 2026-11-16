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
  button?: { text: string; url: string } | { text: string; url: string }[],
  attempt = 0
): Promise<SendResult> {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  }

  // Одна кнопка или несколько — каждая отдельной строкой
  const buttons = button ? (Array.isArray(button) ? button : [button]) : []
  if (buttons.length) {
    body.reply_markup = {
      inline_keyboard: buttons.map((b) => [{ text: b.text, url: b.url }]),
    }
  }

  let res: Response
  try {
    res = await fetch(`${API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    })
  } catch (err) {
    return { ok: false, delivered: false, bot_blocked: false, error: String(err) }
  }

  const data = await res.json()

  if (res.status === 403) {
    // User blocked the bot
    return { ok: false, delivered: false, bot_blocked: true, error: data.description }
  }

  if (res.status === 429 && attempt < 3) {
    // Flood limit: wait as long as Telegram asks and retry
    const retryAfter = Number(data.parameters?.retry_after ?? 1)
    await new Promise((r) => setTimeout(r, (retryAfter + 0.5) * 1000))
    return sendTelegramMessage(chatId, text, button, attempt + 1)
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
  try {
    await fetch(`${API}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: queryId, ...(url ? { url } : {}) }),
      signal: AbortSignal.timeout(10_000),
    })
  } catch (err) {
    console.warn('[telegram-bot] answerCallbackQuery failed:', err)
  }
}
