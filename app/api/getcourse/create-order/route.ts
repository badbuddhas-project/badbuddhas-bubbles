/**
 * POST /api/getcourse/create-order — proxy for GetCourse HTML widget form submission.
 * Fetches fresh requestTime + requestSimpleSign tokens before submitting.
 */

import { NextResponse } from 'next/server'

const GC_WIDGET_URL = 'https://online.badbuddhas.ru/pl/lite/widget/widget?id=1576883'
const GC_FORM_URL = 'https://online.badbuddhas.ru/pl/lite/block-public/process-html?id=2218368276'

export async function POST(request: Request) {
  try {
    // 1. Fetch fresh HTML form to extract requestTime and requestSimpleSign
    const formPageRes = await fetch(GC_WIDGET_URL, {
      headers: { 'Accept': 'text/html' },
    })
    const formPageHtml = await formPageRes.text()

    const timeMatch = formPageHtml.match(/name="requestTime"\s+value="(\d+)"/)
    const signMatch = formPageHtml.match(/name="requestSimpleSign"\s+value="([a-f0-9]+)"/)

    const requestTime = timeMatch?.[1] || ''
    const requestSimpleSign = signMatch?.[1] || ''

    console.log('[create-order] Fresh tokens:', {
      requestTime,
      requestSimpleSign: requestSimpleSign ? requestSimpleSign.substring(0, 8) + '...' : 'EMPTY',
    })

    if (!requestTime || !requestSimpleSign) {
      console.error('[create-order] Failed to extract tokens from GC form')
      return NextResponse.json({ success: false, error: 'Failed to get form tokens' }, { status: 500 })
    }

    // 2. Read client body and inject fresh tokens
    const clientBody = await request.text()
    const params = new URLSearchParams(clientBody)
    params.set('requestTime', requestTime)
    params.set('requestSimpleSign', requestSimpleSign)

    // 3. Submit to GetCourse
    const gcRes = await fetch(GC_FORM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    const text = await gcRes.text()
    console.log('[create-order] GC response status:', gcRes.status, 'body:', text.substring(0, 500))

    // Try JSON parse
    try {
      const json = JSON.parse(text)
      return NextResponse.json(json)
    } catch {
      // GC may return HTML — try to extract redirect / payment URL
      const redirectMatch =
        text.match(/(?:window\.location\.href|location\.href|window\.location)\s*=\s*["']([^"']+)["']/) ||
        text.match(/href=["']([^"']*pay[^"']*)["']/) ||
        text.match(/action=["']([^"']*pay[^"']*)["']/)
      if (redirectMatch) {
        return NextResponse.json({ success: true, payment_link: redirectMatch[1] })
      }
      return NextResponse.json({
        success: false,
        error: 'GetCourse returned non-JSON response',
        raw: text.substring(0, 300),
      })
    }
  } catch (error) {
    console.error('[create-order] error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
