import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      const supabaseUser = data.user
      const fullName =
        supabaseUser.user_metadata?.full_name ||
        supabaseUser.user_metadata?.name ||
        supabaseUser.email?.split('@')[0] ||
        'User'

      try {
        // Upsert User in DB
        const dbUser = await prisma.user.upsert({
          where: { supabaseId: supabaseUser.id },
          create: {
            supabaseId: supabaseUser.id,
            email: supabaseUser.email!,
            name: fullName,
          },
          update: { name: fullName },
          include: { academy: true },
        })

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
