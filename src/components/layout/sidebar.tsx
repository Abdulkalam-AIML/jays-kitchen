'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Receipt,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'
import { getInitials, getAvatarColor } from '@/lib/format'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/bills', label: 'Bills', icon: Receipt },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Persist collapse state
  useEffect(() => {
    const saved = localStorage.getItem('jk-sidebar-collapsed')
    if (saved) setCollapsed(saved === 'true')
  }, [])

  const toggleCollapse = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('jk-sidebar-collapsed', String(next))
  }

  const avatarColor = user ? getAvatarColor(user.name) : '#f97316'
  const initials = user ? getInitials(user.name) : 'JK'

  const SidebarContent = () => (
    <div
      style={{
        width: collapsed ? 64 : 240,
        height: '100dvh',
        background: 'var(--sidebar-bg)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Logo Area */}
      <div
        style={{
          padding: collapsed ? '20px 12px' : '20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          minHeight: 70,
          overflow: 'hidden',
        }}
      >
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              overflow: 'hidden',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            }}
          >
            <Image
              src="/logo.png"
              alt="Jay's Kitchen"
              width={40}
              height={40}
              style={{ objectFit: 'cover', width: '100%', height: '100%' }}
            />
          </div>
        </Link>

        {!collapsed && (
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div
              style={{
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 14,
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                letterSpacing: '-0.02em',
              }}
            >
              Jay&apos;s Kitchen
            </div>
            <div
              style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: 10,
                marginTop: 2,
                whiteSpace: 'nowrap',
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
              }}
            >
              Expense Manager
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: collapsed ? '10px 20px' : '10px 14px',
                margin: '2px 8px',
                borderRadius: 10,
                textDecoration: 'none',
                color: active ? '#f97316' : 'rgba(255,255,255,0.6)',
                background: active ? 'rgba(249,115,22,0.12)' : 'transparent',
                fontSize: 14,
                fontWeight: active ? 600 : 500,
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              <Icon size={18} style={{ flexShrink: 0 }} />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* User Profile */}
      <div
        style={{
          padding: collapsed ? '12px 8px' : '12px 16px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {!collapsed ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: avatarColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 12,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ color: '#ffffff', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2, whiteSpace: 'nowrap', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : user?.role?.toLowerCase() ?? ''}
              </div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.3)',
                padding: 6,
                borderRadius: 6,
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'transparent' }}
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <div
            style={{ display: 'flex', justifyContent: 'center' }}
            title={user?.name}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: avatarColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
              onClick={logout}
            >
              {initials}
            </div>
          </div>
        )}
      </div>

      {/* Collapse Toggle (desktop) */}
      <button
        onClick={toggleCollapse}
        style={{
          position: 'absolute',
          top: 22,
          right: -12,
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: 'var(--sidebar-bg)',
          border: '1px solid rgba(255,255,255,0.1)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.4)',
          zIndex: 10,
          transition: 'all 0.15s ease',
        }}
        className="hidden md:flex"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:block" style={{ flexShrink: 0 }}>
        <div style={{ position: 'fixed', top: 0, left: 0, zIndex: 100 }}>
          <SidebarContent />
        </div>
        <div style={{ width: collapsed ? 64 : 240, transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>

      {/* Mobile Toggle Button */}
      <button
        className="md:hidden"
        onClick={() => setMobileOpen(true)}
        style={{
          position: 'fixed',
          top: 14,
          left: 16,
          zIndex: 200,
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '6px',
          cursor: 'pointer',
          color: 'var(--foreground)',
          display: 'flex',
          alignItems: 'center',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <Menu size={20} />
      </button>

      {/* Mobile Overlay + Sidebar */}
      {mobileOpen && (
        <>
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 150,
              backdropFilter: 'blur(2px)',
            }}
          />
          <div style={{ position: 'fixed', top: 0, left: 0, zIndex: 160, animation: 'slideInLeft 0.25s ease' }}>
            <SidebarContent />
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'fixed',
              top: 14,
              left: 256,
              zIndex: 170,
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '6px',
              cursor: 'pointer',
              color: 'var(--foreground)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={18} />
          </button>
        </>
      )}
    </>
  )
}
