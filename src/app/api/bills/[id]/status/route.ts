import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { billStatusSchema } from '@/lib/validations'
import { createAuditLog } from '@/lib/audit'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { status } = billStatusSchema.parse(body)

    const bill = await prisma.bill.findUnique({ where: { id } })
    if (!bill) {
      return NextResponse.json({ success: false, error: 'Bill not found' }, { status: 404 })
    }

    const updated = await prisma.bill.update({
      where: { id },
      data: { status },
      include: {
        vendor: true,
        category: true,
        paymentMethod: true,
      },
    })

    await createAuditLog({
      userId: user.userId,
      action: `BILL_${status}`,
      entity: 'Bill',
      entityId: id,
      details: { billNumber: bill.billNumber, previousStatus: bill.status, newStatus: status },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('[BILL STATUS ERROR]', error)
    return NextResponse.json({ success: false, error: 'Failed to update bill status' }, { status: 400 })
  }
}
