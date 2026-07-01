'use client'

import { useEffect, useRef } from 'react'

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

declare global {
  interface Window {
    grecaptcha?: { render: (el: HTMLElement, opts: { sitekey: string }) => number }
  }
}

// reCAPTCHA v2 checkbox. Injects a hidden `g-recaptcha-response` field into the
// enclosing <form> on solve, which submits with the server action.
export function Recaptcha() {
  const ref = useRef<HTMLDivElement>(null)
  const rendered = useRef(false)

  useEffect(() => {
    if (!SITE_KEY) return
    if (!document.querySelector('script[data-recaptcha]')) {
      const s = document.createElement('script')
      s.src = 'https://www.google.com/recaptcha/api.js?render=explicit'
      s.async = true
      s.defer = true
      s.setAttribute('data-recaptcha', '')
      document.head.appendChild(s)
    }
    // ponytail: poll for the script instead of an onload callback — simpler, clears once rendered.
    const id = setInterval(() => {
      if (rendered.current) { clearInterval(id); return }
      if (window.grecaptcha?.render && ref.current) {
        window.grecaptcha.render(ref.current, { sitekey: SITE_KEY })
        rendered.current = true
        clearInterval(id)
      }
    }, 200)
    return () => clearInterval(id)
  }, [])

  if (!SITE_KEY) return null
  return <div ref={ref} className="flex justify-center my-1" />
}
