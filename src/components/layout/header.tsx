'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Moon, Sun, Bell, Search } from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'
import { getInitials, getAvatarColor } from '@/lib/format'

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Overview of your restaurant expenses' },
  '/bills': { title: 'Bills', subtitle: 'Manage and track all expense bills' },
  '/settings': { title: 'Settings', subtitle: 'Configure your workspace' },
}

export default function Header() {
  const pathname = usePathname()
  const { user, logout, settings } = useAuth()
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [logoVisible, setLogoVisible] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const page = PAGE_TITLES[pathname] || PAGE_TITLES['/dashboard']
  const avatarColor = user ? getAvatarColor(user.name) : '#f97316'
  const initials = user ? getInitials(user.name) : 'JK'

  const getGreeting = () => {
    const hr = new Date().getHours()
    if (hr >= 5 && hr < 12) return 'Good Morning'
    if (hr >= 12 && hr < 17) return 'Good Afternoon'
    if (hr >= 17 && hr < 21) return 'Good Evening'
    return 'Good Night'
  }

  useEffect(() => {
    const saved = localStorage.getItem('jk-theme') as 'light' | 'dark' | null
    const initial = saved || 'light'
    setTheme(initial)
    document.documentElement.setAttribute('data-theme', initial)

    // Fade in logo
    const timer = setTimeout(() => setLogoVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('jk-theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  return (
    <header
      style={{
        height: 64,
        background: 'var(--background-secondary)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px 0 20px',
        gap: 16,
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* Page Title (left, offset for mobile hamburger) */}
      <div style={{ flex: 1, paddingLeft: 0 }} className="md:pl-0 pl-10">
        <h1
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--foreground)',
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
          }}
        >
          {page.title}
        </h1>
        <p
          style={{
            fontSize: 11,
            color: 'var(--foreground-muted)',
            marginTop: 1,
            fontWeight: 400,
          }}
          className="hidden sm:block"
        >
          {page.subtitle}
        </p>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

        {/* ── Brand Identity (top-right) ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            paddingRight: 12,
            borderRight: '1px solid var(--border)',
            marginRight: 4,
          }}
          className="hidden md:flex"
        >
          <Image
            src="/logo.png"
            alt="Jay's Kitchen Logo"
            width={32}
            height={32}
            style={{
              objectFit: 'contain',
              borderRadius: 6,
              opacity: logoVisible ? 1 : 0,
              transition: 'opacity 0.4s ease',
            }}
          />
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-0.02em' }}>
              Jay&apos;s Kitchen
            </div>
            <div style={{ fontSize: 10, color: 'var(--foreground-muted)', fontWeight: 500, letterSpacing: '0.02em' }}>
              Expense Management System
            </div>
          </div>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--foreground-muted)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card-hover)'; e.currentTarget.style.color = 'var(--foreground)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--foreground-muted)' }}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        {/* User badge */}
        <div style={{ position: 'relative', zIndex: 95 }}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 14px 6px 8px',
              borderRadius: 16,
              border: '1px solid var(--border)',
              background: 'var(--card-glass, rgba(255, 255, 255, 0.7))',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)',
              transition: 'all 0.2s ease',
              textAlign: 'left',
              outline: 'none',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = 'var(--shadow-md)'
              e.currentTarget.style.borderColor = 'var(--primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
              e.currentTarget.style.borderColor = 'var(--border)'
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: avatarColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 12,
                fontWeight: 700,
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                flexShrink: 0,
              }}
            >
              {initials}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
              <span style={{ fontSize: '10px', color: 'var(--foreground-muted)', fontWeight: 500 }}>
                👋 {getGreeting()},
              </span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--foreground)' }}>
                {user?.name || 'Guest'}
              </span>
              <span
                style={{
                  fontSize: '9px',
                  color: 'var(--primary)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.02em',
                  marginTop: 1,
                }}
              >
                {user?.role === 'ADMIN' ? 'Administrator' : 'Staff'}
              </span>
            </div>
          </button>

          {/* Click away backdrop */}
          {dropdownOpen && (
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 90, cursor: 'default' }}
              onClick={() => setDropdownOpen(false)}
            />
          )}

          {/* User Profile Dropdown Menu */}
          {dropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: '46px',
                right: 0,
                width: '260px',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                boxShadow: 'var(--shadow-xl)',
                padding: '14px',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {/* Profile Details Block */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: avatarColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  {initials}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.name || 'Jay User'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--foreground-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.email || ''}
                  </span>
                </div>
              </div>

              {/* Account details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '11px', color: 'var(--foreground-muted)' }}>
                <div>🔑 Role: <span style={{ fontWeight: 600 }}>{user?.role === 'ADMIN' ? 'Administrator' : 'Staff'}</span></div>
                <div>📅 Created: <span style={{ fontWeight: 600 }}>{user ? new Date(user.createdAt).toLocaleDateString(settings?.currency === 'INR' ? 'en-IN' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</span></div>
              </div>

              <div style={{ borderBottom: '1px solid var(--border)', margin: '2px 0' }} />

              {/* Action items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Link
                  href="/settings"
                  onClick={() => setDropdownOpen(false)}
                  style={{
                    display: 'flex',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: 'var(--foreground)',
                    textDecoration: 'none',
                    fontWeight: 500,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card-hover)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  👤 Profile & Settings
                </Link>
                <button
                  onClick={() => {
                    setDropdownOpen(false)
                    logout()
                  }}
                  style={{
                    display: 'flex',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#ef4444',
                    background: 'none',
                    border: 'none',
                    width: '100%',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontWeight: 600,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#ef444412' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  🚪 Logout
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Logo in top-right — premium brand signature */}
        <Link
          href="/dashboard"
          title="Jay's Kitchen — Go to Dashboard"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            textDecoration: 'none',
            marginLeft: 4,
            opacity: logoVisible ? 1 : 0,
            transform: logoVisible ? 'scale(1)' : 'scale(0.9)',
            transition: 'opacity 0.4s ease, transform 0.4s ease',
          }}
        >
          {/* Text branding */}
          <div className="hidden lg:flex" style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--foreground)',
                lineHeight: 1.2,
                letterSpacing: '-0.01em',
              }}
            >
              Jay&apos;s Kitchen
            </span>
            <span
              style={{
                fontSize: 9,
                color: 'var(--foreground-muted)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                fontWeight: 500,
              }}
            >
              Smart Expense Management
            </span>
          </div>

          {/* Logo image */}
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              overflow: 'hidden',
              flexShrink: 0,
              boxShadow: '0 2px 12px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1)',
              transition: 'transform 0.25s ease, box-shadow 0.25s ease',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)'
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(218,165,32,0.35), 0 2px 8px rgba(0,0,0,0.2)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            <Image
              src="/logo.png"
              alt="Jay's Kitchen"
              width={42}
              height={42}
              priority
              style={{
                objectFit: 'cover',
                width: '100%',
                height: '100%',
                imageRendering: 'crisp-edges',
              }}
            />
          </div>
        </Link>
      </div>
    </header>
  )
}
