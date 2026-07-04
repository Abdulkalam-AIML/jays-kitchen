import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

import { formatCurrency as formatCurr } from './currency'

export function formatCurrency(amount: number | string | null | undefined): string {
  return formatCurr(amount ?? 0)
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-'
  return format(new Date(date), 'dd MMM yyyy')
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-'
  return format(new Date(date), 'dd MMM yyyy, hh:mm a')
}

export function generateBillNumber(): string {
  const year = new Date().getFullYear()
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `JK-${year}-${rand}`
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), delay)
  }
}
