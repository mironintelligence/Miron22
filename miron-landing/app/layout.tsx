import type { Metadata } from 'next'
import { Abril_Fatface, Libre_Baskerville, IBM_Plex_Sans } from 'next/font/google'
import './globals.css'

const abril = Abril_Fatface({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const baskerville = Libre_Baskerville({
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-sub',
  display: 'swap',
})

const plex = IBM_Plex_Sans({
  weight: ['300', '400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-ui',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://miron.ai'),
  title: 'Miron — Hukuk büroları için yapay zeka sistemi',
  description: 'Üst düzey hukuk bürolarının dosya analizini saatlerden dakikalara indirdiği sistem.',
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Miron — Hukuk büroları için yapay zeka sistemi',
    description: 'Üst düzey hukuk bürolarının dosya analizini saatlerden dakikalara indirdiği sistem.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    locale: 'tr_TR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Miron — Hukuk büroları için yapay zeka sistemi',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="tr"
      className={`${abril.variable} ${baskerville.variable} ${plex.variable}`}
    >
      <body className="bg-bg text-text font-ui antialiased">{children}</body>
    </html>
  )
}
