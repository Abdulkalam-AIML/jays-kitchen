export interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'STAFF'
  avatar?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Vendor {
  id: string
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  gstin?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  name: string
  color: string
  icon?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PaymentMethod {
  id: string
  name: string
  type: 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'CHEQUE' | 'WALLET'
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface BillImage {
  id: string
  url: string
  publicId: string
  thumbnailUrl?: string | null
}

export interface Bill {
  id: string
  billNumber: string
  billDate: string
  amount: number | string
  remarks?: string | null
  createdAt: string
  updatedAt: string
  vendor: Vendor
  vendorId: string
  category: Category
  categoryId: string
  paymentMethod: PaymentMethod
  paymentMethodId: string
  paidBy: User
  paidById: string
  images: BillImage[]
}

export interface AuditLog {
  id: string
  action: string
  entity: string
  entityId: string
  details?: Record<string, unknown> | null
  createdAt: string
  user: User
  userId: string
}

export interface RestaurantSettings {
  id: string
  name: string
  address?: string | null
  phone?: string | null
  email?: string | null
  gstin?: string | null
  logo?: string | null
  currency: string
  timezone: string
}

export interface DashboardStats {
  totalBills: number
  totalExpenses: number
  thisMonthExpenses: number
  lastMonthExpenses: number
  thisWeekExpenses: number
  topVendor: string | null
  topCategory: string | null
  pendingBills: number
}

export interface ChartDataPoint {
  name: string
  value: number
  color?: string
}

export interface MonthlyChartData {
  month: string
  amount: number
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface BillFilters {
  search?: string
  vendorId?: string
  categoryId?: string
  paymentMethodId?: string
  paidById?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}
