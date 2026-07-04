import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { paymentMethodSchema } from '@/lib/validations'

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const methods = await prisma.paymentMethod.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { bills: true } } },
    })

    return NextResponse.json({ success: true, data: methods })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch payment methods' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'ADMIN') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const validated = paymentMethodSchema.parse(body)
    const method = await prisma.paymentMethod.create({ data: validated })
    return NextResponse.json({ success: true, data: method }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create payment method' }, { status: 400 })
  }
}
