export function Container({ children, className = '' }) {
  return (
    <div className={`max-w-[1200px] mx-auto px-6 lg:px-[52px] ${className}`}>
      {children}
    </div>
  )
}
