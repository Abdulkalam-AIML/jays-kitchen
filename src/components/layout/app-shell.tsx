'use client'

import { AuthProvider } from '@/providers/auth-provider'
import Sidebar from './sidebar'
import Header from './header'
import Image from 'next/image'

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {/* ===================== GLOBAL WATERMARK ===================== */}
      {/* Fixed behind all content, visible in both light and dark mode */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <Image
          src="/logo.png"
          alt=""
          width={600}
          height={600}
          style={{
            opacity: 0.03,
            filter: 'blur(1.5px)',
            objectFit: 'contain',
            userSelect: 'none',
            flexShrink: 0,
            // Responsive sizing via media
          }}
          className="watermark-logo"
          priority={false}
        />
      </div>

      {/* ===================== LAYOUT ===================== */}
      <div style={{ display: 'flex', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        <Sidebar />

        {/* Main content area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <Header />
          <main
            style={{
              flex: 1,
              padding: '24px',
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
          >
            {children}
          </main>
        </div>
      </div>

      <style jsx global>{`
        .watermark-logo {
          width: 580px !important;
          height: 580px !important;
        }

        @media (max-width: 1024px) {
          .watermark-logo {
            width: 440px !important;
            height: 440px !important;
          }
        }

        @media (max-width: 640px) {
          .watermark-logo {
            width: 320px !important;
            height: 320px !important;
          }
        }
      `}</style>
    </AuthProvider>
  )
}
