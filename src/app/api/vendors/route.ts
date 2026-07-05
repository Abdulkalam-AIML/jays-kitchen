import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { vendorSchema } from '@/lib/validations'
import { createAuditLog } from '@/lib/audit'
import { getCachedVendorsList, invalidateVendors } from '@/lib/cache'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const activeOnly = searchParams.get('activeOnly') === 'true'

    const vendors = await getCachedVendorsList({ search, activeOnly })

    return NextResponse.json({ success: true, data: vendors })
  } catch (error) {
    console.error('[VENDORS GET ERROR]', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch vendors' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const validated = vendorSchema.parse(body)

    const vendor = await prisma.vendor.create({ data: validated })

    await createAuditLog({
      userId: user.userId,
      action: 'CREATE',
      entity: 'Vendor',
      entityId: vendor.id,
      details: { name: vendor.name },
    })

    invalidateVendors()

    return NextResponse.json({ success: true, data: vendor }, { status: 201 })
  } catch (error) {
    console.error('[VENDORS POST ERROR]', error)
    return NextResponse.json({ success: false, error: 'Failed to create vendor' }, { status: 400 })
  }
}
