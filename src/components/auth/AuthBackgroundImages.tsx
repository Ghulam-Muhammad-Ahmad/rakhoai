'use client'

import Image from 'next/image'
import { usePathname } from 'next/navigation'

const authBackgrounds = {
  login: {
    left: '/assets/login img 1 left.png',
    right: '/assets/login img 1 right.png',
  },
  signup: {
    left: '/assets/register left.png',
    right: '/assets/register right.png',
  },
} as const

type AuthSide = 'left' | 'right'

export function AuthSideImage({ side }: { side: AuthSide }) {
  const pathname = usePathname()
  const images = pathname.startsWith('/signup') ? authBackgrounds.signup : authBackgrounds.login

  return (
    <div
      className="pointer-events-none relative hidden h-[clamp(400px,64vh,620px)] w-[clamp(190px,22vw,440px)] shrink-0 lg:block"
      aria-hidden="true"
    >
      <Image
        src={images[side]}
        alt=""
        fill
        priority
        sizes="(min-width: 1280px) 22vw, 190px"
        className="object-contain"
      />
    </div>
  )
}
