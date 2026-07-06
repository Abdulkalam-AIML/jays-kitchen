'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Lock, Mail, ChefHat, ArrowLeft } from 'lucide-react'
import { loginSchema, type LoginInput } from '@/lib/validations'

export default function AdminLoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (data: LoginInput) => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        toast.error(json.error || 'Login failed. Please check your credentials.')
        return
      }

      toast.success(`Welcome back, ${json.data.name}!`)
      if (json.data.role === 'USER') {
        router.replace('/submit-bill')
      } else {
        router.replace('/dashboard')
      }
      router.refresh()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', background: 'var(--background)', position: 'relative', overflow: 'hidden' }}>
      {/* Watermark */}
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 0 }}>
        <Image src="/logo.png" alt="" width={600} height={600} style={{ opacity: 0.03, filter: 'blur(1.5px)', objectFit: 'contain' }} priority={false} />
      </div>

      {/* Left panel — Branding */}
      <div className="hidden lg:flex" style={{ width: '50%', background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, position: 'relative', overflow: 'hidden', zIndex: 1 }}>
        <div style={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'rgba(249,115,22,0.05)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(249,115,22,0.04)', pointerEvents: 'none' }} />

        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 140, height: 140, borderRadius: 28, overflow: 'hidden', margin: '0 auto 28px', boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 4px 20px rgba(218,165,32,0.2)', border: '2px solid rgba(218,165,32,0.2)' }}>
            <Image src="/logo.png" alt="Jay's Kitchen" width={140} height={140} priority style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
          </div>
          <h1 style={{ color: '#ffffff', fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>Jay&apos;s Kitchen</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500, marginBottom: 36 }}>Admin Portal</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            {['📊 Real-time expense analytics', '🧾 Smart bill management', '✅ Approve & reject bills', '👥 User management (Super Admin)'].map((feat) => (
              <div key={feat} style={{ padding: '7px 18px', borderRadius: 100, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 500, backdropFilter: 'blur(8px)' }}>
                {feat}
              </div>
            ))}
          </div>
        </div>

        <Link href="/" style={{ position: 'absolute', bottom: 32, display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.3)', fontSize: 12, textDecoration: 'none', transition: 'color 0.15s' }}>
          <ArrowLeft size={12} /> Back to Home
        </Link>
      </div>

      {/* Right panel — Login form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', position: 'relative', zIndex: 1 }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          {/* Mobile logo */}
          <div className="lg:hidden" style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ width: 72, height: 72, borderRadius: 18, overflow: 'hidden', margin: '0 auto 12px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
              <Image src="/logo.png" alt="Jay's Kitchen" width={72} height={72} priority style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--foreground)' }}>Jay&apos;s Kitchen</h2>
            <p style={{ color: 'var(--foreground-muted)', fontSize: 12, marginTop: 4 }}>Admin Portal</p>
          </div>

          <div style={{ background: 'var(--card)', borderRadius: 24, padding: '40px 36px', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-xl)' }}>
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-0.02em', marginBottom: 6 }}>Admin Login 🔐</h2>
              <p style={{ color: 'var(--foreground-muted)', fontSize: 13 }}>Sign in to manage restaurant expenses</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              {/* Email */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--foreground)', marginBottom: 7 }}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--foreground-muted)', pointerEvents: 'none' }} />
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="admin@jayskitchen.com"
                    autoComplete="email"
                    style={{ width: '100%', padding: '11px 12px 11px 36px', border: errors.email ? '1px solid var(--error)' : '1px solid var(--border)', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: 'var(--foreground)', background: 'var(--background)', outline: 'none', boxSizing: 'border-box' }}
                    onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.1)' }}
                    onBlur={(e) => { e.target.style.borderColor = errors.email ? 'var(--error)' : 'var(--border)'; e.target.style.boxShadow = 'none' }}
                  />
                </div>
                {errors.email && <p style={{ color: 'var(--error)', fontSize: 12, marginTop: 4 }}>{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div style={{ marginBottom: 26 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--foreground)', marginBottom: 7 }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--foreground-muted)', pointerEvents: 'none' }} />
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    style={{ width: '100%', padding: '11px 40px 11px 36px', border: errors.password ? '1px solid var(--error)' : '1px solid var(--border)', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: 'var(--foreground)', background: 'var(--background)', outline: 'none', boxSizing: 'border-box' }}
                    onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.1)' }}
                    onBlur={(e) => { e.target.style.borderColor = errors.password ? 'var(--error)' : 'var(--border)'; e.target.style.boxShadow = 'none' }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--foreground-muted)', display: 'flex', padding: 2 }}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {errors.password && <p style={{ color: 'var(--error)', fontSize: 12, marginTop: 4 }}>{errors.password.message}</p>}
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ flex: 2, padding: '13px 24px', background: loading ? 'var(--border)' : 'linear-gradient(135deg, #f97316, #ea580c)', color: 'white', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: loading ? 'none' : '0 4px 16px rgba(249,115,22,0.4)', letterSpacing: '-0.01em' }}
                >
                  {loading ? (
                    <>
                      <div style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      Signing in…
                    </>
                  ) : (
                    <><ChefHat size={15} /> Sign In</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => reset({ email: '', password: '' })}
                  style={{ flex: 1, padding: '13px 20px', border: '1px solid var(--border)', borderRadius: 12, background: 'transparent', color: 'var(--foreground-muted)', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  Reset
                </button>
              </div>
            </form>


          </div>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <Link href="/submit-bill" style={{ color: 'var(--primary)', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
              → Submit a bill without logging in
            </Link>
          </div>

          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--foreground-muted)' }}>
            © {new Date().getFullYear()} Jay&apos;s Kitchen. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
