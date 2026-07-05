'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/auth-provider'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Users, Building2, Tag, CreditCard, Store, User,
  Plus, Edit2, Trash2, Save, X, Loader2, Eye, EyeOff,
  Shield, CheckCircle2, XCircle,
} from 'lucide-react'

// ========== TYPES ==========
interface AppUser { id: string; name: string; email: string; role: string; isActive: boolean; createdAt: string }
interface Vendor { id: string; name: string; phone?: string | null; email?: string | null; address?: string | null; gstin?: string | null; isActive: boolean; _count?: { bills: number } }
interface Category { id: string; name: string; color: string; icon?: string | null; isActive: boolean; _count?: { bills: number } }
interface PaymentMethod { id: string; name: string; type: string; isActive: boolean; _count?: { bills: number } }
interface RestaurantSettings { id: string; name: string; address?: string | null; phone?: string | null; email?: string | null; gstin?: string | null; currency: string; timezone: string }

const TABS = [
  { id: 'restaurant', label: 'Restaurant', icon: Store },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'vendors', label: 'Vendors', icon: Building2 },
  { id: 'categories', label: 'Categories', icon: Tag },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'profile', label: 'My Profile', icon: User },
]

export default function SettingsPage() {
  const { user: authUser, isSuperAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState('restaurant')

  // Users tab is only visible to SUPER_ADMIN
  const visibleTabs = TABS.filter((t) => {
    if (t.id === 'users') return isSuperAdmin
    return true
  })

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--foreground)', marginBottom: 4 }}>Settings</h2>
        <p style={{ fontSize: 13, color: 'var(--foreground-muted)' }}>Manage your restaurant, users, and preferences</p>
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Tab List */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: 8,
            minWidth: 180,
            flexShrink: 0,
          }}
        >
          {visibleTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 10,
                border: 'none',
                background: activeTab === id ? 'var(--primary-light)' : 'transparent',
                color: activeTab === id ? 'var(--primary)' : 'var(--foreground-muted)',
                fontSize: 13,
                fontWeight: activeTab === id ? 600 : 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'left',
                transition: 'all 0.15s',
                marginBottom: 2,
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          style={{ flex: 1, minWidth: 0 }}
        >
          {activeTab === 'restaurant' && <RestaurantTab />}
          {activeTab === 'users' && isSuperAdmin && <UsersTab currentUserId={authUser?.id} />}
          {activeTab === 'vendors' && <VendorsTab />}
          {activeTab === 'categories' && <CategoriesTab />}
          {activeTab === 'payments' && <PaymentsTab />}
          {activeTab === 'profile' && <ProfileTab userId={authUser?.id} />}
        </motion.div>
      </div>
    </div>
  )
}

// ========== RESTAURANT TAB ==========
function RestaurantTab() {
  const { refetchSettings } = useAuth()
  const [settings, setSettings] = useState<RestaurantSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', address: '', phone: '', email: '', gstin: '', currency: 'USD', timezone: 'America/New_York' })

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then((j) => {
      if (j.success && j.data) {
        setSettings(j.data)
        setForm({ name: j.data.name || '', address: j.data.address || '', phone: j.data.phone || '', email: j.data.email || '', gstin: j.data.gstin || '', currency: j.data.currency || 'USD', timezone: j.data.timezone || 'America/New_York' })
      }
    })
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const j = await res.json()
      if (!j.success) throw new Error(j.error)
      toast.success('Restaurant settings saved!')
      refetchSettings()
    } catch { toast.error('Failed to save') } finally { setSaving(false) }
  }

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 24 }}>Restaurant Details</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {([
          ['Restaurant Name', 'name', 'text', "Jay's Kitchen"],
          ['Address', 'address', 'text', '123 Restaurant Street…'],
          ['Phone', 'phone', 'tel', '+1 (212) 555-0199'],
          ['Email', 'email', 'email', 'info@jayskitchen.com'],
          ['Tax ID / GSTIN', 'gstin', 'text', 'Tax ID / GSTIN'],
          ['Currency', 'currency', 'text', 'USD'],
        ] as [string, keyof typeof form, string, string][]).map(([label, field, type, placeholder]) => (
          <div key={field} style={field === 'address' ? { gridColumn: 'span 2' } : {}}>
            <label htmlFor={field} style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>{label}</label>
            <input
              id={field}
              type={type}
              value={form[field]}
              onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
              placeholder={placeholder}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--background)', color: 'var(--foreground)', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.1)' }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button onClick={save} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, border: 'none', background: saving ? 'var(--border)' : 'var(--primary)', color: 'white', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
          {saving ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Save size={15} />}
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={() => {
            if (settings) {
              setForm({
                name: settings.name || '',
                address: settings.address || '',
                phone: settings.phone || '',
                email: settings.email || '',
                gstin: settings.gstin || '',
                currency: settings.currency || 'USD',
                timezone: settings.timezone || 'America/New_York'
              })
            } else {
              setForm({ name: '', address: '', phone: '', email: '', gstin: '', currency: 'USD', timezone: 'America/New_York' })
            }
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--foreground-muted)', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Reset
        </button>
      </div>
    </div>
  )
}

