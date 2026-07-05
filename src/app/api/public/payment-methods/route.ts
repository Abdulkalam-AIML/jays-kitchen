import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCachedActivePaymentMethods } from '@/lib/cache'

// Also expose payment methods publicly for the submit form
export async function GET() {
  try {
    const methods = await getCachedActivePaymentMethods()
    return NextResponse.json(
      { success: true, data: methods },
      { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' } }
    )
  } catch (error) {
    console.error('[PUBLIC PAYMENT METHODS ERROR]', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch payment methods' }, { status: 500 })
  }
}
