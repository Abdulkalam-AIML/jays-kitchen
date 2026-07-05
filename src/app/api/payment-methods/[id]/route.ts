import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { paymentMethodSchema } from '@/lib/validations'
import { invalidatePaymentMethods } from '@/lib/cache'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

    const { id } = await params

    // Check if bills exist using this Payment Method
    const billCount = await prisma.bill.count({ where: { paymentMethodId: id } })
    if (billCount > 0) {
      return NextResponse.json({ success: false, error: 'Access forbidden as there are bills under this.' }, { status: 403 })
    }

    const body = await request.json()
    const validated = paymentMethodSchema.partial().parse(body)
    const method = await prisma.paymentMethod.update({ where: { id }, data: validated })
    
    invalidatePaymentMethods()

    return NextResponse.json({ success: true, data: method })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update payment method' }, { status: 400 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const billCount = await prisma.bill.count({ where: { paymentMethodId: id } })
    if (billCount > 0) {
      return NextResponse.json({ success: false, error: 'Access forbidden as there are bills under this.' }, { status: 403 })
    }

    await prisma.paymentMethod.delete({ where: { id } })
    
    invalidatePaymentMethods()

    return NextResponse.json({ success: true, message: 'Payment method deleted' })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete payment method' }, { status: 500 })
  }
}
