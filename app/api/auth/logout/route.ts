/**
 * POST /api/auth/logout — deletes the session cookie.
 */

import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete('session')
  return response
}
