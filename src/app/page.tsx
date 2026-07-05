import Link from 'next/link'
import Image from 'next/image'
import { ChefHat, ArrowRight, Shield } from 'lucide-react'

export const metadata = {
  title: "Jay's Kitchen — Expense Management",
  description: "Submit restaurant expense bills quickly and easily. No account required.",
}

export default function LandingPage() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'linear-gradient(145deg, #0f0f13 0%, #1a1a2e 50%, #16213e 100%)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background decorative circles */}
      <div style={{ position: 'absolute', top: -200, right: -200, width: 600, height: 600, borderRadius: '50%', background: 'rgba(249,115,22,0.04)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -150, left: -150, width: 500, height: 500, borderRadius: '50%', background: 'rgba(249,115,22,0.03)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '40%', left: '60%', width: 200, height: 200, borderRadius: '50%', background: 'rgba(218,165,32,0.04)', pointerEvents: 'none' }} />

      {/* Top nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
            <Image src="/logo.png" alt="Jay's Kitchen" width={40} height={40} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
          </div>
          <span style={{ color: '#ffffff', fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em' }}>
            Jay&apos;s Kitchen
          </span>
        </div>
        <Link
          href="/admin/login"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 500,
            textDecoration: 'none', transition: 'color 0.15s',
          }}
        >
          <Shield size={14} />
          Admin Login
        </Link>
      </nav>

      {/* Hero section */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center', position: 'relative', zIndex: 10 }}>
        {/* Logo */}
        <div style={{
          width: 120, height: 120, borderRadius: 28,
          overflow: 'hidden', margin: '0 auto 32px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 4px 24px rgba(218,165,32,0.2)',
          border: '2px solid rgba(218,165,32,0.15)',
        }}>
          <Image src="/logo.png" alt="Jay's Kitchen" width={120} height={120} priority style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
        </div>

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', borderRadius: 100,
          background: 'rgba(249,115,22,0.1)',
          border: '1px solid rgba(249,115,22,0.2)',
          color: '#f97316', fontSize: 12, fontWeight: 600,
          marginBottom: 24, letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          <ChefHat size={13} />
          Expense Management System
        </div>

        {/* Headline */}
        <h1 style={{
          color: '#ffffff', fontSize: 'clamp(36px, 6vw, 64px)',
          fontWeight: 800, letterSpacing: '-0.04em',
          lineHeight: 1.05, marginBottom: 20, maxWidth: 700,
        }}>
          Submit Your<br />
          <span style={{ background: 'linear-gradient(135deg, #f97316, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Expense Bills
          </span>
        </h1>

        {/* Subheading */}
        <p style={{
          color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(15px, 2vw, 18px)',
          lineHeight: 1.7, marginBottom: 48, maxWidth: 500,
        }}>
          No account needed. Fill in the bill details and submit instantly.
          Our admin team will review and approve it.
        </p>

        {/* CTA Button */}
        <Link
          href="/submit-bill"
          id="submit-bill-cta"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '18px 40px', borderRadius: 16,
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            color: 'white', fontSize: 18, fontWeight: 700,
            textDecoration: 'none', letterSpacing: '-0.02em',
            boxShadow: '0 8px 40px rgba(249,115,22,0.45)',
            transition: 'all 0.2s ease',
          }}
        >
          Submit a Bill
          <ArrowRight size={20} />
        </Link>

        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, marginTop: 16 }}>
          Free · No registration required · Instant submission
        </p>

        {/* Feature pills */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 64 }}>
          {[
            '📋 Simple form',
            '🔒 Secure submission',
            '📸 Image upload',
            '✅ Instant confirmation',
          ].map((feat) => (
            <div
              key={feat}
              style={{
                padding: '8px 18px', borderRadius: 100,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 500,
              }}
            >
              {feat}
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '24px', color: 'rgba(255,255,255,0.2)', fontSize: 12, position: 'relative', zIndex: 10 }}>
        © {new Date().getFullYear()} Jay&apos;s Kitchen. All rights reserved.
      </footer>
    </div>
  )
}
