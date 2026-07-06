'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Plus, Save, Loader2, Calendar, Hash, Building2, Tag, CreditCard, User, FileText, Upload, Trash2, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import Image from 'next/image'
import { billSchema, type BillInput } from '@/lib/validations'
import { formatCurrency, toInputDate, getOptimizedImageUrl } from '@/lib/format'
import { useAuth } from '@/providers/auth-provider'
import { getCurrencySymbol } from '@/lib/currency'

interface Vendor { id: string; name: string; isActive: boolean }
interface Category { id: string; name: string; color: string; icon?: string | null; isActive: boolean }
interface PaymentMethod { id: string; name: string; type: string; isActive: boolean }
interface BillImage { id: string; url: string; thumbnailUrl?: string | null }
interface Bill {
  id: string
  billNumber: string
  billDate: string
  amount: number | string
  remarks?: string | null
  vendorId: string
  categoryId: string
  paymentMethodId: string
  paidBy?: { name: string } | null
  submittedByUser?: { firstName: string; lastName: string } | null
  submitterName?: string | null
  images: BillImage[]
  paymentStatus?: 'FULLY_PAID' | 'NOT_PAID' | 'PARTIALLY_PAID'
  amountPaid?: number | string
  remainingAmount?: number | string
}

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  bill?: Bill | null
}

