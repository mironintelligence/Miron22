import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#000000',
        surface: '#0a0a0a',
        'surface-2': '#0d0d0d',
        'surface-3': '#111111',
        border: '#1a1a1a',
        'border-hover': '#2e2e2e',
        text: '#ffffff',
        'text-soft': 'rgba(255,255,255,0.75)',
        muted: 'rgba(255,255,255,0.40)',
        'muted-2': 'rgba(255,255,255,0.25)',
        gold: '#FFD700',
        'gold-dim': 'rgba(255,215,0,0.10)',
        'gold-glow': 'rgba(255,215,0,0.05)',
        danger: '#cc3333',
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        sub: ['var(--font-sub)', 'serif'],
        ui: ['var(--font-ui)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulseSlow 5s ease-in-out infinite',
        'spin-slow': 'spin 18s linear infinite',
        'spin-reverse': 'spin 28s linear infinite reverse',
        blink: 'blink 1s step-end infinite',
      },
      keyframes: {
        pulseSlow: {
          '0%,100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.12)' },
        },
        blink: {
          '0%,50%': { opacity: '1' },
          '51%,100%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}

export default config
