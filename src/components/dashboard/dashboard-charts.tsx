'use client'

import { motion } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { RefreshCw } from 'lucide-react'
import { formatCurrency, PAYMENT_METHOD_COLORS } from '@/lib/format'

interface DashboardChartsProps {
  data: {
    categoryChartData?: Array<{ name: string; value: number; color: string; count: number }>
    vendorChartData?: Array<{ name: string; value: number; count: number }>
    paymentChartData?: Array<{ name: string; type: string; value: number; count: number }>
    monthlyData?: Array<{ month: string; amount: number }>
  } | null
  loading: boolean
  settings: { currency?: string } | null | undefined
  currencySymbol: string
}

function CustomTooltip({ active, payload, label, currency }: { active?: boolean; payload?: Array<{ value: number }>; label?: string; currency?: string }) {
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
        {formatCurrency(payload[0].value, currency)}
      </p>
    </div>
  )
}

export default function DashboardCharts({ data, loading, settings, currencySymbol }: DashboardChartsProps) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {/* Chart 1 skeleton */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 20, padding: 24, height: 300, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div className="skeleton" style={{ width: '40%', height: 20, borderRadius: 6, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: '25%', height: 14, borderRadius: 4 }} />
            </div>
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RefreshCw size={24} style={{ opacity: 0.3 }} className="animate-spin text-orange-500" />
            </div>
          </div>
          {/* Chart 2 skeleton */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 20, padding: 24, height: 300, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div className="skeleton" style={{ width: '40%', height: 20, borderRadius: 6, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: '25%', height: 14, borderRadius: 4 }} />
            </div>
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RefreshCw size={24} style={{ opacity: 0.3 }} className="animate-spin text-orange-500" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ===== CHARTS ROW 1 ===== */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 16,
        }}
      >
        {/* Monthly Area Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="col-span-1 md:col-span-2"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--card-border)',
            borderRadius: 20,
            padding: '20px 20px 12px',
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
              <Tooltip content={<CustomTooltip currency={settings?.currency} />} />
              <Area type="monotone" dataKey="amount" stroke="#f97316" strokeWidth={2.5} fill="url(#colorAmt)" dot={{ fill: '#f97316', r: 3, strokeWidth: 0 }} activeDot={{ r: 6, fill: '#f97316' }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Category Pie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
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
        }}
      >
        {/* Vendor Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
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
          transition={{ delay: 0.25 }}
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
    </div>
  )
}
