/**
 * POST /api/getcourse/create-order — proxy for GetCourse HTML widget form submission.
 * Avoids CORS issues when submitting from the client.
 */

import { NextResponse } from 'next/server'

const GC_FORM_URL = 'https://online.badbuddhas.ru/pl/lite/block-public/process-html?id=2218368276'

export async function POST(request: Request) {
  try {
    const body = await request.text()

    const res = await fetch(GC_FORM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })

    const text = await res.text()
    console.log('[create-order] GC response status:', res.status, 'body:', text.substring(0, 500))

    // Try JSON parse first
    try {
      const json = JSON.parse(text)
      return NextResponse.json(json)
    } catch {
      // GC may return HTML — try to extract redirect URL
      const redirectMatch = text.match(/(?:window\.location\.href|location\.href|window\.location)\s*=\s*["']([^"']+)["']/)
        || text.match(/href=["']([^"']*pay[^"']*)["']/)
        || text.match(/action=["']([^"']*pay[^"']*)["']/)
      if (redirectMatch) {
        return NextResponse.json({ success: true, payment_link: redirectMatch[1] })
      }
      // Return raw text for debugging
      return NextResponse.json({ success: false, raw: text.substring(0, 1000) })
    }
  } catch (error) {
    console.error('[create-order] error:', error)
    return NextResponse.json({ error: 'Failed to submit form' }, { status: 500 })
  }
}
