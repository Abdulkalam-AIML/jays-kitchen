import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { vendorSchema } from '@/lib/validations'
import { createAuditLog } from '@/lib/audit'
import { invalidateVendors } from '@/lib/cache'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

    const { id } = await params

    // Check if bills exist using this Vendor
    const billCount = await prisma.bill.count({ where: { vendorId: id } })
    if (billCount > 0) {
      return NextResponse.json({ success: false, error: 'Access forbidden as there are bills under this.' }, { status: 403 })
    }

    const body = await request.json()
    const validated = vendorSchema.partial().parse(body)

    const vendor = await prisma.vendor.update({ where: { id }, data: validated })

    await createAuditLog({ userId: user.userId, action: 'UPDATE', entity: 'Vendor', entityId: id })
    
    invalidateVendors()

    return NextResponse.json({ success: true, data: vendor })
  } catch (error) {
    console.error('[VENDOR PATCH ERROR]', error)
    return NextResponse.json({ success: false, error: 'Failed to update vendor' }, { status: 400 })
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
    const billCount = await prisma.bill.count({ where: { vendorId: id } })
    if (billCount > 0) {
      return NextResponse.json({ success: false, error: 'Access forbidden as there are bills under this.' }, { status: 403 })
    }

    await prisma.vendor.delete({ where: { id } })
    await createAuditLog({ userId: user.userId, action: 'DELETE', entity: 'Vendor', entityId: id })
    
    invalidateVendors()

    return NextResponse.json({ success: true, message: 'Vendor deleted' })
  } catch (error) {
    console.error('[VENDOR DELETE ERROR]', error)
    return NextResponse.json({ success: false, error: 'Failed to delete vendor' }, { status: 500 })
  }
}
