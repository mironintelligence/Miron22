import { type ReactNode } from 'react'

interface ContainerProps {
  children: ReactNode
  className?: string
}

export function Container({ children, className = '' }: ContainerProps) {
  return (
    <div className={`max-w-[1200px] mx-auto px-6 lg:px-[52px] ${className}`}>
      {children}
    </div>
  )
}
