'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import {
  TrendingUp, TrendingDown, Receipt, DollarSign, Calendar,
  Users, RefreshCw, Plus, Filter, X,
} from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/format'
import BillDrawer from '@/components/bills/bill-drawer'
import { useAuth } from '@/providers/auth-provider'
import { getCurrencySymbol } from '@/lib/currency'

const DashboardCharts = dynamic(() => import('@/components/dashboard/dashboard-charts'), {
  ssr: false,
})

const RecentActivity = dynamic(() => import('@/components/dashboard/recent-activity'), {
  ssr: false,
})

// ===================== TYPES =====================
interface DashboardData {
  stats: {
    totalBills: number
    totalExpenses: number
    todayExpenses: number
    thisMonthExpenses: number
    lastMonthExpenses: number
    thisWeekExpenses: number
    percentChange: number
    topVendor: string | null
    topVendorAmount: number
    topCategory: string | null
    topCategoryAmount: number
  }
  billStatusCounts?: {
    pending: number
    approved: number
    rejected?: number
  }
  recentBills: Array<{
    id: string
    billNumber: string
    billDate: string
    amount: number | string
    remarks?: string | null
    status?: string
    submitterName?: string | null
    vendor: { name: string }
    category: { name: string; color: string }
    paymentMethod: { name: string; type: string }
    paidBy?: { name: string } | null
    images: Array<{ thumbnailUrl?: string | null }>
  }>
  categoryChartData: Array<{ name: string; value: number; color: string; count: number }>
  vendorChartData: Array<{ name: string; value: number; count: number }>
  paymentChartData: Array<{ name: string; type: string; value: number; count: number }>
  monthlyData: Array<{ month: string; amount: number }>
}

// ===================== ANIMATED NUMBER =====================
function AnimatedNumber({ value, currencyCode }: { value: number; currencyCode?: string }) {
  const [displayValue, setDisplayValue] = useState(value)

  useEffect(() => {
    let startTimestamp: number | null = null
    const duration = 1200 // 1.2s for count up
    const startValue = displayValue

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / duration, 1)
      const easeProgress = 1 - Math.pow(1 - progress, 4) // easeOutQuart
      
      const current = startValue + easeProgress * (value - startValue)
      setDisplayValue(current)

      if (progress < 1) {
        window.requestAnimationFrame(step)
      } else {
        setDisplayValue(value)
      }
    }

    const frameId = window.requestAnimationFrame(step)
    return () => window.cancelAnimationFrame(frameId)
  }, [value])

  return <>{formatCurrency(displayValue, currencyCode)}</>
}

