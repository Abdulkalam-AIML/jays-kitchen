'use client'

import { motion } from 'framer-motion'
import { Receipt, ArrowRight, RefreshCw } from 'lucide-react'
import { formatCurrency, formatDate, PAYMENT_METHOD_ICONS } from '@/lib/format'

interface RecentActivityProps {
  bills: Array<{
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
  }> | undefined
  loading: boolean
  settings: { currency?: string } | null | undefined
}

export default function RecentActivity({ bills, loading, settings }: RecentActivityProps) {
  if (loading) {
    return (
      <div style={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 20, padding: 24, height: 280, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div className="skeleton" style={{ width: '20%', height: 20, borderRadius: 6, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: '15%', height: 14, borderRadius: 4 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <RefreshCw size={24} style={{ opacity: 0.3 }} className="animate-spin text-orange-500" />
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
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
        {!bills?.length ? (
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
              {bills.map((bill, i) => (
                <tr
                  key={bill.id}
                  style={{
                    borderBottom: i < bills.length - 1 ? '1px solid var(--border)' : 'none',
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
  )
}
