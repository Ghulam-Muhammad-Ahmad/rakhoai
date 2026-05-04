import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUserWithAcademy } from '@/lib/db/auth-user'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      try {
        const dbUser = await getAuthUserWithAcademy(data.user.id)
        const redirectTo = dbUser.academy ? next : '/onboarding'
        return NextResponse.redirect(`${origin}${redirectTo}`)
      } catch {
        // DB error — session is valid, send to onboarding as safe default
        return NextResponse.redirect(`${origin}/onboarding`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
