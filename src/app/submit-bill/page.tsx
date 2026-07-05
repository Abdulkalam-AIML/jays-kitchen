'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Send, RotateCcw, Plus, DollarSign,
  Calendar, Hash, User, ChefHat, FileText, Upload, X, CheckCircle2,
} from 'lucide-react'

interface Vendor { id: string; name: string }
interface Category { id: string; name: string; color: string }
interface PaymentMethod { id: string; name: string; type: string }

const PAYMENT_METHOD_OPTIONS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI / GPay' },
  { value: 'CARD', label: 'Credit Card' },
  { value: 'CARD', label: 'Debit Card' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'WALLET', label: 'Wallet' },
]

const inputStyle = {
  width: '100%',
  padding: '11px 14px',
  border: '1px solid var(--border)',
  borderRadius: 10,
  fontSize: 14,
  fontFamily: 'inherit',
  color: 'var(--foreground)',
  background: 'var(--background)',
  outline: 'none',
  boxSizing: 'border-box' as const,
  transition: 'border-color 0.15s, box-shadow 0.15s',
}

const labelStyle = {
  display: 'block' as const,
  fontSize: 13,
  fontWeight: 600 as const,
  color: 'var(--foreground)',
  marginBottom: 7,
}

export default function SubmitBillPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submittedBill, setSubmittedBill] = useState<{ billNumber: string; amount: number } | null>(null)

  // Form state
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0])
  const [billNumber, setBillNumber] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [submitterName, setSubmitterName] = useState('')
  const [amount, setAmount] = useState('')
  const [remarks, setRemarks] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)

  // Payment Status Tracking
  const [paymentStatus, setPaymentStatus] = useState('NOT_PAID')
  const [amountPaid, setAmountPaid] = useState('0')
  const [remainingAmount, setRemainingAmount] = useState('0')

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchDropdowns()
  }, [])

  useEffect(() => {
    const amt = Number(amount) || 0
    if (paymentStatus === 'FULLY_PAID') {
      setAmountPaid(amt.toFixed(2))
      setRemainingAmount('0.00')
    } else if (paymentStatus === 'NOT_PAID') {
      setAmountPaid('0.00')
      setRemainingAmount(amt.toFixed(2))
    } else if (paymentStatus === 'PARTIALLY_PAID') {
      const amtPaid = Number(amountPaid) || 0
      const rem = Math.max(0, amt - amtPaid)
      setRemainingAmount(rem.toFixed(2))
    }
  }, [amount, paymentStatus, amountPaid])

  const fetchDropdowns = async () => {
    try {
      const [vRes, cRes, pmRes] = await Promise.all([
        fetch('/api/public/vendors'),
        fetch('/api/public/categories'),
        fetch('/api/public/payment-methods'),
      ])
      const [v, c, pm] = await Promise.all([vRes.json(), cRes.json(), pmRes.json()])
      if (v.success) setVendors(v.data)
      if (c.success) setCategories(c.data)
      if (pm.success) setPaymentMethods(pm.data)
    } catch {
      // silent fail
    }
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!billDate) e.billDate = 'Bill date is required'
    if (!billNumber.trim()) e.billNumber = 'Bill number is required'
    if (!vendorId) e.vendorId = 'Please select a vendor'
    if (!categoryId) e.categoryId = 'Please select a category'
    if (!paymentMethodId) e.paymentMethodId = 'Please select payment method'
    if (!submitterName.trim()) e.submitterName = 'Your name is required'
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) e.amount = 'Enter a valid amount'
    if (!imageFile) e.imageFile = 'Bill receipt image is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('billNumber', billNumber.trim())
      fd.append('billDate', billDate)
      fd.append('vendorId', vendorId)
      fd.append('categoryId', categoryId)
      fd.append('paymentMethodId', paymentMethodId)
      fd.append('submitterName', submitterName.trim())
      fd.append('amount', amount)
      fd.append('paymentStatus', paymentStatus)
      fd.append('amountPaid', amountPaid)
      fd.append('remainingAmount', remainingAmount)
      if (remarks.trim()) fd.append('remarks', remarks.trim())
      if (imageFile) fd.append('file', imageFile)

      const res = await fetch('/api/public/submit-bill', {
        method: 'POST',
        body: fd,
      })
      const json = await res.json()
      if (json.success) {
        setSubmitted(true)
        setSubmittedBill({ billNumber: json.data.billNumber, amount: json.data.amount })
        toast.success('Bill submitted successfully!')
      } else {
        toast.error(json.error || 'Submission failed')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setBillDate(new Date().toISOString().split('T')[0])
    setBillNumber('')
    setVendorId('')
    setCategoryId('')
    setPaymentMethodId('')
    setSubmitterName('')
    setAmount('')
    setRemarks('')
    setImageFile(null)
    setPaymentStatus('NOT_PAID')
    setAmountPaid('0')
    setRemainingAmount('0')
    setErrors({})
    setSubmitted(false)
    setSubmittedBill(null)
  }

  const focusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = 'var(--primary)'
    e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.1)'
  }
  const blurStyle = (field: string) => (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = errors[field] ? 'var(--error)' : 'var(--border)'
    e.target.style.boxShadow = 'none'
  }

  // Success screen
  if (submitted && submittedBill) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--background)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', border: '2px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: '#22c55e' }}>
            <CheckCircle2 size={40} />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--foreground)', marginBottom: 12, letterSpacing: '-0.02em' }}>
            Bill Submitted Successfully! 🎉
          </h1>
          <p style={{ color: 'var(--foreground-muted)', fontSize: 15, lineHeight: 1.6, marginBottom: 28 }}>
            Your bill has been received and is pending review by our admin team.
          </p>
          <div style={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 14, padding: '18px 24px', marginBottom: 28, textAlign: 'left' }}>
            <p style={{ fontSize: 12, color: 'var(--foreground-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Submission Details</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: 'var(--foreground-muted)', fontSize: 13 }}>Bill Number</span>
              <span style={{ color: 'var(--foreground)', fontSize: 13, fontWeight: 600, fontFamily: 'monospace' }}>{submittedBill.billNumber}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--foreground-muted)', fontSize: 13 }}>Status</span>
              <span style={{ color: '#f59e0b', fontSize: 13, fontWeight: 600 }}>⏳ Pending Review</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #f97316, #ea580c)', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Plus size={14} /> Submit Another Bill
            </button>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--foreground)', fontSize: 14, fontWeight: 500, cursor: 'pointer', textDecoration: 'none' }}>
              <ArrowLeft size={14} /> Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--background)', position: 'relative' }}>
      {/* Top nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, overflow: 'hidden' }}>
            <Image src="/logo.png" alt="Jay's Kitchen" width={34} height={34} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
          </div>
          <div>
            <div style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>Jay&apos;s Kitchen</div>
            <div style={{ color: 'var(--foreground-muted)', fontSize: 11 }}>Expense Management</div>
          </div>
        </div>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--foreground-muted)', fontSize: 13, textDecoration: 'none' }}>
          <ArrowLeft size={14} /> Back
        </Link>
      </nav>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px 60px' }}>
        {/* Header */}
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: '#f97316' }}>
            <ChefHat size={28} />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-0.03em', marginBottom: 6 }}>Submit an Expense Bill</h1>
          <p style={{ color: 'var(--foreground-muted)', fontSize: 14 }}>No account required. Fill in the details below and submit.</p>
        </div>

        {/* Form card */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 20, padding: '32px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <form onSubmit={handleSubmit} noValidate>

            {/* Row: Date + Bill Number */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
              <div>
                <label htmlFor="billDate" style={labelStyle}><Calendar size={13} style={{ display: 'inline', marginRight: 5 }} />Date of Bill Paid</label>
                <input
                  id="billDate"
                  type="date"
                  value={billDate}
                  onChange={(e) => { setBillDate(e.target.value); setErrors((p) => ({ ...p, billDate: '' })) }}
                  style={{ ...inputStyle, borderColor: errors.billDate ? 'var(--error)' : undefined }}
                  onFocus={focusStyle}
                  onBlur={blurStyle('billDate')}
                />
                {errors.billDate && <p style={{ color: 'var(--error)', fontSize: 12, marginTop: 4 }}>{errors.billDate}</p>}
              </div>
              <div>
                <label htmlFor="billNumber" style={labelStyle}><Hash size={13} style={{ display: 'inline', marginRight: 5 }} />Bill Number</label>
                <input
                  id="billNumber"
                  type="text"
                  value={billNumber}
                  onChange={(e) => { setBillNumber(e.target.value); setErrors((p) => ({ ...p, billNumber: '' })) }}
                  placeholder="e.g. BILL-001"
                  style={{ ...inputStyle, borderColor: errors.billNumber ? 'var(--error)' : undefined }}
                  onFocus={focusStyle}
                  onBlur={blurStyle('billNumber')}
                />
                {errors.billNumber && <p style={{ color: 'var(--error)', fontSize: 12, marginTop: 4 }}>{errors.billNumber}</p>}
              </div>
            </div>

            {/* Your Name */}
            <div style={{ marginBottom: 18 }}>
              <label htmlFor="submitterName" style={labelStyle}><User size={13} style={{ display: 'inline', marginRight: 5 }} />Your Name (Paid By)</label>
              <input
                id="submitterName"
                type="text"
                value={submitterName}
                onChange={(e) => { setSubmitterName(e.target.value); setErrors((p) => ({ ...p, submitterName: '' })) }}
                placeholder="Enter your full name"
                style={{ ...inputStyle, borderColor: errors.submitterName ? 'var(--error)' : undefined }}
                onFocus={focusStyle}
                onBlur={blurStyle('submitterName')}
              />
              {errors.submitterName && <p style={{ color: 'var(--error)', fontSize: 12, marginTop: 4 }}>{errors.submitterName}</p>}
            </div>

            {/* Amount */}
            <div style={{ marginBottom: 18 }}>
              <label htmlFor="amount" style={labelStyle}><DollarSign size={13} style={{ display: 'inline', marginRight: 5 }} />Amount</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--foreground-muted)', fontSize: 15, fontWeight: 600 }}>$</span>
                <input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setErrors((p) => ({ ...p, amount: '' })) }}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  style={{ ...inputStyle, paddingLeft: 28, borderColor: errors.amount ? 'var(--error)' : undefined }}
                  onFocus={focusStyle}
                  onBlur={blurStyle('amount')}
                />
              </div>
              {errors.amount && <p style={{ color: 'var(--error)', fontSize: 12, marginTop: 4 }}>{errors.amount}</p>}
            </div>

            {/* Payment Status */}
            <div style={{ marginBottom: 18 }}>
              <label htmlFor="paymentStatus" style={labelStyle}>Payment Status</label>
              <select
                id="paymentStatus"
                value={paymentStatus}
                onChange={(e) => { setPaymentStatus(e.target.value) }}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="FULLY_PAID">Fully Paid</option>
                <option value="NOT_PAID">Not Paid</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
              </select>
            </div>

            {/* Amount Paid + Remaining Amount */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 18 }}>
              <div>
                <label htmlFor="amountPaid" style={labelStyle}>Amount Paid</label>
                <input
                  id="amountPaid"
                  type="number"
                  value={amountPaid}
                  onChange={(e) => { setAmountPaid(e.target.value) }}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  disabled={paymentStatus !== 'PARTIALLY_PAID'}
                  style={{ ...inputStyle, opacity: paymentStatus !== 'PARTIALLY_PAID' ? 0.7 : 1, cursor: paymentStatus !== 'PARTIALLY_PAID' ? 'not-allowed' : 'text' }}
                  onFocus={focusStyle}
                  onBlur={blurStyle('amountPaid')}
                />
              </div>
              <div>
                <label htmlFor="remainingAmount" style={labelStyle}>Remaining Amount to be Paid</label>
                <input
                  id="remainingAmount"
                  type="number"
                  value={remainingAmount}
                  disabled
                  style={{ ...inputStyle, opacity: 0.7, cursor: 'not-allowed' }}
                />
              </div>
            </div>

            {/* Vendor */}
            <div style={{ marginBottom: 18 }}>
              <label htmlFor="vendorId" style={labelStyle}>Vendor</label>
              <select
                id="vendorId"
                value={vendorId}
                onChange={(e) => { setVendorId(e.target.value); setErrors((p) => ({ ...p, vendorId: '' })) }}
                style={{ ...inputStyle, borderColor: errors.vendorId ? 'var(--error)' : undefined, cursor: 'pointer' }}
                onFocus={focusStyle}
                onBlur={blurStyle('vendorId')}
              >
                <option value="">Select a vendor…</option>
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
              {errors.vendorId && <p style={{ color: 'var(--error)', fontSize: 12, marginTop: 4 }}>{errors.vendorId}</p>}
            </div>

            {/* Paid With */}
            <div style={{ marginBottom: 18 }}>
              <label htmlFor="paymentMethodId" style={labelStyle}>Paid With</label>
              <select
                id="paymentMethodId"
                value={paymentMethodId}
                onChange={(e) => { setPaymentMethodId(e.target.value); setErrors((p) => ({ ...p, paymentMethodId: '' })) }}
                style={{ ...inputStyle, borderColor: errors.paymentMethodId ? 'var(--error)' : undefined, cursor: 'pointer' }}
                onFocus={focusStyle}
                onBlur={blurStyle('paymentMethodId')}
              >
                <option value="">Select payment method…</option>
                {paymentMethods.map((pm) => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
              </select>
              {errors.paymentMethodId && <p style={{ color: 'var(--error)', fontSize: 12, marginTop: 4 }}>{errors.paymentMethodId}</p>}
            </div>

            {/* Category */}
            <div style={{ marginBottom: 18 }}>
              <label htmlFor="categoryId" style={labelStyle}>Category</label>
              <select
                id="categoryId"
                value={categoryId}
                onChange={(e) => { setCategoryId(e.target.value); setErrors((p) => ({ ...p, categoryId: '' })) }}
                style={{ ...inputStyle, borderColor: errors.categoryId ? 'var(--error)' : undefined, cursor: 'pointer' }}
                onFocus={focusStyle}
                onBlur={blurStyle('categoryId')}
              >
                <option value="">Select a category…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.categoryId && <p style={{ color: 'var(--error)', fontSize: 12, marginTop: 4 }}>{errors.categoryId}</p>}
            </div>

            {/* Remarks */}
            <div style={{ marginBottom: 18 }}>
              <label htmlFor="remarks" style={labelStyle}><FileText size={13} style={{ display: 'inline', marginRight: 5 }} />Remarks <span style={{ fontWeight: 400, color: 'var(--foreground-muted)', fontSize: 11 }}>(optional)</span></label>
              <textarea
                id="remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Any additional notes about this bill…"
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
                onFocus={focusStyle}
                onBlur={blurStyle('remarks')}
              />
            </div>

             {/* Image Upload */}
             <div style={{ marginBottom: 28 }}>
               <label style={labelStyle}>
                 <Upload size={13} style={{ display: 'inline', marginRight: 5 }} />
                 Bill Image <span style={{ fontWeight: 600, color: 'var(--error)', fontSize: 11 }}>* (Required — jpg, jpeg, png, pdf)</span>
               </label>
               <div
                 style={{
                   border: `2px dashed ${imageFile ? 'var(--primary)' : (errors.imageFile ? 'var(--error)' : 'var(--border)')}`,
                   borderRadius: 12, padding: '20px', textAlign: 'center',
                   background: imageFile ? 'rgba(249,115,22,0.04)' : 'transparent',
                   cursor: 'pointer', transition: 'all 0.15s',
                   position: 'relative',
                 }}
                 onClick={() => document.getElementById('bill-image-upload')?.click()}
               >
                 {imageFile ? (
                   <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                     <div style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 14 }}>📎 {imageFile.name}</div>
                     <button
                       type="button"
                       onClick={(e) => { e.stopPropagation(); setImageFile(null) }}
                       style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', display: 'flex' }}
                     >
                       <X size={16} />
                     </button>
                   </div>
                 ) : (
                   <>
                     <Upload size={24} style={{ color: 'var(--foreground-muted)', marginBottom: 8 }} />
                     <p style={{ color: 'var(--foreground-muted)', fontSize: 13 }}>Click to upload or drag and drop</p>
                     <p style={{ color: 'var(--foreground-muted)', fontSize: 11, marginTop: 4 }}>JPG, PNG, PDF up to 10MB</p>
                   </>
                 )}
                 <input
                   id="bill-image-upload"
                   type="file"
                   accept=".jpg,.jpeg,.png,.pdf"
                   style={{ display: 'none' }}
                   onChange={(e) => { setImageFile(e.target.files?.[0] || null); setErrors((p) => ({ ...p, imageFile: '' })) }}
                 />
               </div>
               {errors.imageFile && <p style={{ color: 'var(--error)', fontSize: 12, marginTop: 4 }}>{errors.imageFile}</p>}
             </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '13px 24px', borderRadius: 12, border: 'none',
                  background: loading ? 'var(--border)' : 'linear-gradient(135deg, #f97316, #ea580c)',
                  color: 'white', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', boxShadow: loading ? 'none' : '0 4px 16px rgba(249,115,22,0.4)',
                }}
              >
                {loading ? (
                  <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Submitting…</>
                ) : (
                  <><Send size={16} /> Submit Bill</>
                )}
              </button>
              <button
                type="button"
                onClick={handleReset}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '13px 20px',
                  borderRadius: 12, border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--foreground-muted)', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <RotateCcw size={14} /> Reset
              </button>
            </div>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--foreground-muted)' }}>
          © {new Date().getFullYear()} Jay&apos;s Kitchen. All rights reserved.
        </p>
      </div>
    </div>
  )
}
