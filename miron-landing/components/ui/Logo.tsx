'use client'

import Image from 'next/image'
import { useState } from 'react'

const SIZES = { sm: 24, md: 32, lg: 48 } as const

interface LogoProps {
  size?: keyof typeof SIZES
  withText?: boolean
}

export function Logo({ size = 'md', withText = true }: LogoProps) {
  const px = SIZES[size]
  const [imgError, setImgError] = useState(false)

  return (
    <div className="flex items-center gap-2">
      {!imgError ? (
        <Image
          src="/miron-logo.png"
          alt="Miron AI"
          width={px}
          height={px}
          priority
          className="object-contain"
          onError={() => setImgError(true)}
        />
      ) : (
        <span
          className="font-display text-gold flex items-center justify-center"
          style={{ fontSize: px * 0.6, width: px, height: px }}
        >
          M
        </span>
      )}
      {withText && (
        <span className="font-sub font-bold text-[22px] tracking-[0.06em] text-text">
          Miron<span className="text-gold">.</span>
        </span>
      )}
    </div>
  )
}
