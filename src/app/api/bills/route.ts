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
  paidByUser: { select: { firstName: true, lastName: true } },
  paidBy: true,
  submittedByUserId: true,
  submittedByUser: { select: { firstName: true, lastName: true } },
  images: { select: { id: true } },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapBill = (bill: any) => {
  const { paidByUser, submittedByUser, ...rest } = bill
  return {
    ...rest,
    paidBy: bill.paidBy
      ? { name: bill.paidBy }
      : (paidByUser ? { name: `${paidByUser.firstName} ${paidByUser.lastName}`.trim() } : null),
    submittedByUser: submittedByUser
      ? { firstName: submittedByUser.firstName, lastName: submittedByUser.lastName }
      : null,
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

    const startAll = Date.now()
    const [total, bills, aggregate] = await Promise.all([
      (async () => {
        const start = Date.now()
        const res = await prisma.bill.count({ where })
        console.log(`[PERF_BILLS_COUNT] took ${Date.now() - start}ms`)
        return res
      })(),
      (async () => {
        const start = Date.now()
        const res = await prisma.bill.findMany({
          where,
          select: BILL_SELECT,
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * limit,
          take: limit,
        })
        console.log(`[PERF_BILLS_FINDMANY] took ${Date.now() - start}ms`)
        return res
      })(),
      (async () => {
        const start = Date.now()
        const res = await prisma.bill.aggregate({ where, _sum: { amount: true } })
        console.log(`[PERF_BILLS_AGGREGATE] took ${Date.now() - start}ms`)
        return res
      })(),
    ])
    console.log(`[PERF_BILLS_TOTAL] Promise.all took ${Date.now() - startAll}ms`)

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
        paidById: null,
        paidBy: validated.paidBy || '',
        submittedBy: user.role,
        submittedByUserId: user.userId,
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
