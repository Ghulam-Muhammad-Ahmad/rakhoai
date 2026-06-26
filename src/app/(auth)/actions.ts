'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getAuthUserWithAcademy } from '@/lib/db/auth-user'
import { headers } from 'next/headers'
import { checkAuthRateLimit } from '@/lib/rate-limit'

const signUpSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
  email: z.string().trim().email('Enter a valid email').max(254),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
})

const signInSchema = z.object({
  email: z.string().trim().email('Enter a valid email').max(254),
  password: z.string().min(1, 'Password is required').max(200),
})

async function getRedirectForUser(authUserId: string) {
  const dbUser = await getAuthUserWithAcademy(authUserId)
  return dbUser.academy ? '/dashboard' : '/onboarding'
}

export async function signUp(formData: FormData) {
  const supabase = await createClient()
  const origin = (await headers()).get('origin')
  const forwardedFor = (await headers()).get('x-forwarded-for') ?? 'unknown'
  const clientIp = forwardedFor.split(',')[0].trim()

  const limit = await checkAuthRateLimit(clientIp)
  if (!limit.success) {
    redirect(`/signup?error=${encodeURIComponent('Too many attempts. Please try again later.')}`)
  }

  const parsed = signUpSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Invalid input'
    redirect(`/signup?error=${encodeURIComponent(msg)}`)
  }
  const { name, email, password } = parsed.data

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    redirect(`/signup?error=${encodeURIComponent('Sign-up failed')}`)
  }

  // Email confirmation required — never grant session before verification.
  redirect('/signup?message=Check+your+email+to+confirm+your+account')
}

export async function signIn(formData: FormData) {
  const supabase = await createClient()
  const forwardedFor = (await headers()).get('x-forwarded-for') ?? 'unknown'
  const clientIp = forwardedFor.split(',')[0].trim()

  const limit = await checkAuthRateLimit(clientIp)
  if (!limit.success) {
    redirect(`/login?error=${encodeURIComponent('Too many attempts. Please try again later.')}`)
  }

  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Invalid input'
    redirect(`/login?error=${encodeURIComponent(msg)}`)
  }
  const { email, password } = parsed.data

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/login?error=${encodeURIComponent('Sign-in failed')}`)
  }

  const dest = await getRedirectForUser(data.user.id)
  redirect(dest)
}

export async function signInWithGoogle() {
  const supabase = await createClient()
  const origin = (await headers()).get('origin')

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  })

  if (error || !data.url) {
    redirect('/login?error=Google+sign-in+failed')
  }

  redirect(data.url)
}
