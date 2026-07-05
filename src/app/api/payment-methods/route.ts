import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { paymentMethodSchema } from '@/lib/validations'
import { getCachedPaymentMethodsWithCount, invalidatePaymentMethods } from '@/lib/cache'

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const methods = await getCachedPaymentMethodsWithCount()

    return NextResponse.json({ success: true, data: methods })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch payment methods' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const validated = paymentMethodSchema.parse(body)
    const method = await prisma.paymentMethod.create({ data: validated })
    
    invalidatePaymentMethods()

    return NextResponse.json({ success: true, data: method }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create payment method' }, { status: 400 })
  }
}
