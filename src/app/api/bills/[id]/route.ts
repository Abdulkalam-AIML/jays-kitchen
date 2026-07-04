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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const bill = await prisma.bill.findUnique({ where: { id }, include: BILL_INCLUDE })
    if (!bill) return NextResponse.json({ success: false, error: 'Bill not found' }, { status: 404 })

    return NextResponse.json({ success: true, data: bill })
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
        ...(validated.paidById && { paidById: validated.paidById }),
      },
      include: BILL_INCLUDE,
    })

    await createAuditLog({
      userId: user.userId,
      action: 'UPDATE',
      entity: 'Bill',
      entityId: bill.id,
      details: { billNumber: bill.billNumber },
    })

    return NextResponse.json({ success: true, data: bill })
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
    const existing = await prisma.bill.findUnique({ where: { id }, include: { images: true } })
    if (!existing) return NextResponse.json({ success: false, error: 'Bill not found' }, { status: 404 })

    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN' && existing.paidById !== user.userId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    // Delete Supabase Storage images
    if (existing.images.length > 0) {
      const { deleteFromStorage } = await import('@/lib/storage')
      await Promise.allSettled(existing.images.map((img) => deleteFromStorage(img.publicId)))
    }

    await prisma.bill.delete({ where: { id } })

    await createAuditLog({
      userId: user.userId,
      action: 'DELETE',
      entity: 'Bill',
      entityId: id,
      details: { billNumber: existing.billNumber },
    })

    return NextResponse.json({ success: true, message: 'Bill deleted' })
  } catch (error) {
    console.error('[BILL DELETE ERROR]', error)
    return NextResponse.json({ success: false, error: 'Failed to delete bill' }, { status: 500 })
  }
}
