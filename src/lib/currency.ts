export const CURRENCY_CONFIG = {
  currency: 'USD',
  locale: 'en-US',
  symbol: '$',
}

export function formatCurrency(amount: number | string, _currencyCode = 'USD'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) {
    return '$0.00'
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

export function formatCompact(amount: number | string, _currencyCode = 'USD'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) {
    return '$0.00'
  }

  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`

  return formatCurrency(num, 'USD')
}

export function getCurrencySymbol(_currencyCode = 'USD'): string {
  return '$'
}
