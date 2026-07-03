'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { signUp } from '@/app/(auth)/actions'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { SubmitButton } from '@/components/auth/SubmitButton'
import { useSearchParams } from 'next/navigation'

function SignupForm() {
  const [showPw, setShowPw] = useState(false)
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const message = searchParams.get('message')

  return (
    <div
      className="w-full max-w-[520px] bg-white rounded-[18px] px-4 py-8 sm:px-10 sm:py-9"
      style={{ boxShadow: '0 30px 60px -25px rgba(15,23,42,0.18), 0 4px 14px -6px rgba(15,23,42,0.06)' }}
    >
      <h1
        className="text-[26px] font-bold text-center mb-2"
        style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#0F172A' }}
      >
        Create your account
      </h1>
      <p className="text-sm text-center mb-6 pb-4 text-gray-500">
        Start your journey with Rakho AI — set up your academy in minutes.
      </p>

      <GoogleButton />

      <div
        className="flex items-center gap-3 my-4 text-xs font-medium"
        style={{ color: '#64748B' }}
      >
        <span className="flex-1 h-px bg-[#CBD5E1]" />
        Or sign up with your email
        <span className="flex-1 h-px bg-[#CBD5E1]" />
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 rounded-lg text-sm text-[#DC2626] bg-[#FEE2E2] border border-[#FCA5A5]">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-4 px-3 py-2 rounded-lg text-sm text-[#0F766E] bg-[#F0FDFA] border border-[#5EEAD4]">
          {message}
        </div>
      )}

      <form action={signUp} className="flex flex-col gap-3">
        <input
          type="text"
          name="name"
          placeholder="Your full name"
          autoComplete="name"
          required
          className="w-full px-3.5 py-3.5 rounded-[10px] border text-sm outline-none transition-all"
          style={{
            borderColor: '#E2E8F0',
            color: '#0F172A',
            fontFamily: 'Inter, sans-serif',
          }}
          onFocus={e => { e.target.style.borderColor = '#94A3B8'; e.target.style.boxShadow = '0 0 0 3px rgba(15,23,42,0.06)' }}
          onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none' }}
        />
        <input
          type="email"
          name="email"
          placeholder="Work email"
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
            placeholder="Create a Password"
            autoComplete="new-password"
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

        <div className="flex items-start gap-2.5 mt-1.5">
          <input
            type="checkbox"
            id="terms"
            name="terms"
            required
            className="mt-0.5 w-4 h-4 rounded cursor-pointer accent-[#0F766E] flex-shrink-0"
          />
          <label htmlFor="terms" className="text-xs leading-relaxed cursor-pointer" style={{ color: '#475569' }}>
            I agree to Rakho AI&apos;s{' '}
            <a href="#terms" className="font-semibold text-[#0F172A] hover:underline">Terms</a>{' '}
            and{' '}
            <a href="#privacy" className="font-semibold text-[#0F172A] hover:underline">Privacy Policy</a>.
          </label>
        </div>

        <SubmitButton idle="Create account" pending="Creating your account…" />

      </form>

   


      <p className="text-center pt-4 mt-4 text-sm" style={{ color: '#475569' }}>
        Already a member?{' '}
        <Link href="/login" className="font-bold text-[#0F172A] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  )
}
