import './global.css'
import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { baseUrl } from './sitemap'
import { Inter } from 'next/font/google'
import localFont from 'next/font/local'
import Footer from './components/Footer/Footer'
import Nav from './components/Nav/Nav'
import DevThemeToggle from './components/DevThemeToggle/DevThemeToggle'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

const departureMono = localFont({
  src: '../public/fonts/DepartureMono-Regular.woff2',
  variable: '--font-departure-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'Next.js Portfolio Starter',
    template: '%s | Next.js Portfolio Starter',
  },
  description: 'This is my portfolio.',
  openGraph: {
    title: 'My Portfolio',
    description: 'This is my portfolio.',
    url: baseUrl,
    siteName: 'My Portfolio',
    locale: 'en_US',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

const cx = (...classes) => classes.filter(Boolean).join(' ')

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={cx(inter.variable, departureMono.variable, 'bg-background text-foreground antialiased')}
    >
      <body className="antialiased">
        <Footer>
          {children}
          <Analytics />
          <SpeedInsights />
        </Footer>
        <DevThemeToggle />
      </body>
    </html>
  )
}
