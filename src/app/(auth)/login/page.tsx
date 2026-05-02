'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { signIn } from '@/app/(auth)/actions'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { useSearchParams } from 'next/navigation'

function LoginForm() {
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    await signIn(formData)
    setLoading(false)
  }

  return (
    <div
      className="w-full max-w-[520px] bg-white rounded-[18px] px-10 py-9"
      style={{ boxShadow: '0 30px 60px -25px rgba(15,23,42,0.18), 0 4px 14px -6px rgba(15,23,42,0.06)' }}
    >
      <h1
        className="text-[26px] font-bold text-center tracking-tight mb-2"
        style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#0F172A' }}
      >
        Welcome back
      </h1>
      <p className="text-sm text-center mb-6 pb-4 text-gray-500">
        Hey, Enter your details to sign in to your Rakho account.
      </p>

      {error && (
        <div className="mb-4 px-3 py-2 rounded-lg text-sm text-[#DC2626] bg-[#FEE2E2] border border-[#FCA5A5]">
          {error}
        </div>
      )}
      <GoogleButton />
      <div
        className="flex items-center w-full gap-3 my-4 text-xs font-medium"
        style={{ color: '#64748B' }}
      >
        <span className="flex-1 h-px bg-[#CBD5E1]" />
        <span>Or sign in with your email</span>
        <span className="flex-1 h-px bg-[#CBD5E1]" />
      </div>
      <form action={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          name="email"
          placeholder="Enter email or phone number"
          autoComplete="email"
          required
          className="w-full px-3.5 py-3.5 rounded-[10px] border text-sm outline-none transition-all"
          style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
          onFocus={e => { e.target.style.borderColor = '#94A3B8'; e.target.style.boxShadow = '0 0 0 3px rgba(15,23,42,0.06)' }}
          onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none' }}
        />
        <div className="relative flex items-center">
          <input
            type={showPw ? 'text' : 'password'}
            name="password"
            placeholder="Password"
            autoComplete="current-password"
            required
            className="w-full pl-3.5 pr-14 py-3.5 rounded-[10px] border text-sm outline-none transition-all"
            style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
            onFocus={e => { e.target.style.borderColor = '#94A3B8'; e.target.style.boxShadow = '0 0 0 3px rgba(15,23,42,0.06)' }}
            onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none' }}
          />
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            className="absolute right-3.5 text-xs font-medium px-1.5 py-1 rounded border-0 bg-transparent cursor-pointer"
            style={{ color: '#334155' }}
          >
            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full py-3.5 rounded-sm text-white text-[15px] font-semibold border-0 cursor-pointer transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: loading ? '#94A3B8' : '#0F766E' }}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

     


      <p className="text-center pt-4 mt-4 text-sm" style={{ color: '#475569' }}>
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="font-bold text-[#0F172A] hover:underline">
          Sign up now
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <LoginForm />
  )
}