export default function BillDrawer({ open, onClose, onSaved, bill }: Props) {
  const { settings } = useAuth()
  const currencySymbol = getCurrencySymbol(settings?.currency)
  const isEdit = !!bill
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [images, setImages] = useState<BillImage[]>(bill?.images || [])
  // For new bills: hold selected file before bill ID exists
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<BillInput>({
    resolver: zodResolver(billSchema),
    defaultValues: bill
      ? {
          billNumber: bill.billNumber,
          billDate: toInputDate(bill.billDate),
          vendorId: bill.vendorId,
          categoryId: bill.categoryId,
          paymentMethodId: bill.paymentMethodId,
          paidBy: bill.paidBy?.name || '',
          amount: Number(bill.amount),
          remarks: bill.remarks || '',
          paymentStatus: bill.paymentStatus || 'NOT_PAID',
          amountPaid: Number(bill.amountPaid || 0),
          remainingAmount: Number(bill.remainingAmount || 0),
        }
      : {
          billDate: toInputDate(new Date()),
          billNumber: '',
          paidBy: '',
          paymentStatus: 'NOT_PAID',
          amountPaid: 0,
          remainingAmount: 0,
        },
  })

  const watchedAmount = watch('amount') || 0
  const watchedPaymentStatus = watch('paymentStatus') || 'NOT_PAID'
  const watchedAmountPaid = watch('amountPaid') || 0

  useEffect(() => {
    if (watchedPaymentStatus === 'FULLY_PAID') {
      setValue('amountPaid', watchedAmount)
      setValue('remainingAmount', 0)
    } else if (watchedPaymentStatus === 'NOT_PAID') {
      setValue('amountPaid', 0)
      setValue('remainingAmount', watchedAmount)
    } else if (watchedPaymentStatus === 'PARTIALLY_PAID') {
      const rem = Math.max(0, watchedAmount - watchedAmountPaid)
      setValue('remainingAmount', Number(rem.toFixed(2)))
    }
  }, [watchedAmount, watchedPaymentStatus, watchedAmountPaid, setValue])

  useEffect(() => {
    const fetchData = async () => {
      const [v, c, p] = await Promise.all([
        fetch('/api/vendors').then((r) => r.json()),
        fetch('/api/categories').then((r) => r.json()),
        fetch('/api/payment-methods').then((r) => r.json()),
      ])
      if (v.success) setVendors(v.data.filter((x: Vendor) => x.isActive || x.id === bill?.vendorId))
      if (c.success) setCategories(c.data.filter((x: Category) => x.isActive || x.id === bill?.categoryId))
      if (p.success) setPaymentMethods(p.data.filter((x: PaymentMethod) => x.isActive || x.id === bill?.paymentMethodId))

      if (bill?.id) {
        try {
          const [imgRes, billRes] = await Promise.all([
            fetch(`/api/bills/${bill.id}/images`).then((r) => r.json()),
            fetch(`/api/bills/${bill.id}`).then((r) => r.json()),
          ])
          if (imgRes.success) setImages(imgRes.data)
          if (billRes.success && billRes.data) {
            setValue('remarks', billRes.data.remarks || '')
          }
        } catch (err) {
          console.error('Failed to load bill details:', err)
        }
      }
    }
    fetchData()
  }, [bill])

  // Upload image to an existing bill
  const uploadImageToBill = async (billId: string, file: File): Promise<BillImage | null> => {
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`/api/bills/${billId}/images`, { method: 'POST', body: fd })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data as BillImage
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Image upload failed')
      return null
    }
  }

  const onSubmit = async (data: BillInput) => {
    if (!isEdit && !pendingFile) {
      toast.error('Bill receipt image is required')
      return
    }
    setSaving(true)
    try {
      const url = isEdit ? `/api/bills/${bill!.id}` : '/api/bills'
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const json = await res.json()
      if (!json.success) throw new Error(json.error)

      // If creating a new bill with a pending image, upload it now
      if (!isEdit && pendingFile && json.data?.id) {
        const uploaded = await uploadImageToBill(json.data.id, pendingFile)
        if (uploaded) {
          setImages([uploaded])
        }
        setPendingFile(null)
      }

      toast.success(isEdit ? 'Bill updated!' : 'Bill added!')
      onSaved()
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to save bill')
    } finally {
      setSaving(false)
    }
  }

  // Image upload for EDIT mode (bill already exists)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (isEdit) {
      // Upload immediately
      setUploadingImage(true)
      try {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch(`/api/bills/${bill!.id}/images`, { method: 'POST', body: fd })
        const json = await res.json()
        if (!json.success) throw new Error(json.error)
        setImages((prev) => [...prev, json.data])
        toast.success('Image uploaded!')
      } catch (err: unknown) {
        toast.error((err as Error).message || 'Upload failed')
      } finally {
        setUploadingImage(false)
        e.target.value = ''
      }
    } else {
      // Store file; will upload after bill is created
      setPendingFile(file)
      e.target.value = ''
    }
  }

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Delete this image?')) return
    try {
      await fetch(`/api/bills/${bill!.id}/images/${imageId}`, { method: 'DELETE' })
      setImages((prev) => prev.filter((i) => i.id !== imageId))
      toast.success('Image deleted')
    } catch {
      toast.error('Failed to delete image')
    }
  }

  const handleDownloadImage = (url: string, id: string) => {
    let ext = 'png'
    if (url.startsWith('data:application/pdf')) ext = 'pdf'
    else if (url.startsWith('data:image/jpeg') || url.startsWith('data:image/jpg')) ext = 'jpg'
    else if (url.startsWith('data:image/gif')) ext = 'gif'

    const link = document.createElement('a')
    link.href = url
    link.download = `receipt-${bill?.billNumber || id}.${ext}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Receipt downloaded successfully!')
  }

  if (!open) return null

  const amount = watch('amount')

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(3px)',
          zIndex: 200,
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100dvh',
          width: '100%',
          maxWidth: 500,
          background: 'var(--card)',
          zIndex: 201,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-20px 0 60px rgba(0,0,0,0.2)',
          animation: 'slideInRight 0.25s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.02em' }}>
              {isEdit ? 'Edit Bill' : 'Add New Bill'}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 2 }}>
              {isEdit ? `Editing ${bill?.billNumber}` : 'Fill in the expense details below'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--foreground-muted)',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Amount Preview */}
        {amount > 0 && (
          <div
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 500, opacity: 0.85 }}>Bill Amount</span>
            <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>
              {formatCurrency(amount, settings?.currency)}
            </span>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          {/* Bill Number + Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FieldGroup label="Bill Number" error={errors.billNumber?.message} icon={<Hash size={14} />} id="billNumber">
              <input id="billNumber" {...register('billNumber')} placeholder="JK-2025-0001" className="drawer-input" />
            </FieldGroup>
            <FieldGroup label="Bill Date" error={errors.billDate?.message} icon={<Calendar size={14} />} id="billDate">
              <input id="billDate" {...register('billDate')} type="date" className="drawer-input" />
            </FieldGroup>
          </div>

          {/* Vendor */}
          <FieldGroup label="Vendor" error={errors.vendorId?.message} icon={<Building2 size={14} />} id="vendorId">
            <select id="vendorId" {...register('vendorId')} className="drawer-select">
              <option value="">Select vendor…</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </FieldGroup>

          {/* Amount */}
          <FieldGroup label={`Amount (${currencySymbol})`} error={errors.amount?.message} icon={<span style={{ fontSize: 13, fontWeight: 700 }}>{currencySymbol}</span>} id="amount">
            <input id="amount" {...register('amount', { valueAsNumber: true })} type="number" step="0.01" min="0" placeholder="0.00" className="drawer-input" />
          </FieldGroup>

          {/* Payment Status */}
          <FieldGroup label="Payment Status" error={errors.paymentStatus?.message} icon={<CreditCard size={14} />} id="paymentStatus">
            <select id="paymentStatus" {...register('paymentStatus')} className="drawer-select">
              <option value="FULLY_PAID">Fully Paid</option>
              <option value="NOT_PAID">Not Paid</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
            </select>
          </FieldGroup>

          {/* Amount Paid + Remaining Amount */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <FieldGroup label="Amount Paid" error={errors.amountPaid?.message} icon={<span style={{ fontSize: 13, fontWeight: 700 }}>{currencySymbol}</span>} id="amountPaid">
              <input
                id="amountPaid"
                {...register('amountPaid', { valueAsNumber: true })}
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                disabled={watchedPaymentStatus !== 'PARTIALLY_PAID'}
                className="drawer-input"
              />
            </FieldGroup>
            <FieldGroup label="Remaining Amount to be Paid" error={errors.remainingAmount?.message} icon={<span style={{ fontSize: 13, fontWeight: 700 }}>{currencySymbol}</span>} id="remainingAmount">
              <input
                id="remainingAmount"
                {...register('remainingAmount', { valueAsNumber: true })}
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                disabled
                className="drawer-input"
                style={{ opacity: 0.7, cursor: 'not-allowed' }}
              />
            </FieldGroup>
          </div>

          {/* Category + Payment Method */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FieldGroup label="Category" error={errors.categoryId?.message} icon={<Tag size={14} />} id="categoryId">
              <select id="categoryId" {...register('categoryId')} className="drawer-select">
                <option value="">Select…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </FieldGroup>
            <FieldGroup label="Payment Method" error={errors.paymentMethodId?.message} icon={<CreditCard size={14} />} id="paymentMethodId">
              <select id="paymentMethodId" {...register('paymentMethodId')} className="drawer-select">
                <option value="">Select…</option>
                {paymentMethods.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </FieldGroup>
          </div>

          {/* Paid By */}
          <FieldGroup label="Paid By" error={errors.paidBy?.message} icon={<User size={14} />} id="paidBy">
            <input
              id="paidBy"
              type="text"
              {...register('paidBy')}
              placeholder="Name of person who paid..."
              className="drawer-input"
            />
          </FieldGroup>

          {isEdit && (
            <FieldGroup label="Submitted By" icon={<User size={14} />} id="submittedByDisplay">
              <input
                id="submittedByDisplay"
                type="text"
                readOnly
                value={bill?.submittedByUser ? `${bill.submittedByUser.firstName} ${bill.submittedByUser.lastName}`.trim() : 'Public Submission'}
                className="drawer-input"
                style={{ background: 'var(--background)', cursor: 'not-allowed', color: 'var(--foreground-muted)' }}
              />
            </FieldGroup>
          )}

          {/* Remarks */}
          <FieldGroup label="Remarks" icon={<FileText size={14} />} id="remarks">
            <textarea
              id="remarks"
              {...register('remarks')}
              placeholder="Optional notes about this bill…"
              rows={2}
              className="drawer-input"
              style={{ resize: 'none' }}
            />
          </FieldGroup>

          {/* Read-only Payment Info display */}
          {isEdit && (
            <div style={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--foreground-muted)' }}>Payment Status</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>
                  {watchedPaymentStatus === 'FULLY_PAID' && 'Fully Paid'}
                  {watchedPaymentStatus === 'NOT_PAID' && 'Not Paid'}
                  {watchedPaymentStatus === 'PARTIALLY_PAID' && 'Partially Paid'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--foreground-muted)' }}>Amount Paid</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>
                  {formatCurrency(watchedAmountPaid, settings?.currency)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--foreground-muted)' }}>Remaining Amount</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: watchedPaymentStatus === 'FULLY_PAID' ? 'var(--success)' : 'var(--error)' }}>
                  {formatCurrency(Math.max(0, watchedAmount - watchedAmountPaid), settings?.currency)}
                </span>
              </div>
            </div>
          )}

          {/* Bill Images — shown for both CREATE and EDIT */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Upload size={14} color="var(--foreground-muted)" />
                Bill Image
                {!isEdit && <span style={{ fontWeight: 600, fontSize: 11, color: 'var(--error)' }}>* (Required)</span>}
                {isEdit && <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--foreground-muted)' }}>(Optional)</span>}
              </label>
              <label
                style={{
                  padding: '5px 12px',
                  borderRadius: 8,
                  border: '1px dashed var(--border)',
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--foreground-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  transition: 'all 0.15s',
                }}
              >
                {uploadingImage ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Plus size={13} />}
                {uploadingImage ? 'Uploading…' : 'Add Photo'}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  style={{ display: 'none' }}
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                />
              </label>
            </div>

            {/* Show pending file indicator for new bills */}
            {!isEdit && pendingFile && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid rgba(249,115,22,0.4)',
                  background: 'rgba(249,115,22,0.06)',
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 500 }}>
                  📎 {pendingFile.name}
                </span>
                <button
                  type="button"
                  onClick={() => setPendingFile(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--foreground-muted)', display: 'flex', padding: 2 }}
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Show uploaded images for edit mode */}
            {isEdit && images.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {images.map((img) => (
                  <div
                    key={img.id}
                    style={{
                      position: 'relative',
                      borderRadius: 10,
                      overflow: 'hidden',
                      border: '1px solid var(--border)',
                      aspectRatio: '1',
                      background: 'var(--background)',
                      cursor: 'pointer',
                    }}
                    onClick={() => window.open(img.url, '_blank')}
                  >
                    <img
                      src={getOptimizedImageUrl(img.thumbnailUrl || img.url)}
                      alt="Bill"
                      loading="lazy"
                      style={{ objectFit: 'cover', width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
                    />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDownloadImage(img.url, img.id) }}
                      style={{
                        position: 'absolute',
                        top: 4,
                        left: 4,
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        background: 'rgba(34,197,94,0.9)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                      }}
                      title="Download Image"
                    >
                      <Download size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDeleteImage(img.id) }}
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        background: 'rgba(239,68,68,0.9)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                      }}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            ) : isEdit ? (
              <div
                style={{
                  border: '1px dashed var(--border)',
                  borderRadius: 10,
                  padding: 20,
                  textAlign: 'center',
                  color: 'var(--foreground-muted)',
                  fontSize: 13,
                }}
              >
                No images attached
              </div>
            ) : null}
          </div>
        </form>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: 10,
            flexShrink: 0,
            background: 'var(--card)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '11px 16px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--foreground-muted)',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              reset({
                billDate: toInputDate(new Date()),
                billNumber: `JK-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
                vendorId: '',
                categoryId: '',
                paymentMethodId: '',
                paidBy: '',
                amount: undefined,
                remarks: '',
              })
              setImages([])
              setPendingFile(null)
            }}
            style={{
              flex: 1,
              padding: '11px 16px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: '#f59e0b',
              borderColor: 'rgba(245,158,11,0.4)',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            ↺ Reset
          </button>
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={saving}
            style={{
              flex: 2,
              padding: '11px 16px',
              borderRadius: 10,
              border: 'none',
              background: saving ? 'var(--border)' : 'linear-gradient(135deg, #f97316, #ea580c)',
              color: 'white',
              fontSize: 14,
              fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: saving ? 'none' : '0 2px 8px rgba(249,115,22,0.35)',
              transition: 'all 0.15s',
            }}
          >
            {saving ? (
              <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
            ) : (
              <Save size={15} />
            )}
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Bill'}
          </button>
        </div>
      </div>

      <style jsx global>{`
        .drawer-input {
          width: 100%;
          padding: 9px 12px;
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          color: var(--foreground);
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .drawer-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(249,115,22,0.1);
        }
        .drawer-select {
          width: 100%;
          padding: 9px 12px;
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          color: var(--foreground);
          outline: none;
          cursor: pointer;
          appearance: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .drawer-select:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(249,115,22,0.1);
        }
      `}</style>
    </>
  )
}

function FieldGroup({
  label,
  error,
  icon,
  id,
  children,
}: {
  label: string
  error?: string
  icon?: React.ReactNode
  id?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        htmlFor={id}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--foreground)',
          marginBottom: 6,
        }}
      >
        <span style={{ color: 'var(--foreground-muted)' }}>{icon}</span>
        {label}
      </label>
      {children}
      {error && <p style={{ color: 'var(--error)', fontSize: 12, marginTop: 4 }}>{error}</p>}
    </div>
  )
}
