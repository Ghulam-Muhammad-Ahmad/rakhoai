'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAuthUserWithAcademy } from '@/lib/db/auth-user'
import { headers } from 'next/headers'

async function getRedirectForUser(authUserId: string) {
  const dbUser = await getAuthUserWithAcademy(authUserId)
  return dbUser.academy ? '/dashboard' : '/onboarding'
}

export async function signUp(formData: FormData) {
  const supabase = await createClient()
  const origin = (await headers()).get('origin')

  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`)
  }

  // Email confirmation disabled: session returned immediately.
  if (data.session && data.user) {
    const dest = await getRedirectForUser(data.user.id)
    redirect(dest)
  }

  // Email confirmation enabled: ask user to check email.
  redirect('/signup?message=Check+your+email+to+confirm+your+account')
}

export async function signIn(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
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
