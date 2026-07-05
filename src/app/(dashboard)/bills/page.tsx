'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, Search, Filter, Download, Edit2, Trash2,
  Eye, X, ChevronLeft, ChevronRight, RefreshCw,
  DollarSign,
} from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { formatCurrency, formatDate, PAYMENT_METHOD_ICONS, getOptimizedImageUrl } from '@/lib/format'
import { useAuth } from '@/providers/auth-provider'
import BillDrawer from '@/components/bills/bill-drawer'

interface Bill {
  id: string
  billNumber: string
  billDate: string
  amount: number | string
  remarks?: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  submittedBy: string
  submitterName?: string | null
  vendor: { name: string }
  category: { name: string; color: string }
  paymentMethod: { name: string; type: string }
  paidBy?: { name: string } | null
  vendorId: string
  categoryId: string
  paymentMethodId: string
  paidById?: string | null
  images: Array<{ id: string; url: string; thumbnailUrl?: string | null }>
}

interface BillsResponse {
  data: Bill[]
  total: number
  grandTotal: number
  page: number
  limit: number
  totalPages: number
}

interface Vendor { id: string; name: string }
interface Category { id: string; name: string; color: string }
interface PaymentMethod { id: string; name: string; type: string }

export default function BillsPage() {
  const { settings } = useAuth()
  const [bills, setBills] = useState<BillsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editBill, setEditBill] = useState<Bill | null>(null)
  const [viewImage, setViewImage] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const lastFetchedQsRef = useRef<string | null>(null)
  const [imageLoading, setImageLoading] = useState<string | null>(null)

  // Grand Total animated state
  const [displayTotal, setDisplayTotal] = useState(0)
  const animFrameRef = useRef<number | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const limit = 15

  const [vendors, setVendors] = useState<Vendor[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])

  const fetchBills = useCallback(async (force = false) => {
    const qs = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(search && { search }),
      ...(vendorId && { vendorId }),
      ...(categoryId && { categoryId }),
      ...(paymentMethodId && { paymentMethodId }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
    }).toString()

    if (lastFetchedQsRef.current === qs && !force) return
    lastFetchedQsRef.current = qs

    setLoading(true)
    setSelectedIds([])
    try {
      const res = await fetch(`/api/bills?${qs}`)
      const json = await res.json()
      if (json.success) {
        setBills(json.data)
        // Animate grand total
        const target = Number(json.data.grandTotal ?? 0)
        const start = displayTotal
        const duration = 900
        let startTime: number | null = null
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
        const step = (ts: number) => {
          if (!startTime) startTime = ts
          const progress = Math.min((ts - startTime) / duration, 1)
          const ease = 1 - Math.pow(1 - progress, 4)
          setDisplayTotal(start + ease * (target - start))
          if (progress < 1) animFrameRef.current = requestAnimationFrame(step)
          else setDisplayTotal(target)
        }
        animFrameRef.current = requestAnimationFrame(step)
      }
    } catch {
      toast.error('Failed to load bills')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, vendorId, categoryId, paymentMethodId, startDate, endDate])

  useEffect(() => {
    fetchBills()
  }, [fetchBills])

  const [filtersLoaded, setFiltersLoaded] = useState(false)

  const fetchFilters = useCallback(async () => {
    if (filtersLoaded) return
    try {
      const [v, c, p] = await Promise.all([
        fetch('/api/vendors').then((r) => r.json()),
        fetch('/api/categories').then((r) => r.json()),
        fetch('/api/payment-methods').then((r) => r.json()),
      ])
      if (v.success) setVendors(v.data)
      if (c.success) setCategories(c.data)
      if (p.success) setPaymentMethods(p.data)
      setFiltersLoaded(true)
    } catch (e) {
      console.error('Failed to load filters:', e)
    }
  }, [filtersLoaded])

  useEffect(() => {
    if (filtersOpen) {
      fetchFilters()
    }
  }, [filtersOpen, fetchFilters])

  const handleViewImage = async (billId: string) => {
    setImageLoading(billId)
    try {
      const res = await fetch(`/api/bills/${billId}/images`)
      const json = await res.json()
      if (json.success && json.data.length > 0) {
        setViewImage(json.data[0].url)
      } else {
        toast.error('No image found for this bill')
      }
    } catch {
      toast.error('Failed to load image')
    } finally {
      setImageLoading(null)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleting(true)
    try {
      if (id === 'bulk') {
        const results = await Promise.all(
          selectedIds.map(sid =>
            fetch(`/api/bills/${sid}`, { method: 'DELETE' })
              .then(r => r.json())
              .catch(() => ({ success: false, error: 'Network error' }))
          )
        )
        const failedCount = results.filter(r => !r.success).length
        const successCount = results.length - failedCount
        if (failedCount > 0) {
          if (successCount > 0) {
            toast.success(`Deleted ${successCount} bills. ${failedCount} failed.`)
          } else {
            toast.error('Failed to delete selected bills')
          }
        } else {
          toast.success(`Deleted ${selectedIds.length} bills`)
        }
        setSelectedIds([])
      } else {
        const res = await fetch(`/api/bills/${id}`, { method: 'DELETE' })
        const json = await res.json()
        if (!json.success) throw new Error(json.error)
        toast.success('Bill deleted')
      }
      setDeleteConfirm(null)
      fetchBills(true)
    } catch {
      toast.error('Failed to delete bills')
    } finally {
      setDeleting(false)
    }
  }

  const handleStatusChange = async (id: string, status: 'APPROVED' | 'REJECTED' | 'PENDING') => {
    try {
      const res = await fetch(`/api/bills/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success(`Bill ${status.toLowerCase()}`)
      fetchBills(true)
    } catch {
      toast.error('Failed to update bill status')
    }
  }

  const StatusBadge = ({ status }: { status: string }) => {
    const config = {
      PENDING:  { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b', label: '⏳ Pending'  },
      APPROVED: { bg: 'rgba(34,197,94,0.12)',   color: '#22c55e', label: '✅ Approved' },
      REJECTED: { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', label: '❌ Rejected' },
    }[status] ?? { bg: 'rgba(100,116,139,0.1)', color: '#64748b', label: status }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 100, fontSize: 11, fontWeight: 600, background: config.bg, color: config.color, whiteSpace: 'nowrap' }}>
        {config.label}
      </span>
    )
  }

  const exportCSV = async () => {
    try {
      const qs = new URLSearchParams({ format: 'csv', ...(startDate && { startDate }), ...(endDate && { endDate }) })
      const res = await fetch(`/api/bills/export?${qs}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `jays-kitchen-bills-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV exported!')
    } catch {
      toast.error('Export failed')
    }
  }

  const clearFilters = () => {
    setSearch(''); setVendorId(''); setCategoryId('')
    setPaymentMethodId(''); setStartDate(''); setEndDate('')
    setPage(1)
  }

  const hasFilters = search || vendorId || categoryId || paymentMethodId || startDate || endDate

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--foreground)', marginBottom: 2 }}>
            Bills {bills && <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--foreground-muted)' }}>({bills.total} total)</span>}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {selectedIds.length > 0 && (
            <button
              onClick={() => setDeleteConfirm('bulk')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                borderRadius: 10, border: 'none',
                background: 'var(--error)',
                color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(239,68,68,0.3)',
              }}
            >
              <Trash2 size={14} /> Delete Selected ({selectedIds.length})
            </button>
          )}
          <button onClick={exportCSV} style={ghostBtnStyle}>
            <Download size={14} /> Export CSV
          </button>
          <button onClick={() => fetchBills(true)} style={ghostBtnStyle}>
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => { setEditBill(null); setDrawerOpen(true) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
              borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(249,115,22,0.35)',
            }}
          >
            <Plus size={15} /> Add Bill
          </button>
        </div>
      </div>

      {/* ── Grand Total KPI Card ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={{
          background: 'var(--card)',
          border: '1px solid var(--card-border)',
          borderRadius: 16,
          padding: '16px 24px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}
      >
        {/* Accent bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #f97316, #ea580c)', borderRadius: '16px 16px 0 0' }} />
        {/* Icon */}
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: 'rgba(249,115,22,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#f97316', flexShrink: 0,
        }}>
          <DollarSign size={22} />
        </div>
        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
            💰 Grand Total Expenses
          </div>
          <div style={{
            fontSize: 28, fontWeight: 800, color: 'var(--foreground)',
            letterSpacing: '-0.03em', lineHeight: 1.1,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {loading
              ? <div className="skeleton" style={{ height: 32, width: 160, borderRadius: 8 }} />
              : formatCurrency(displayTotal, settings?.currency)
            }
          </div>
          <div style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 3 }}>
            {hasFilters
              ? `Filtered total across ${bills?.total ?? 0} matching bill${(bills?.total ?? 0) !== 1 ? 's' : ''}`
              : `Across all ${bills?.total ?? 0} bill${(bills?.total ?? 0) !== 1 ? 's' : ''} in the database`
            }
          </div>
        </div>
        {/* Right badge */}
        {bills && !loading && (
          <div style={{
            padding: '6px 14px', borderRadius: 100,
            background: 'rgba(249,115,22,0.1)',
            color: '#f97316', fontSize: 13, fontWeight: 700,
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {bills.total} Bill{bills.total !== 1 ? 's' : ''}
          </div>
        )}
      </motion.div>

      {/* Search + Filter Bar */}
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: '14px 16px',
          marginBottom: 16,
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--foreground-muted)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search bill number, vendor, remarks…"
            style={{
              width: '100%', padding: '8px 12px 8px 32px',
              border: '1px solid var(--border)', borderRadius: 8,
              background: 'var(--background)', color: 'var(--foreground)',
              fontSize: 13, fontFamily: 'inherit', outline: 'none',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--primary)' }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--border)' }}
          />
        </div>

        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          style={{
            ...ghostBtnStyle,
            background: filtersOpen || hasFilters ? 'var(--primary-light)' : 'transparent',
            color: hasFilters ? 'var(--primary)' : 'var(--foreground-muted)',
            borderColor: hasFilters ? 'rgba(249,115,22,0.3)' : 'var(--border)',
          }}
        >
          <Filter size={14} /> Filters {hasFilters && '•'}
        </button>

        {hasFilters && (
          <button onClick={clearFilters} style={{ ...ghostBtnStyle, color: 'var(--error)' }}>
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {/* Expanded Filters */}
      {filtersOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}
        >
          <FilterSelect label="Vendor" value={vendorId} onChange={(v) => { setVendorId(v); setPage(1) }}>
            <option value="">All Vendors</option>
            {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </FilterSelect>
          <FilterSelect label="Category" value={categoryId} onChange={(v) => { setCategoryId(v); setPage(1) }}>
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </FilterSelect>
          <FilterSelect label="Payment" value={paymentMethodId} onChange={(v) => { setPaymentMethodId(v); setPage(1) }}>
            <option value="">All Methods</option>
            {paymentMethods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </FilterSelect>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--foreground-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>From</label>
            <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1) }} style={filterInputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--foreground-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>To</label>
            <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1) }} style={filterInputStyle} />
          </div>
        </motion.div>
      )}

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--background)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '11px 14px', width: 40, textAlign: 'left' }}>
                  <input
                    type="checkbox"
                    checked={!!(bills?.data?.length) && selectedIds.length === (bills?.data?.length ?? 0)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(bills?.data?.map((b) => b.id) || [])
                      } else {
                        setSelectedIds([])
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                {['Bill #', 'Date', 'Vendor', 'Category', 'Payment', 'Amount', 'Paid By', 'Status', 'Images', ''].map((h) => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '14px', width: 40 }}>
                      <div className="skeleton" style={{ height: 14, borderRadius: 6, width: 20 }} />
                    </td>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} style={{ padding: '14px' }}>
                        <div className="skeleton" style={{ height: 14, borderRadius: 6, width: j === 5 ? 60 : j === 0 ? 80 : '70%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : !bills?.data?.length ? (
                <tr>
                  <td colSpan={11} style={{ padding: '60px', textAlign: 'center', color: 'var(--foreground-muted)' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🧾</div>
                    <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No bills found</p>
                    <p style={{ fontSize: 13 }}>Add your first bill or adjust the filters</p>
                  </td>
                </tr>
              ) : (
                bills.data.map((bill, i) => (
                  <tr
                    key={bill.id}
                    style={{ borderBottom: i < bills.data.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.1s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card-hover)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <td style={{ padding: '12px 14px', width: 40 }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(bill.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds((prev) => [...prev, bill.id])
                          } else {
                            setSelectedIds((prev) => prev.filter((id) => id !== bill.id))
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: 'var(--primary)', whiteSpace: 'nowrap' }}>{bill.billNumber}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--foreground-muted)', whiteSpace: 'nowrap' }}>{formatDate(bill.billDate, 'short')}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--foreground)', fontWeight: 500, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bill.vendor.name}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 100, fontSize: 12, fontWeight: 500, background: `${bill.category.color}18`, color: bill.category.color, whiteSpace: 'nowrap' }}>
                        {bill.category.name}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--foreground-muted)', whiteSpace: 'nowrap' }}>
                      {PAYMENT_METHOD_ICONS[bill.paymentMethod.type]} {bill.paymentMethod.name}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 14, fontWeight: 800, color: 'var(--foreground)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {formatCurrency(Number(bill.amount), settings?.currency)}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--foreground-muted)', whiteSpace: 'nowrap' }}>{bill.paidBy?.name ?? bill.submitterName ?? 'Public'}</td>
                    <td style={{ padding: '12px 14px' }}>
                       <StatusBadge status={bill.status} />
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {bill.images.length > 0 ? (
                        <button
                          onClick={() => handleViewImage(bill.id)}
                          disabled={imageLoading !== null}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--foreground-muted)', fontSize: 12 }}
                        >
                          {imageLoading === bill.id ? (
                            <RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
                          ) : (
                            <Eye size={13} />
                          )} {bill.images.length}
                        </button>
                      ) : (
                        <span style={{ color: 'var(--border)', fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap' }}>
                        {bill.status === 'PENDING' && (
                           <button
                             onClick={() => handleStatusChange(bill.id, 'APPROVED')}
                             title="Approve"
                             style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.08)', cursor: 'pointer', color: '#22c55e', fontSize: 11, fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                           >✓ Approve</button>
                         )}
                         {bill.status !== 'PENDING' && (
                           <button
                             onClick={() => handleStatusChange(bill.id, 'PENDING')}
                             title="Reset to Pending"
                             style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--foreground-muted)', fontSize: 11, fontFamily: 'inherit' }}
                           >↺</button>
                         )}
                        <button
                          onClick={() => { setEditBill(bill); setDrawerOpen(true) }}
                          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--foreground-muted)', transition: 'all 0.15s' }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-light)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--foreground-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent' }}
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(bill.id)}
                          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--foreground-muted)', transition: 'all 0.15s' }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--error)'; e.currentTarget.style.borderColor = 'var(--error)'; e.currentTarget.style.background = 'var(--error-light)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--foreground-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {bills && bills.totalPages > 1 && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'var(--foreground-muted)' }}>
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, bills.total)} of {bills.total}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={paginBtnStyle}>
                <ChevronLeft size={15} />
              </button>
              {Array.from({ length: Math.min(5, bills.totalPages) }, (_, i) => {
                const pg = page <= 3 ? i + 1 : page - 2 + i
                if (pg > bills.totalPages) return null
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    style={{
                      ...paginBtnStyle,
                      background: pg === page ? 'var(--primary)' : 'transparent',
                      color: pg === page ? 'white' : 'var(--foreground-muted)',
                      fontWeight: pg === page ? 700 : 400,
                    }}
                  >
                    {pg}
                  </button>
                )
              })}
              <button onClick={() => setPage((p) => Math.min(bills.totalPages, p + 1))} disabled={page === bills.totalPages} style={paginBtnStyle}>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Bill Drawer */}
      {drawerOpen && (
        <BillDrawer
          open={drawerOpen}
          onClose={() => { setDrawerOpen(false); setEditBill(null) }}
          onSaved={() => { setDrawerOpen(false); setEditBill(null); fetchBills(true) }}
          bill={editBill as Parameters<typeof BillDrawer>[0]['bill']}
        />
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <>
          <div onClick={() => setDeleteConfirm(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'var(--card)', borderRadius: 20, padding: 32, zIndex: 201, width: 360, boxShadow: 'var(--shadow-xl)', animation: 'fadeInScale 0.2s ease' }}>
            <div style={{ fontSize: 40, marginBottom: 16, textAlign: 'center' }}>🗑️</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>Delete Bill?</h3>
            <p style={{ fontSize: 14, color: 'var(--foreground-muted)', textAlign: 'center', marginBottom: 24 }}>
              This action cannot be undone. Any attached images will also be deleted.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, color: 'var(--foreground-muted)' }}>Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} disabled={deleting} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'var(--error)', color: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600 }}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Image Viewer */}
      {viewImage && (
        <>
          <div onClick={() => setViewImage(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
            <img src={getOptimizedImageUrl(viewImage)} alt="Bill" loading="lazy" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 12 }} />
            <button onClick={() => setViewImage(null)} style={{ position: 'absolute', top: 20, right: 20, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <X size={18} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}

const ghostBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px',
  borderRadius: 9, border: '1px solid var(--border)', background: 'transparent',
  color: 'var(--foreground-muted)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
}

const paginBtnStyle: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
  background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center',
  justifyContent: 'center', color: 'var(--foreground-muted)', fontFamily: 'inherit', fontSize: 13,
}

const filterInputStyle: React.CSSProperties = {
  padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8,
  background: 'var(--background)', color: 'var(--foreground)', fontSize: 13, fontFamily: 'inherit', outline: 'none',
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--foreground-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...filterInputStyle, cursor: 'pointer', minWidth: 140 }}>
        {children}
      </select>
    </div>
  )
}
