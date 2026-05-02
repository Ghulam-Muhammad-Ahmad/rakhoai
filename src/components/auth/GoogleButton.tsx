'use client'

import { signInWithGoogle } from '@/app/(auth)/actions'

export function GoogleButton() {
  return (
    <form action={signInWithGoogle}>
      <button
        type="submit"
        className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-[10px] border border-[#E2E8F0] bg-white text-sm font-semibold text-[#0F172A] hover:border-[#94A3B8] hover:bg-[#F8FAFC] transition-all duration-150 cursor-pointer"
      >
        <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" />
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.583-5.036-3.71H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
          <path d="M3.964 10.708A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.708V4.96H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.04l3.007-2.332z" fill="#FBBC05" />
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.96L3.964 7.292C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
        </svg>
        Continue with Google
      </button>
    </form>
  )
}