// ========== USERS TAB ==========
function UsersTab({ currentUserId }: { currentUserId?: string }) {
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editUser, setEditUser] = useState<AppUser | null>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'ADMIN' })
  const [saving, setSaving] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const fetchUsers = () => {
    setLoading(true)
    fetch('/api/users').then((r) => r.json()).then((j) => {
      if (j.success) setUsers(j.data)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { fetchUsers() }, [])

  const openAdd = () => { setEditUser(null); setForm({ name: '', email: '', password: '', role: 'ADMIN' }); setShowForm(true) }
  const openEdit = (u: AppUser) => { setEditUser(u); setForm({ name: u.name, email: u.email, password: '', role: u.role }); setShowForm(true) }

  const save = async () => {
    setSaving(true)
    try {
      const url = editUser ? `/api/users/${editUser.id}` : '/api/users'
      const method = editUser ? 'PATCH' : 'POST'
      const body: Record<string, string> = { name: form.name, email: form.email, role: form.role }
      if (form.password) body.password = form.password
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j = await res.json()
      if (!j.success) throw new Error(j.error)
      toast.success(editUser ? 'User updated!' : 'User created!')
      setShowForm(false)
      fetchUsers()
    } catch (e: unknown) { toast.error((e as Error).message || 'Failed') } finally { setSaving(false) }
  }

  const deactivate = async (id: string) => {
    if (!confirm('Deactivate this user?')) return
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to deactivate user')
      toast.success('User deactivated')
      fetchUsers()
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Failed to deactivate user')
    }
  }

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700 }}>Users ({users.length})</h3>
        <button onClick={openAdd} style={addBtnStyle}><Plus size={14} /> Add User</button>
      </div>

      {showForm && (
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--background)' }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>{editUser ? 'Edit User' : 'New User'}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <SettingField label="Name"><input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Full name" style={settingInputStyle} /></SettingField>
            <SettingField label="Email"><input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="email@example.com" type="email" style={settingInputStyle} /></SettingField>
            <SettingField label={editUser ? 'New Password (leave blank to keep)' : 'Password'}>
              <div style={{ position: 'relative' }}>
                <input value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder="••••••••" type={showPass ? 'text' : 'password'} style={{ ...settingInputStyle, paddingRight: 36 }} />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--foreground-muted)', display: 'flex' }}>
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </SettingField>
            <SettingField label="Role">
              <select value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} style={settingSelectStyle}>
                <option value="ADMIN">Admin</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </SettingField>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={save} disabled={saving} style={saveBtnStyle}>{saving ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Save size={14} />} {saving ? 'Saving…' : 'Save'}</button>
            <button
              type="button"
              onClick={() => {
                if (editUser) {
                  setForm({ name: editUser.name, email: editUser.email, password: '', role: editUser.role })
                } else {
                  setForm({ name: '', email: '', password: '', role: 'ADMIN' })
                }
              }}
              style={{ ...cancelBtnStyle, color: '#f59e0b', borderColor: 'rgba(245,158,11,0.4)' }}
            >
              Reset
            </button>
            <button onClick={() => setShowForm(false)} style={cancelBtnStyle}><X size={14} /> Cancel</button>
          </div>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--background)' }}>
              {['Name', 'Email', 'Role', 'Status', ''].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--foreground-muted)' }}>Loading…</td></tr> :
              users.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700 }}>
                        {u.name[0]?.toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 500, fontSize: 14 }}>{u.name}</span>
                      {u.id === currentUserId && <span style={{ fontSize: 10, background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 6px', borderRadius: 100, fontWeight: 600 }}>You</span>}
                    </div>
                  </td>
                  <td style={tdStyle}><span style={{ fontSize: 13, color: 'var(--foreground-muted)' }}>{u.email}</span></td>
                  <td style={tdStyle}><span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 100, background: (u.role === 'ADMIN' || u.role === 'SUPER_ADMIN') ? 'var(--primary-light)' : 'var(--border)', color: (u.role === 'ADMIN' || u.role === 'SUPER_ADMIN') ? 'var(--primary)' : 'var(--foreground-muted)', fontWeight: 600 }}>{u.role}</span></td>
                  <td style={tdStyle}>{u.isActive ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#22c55e' }}><CheckCircle2 size={14} />Active</span> : <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#ef4444' }}><XCircle size={14} />Inactive</span>}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => openEdit(u)} style={actionBtnStyle}><Edit2 size={13} /></button>
                      {u.id !== currentUserId && <button onClick={() => deactivate(u.id)} style={{ ...actionBtnStyle, color: 'var(--error)' }}><Trash2 size={13} /></button>}
                    </div>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ========== VENDORS TAB ==========
function VendorsTab() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editVendor, setEditVendor] = useState<Vendor | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', gstin: '' })
  const [saving, setSaving] = useState(false)

  const fetchVendors = () => fetch('/api/vendors').then((r) => r.json()).then((j) => { if (j.success) setVendors(j.data) })
  useEffect(() => { fetchVendors() }, [])

  const openAdd = () => { setEditVendor(null); setForm({ name: '', phone: '', email: '', address: '', gstin: '' }); setShowForm(true) }
  const openEdit = (v: Vendor) => { setEditVendor(v); setForm({ name: v.name, phone: v.phone || '', email: v.email || '', address: v.address || '', gstin: v.gstin || '' }); setShowForm(true) }

  const save = async () => {
    setSaving(true)
    try {
      const url = editVendor ? `/api/vendors/${editVendor.id}` : '/api/vendors'
      const method = editVendor ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const j = await res.json()
      if (!j.success) throw new Error(j.error)
      toast.success(editVendor ? 'Vendor updated!' : 'Vendor created!')
      setShowForm(false)
      fetchVendors()
    } catch (e: unknown) { toast.error((e as Error).message || 'Failed') } finally { setSaving(false) }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete/deactivate this vendor?')) return
    try {
      const res = await fetch(`/api/vendors/${id}`, { method: 'DELETE' })
      const j = await res.json()
      if (!j.success) throw new Error(j.error)
      toast.success('Vendor removed')
      fetchVendors()
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Failed to delete vendor')
    }
  }

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700 }}>Vendors ({vendors.length})</h3>
        <button onClick={openAdd} style={addBtnStyle}><Plus size={14} /> Add Vendor</button>
      </div>
      {showForm && (
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--background)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {([['Name *', 'name', 'text', 'Vendor name'], ['Phone', 'phone', 'tel', '+91…'], ['Email', 'email', 'email', 'vendor@…'], ['Address', 'address', 'text', 'Street, City…'], ['GSTIN', 'gstin', 'text', 'Optional']] as [string, keyof typeof form, string, string][]).map(([label, field, type, ph]) => (
              <SettingField key={field} label={label}><input value={form[field]} onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))} placeholder={ph} type={type} style={settingInputStyle} /></SettingField>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={save} disabled={saving} style={saveBtnStyle}>{saving ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Save size={14} />} Save</button>
            <button
              type="button"
              onClick={() => {
                if (editVendor) {
                  setForm({
                    name: editVendor.name,
                    phone: editVendor.phone || '',
                    email: editVendor.email || '',
                    address: editVendor.address || '',
                    gstin: editVendor.gstin || ''
                  })
                } else {
                  setForm({ name: '', phone: '', email: '', address: '', gstin: '' })
                }
              }}
              style={{ ...cancelBtnStyle, color: '#f59e0b', borderColor: 'rgba(245,158,11,0.4)' }}
            >
              Reset
            </button>
            <button onClick={() => setShowForm(false)} style={cancelBtnStyle}><X size={14} /> Cancel</button>
          </div>
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: 'var(--background)' }}>{['Name', 'Phone', 'Bills', 'Status', ''].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
          <tbody>
            {vendors.map((v, i) => (
              <tr key={v.id} style={{ borderBottom: i < vendors.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <td style={tdStyle}><span style={{ fontWeight: 500 }}>{v.name}</span></td>
                <td style={tdStyle}><span style={{ fontSize: 13, color: 'var(--foreground-muted)' }}>{v.phone || '—'}</span></td>
                <td style={tdStyle}><span style={{ fontSize: 13 }}>{v._count?.bills || 0} bills</span></td>
                <td style={tdStyle}>{v.isActive ? <span style={{ fontSize: 12, color: '#22c55e' }}>Active</span> : <span style={{ fontSize: 12, color: '#ef4444' }}>Inactive</span>}</td>
                <td style={tdStyle}><div style={{ display: 'flex', gap: 4 }}><button onClick={() => openEdit(v)} style={actionBtnStyle}><Edit2 size={13} /></button><button onClick={() => remove(v.id)} style={{ ...actionBtnStyle, color: 'var(--error)' }}><Trash2 size={13} /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ========== CATEGORIES TAB ==========
function CategoriesTab() {
  const [categories, setCategories] = useState<Category[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editCat, setEditCat] = useState<Category | null>(null)
  const [form, setForm] = useState({ name: '', color: '#f97316', icon: '' })
  const [saving, setSaving] = useState(false)

  const fetchCats = () => fetch('/api/categories').then((r) => r.json()).then((j) => { if (j.success) setCategories(j.data) })
  useEffect(() => { fetchCats() }, [])

  const openAdd = () => { setEditCat(null); setForm({ name: '', color: '#f97316', icon: '' }); setShowForm(true) }
  const openEdit = (c: Category) => { setEditCat(c); setForm({ name: c.name, color: c.color, icon: c.icon || '' }); setShowForm(true) }

  const save = async () => {
    setSaving(true)
    try {
      const url = editCat ? `/api/categories/${editCat.id}` : '/api/categories'
      const method = editCat ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const j = await res.json()
      if (!j.success) throw new Error(j.error)
      toast.success('Category saved!')
      setShowForm(false)
      fetchCats()
    } catch (e: unknown) { toast.error((e as Error).message || 'Failed') } finally { setSaving(false) }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this category?')) return
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
      const j = await res.json()
      if (!j.success) throw new Error(j.error)
      toast.success('Category removed')
      fetchCats()
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Failed to delete category')
    }
  }

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700 }}>Categories ({categories.length})</h3>
        <button onClick={openAdd} style={addBtnStyle}><Plus size={14} /> Add Category</button>
      </div>
      {showForm && (
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--background)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: 12 }}>
            <SettingField label="Name *"><input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Category name" style={settingInputStyle} /></SettingField>
            <SettingField label="Icon (emoji)"><input value={form.icon} onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))} placeholder="🥦" style={{ ...settingInputStyle, fontSize: 22, textAlign: 'center' }} /></SettingField>
            <SettingField label="Color"><input value={form.color} onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))} type="color" style={{ ...settingInputStyle, padding: 4, cursor: 'pointer', height: 42 }} /></SettingField>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={save} disabled={saving} style={saveBtnStyle}>{saving ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Save size={14} />} Save</button>
            <button
              type="button"
              onClick={() => {
                if (editCat) {
                  setForm({
                    name: editCat.name,
                    color: editCat.color,
                    icon: editCat.icon || ''
                  })
                } else {
                  setForm({ name: '', color: '#f97316', icon: '' })
                }
              }}
              style={{ ...cancelBtnStyle, color: '#f59e0b', borderColor: 'rgba(245,158,11,0.4)' }}
            >
              Reset
            </button>
            <button onClick={() => setShowForm(false)} style={cancelBtnStyle}><X size={14} /> Cancel</button>
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, padding: 20 }}>
        {categories.map((c) => (
          <div key={c.id} style={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${c.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{c.icon || '📂'}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: 'var(--foreground-muted)' }}>{c._count?.bills || 0} bills</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button onClick={() => openEdit(c)} style={actionBtnStyle}><Edit2 size={13} /></button>
              <button onClick={() => remove(c.id)} style={{ ...actionBtnStyle, color: 'var(--error)' }}><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ========== PAYMENTS TAB ==========
function PaymentsTab() {
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editMethod, setEditMethod] = useState<PaymentMethod | null>(null)
  const [form, setForm] = useState({ name: '', type: 'CASH' })
  const [saving, setSaving] = useState(false)

  const fetchMethods = () => fetch('/api/payment-methods').then((r) => r.json()).then((j) => { if (j.success) setMethods(j.data) })
  useEffect(() => { fetchMethods() }, [])

  const openAdd = () => { setEditMethod(null); setForm({ name: '', type: 'CASH' }); setShowForm(true) }
  const openEdit = (m: PaymentMethod) => { setEditMethod(m); setForm({ name: m.name, type: m.type }); setShowForm(true) }

  const save = async () => {
    setSaving(true)
    try {
      const url = editMethod ? `/api/payment-methods/${editMethod.id}` : '/api/payment-methods'
      const method = editMethod ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const j = await res.json()
      if (!j.success) throw new Error(j.error)
      toast.success(editMethod ? 'Payment method updated!' : 'Payment method added!')
      setShowForm(false)
      fetchMethods()
    } catch (e: unknown) { toast.error((e as Error).message || 'Failed') } finally { setSaving(false) }
  }

  const remove = async (id: string) => {
    if (!confirm('Remove this payment method?')) return
    try {
      const res = await fetch(`/api/payment-methods/${id}`, { method: 'DELETE' })
      const j = await res.json()
      if (!j.success) throw new Error(j.error)
      toast.success('Removed')
      fetchMethods()
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Failed to delete payment method')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Payment Methods ({methods.length})</h3>
          <button onClick={openAdd} style={addBtnStyle}><Plus size={14} /> Add Method</button>
        </div>
        {showForm && (
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--background)' }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>{editMethod ? 'Edit Payment Method' : 'New Payment Method'}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <SettingField label="Display Name"><input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. PhonePe UPI" style={settingInputStyle} /></SettingField>
              <SettingField label="Type">
                <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} style={settingSelectStyle}>
                  {['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE', 'WALLET'].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </SettingField>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={save} disabled={saving} style={saveBtnStyle}>{saving ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Save size={14} />} Save</button>
              <button
                type="button"
                onClick={() => {
                  if (editMethod) {
                    setForm({ name: editMethod.name, type: editMethod.type })
                  } else {
                    setForm({ name: '', type: 'CASH' })
                  }
                }}
                style={{ ...cancelBtnStyle, color: '#f59e0b', borderColor: 'rgba(245,158,11,0.4)' }}
              >
                Reset
              </button>
              <button onClick={() => setShowForm(false)} style={cancelBtnStyle}><X size={14} /> Cancel</button>
            </div>
          </div>
        )}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: 'var(--background)' }}>{['Name', 'Type', 'Bills', 'Status', ''].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
            <tbody>
              {methods.map((m, i) => (
                <tr key={m.id} style={{ borderBottom: i < methods.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <td style={tdStyle}><span style={{ fontWeight: 500 }}>{m.name}</span></td>
                  <td style={tdStyle}><span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 100, background: 'var(--border)', color: 'var(--foreground-muted)', fontWeight: 600 }}>{m.type}</span></td>
                  <td style={tdStyle}><span style={{ fontSize: 13 }}>{m._count?.bills || 0} bills</span></td>
                  <td style={tdStyle}>{m.isActive ? <span style={{ fontSize: 12, color: '#22c55e' }}>Active</span> : <span style={{ fontSize: 12, color: '#ef4444' }}>Inactive</span>}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => openEdit(m)} style={actionBtnStyle}><Edit2 size={13} /></button>
                      <button onClick={() => remove(m.id)} style={{ ...actionBtnStyle, color: 'var(--error)' }}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Payment Status Section (Read-only view) */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)' }}>Payment Status</h3>
          <p style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 2 }}>System status options for tracking expense payments</p>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--background)' }}>
                {['Name', 'System Key', 'Description'].map((h) => <th key={h} style={thStyle}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Fully Paid', key: 'FULLY_PAID', desc: 'The bill has been completely settled.' },
                { name: 'Not Paid', key: 'NOT_PAID', desc: 'No payment has been made yet.' },
                { name: 'Partially Paid', key: 'PARTIALLY_PAID', desc: 'A partial payment has been made.' }
              ].map((s, i, arr) => (
                <tr key={s.key} style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <td style={tdStyle}><span style={{ fontWeight: 500 }}>{s.name}</span></td>
                  <td style={tdStyle}><span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 100, background: 'var(--border)', color: 'var(--foreground-muted)', fontWeight: 600 }}>{s.key}</span></td>
                  <td style={tdStyle}><span style={{ fontSize: 13, color: 'var(--foreground-muted)' }}>{s.desc}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ========== PROFILE TAB ==========
function ProfileTab({ userId }: { userId?: string }) {
  const { refetch } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [saving, setSaving] = useState(false)
  const [showPass, setShowPass] = useState(false)

  useEffect(() => {
    if (!userId) return
    fetch('/api/auth/me').then((r) => r.json()).then((j) => {
      if (j.success) setForm((p) => ({ ...p, name: j.data.name, email: j.data.email }))
    })
  }, [userId])

  const save = async () => {
    if (form.password && form.password !== form.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setSaving(true)
    try {
      const body: Record<string, string> = { name: form.name, email: form.email }
      if (form.password) body.password = form.password
      const res = await fetch(`/api/users/${userId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j = await res.json()
      if (!j.success) throw new Error(j.error)
      toast.success('Profile updated!')
      refetch()
    } catch (e: unknown) { toast.error((e as Error).message || 'Failed') } finally { setSaving(false) }
  }

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 24 }}>My Profile</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <SettingField label="Full Name"><input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Your name" style={settingInputStyle} /></SettingField>
        <SettingField label="Email"><input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="email" type="email" style={settingInputStyle} /></SettingField>
        <SettingField label="New Password (optional)">
          <div style={{ position: 'relative' }}>
            <input value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder="Leave blank to keep current" type={showPass ? 'text' : 'password'} style={{ ...settingInputStyle, paddingRight: 36 }} />
            <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--foreground-muted)', display: 'flex' }}>
              {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </SettingField>
        <SettingField label="Confirm Password"><input value={form.confirmPassword} onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))} placeholder="Re-enter password" type="password" style={settingInputStyle} /></SettingField>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button onClick={save} disabled={saving} style={saveBtnStyle}>
          {saving ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Save size={15} />}
          {saving ? 'Saving…' : 'Save Profile'}
        </button>
        <button
          type="button"
          onClick={() => {
            if (userId) {
              fetch('/api/auth/me').then((r) => r.json()).then((j) => {
                if (j.success) setForm({ name: j.data.name, email: j.data.email, password: '', confirmPassword: '' })
              })
            }
          }}
          style={cancelBtnStyle}
        >
          Reset
        </button>
      </div>
    </div>
  )
}

// ========== HELPERS ==========
function SettingField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  )
}

const addBtnStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, border: 'none', background: 'var(--primary)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
const saveBtnStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 9, border: 'none', background: 'var(--primary)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
const cancelBtnStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 9, border: '1px solid var(--border)', background: 'transparent', color: 'var(--foreground-muted)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }
const actionBtnStyle: React.CSSProperties = { width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--foreground-muted)', transition: 'all 0.15s' }
const settingInputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--background)', color: 'var(--foreground)', fontSize: 14, fontFamily: 'inherit', outline: 'none' }
const settingSelectStyle: React.CSSProperties = { ...settingInputStyle, cursor: 'pointer', appearance: 'none' }
const thStyle: React.CSSProperties = { padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }
const tdStyle: React.CSSProperties = { padding: '13px 16px', fontSize: 14, color: 'var(--foreground)', verticalAlign: 'middle' }