// ===================== STAT CARD =====================
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  delay = 0,
  isCurrency = false,
  currencyCode,
  loading = false,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  color: string
  delay?: number
  isCurrency?: boolean
  currencyCode?: string
  loading?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      style={{
        background: 'var(--card)',
        border: '1px solid var(--card-border)',
        borderRadius: 20,
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        cursor: 'default',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
      }}
      whileHover={{ y: -2, boxShadow: '0 12px 32px rgba(0,0,0,0.12)' }}
    >
      {/* Top accent bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: color,
          borderRadius: '20px 20px 0 0',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: `${color}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color,
          }}
        >
          <Icon size={22} />
        </div>
      </div>

      <div>
        {loading ? (
          <>
            <div className="skeleton animate-pulse" style={{ width: '80%', height: 28, borderRadius: 6, marginBottom: 8, background: 'var(--border)' }} />
            <div className="skeleton animate-pulse" style={{ width: '50%', height: 14, borderRadius: 4, background: 'var(--border)' }} />
          </>
        ) : (
          <>
            <div
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: 'var(--foreground)',
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {isCurrency && typeof value === 'number' ? (
                <AnimatedNumber value={value} currencyCode={currencyCode} />
              ) : (
                value
              )}
            </div>
            <div style={{ fontSize: 13, color: 'var(--foreground-muted)', marginTop: 4, fontWeight: 500 }}>
              {title}
            </div>
            {subtitle && (
              <div style={{ fontSize: 11, color: 'var(--foreground-muted)', marginTop: 3 }}>
                {subtitle}
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  )
}

// ===================== MAIN DASHBOARD =====================
export default function DashboardPage() {
  const { settings } = useAuth()
  const currencySymbol = getCurrencySymbol(settings?.currency)
  const [data, setData] = useState<DashboardData | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [detailsLoading, setDetailsLoading] = useState(true)
  const [addBillOpen, setAddBillOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Filters
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [filtersVisible, setFiltersVisible] = useState(false)
  const lastFetchedQsRef = useRef<string | null>(null)

  const fetchDashboard = useCallback(async (params: Record<string, string> = {}) => {
    const baseQs = new URLSearchParams()
    if (params.startDate) baseQs.set('startDate', params.startDate)
    if (params.endDate) baseQs.set('endDate', params.endDate)
    const qsStr = baseQs.toString()

    if (lastFetchedQsRef.current === qsStr && !params.force) return
    lastFetchedQsRef.current = qsStr

    setStatsLoading(true)
    setDetailsLoading(true)

    // 1. Fetch Stats (fast route)
    const fetchStats = async () => {
      const maxRetries = 3
      let attempt = 0
      let success = false

      while (attempt < maxRetries && !success) {
        try {
          const qs = new URLSearchParams(baseQs)
          qs.set('type', 'stats')
          const res = await fetch(`/api/dashboard?${qs}`)
          if (!res.ok) throw new Error('Failed to fetch stats')
          const json = await res.json()
          if (!json.success) throw new Error(json.error || 'Failed')
          
          setData((prev) => ({
            ...prev,
            stats: json.data.stats,
            billStatusCounts: json.data.billStatusCounts,
          } as DashboardData))
          success = true
        } catch (err) {
          attempt++
          console.warn(`Stats fetch attempt ${attempt} failed:`, err)
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, attempt * 500))
          }
        }
      }
      if (!success) {
        toast.error('Failed to load dashboard metrics. Please refresh.')
      }
      setStatsLoading(false)
    }

    // 2. Fetch Details (charts and activity)
    const fetchDetails = async () => {
      const maxRetries = 3
      let attempt = 0
      let success = false

      while (attempt < maxRetries && !success) {
        try {
          const qs = new URLSearchParams(baseQs)
          qs.set('type', 'details')
          const res = await fetch(`/api/dashboard?${qs}`)
          if (!res.ok) throw new Error('Failed to fetch details')
          const json = await res.json()
          if (!json.success) throw new Error(json.error || 'Failed')

          setData((prev) => ({
            ...prev,
            recentBills: json.data.recentBills,
            categoryChartData: json.data.categoryChartData,
            vendorChartData: json.data.vendorChartData,
            paymentChartData: json.data.paymentChartData,
            monthlyData: json.data.monthlyData,
          } as DashboardData))
          success = true
        } catch (err) {
          attempt++
          console.warn(`Details fetch attempt ${attempt} failed:`, err)
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, attempt * 500))
          }
        }
      }
      if (!success) {
        toast.error('Failed to load charts and transaction logs. Please refresh.')
      }
      setDetailsLoading(false)
      setRefreshing(false)
    }

    fetchStats().then(() => {
      setTimeout(fetchDetails, 100)
    })
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  const applyFilters = () => {
    setRefreshing(true)
    fetchDashboard({ startDate, endDate })
  }

  const clearFilters = () => {
    setStartDate('')
    setEndDate('')
    setRefreshing(true)
    fetchDashboard()
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchDashboard({ startDate, endDate, force: 'true' })
  }

  const stats = data?.stats
  const pct = stats?.percentChange || 0
  const pctDisplay = pct > 0 ? `+${pct}%` : `${pct}%`

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* ===== PAGE HEADER ===== */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--foreground)', marginBottom: 2 }}>
            Expense Overview
          </h2>
          <p style={{ fontSize: 13, color: 'var(--foreground-muted)' }}>
            {startDate || endDate
              ? `Filtered: ${startDate || '…'} → ${endDate || 'today'}`
              : 'All time data'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => setFiltersVisible(!filtersVisible)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: filtersVisible ? 'var(--primary-light)' : 'var(--card)',
              color: filtersVisible ? 'var(--primary)' : 'var(--foreground-muted)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          >
            <Filter size={14} />
            Filters
          </button>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--card)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--foreground-muted)',
            }}
          >
            <RefreshCw size={15} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
          </button>

          <button
            onClick={() => setAddBillOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              color: 'white',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              boxShadow: '0 2px 8px rgba(249,115,22,0.35)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(249,115,22,0.45)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(249,115,22,0.35)' }}
          >
            <Plus size={15} />
            Add Bill
          </button>
        </div>
      </div>

      {/* ===== FILTERS PANEL ===== */}
      {filtersVisible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: '20px 24px',
            marginBottom: 20,
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap',
            alignItems: 'flex-end',
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--foreground-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--background)', color: 'var(--foreground)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--foreground-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--background)', color: 'var(--foreground)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
            />
          </div>
          <button
            onClick={applyFilters}
            style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Apply
          </button>
          <button
            onClick={clearFilters}
            style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--foreground-muted)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <X size={13} /> Clear
          </button>
        </motion.div>
      )}

      {/* ===== MAIN KPI GRID — 10 Cards ===== */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* 1 — Total Bills */}
        <StatCard
          title="Total Bills"
          value={stats?.totalBills || 0}
          subtitle="All time"
          icon={Receipt}
          color="#f97316"
          delay={0}
          loading={statsLoading}
        />
        {/* 2 — Grand Total */}
        <StatCard
          title="Grand Total Expenses"
          value={stats?.totalExpenses || 0}
          subtitle="All bills combined"
          icon={DollarSign}
          color="#ea580c"
          delay={0.05}
          isCurrency={true}
          currencyCode={settings?.currency}
          loading={statsLoading}
        />
        {/* 3 — Today */}
        <StatCard
          title="Today's Expenses"
          value={stats?.todayExpenses || 0}
          subtitle={new Date().toLocaleDateString('en-US', { weekday: 'long' })}
          icon={Calendar}
          color="#06b6d4"
          delay={0.10}
          isCurrency={true}
          currencyCode={settings?.currency}
          loading={statsLoading}
        />
        {/* 4 — Weekly */}
        <StatCard
          title="Weekly Expenses"
          value={stats?.thisWeekExpenses || 0}
          subtitle="Last 7 days"
          icon={pct >= 0 ? TrendingUp : TrendingDown}
          color="#8b5cf6"
          delay={0.15}
          isCurrency={true}
          currencyCode={settings?.currency}
          loading={statsLoading}
        />
        {/* 5 — Monthly */}
        <StatCard
          title="Monthly Expenses"
          value={stats?.thisMonthExpenses || 0}
          subtitle={`${pctDisplay} vs last month`}
          icon={pct >= 0 ? TrendingUp : TrendingDown}
          color={pct >= 0 ? '#ef4444' : '#22c55e'}
          delay={0.20}
          isCurrency={true}
          currencyCode={settings?.currency}
          loading={statsLoading}
        />
        {/* 6 — Pending Bills */}
        <StatCard
          title="Pending Bills"
          value={data?.billStatusCounts?.pending ?? 0}
          subtitle="Awaiting review"
          icon={Receipt}
          color="#f59e0b"
          delay={0.25}
          loading={statsLoading}
        />
        {/* 7 — Approved Bills */}
        <StatCard
          title="Approved Bills"
          value={data?.billStatusCounts?.approved ?? 0}
          subtitle="Confirmed expenses"
          icon={Receipt}
          color="#22c55e"
          delay={0.30}
          loading={statsLoading}
        />
        {/* 9 — Top Vendor */}
        <StatCard
          title="Top Vendor"
          value={stats?.topVendor || 'N/A'}
          subtitle={stats?.topVendorAmount ? formatCurrency(stats.topVendorAmount, settings?.currency) : 'No data'}
          icon={Users}
          color="#10b981"
          delay={0.40}
          loading={statsLoading}
        />
        {/* 10 — Top Category */}
        <StatCard
          title="Top Category"
          value={stats?.topCategory || 'N/A'}
          subtitle={stats?.topCategoryAmount ? formatCurrency(stats.topCategoryAmount, settings?.currency) : 'No data'}
          icon={Users}
          color="#3b82f6"
          delay={0.45}
          loading={statsLoading}
        />
      </div>

      {/* Dynamic Charts (Lazy Loaded) */}
      <div style={{ marginBottom: 20 }}>
        <DashboardCharts
          data={data}
          loading={detailsLoading}
          settings={settings}
          currencySymbol={currencySymbol}
        />
      </div>

      {/* Recent Bills (Lazy Loaded) */}
      <RecentActivity
        bills={data?.recentBills}
        loading={detailsLoading}
        settings={settings}
      />

      {/* Add Bill Drawer */}
      {addBillOpen && (
        <BillDrawer
          open={addBillOpen}
          onClose={() => setAddBillOpen(false)}
          onSaved={() => {
            setAddBillOpen(false)
            fetchDashboard({ startDate, endDate, force: 'true' })
          }}
        />
      )}
    </div>
  )
}
