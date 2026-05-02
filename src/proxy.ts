import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const isConfigured = SUPABASE_URL && SUPABASE_URL !== 'your-supabase-project-url'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Without Supabase, block dashboard and redirect to login
  if (!isConfigured) {
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/(dashboard)')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    SUPABASE_URL!,
    SUPABASE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isProtected = pathname.startsWith('/dashboard') ||
    pathname.startsWith('/students') ||
    pathname.startsWith('/interventions') ||
    pathname.startsWith('/cohorts') ||
    pathname.startsWith('/reports') ||
    pathname.startsWith('/settings') ||
    pathname === '/onboarding'

  // Redirect unauthenticated users away from protected routes
  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
