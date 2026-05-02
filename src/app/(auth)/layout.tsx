import type { ReactNode } from 'react'
import { MotifLayer } from '@/components/auth/MotifLayer'
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen p-6"
    >
      <div
        className="relative flex flex-col min-h-[calc(100vh-48px)] rounded-lg overflow-hidden px-14 py-9"
        style={{ background: '#F0FDFA' }}
      >
        {/* Decorative motifs — hidden on mobile */}
        <div className="hidden md:block">
          <MotifLayer />
        </div>

        {/* Page content (login/signup card) */}
        <main className="relative z-10 flex flex-1 items-center justify-center py-6 min-h-[540px]">
          {children}
        </main>

        {/* Footer */}
        <footer className="relative z-10 text-center text-xs py-2" style={{ color: '#475569' }}>
          Copyright © Rakho AI 2026
          <span className="mx-2.5" style={{ color: '#94A3B8' }}>|</span>
          Privacy Policy
          <span className="mx-2.5" style={{ color: '#94A3B8' }}>|</span>
          Terms
        </footer>
      </div>

      <style>{`
        .motif {
          position: absolute;
          pointer-events: none;
          z-index: 1;
        }
        .motif svg {
          display: block;
          width: 100%;
          height: 100%;
        }
      `}</style>
    </div>
  )
}
