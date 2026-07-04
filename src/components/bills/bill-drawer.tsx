'use client'

import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Plus, Save, Loader2, Calendar, Hash, Building2, Tag, CreditCard, User, FileText, Upload, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Image from 'next/image'
import { billSchema, type BillInput } from '@/lib/validations'
import { formatCurrency, toInputDate } from '@/lib/format'
import { useAuth } from '@/providers/auth-provider'
import { getCurrencySymbol } from '@/lib/currency'

interface Vendor { id: string; name: string; isActive: boolean }
interface Category { id: string; name: string; color: string; icon?: string | null; isActive: boolean }
interface PaymentMethod { id: string; name: string; type: string; isActive: boolean }
interface AppUser { id: string; name: string; role: string }
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
  paidById: string
  images: BillImage[]
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
  const [users, setUsers] = useState<AppUser[]>([])
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [images, setImages] = useState<BillImage[]>(bill?.images || [])
  const [newVendorName, setNewVendorName] = useState('')
  const [addingVendor, setAddingVendor] = useState(false)
  const [showAddVendor, setShowAddVendor] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
  } = useForm<BillInput>({
    resolver: zodResolver(billSchema),
    defaultValues: bill
      ? {
          billNumber: bill.billNumber,
          billDate: toInputDate(bill.billDate),
          vendorId: bill.vendorId,
          categoryId: bill.categoryId,
          paymentMethodId: bill.paymentMethodId,
          paidById: bill.paidById,
          amount: Number(bill.amount),
          remarks: bill.remarks || '',
        }
      : {
          billDate: toInputDate(new Date()),
          billNumber: `JK-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        },
  })

  useEffect(() => {
    const fetchData = async () => {
      const [v, c, p, u] = await Promise.all([
        fetch('/api/vendors?activeOnly=true').then((r) => r.json()),
        fetch('/api/categories').then((r) => r.json()),
        fetch('/api/payment-methods').then((r) => r.json()),
        fetch('/api/users').then((r) => r.json()),
      ])
      if (v.success) setVendors(v.data.filter((x: Vendor) => x.isActive))
      if (c.success) setCategories(c.data.filter((x: Category) => x.isActive))
      if (p.success) setPaymentMethods(p.data.filter((x: PaymentMethod) => x.isActive))
      if (u.success) setUsers(u.data)
    }
    fetchData()
  }, [])

  const onSubmit = async (data: BillInput) => {
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

      toast.success(isEdit ? 'Bill updated!' : 'Bill added!')
      onSaved()
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to save bill')
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !isEdit) return

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

  const handleAddVendor = async () => {
    if (!newVendorName.trim()) return
    setAddingVendor(true)
    try {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newVendorName.trim() }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setVendors((prev) => [...prev, json.data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewVendorName('')
      setShowAddVendor(false)
      toast.success(`Vendor "${json.data.name}" added!`)
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to add vendor')
    } finally {
      setAddingVendor(false)
    }
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
          height: '100vh',
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
              {isEdit ? `Editing ${bill?.billNumber}` : "Fill in the expense details below"}
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
            <FieldGroup label="Bill Number" error={errors.billNumber?.message} icon={<Hash size={14} />}>
              <input {...register('billNumber')} placeholder="JK-2025-0001" className="drawer-input" />
            </FieldGroup>
            <FieldGroup label="Bill Date" error={errors.billDate?.message} icon={<Calendar size={14} />}>
              <input {...register('billDate')} type="date" className="drawer-input" />
            </FieldGroup>
          </div>

          {/* Vendor */}
          <FieldGroup label="Vendor" error={errors.vendorId?.message} icon={<Building2 size={14} />}>
            <div style={{ display: 'flex', gap: 8 }}>
              <select {...register('vendorId')} className="drawer-select" style={{ flex: 1 }}>
                <option value="">Select vendor…</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowAddVendor(!showAddVendor)}
                title="Add new vendor"
                style={{
                  padding: '0 10px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: showAddVendor ? 'var(--primary)' : 'var(--background)',
                  color: showAddVendor ? 'white' : 'var(--foreground-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 0,
                  transition: 'all 0.15s',
                }}
              >
                <Plus size={15} />
              </button>
            </div>

            {showAddVendor && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input
                  value={newVendorName}
                  onChange={(e) => setNewVendorName(e.target.value)}
                  placeholder="New vendor name…"
                  className="drawer-input"
                  style={{ flex: 1 }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddVendor() } }}
                />
                <button
                  type="button"
                  onClick={handleAddVendor}
                  disabled={addingVendor}
                  style={{
                    padding: '0 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'var(--primary)',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    flexShrink: 0,
                  }}
                >
                  {addingVendor ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : 'Add'}
                </button>
              </div>
            )}
          </FieldGroup>

          {/* Amount */}
          <FieldGroup label={`Amount (${currencySymbol})`} error={errors.amount?.message} icon={<span style={{ fontSize: 13, fontWeight: 700 }}>{currencySymbol}</span>}>
            <input {...register('amount', { valueAsNumber: true })} type="number" step="0.01" min="0" placeholder="0.00" className="drawer-input" />
          </FieldGroup>

          {/* Category + Payment Method */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FieldGroup label="Category" error={errors.categoryId?.message} icon={<Tag size={14} />}>
              <select {...register('categoryId')} className="drawer-select">
                <option value="">Select…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </FieldGroup>
            <FieldGroup label="Payment Method" error={errors.paymentMethodId?.message} icon={<CreditCard size={14} />}>
              <select {...register('paymentMethodId')} className="drawer-select">
                <option value="">Select…</option>
                {paymentMethods.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </FieldGroup>
          </div>

          {/* Paid By */}
          <FieldGroup label="Paid By" error={errors.paidById?.message} icon={<User size={14} />}>
            <select {...register('paidById')} className="drawer-select">
              <option value="">Select user…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </FieldGroup>

          {/* Remarks */}
          <FieldGroup label="Remarks" icon={<FileText size={14} />}>
            <textarea
              {...register('remarks')}
              placeholder="Optional notes about this bill…"
              rows={2}
              className="drawer-input"
              style={{ resize: 'none' }}
            />
          </FieldGroup>

          {/* Images (edit mode only) */}
          {isEdit && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Upload size={14} color="var(--foreground-muted)" />
                  Bill Images
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
                  <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleImageUpload} disabled={uploadingImage} />
                </label>
              </div>

              {images.length > 0 ? (
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
                      <Image
                        src={img.thumbnailUrl || img.url}
                        alt="Bill"
                        fill
                        style={{ objectFit: 'cover' }}
                      />
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
              ) : (
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
              )}
            </div>
          )}
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
                paidById: '',
                amount: undefined,
                remarks: '',
              })
              setImages([])
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
            type="submit"
            form="bill-form"
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
  children,
}: {
  label: string
  error?: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <label
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
