import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // We do NOT redirect to /login server-side.
  //
  // Reason: Telegram Mini App users have no Supabase session on the first
  // request — TelegramProvider creates an anonymous session client-side AFTER
  // the page loads. A server-side redirect would fire before that happens and
  // always send Telegram users to /login.
  //
  // All auth-based redirects are handled by AuthProvider on the client, which
  // can read window.Telegram.WebApp and knows whether the user is in Telegram.
  //
  // What this middleware still does:
  //  - Refreshes the Supabase session token in cookies if it's close to expiry.
  //  - Sets Cache-Control: no-store so auth pages are never cached.

  // Supabase recovery/confirmation links may land on "/" with code + type params.
  // Redirect them to /auth/callback so the code is properly exchanged.
  const url = request.nextUrl
  if (url.pathname === '/' && url.searchParams.has('code')) {
    const callbackUrl = new URL('/auth/callback', request.url)
    url.searchParams.forEach((v, k) => callbackUrl.searchParams.set(k, v))
    return NextResponse.redirect(callbackUrl)
  }

  // Skip Supabase session refresh for public pages that don't need auth
  const publicPaths = ['/subscribe', '/login', '/register', '/forgot-password', '/reset-password']
  if (publicPaths.some(p => url.pathname.startsWith(p))) {
    return NextResponse.next({ request })
  }

  // If Supabase env vars are missing, skip session refresh gracefully
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session cookies (no redirect, just token refresh).
  await supabase.auth.getSession()

  response.headers.set('Cache-Control', 'no-store, max-age=0')
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
