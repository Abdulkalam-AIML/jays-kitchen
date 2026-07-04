import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Image from 'next/image'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: "Jay's Kitchen — Expense Management System",
  description: "Professional restaurant expense management system for Jay's Kitchen. Track bills, manage vendors, analyze spending.",
  keywords: ['restaurant', 'expense', 'bills', 'management', "Jay's Kitchen"],
  authors: [{ name: "Jay's Kitchen" }],
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#f97316',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('jk-theme') || 'light';
                  document.documentElement.setAttribute('data-theme', theme);
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={inter.variable}>
        {/* ── Global Logo Watermark ── fixed, behind all content, 2% opacity */}
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <Image
            src="/logo.png"
            alt=""
            width={600}
            height={600}
            priority={false}
            style={{
              opacity: 0.02,
              filter: 'blur(1px)',
              objectFit: 'contain',
              maxWidth: '60vw',
              maxHeight: '60vh',
            }}
          />
        </div>

        {/* ── App Content ── z-index 1+ to sit above watermark */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {children}
        </div>

        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: 'var(--card)',
              color: 'var(--foreground)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '14px',
              fontFamily: 'Inter, sans-serif',
              boxShadow: 'var(--shadow-lg)',
            },
            success: {
              iconTheme: { primary: '#22c55e', secondary: 'white' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: 'white' },
            },
          }}
        />
      </body>
    </html>
  )
}
