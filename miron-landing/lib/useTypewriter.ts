'use client'

import { useState, useEffect } from 'react'

export interface Segment {
  text: string
  pauseAfter: number
}

interface Options {
  segments: Segment[]
  charDelay?: number
  spaceDelay?: number
  started: boolean
}

export function useTypewriter({
  segments,
  charDelay = 38,
  spaceDelay = 60,
  started,
}: Options) {
  const [typed, setTyped] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!started) return

    let cancelled = false
    const sleep = (ms: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, ms))

    async function run() {
      for (const seg of segments) {
        for (const char of seg.text) {
          if (cancelled) return
          setTyped((prev) => prev + char)
          await sleep(char === ' ' || char === '\n' ? spaceDelay : charDelay)
        }
        if (cancelled) return
        if (seg.pauseAfter > 0) await sleep(seg.pauseAfter)
      }
      if (!cancelled) setDone(true)
    }

    run()
    return () => { cancelled = true }
  }, [started]) // eslint-disable-line react-hooks/exhaustive-deps

  return { typed, done }
}
