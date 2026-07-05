import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { billSchema } from '@/lib/validations'
import { createAuditLog } from '@/lib/audit'
import { invalidateDashboard } from '@/lib/cache'

const BILL_SELECT = {
  id: true,
  billNumber: true,
  billDate: true,
  amount: true,
  status: true,
  paymentStatus: true,
  amountPaid: true,
  remainingAmount: true,
  submitterName: true,
  vendor: { select: { name: true } },
  category: { select: { name: true, color: true } },
  paymentMethod: { select: { name: true, type: true } },
  paidByUser: { select: { name: true } },
  paidBy: true,
  images: { select: { id: true } },
}

interface BillWithUser {
  paidByUser?: { name: string } | null
  paidBy?: string | null
  [key: string]: unknown
}

const mapBill = (bill: BillWithUser) => {
  const { paidByUser, ...rest } = bill
  return {
    ...rest,
    paidBy: bill.paidBy
      ? { name: bill.paidBy }
      : (paidByUser ? { name: paidByUser.name } : null),
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const vendorId = searchParams.get('vendorId') || ''
    const categoryId = searchParams.get('categoryId') || ''
    const paymentMethodId = searchParams.get('paymentMethodId') || ''
    const paidById = searchParams.get('paidById') || ''
    const statusFilter = searchParams.get('status') || ''
    const paymentStatus = searchParams.get('paymentStatus') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''
    const sortBy = searchParams.get('sortBy') || 'billDate'
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { billNumber: { contains: search, mode: 'insensitive' } },
        { remarks: { contains: search, mode: 'insensitive' } },
        { vendor: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    if (vendorId) where.vendorId = vendorId
    if (categoryId) where.categoryId = categoryId
    if (paymentMethodId) where.paymentMethodId = paymentMethodId
    if (paidById) where.paidById = paidById
    if (statusFilter) where.status = statusFilter
    if (paymentStatus) where.paymentStatus = paymentStatus

    if (startDate || endDate) {
      where.billDate = {}
      if (startDate) (where.billDate as Record<string, Date>).gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        ;(where.billDate as Record<string, Date>).lte = end
      }
    }

    const [total, bills, aggregate] = await Promise.all([
      prisma.bill.count({ where }),
      prisma.bill.findMany({
        where,
        select: BILL_SELECT,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.bill.aggregate({ where, _sum: { amount: true } }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        data: bills.map(mapBill),
        total,
        grandTotal: Number(aggregate._sum.amount ?? 0),
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('[BILLS GET ERROR]', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch bills' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const validated = billSchema.parse(body)

    // Server-side recomputation of amountPaid and remainingAmount based on paymentStatus
    const amt = Number(validated.amount)
    let finalAmountPaid = 0
    let finalRemainingAmount = 0

    if (validated.paymentStatus === 'FULLY_PAID') {
      finalAmountPaid = amt
      finalRemainingAmount = 0
    } else if (validated.paymentStatus === 'NOT_PAID') {
      finalAmountPaid = 0
      finalRemainingAmount = amt
    } else if (validated.paymentStatus === 'PARTIALLY_PAID') {
      finalAmountPaid = Math.max(0, validated.amountPaid || 0)
      finalRemainingAmount = Math.max(0, amt - finalAmountPaid)
    }

    const bill = await prisma.bill.create({
      data: {
        billNumber: validated.billNumber,
        billDate: new Date(validated.billDate),
        amount: validated.amount,
        remarks: validated.remarks,
        vendorId: validated.vendorId,
        categoryId: validated.categoryId,
        paymentMethodId: validated.paymentMethodId,
        paidById: user.userId,
        paidBy: validated.paidBy || '',
        submittedBy: user.name,
        status: 'APPROVED',  // Admin-created bills are pre-approved
        paymentStatus: validated.paymentStatus,
        amountPaid: finalAmountPaid,
        remainingAmount: finalRemainingAmount,
      },
      select: BILL_SELECT,
    })

    await createAuditLog({
      userId: user.userId,
      action: 'CREATE',
      entity: 'Bill',
      entityId: bill.id,
      details: { billNumber: bill.billNumber, amount: Number(bill.amount) },
    })

    invalidateDashboard()

    return NextResponse.json({ success: true, data: mapBill(bill) }, { status: 201 })
  } catch (error: unknown) {
    console.error('[BILLS POST ERROR]', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ success: false, error: 'Bill number already exists' }, { status: 409 })
    }
    return NextResponse.json({ success: false, error: 'Failed to create bill' }, { status: 400 })
  }
}
