'use client'

import { motion, type Variants } from 'framer-motion'
import { type ReactNode } from 'react'

const VARIANTS: Record<string, Variants> = {
  y: {
    hidden: { opacity: 0, y: 28 },
    show: { opacity: 1, y: 0 },
  },
  l: {
    hidden: { opacity: 0, x: -28 },
    show: { opacity: 1, x: 0 },
  },
  r: {
    hidden: { opacity: 0, x: 28 },
    show: { opacity: 1, x: 0 },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.96 },
    show: { opacity: 1, scale: 1 },
  },
}

interface RevealProps {
  children: ReactNode
  variant?: 'y' | 'l' | 'r' | 'scale'
  delay?: number
  className?: string
}

export function Reveal({ children, variant = 'y', delay = 0, className }: RevealProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      variants={VARIANTS[variant]}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

const STAGGER: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

interface StaggerProps {
  children: ReactNode
  className?: string
}

export function Stagger({ children, className }: StaggerProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      variants={STAGGER}
      className={className}
    >
      {children}
    </motion.div>
  )
}
