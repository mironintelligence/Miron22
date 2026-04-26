import { motion } from 'framer-motion'

const VARIANTS = {
  y: { hidden: { opacity: 0, y: 44 }, show: { opacity: 1, y: 0 } },
  l: { hidden: { opacity: 0, x: -44 }, show: { opacity: 1, x: 0 } },
  r: { hidden: { opacity: 0, x: 44 }, show: { opacity: 1, x: 0 } },
  scale: { hidden: { opacity: 0, scale: 0.96 }, show: { opacity: 1, scale: 1 } },
}

export function Reveal({ children, variant = 'y', delay = 0, className }) {
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

const STAGGER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

export function Stagger({ children, className }) {
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
