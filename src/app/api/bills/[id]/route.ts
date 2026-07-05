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
  remarks: true,
  status: true,
  paymentStatus: true,
  amountPaid: true,
  remainingAmount: true,
  submittedBy: true,
  submitterName: true,
  paidBy: true,
  vendorId: true,
  categoryId: true,
  paymentMethodId: true,
  vendor: { select: { name: true } },
  category: { select: { name: true, color: true } },
  paymentMethod: { select: { name: true, type: true } },
  paidByUser: { select: { id: true, name: true, email: true, role: true, avatar: true } },
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
      : (paidByUser ? { name: paidByUser.name } : null)
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const bill = await prisma.bill.findUnique({ where: { id }, select: BILL_SELECT })
    if (!bill) return NextResponse.json({ success: false, error: 'Bill not found' }, { status: 404 })

    return NextResponse.json({ success: true, data: mapBill(bill) })
  } catch (error) {
    console.error('[BILL GET ERROR]', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch bill' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const existing = await prisma.bill.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ success: false, error: 'Bill not found' }, { status: 404 })

    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN' && existing.paidById !== user.userId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validated = billSchema.partial().parse(body)

    // Compute updated payment status fields
    const newAmount = validated.amount !== undefined ? Number(validated.amount) : Number(existing.amount)
    const newPaymentStatus = validated.paymentStatus || existing.paymentStatus
    let finalAmountPaid = Number(existing.amountPaid)
    let finalRemainingAmount = Number(existing.remainingAmount)

    if (validated.amount !== undefined || validated.paymentStatus !== undefined || validated.amountPaid !== undefined) {
      if (newPaymentStatus === 'FULLY_PAID') {
        finalAmountPaid = newAmount
        finalRemainingAmount = 0
      } else if (newPaymentStatus === 'NOT_PAID') {
        finalAmountPaid = 0
        finalRemainingAmount = newAmount
      } else if (newPaymentStatus === 'PARTIALLY_PAID') {
        const inputPaid = validated.amountPaid !== undefined ? validated.amountPaid : Number(existing.amountPaid)
        finalAmountPaid = Math.max(0, inputPaid)
        finalRemainingAmount = Math.max(0, newAmount - finalAmountPaid)
      }
    }

    const bill = await prisma.bill.update({
      where: { id },
      data: {
        ...(validated.billNumber && { billNumber: validated.billNumber }),
        ...(validated.billDate && { billDate: new Date(validated.billDate) }),
        ...(validated.amount !== undefined && { amount: validated.amount }),
        ...(validated.remarks !== undefined && { remarks: validated.remarks }),
        ...(validated.vendorId && { vendorId: validated.vendorId }),
        ...(validated.categoryId && { categoryId: validated.categoryId }),
        ...(validated.paymentMethodId && { paymentMethodId: validated.paymentMethodId }),
        ...(validated.paidBy !== undefined && { paidBy: validated.paidBy }),
        ...(validated.paymentStatus && { paymentStatus: validated.paymentStatus }),
        amountPaid: finalAmountPaid,
        remainingAmount: finalRemainingAmount,
      },
      select: BILL_SELECT,
    })

    await createAuditLog({
      userId: user.userId,
      action: 'UPDATE',
      entity: 'Bill',
      entityId: bill.id,
      details: { billNumber: bill.billNumber },
    })

    invalidateDashboard()

    return NextResponse.json({ success: true, data: mapBill(bill) })
  } catch (error) {
    console.error('[BILL PATCH ERROR]', error)
    return NextResponse.json({ success: false, error: 'Failed to update bill' }, { status: 400 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const existing = await prisma.bill.findUnique({ where: { id }, select: { billNumber: true, paidById: true, images: true } })
    if (!existing) return NextResponse.json({ success: false, error: 'Bill not found' }, { status: 404 })

    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN' && existing.paidById !== user.userId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    // Delete Supabase Storage images (skip local base64 ones)
    const externalImages = existing.images.filter(img => !img.publicId.startsWith('local_') && !img.publicId.startsWith('public_'))
    if (externalImages.length > 0) {
      const { deleteFromStorage } = await import('@/lib/storage')
      await Promise.allSettled(externalImages.map((img) => deleteFromStorage(img.publicId)))
    }

    await prisma.bill.delete({ where: { id } })

    await createAuditLog({
      userId: user.userId,
      action: 'DELETE',
      entity: 'Bill',
      entityId: id,
      details: { billNumber: existing.billNumber },
    })

    invalidateDashboard()

    return NextResponse.json({ success: true, message: 'Bill deleted' })
  } catch (error) {
    console.error('[BILL DELETE ERROR]', error)
    return NextResponse.json({ success: false, error: 'Failed to delete bill' }, { status: 500 })
  }
}
