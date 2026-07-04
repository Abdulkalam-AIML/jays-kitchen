import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { billSchema } from '@/lib/validations'
import { createAuditLog } from '@/lib/audit'

const BILL_INCLUDE = {
  vendor: true,
  category: true,
  paymentMethod: true,
  paidBy: { select: { id: true, name: true, email: true, role: true, avatar: true } },
  images: true,
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
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''
    const sortBy = searchParams.get('sortBy') || 'billDate'
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { billNumber: { contains: search } },
        { remarks: { contains: search } },
        { vendor: { name: { contains: search } } },
      ]
    }

    if (vendorId) where.vendorId = vendorId
    if (categoryId) where.categoryId = categoryId
    if (paymentMethodId) where.paymentMethodId = paymentMethodId
    if (paidById) where.paidById = paidById
    if (statusFilter) where.status = statusFilter

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
        include: BILL_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.bill.aggregate({ where, _sum: { amount: true } }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        data: bills,
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

    const bill = await prisma.bill.create({
      data: {
        billNumber: validated.billNumber,
        billDate: new Date(validated.billDate),
        amount: validated.amount,
        remarks: validated.remarks,
        vendorId: validated.vendorId,
        categoryId: validated.categoryId,
        paymentMethodId: validated.paymentMethodId,
        paidById: validated.paidById || user.userId,
        submittedBy: user.name,
        status: 'APPROVED',  // Admin-created bills are pre-approved
      },
      include: BILL_INCLUDE,
    })

    await createAuditLog({
      userId: user.userId,
      action: 'CREATE',
      entity: 'Bill',
      entityId: bill.id,
      details: { billNumber: bill.billNumber, amount: Number(bill.amount) },
    })

    return NextResponse.json({ success: true, data: bill }, { status: 201 })
  } catch (error) {
    console.error('[BILLS POST ERROR]', error)
    return NextResponse.json({ success: false, error: 'Failed to create bill' }, { status: 400 })
  }
}
