import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Also expose payment methods publicly for the submit form
export async function GET() {
  try {
    const methods = await prisma.paymentMethod.findMany({
      where: { isActive: true },
      select: { id: true, name: true, type: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ success: true, data: methods })
  } catch (error) {
    console.error('[PUBLIC PAYMENT METHODS ERROR]', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch payment methods' }, { status: 500 })
  }
}
