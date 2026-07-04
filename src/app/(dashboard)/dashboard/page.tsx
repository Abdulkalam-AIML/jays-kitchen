'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Receipt, DollarSign, Calendar,
  Users, RefreshCw, Plus, ArrowRight, Filter, X,
} from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { formatCurrency, formatCompact, formatDate, getPercentageChange, PAYMENT_METHOD_COLORS, PAYMENT_METHOD_ICONS } from '@/lib/format'
import BillDrawer from '@/components/bills/bill-drawer'
import { useAuth } from '@/providers/auth-provider'
import { getCurrencySymbol } from '@/lib/currency'

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
    rejected: number
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

// ===================== STAT CARD =====================
// ===================== ANIMATED NUMBER =====================
function AnimatedNumber({ value, currencyCode }: { value: number; currencyCode?: string }) {
  const [displayValue, setDisplayValue] = useState(0)

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
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  color: string
  delay?: number
  isCurrency?: boolean
  currencyCode?: string
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
      </div>
    </motion.div>
  )
}

// ===================== CUSTOM TOOLTIP =====================
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '10px 14px',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <p style={{ fontSize: 12, color: 'var(--foreground-muted)', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  )
}

// ===================== MAIN DASHBOARD =====================
export default function DashboardPage() {
  const { settings } = useAuth()
  const currencySymbol = getCurrencySymbol(settings?.currency)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [addBillOpen, setAddBillOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Filters
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [filtersVisible, setFiltersVisible] = useState(false)

  const fetchDashboard = useCallback(async (params: Record<string, string> = {}) => {
    try {
      const qs = new URLSearchParams()
      if (params.startDate) qs.set('startDate', params.startDate)
      if (params.endDate) qs.set('endDate', params.endDate)

      const res = await fetch(`/api/dashboard?${qs}`)
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      setData(json.data)
    } catch {
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
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
    fetchDashboard({ startDate, endDate })
  }

  if (loading) {
    return <DashboardSkeleton />
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
        />
        {/* 6 — Pending Bills */}
        <StatCard
          title="Pending Bills"
          value={data?.billStatusCounts?.pending ?? 0}
          subtitle="Awaiting review"
          icon={Receipt}
          color="#f59e0b"
          delay={0.25}
        />
        {/* 7 — Approved Bills */}
        <StatCard
          title="Approved Bills"
          value={data?.billStatusCounts?.approved ?? 0}
          subtitle="Confirmed expenses"
          icon={Receipt}
          color="#22c55e"
          delay={0.30}
        />
        {/* 8 — Rejected Bills */}
        <StatCard
          title="Rejected Bills"
          value={data?.billStatusCounts?.rejected ?? 0}
          subtitle="Declined"
          icon={Receipt}
          color="#ef4444"
          delay={0.35}
        />
        {/* 9 — Top Vendor */}
        <StatCard
          title="Top Vendor"
          value={stats?.topVendor || 'N/A'}
          subtitle={stats?.topVendorAmount ? formatCurrency(stats.topVendorAmount, settings?.currency) : 'No data'}
          icon={Users}
          color="#10b981"
          delay={0.40}
        />
        {/* 10 — Top Category */}
        <StatCard
          title="Top Category"
          value={stats?.topCategory || 'N/A'}
          subtitle={stats?.topCategoryAmount ? formatCurrency(stats.topCategoryAmount, settings?.currency) : 'No data'}
          icon={Users}
          color="#3b82f6"
          delay={0.45}
        />
      </div>


      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 16,
          marginBottom: 20,
        }}
      >
        {/* Monthly Area Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          style={{
            background: 'var(--card)',
            border: '1px solid var(--card-border)',
            borderRadius: 20,
            padding: '20px 20px 12px',
            gridColumn: 'span 2',
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', marginBottom: 2 }}>
              Monthly Expenses
            </h3>
            <p style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>Last 12 months trend</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data?.monthlyData || []} margin={{ top: 4, right: 10, bottom: 0, left: 10 }}>
              <defs>
                <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--foreground-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--foreground-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${currencySymbol}${(v / 1000).toFixed(0)}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="amount" stroke="#f97316" strokeWidth={2.5} fill="url(#colorAmt)" dot={{ fill: '#f97316', r: 3, strokeWidth: 0 }} activeDot={{ r: 6, fill: '#f97316' }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Category Pie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 20, padding: '20px 20px 12px' }}
        >
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', marginBottom: 2 }}>By Category</h3>
            <p style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>Spending distribution</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data?.categoryChartData || []}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {(data?.categoryChartData || []).map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(Number(v as number || 0), settings?.currency)} />
              <Legend formatter={(value) => <span style={{ fontSize: 11, color: 'var(--foreground-muted)' }}>{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* ===== CHARTS ROW 2 ===== */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 16,
          marginBottom: 20,
        }}
      >
        {/* Vendor Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          style={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 20, padding: '20px 20px 12px' }}
        >
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', marginBottom: 2 }}>Top Vendors</h3>
            <p style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>Highest spending vendors</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data?.vendorChartData?.slice(0, 6) || []} layout="vertical" margin={{ left: 0, right: 30, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--foreground-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${currencySymbol}${(v / 1000).toFixed(0)}K`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--foreground-muted)' }} axisLine={false} tickLine={false} width={80} />
              <Tooltip formatter={(v) => formatCurrency(Number(v as number || 0), settings?.currency)} />
              <Bar dataKey="value" fill="#f97316" radius={[0, 6, 6, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Payment Method Pie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 20, padding: '20px 20px 12px' }}
        >
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', marginBottom: 2 }}>Payment Methods</h3>
            <p style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>How expenses are paid</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={data?.paymentChartData || []} cx="50%" cy="50%" outerRadius={80} paddingAngle={3} dataKey="value">
                {(data?.paymentChartData || []).map((entry, i) => (
                  <Cell key={i} fill={PAYMENT_METHOD_COLORS[entry.type] || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(Number(v as number || 0), settings?.currency)} />
              <Legend formatter={(value) => <span style={{ fontSize: 11, color: 'var(--foreground-muted)' }}>{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* ===== RECENT BILLS ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        style={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 20, overflow: 'hidden' }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', marginBottom: 2 }}>Recent Bills</h3>
            <p style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>Latest 10 transactions</p>
          </div>
          <a
            href="/bills"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              color: 'var(--primary)',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            View All <ArrowRight size={14} />
          </a>
        </div>

        <div style={{ overflowX: 'auto' }}>
          {!data?.recentBills?.length ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--foreground-muted)' }}>
              <Receipt size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p style={{ fontSize: 14 }}>No bills found</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--background)', borderBottom: '1px solid var(--border)' }}>
                  {['Bill #', 'Date', 'Vendor', 'Category', 'Payment', 'Amount', 'By'].map((h) => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recentBills.map((bill, i) => (
                  <tr
                    key={bill.id}
                    style={{
                      borderBottom: i < data.recentBills.length - 1 ? '1px solid var(--border)' : 'none',
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card-hover)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <td style={{ padding: '13px 16px', fontSize: 13, fontWeight: 600, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                      {bill.billNumber}
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--foreground-muted)', whiteSpace: 'nowrap' }}>
                      {formatDate(bill.billDate, 'short')}
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--foreground)', fontWeight: 500, whiteSpace: 'nowrap', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {bill.vendor.name}
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '3px 10px',
                          borderRadius: 100,
                          fontSize: 12,
                          fontWeight: 500,
                          background: `${bill.category.color}18`,
                          color: bill.category.color,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {bill.category.name}
                      </span>
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 12, color: 'var(--foreground-muted)' }}>
                      {PAYMENT_METHOD_ICONS[bill.paymentMethod.type] || ''} {bill.paymentMethod.name}
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 14, fontWeight: 700, color: 'var(--foreground)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {formatCurrency(Number(bill.amount), settings?.currency)}
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--foreground-muted)', whiteSpace: 'nowrap' }}>
                      {bill.paidBy?.name ?? bill.submitterName ?? 'Public'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>

      {/* Add Bill Drawer */}
      {addBillOpen && (
        <BillDrawer
          open={addBillOpen}
          onClose={() => setAddBillOpen(false)}
          onSaved={() => {
            setAddBillOpen(false)
            fetchDashboard({ startDate, endDate })
          }}
        />
      )}
    </div>
  )
}

// ===================== SKELETON =====================
function DashboardSkeleton() {
  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ background: 'var(--card)', borderRadius: 20, padding: 24, border: '1px solid var(--border)' }}>
            <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 12, marginBottom: 16 }} />
            <div className="skeleton" style={{ width: '70%', height: 30, borderRadius: 8, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: '50%', height: 14, borderRadius: 6 }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div className="skeleton" style={{ height: 280, borderRadius: 20 }} />
        <div className="skeleton" style={{ height: 280, borderRadius: 20 }} />
      </div>
    </div>
  )
}
