/**
 * POST /api/getcourse/create-order — proxy for GetCourse HTML widget form submission.
 * Tries to fetch fresh requestTime + requestSimpleSign tokens; falls back to submitting without them.
 */

import { NextResponse } from 'next/server'

const GC_FORM_URL = 'https://online.badbuddhas.ru/pl/lite/block-public/process-html?id=2218368276'

function extractTokens(html: string) {
  const timeMatch =
    html.match(/name="requestTime"\s+value="(\d+)"/) ||
    html.match(/requestTime["\s]*value="(\d+)"/) ||
    html.match(/requestTime.*?(\d{10})/)
  const signMatch =
    html.match(/name="requestSimpleSign"\s+value="([a-f0-9]+)"/) ||
    html.match(/requestSimpleSign["\s]*value="([a-f0-9]+)"/) ||
    html.match(/requestSimpleSign.*?([a-f0-9]{32})/)
  return { requestTime: timeMatch?.[1] || '', requestSimpleSign: signMatch?.[1] || '' }
}

export async function POST(request: Request) {
  try {
    // 1. Try to get fresh tokens from the form page (GET)
    let requestTime = ''
    let requestSimpleSign = ''

    try {
      const formPageRes = await fetch(GC_FORM_URL, {
        method: 'GET',
        headers: { 'Accept': 'text/html' },
      })
      const html = await formPageRes.text()
      console.log('[create-order] Form page (first 300):', html.substring(0, 300))

      const tokens = extractTokens(html)
      requestTime = tokens.requestTime
      requestSimpleSign = tokens.requestSimpleSign
      console.log('[create-order] Extracted tokens:', {
        requestTime,
        sign: requestSimpleSign ? requestSimpleSign.substring(0, 8) + '...' : 'EMPTY',
      })
    } catch (e) {
      console.error('[create-order] Token fetch failed:', e)
    }

    // 2. Read client body and set tokens if available
    const clientBody = await request.text()
    const params = new URLSearchParams(clientBody)

    if (requestTime && requestSimpleSign) {
      params.set('requestTime', requestTime)
      params.set('requestSimpleSign', requestSimpleSign)
    } else {
      // Fallback: submit without tokens
      params.delete('requestTime')
      params.delete('requestSimpleSign')
      console.log('[create-order] Submitting WITHOUT tokens (fallback)')
    }

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
