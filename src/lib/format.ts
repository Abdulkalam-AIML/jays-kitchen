import { formatCurrency, formatCompact, CURRENCY_CONFIG } from './currency'
export { formatCurrency, formatCompact }

/**
 * Format date to display string
 */
export function formatDate(date: string | Date, format: 'short' | 'long' | 'time' | 'relative' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '-'

  const locale = CURRENCY_CONFIG.locale === 'en-IN' ? 'en-IN' : 'en-US'

  switch (format) {
    case 'short':
      return d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })
    case 'long':
      return d.toLocaleDateString(locale, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    case 'time':
      return d.toLocaleString(locale, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    case 'relative': {
      const now = new Date()
      const diff = now.getTime() - d.getTime()
      const seconds = Math.floor(diff / 1000)
      const minutes = Math.floor(seconds / 60)
      const hours = Math.floor(minutes / 60)
      const days = Math.floor(hours / 24)
      if (seconds < 60) return 'Just now'
      if (minutes < 60) return `${minutes}m ago`
      if (hours < 24) return `${hours}h ago`
      if (days < 7) return `${days}d ago`
      return formatDate(d, 'short')
    }
  }
}

/**
 * Format date for input[type="date"]
 */
export function toInputDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get month name
 */
export function getMonthName(month: number): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return months[month] || ''
}

/**
 * Get percentage change
 */
export function getPercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

/**
 * Generate initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Generate avatar color from string
 */
export function getAvatarColor(str: string): string {
  const colors = [
    '#f97316', '#ef4444', '#8b5cf6', '#3b82f6', '#22c55e',
    '#06b6d4', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6',
  ]
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

/**
 * Payment method display names and icons
 */
export const PAYMENT_METHOD_ICONS: Record<string, string> = {
  CASH: '💵',
  UPI: '📱',
  CARD: '💳',
  BANK_TRANSFER: '🏦',
  CHEQUE: '📋',
  WALLET: '👛',
}

export const PAYMENT_METHOD_COLORS: Record<string, string> = {
  CASH: '#22c55e',
  UPI: '#8b5cf6',
  CARD: '#3b82f6',
  BANK_TRANSFER: '#06b6d4',
  CHEQUE: '#f59e0b',
  WALLET: '#ec4899',
}

/**
 * Truncate text
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length) + '…'
}

/**
 * Optimizes image URLs (specifically adds Cloudinary compression params)
 */
export function getOptimizedImageUrl(url: string | null | undefined): string {
  if (!url) return ''
  if (url.includes('res.cloudinary.com') && !url.includes('f_auto,q_auto')) {
    return url.replace('/upload/', '/upload/f_auto,q_auto/')
  }
  return url
}
