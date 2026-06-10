import type { ReactNode } from 'react'
import { AuthSideImage } from '@/components/auth/AuthBackgroundImages'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen p-4 sm:p-6" style={{ background: '#F4F9F8' }}>
      <div
        className="relative flex min-h-[calc(100vh-32px)] flex-col overflow-hidden rounded-lg px-4 py-6 sm:min-h-[calc(100vh-48px)] sm:px-8 sm:py-9 lg:px-10"
        style={{ background: '#F4F9F8' }}
      >
        <main className="relative z-10 flex min-h-[540px] flex-1 items-center justify-center gap-[clamp(1rem,2vw,3rem)] py-6">
          <AuthSideImage side="left" />
          {children}
          <AuthSideImage side="right" />
        </main>

        <footer className="relative z-10 py-2 text-center text-xs" style={{ color: '#475569' }}>
          Copyright &copy; Rakho AI 2026
          <span className="mx-2.5" style={{ color: '#94A3B8' }}>|</span>
          Privacy Policy
          <span className="mx-2.5" style={{ color: '#94A3B8' }}>|</span>
          Terms
        </footer>
      </div>
    </div>
  )
}
