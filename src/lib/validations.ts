import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const billSchema = z.object({
  billNumber: z.string().min(1, 'Bill number is required'),
  billDate: z.string().min(1, 'Bill date is required'),
  vendorId: z.string().min(1, 'Vendor is required'),
  categoryId: z.string().min(1, 'Category is required'),
  paymentMethodId: z.string().min(1, 'Payment method is required'),
  paidBy: z.string().max(100, 'Name is too long').optional().or(z.literal('')),
  amount: z.number().positive('Amount must be positive'),
  remarks: z.string().optional(),
})

// Schema for public bill submissions (no auth required)
export const publicBillSchema = z.object({
  billNumber: z.string().min(1, 'Bill number is required'),
  billDate: z.string().min(1, 'Bill date is required'),
  vendorId: z.string().min(1, 'Vendor is required'),
  categoryId: z.string().min(1, 'Category is required'),
  paymentMethodId: z.string().min(1, 'Payment method is required'),
  submitterName: z.string().min(1, 'Your name is required'),
  amount: z.number().positive('Amount must be positive'),
  remarks: z.string().optional(),
})

export const vendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  gstin: z.string().optional(),
})

export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  color: z.string().default('#f97316'),
  icon: z.string().optional(),
})

export const paymentMethodSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE', 'WALLET']),
})

export const userSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  role: z.enum(['ADMIN', 'SUPER_ADMIN']),
})

export const restaurantSchema = z.object({
  name: z.string().min(1, 'Restaurant name is required'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  gstin: z.string().optional(),
  currency: z.string().default('USD'),
  timezone: z.string().default('America/New_York'),
})

export const billStatusSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
})

export type LoginInput = z.infer<typeof loginSchema>
export type BillInput = z.infer<typeof billSchema>
export type PublicBillInput = z.infer<typeof publicBillSchema>
export type VendorInput = z.infer<typeof vendorSchema>
export type CategoryInput = z.infer<typeof categorySchema>
export type PaymentMethodInput = z.infer<typeof paymentMethodSchema>
export type UserInput = z.infer<typeof userSchema>
export type RestaurantInput = z.infer<typeof restaurantSchema>
export type BillStatusInput = z.infer<typeof billStatusSchema>
