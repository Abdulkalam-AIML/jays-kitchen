import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { categorySchema } from '@/lib/validations'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'ADMIN') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const body = await request.json()
    const validated = categorySchema.partial().parse(body)
    const category = await prisma.category.update({ where: { id }, data: validated })
    return NextResponse.json({ success: true, data: category })
  } catch (error) {
    console.error('[CATEGORY PATCH ERROR]', error)
    return NextResponse.json({ success: false, error: 'Failed to update category' }, { status: 400 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'ADMIN') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const billCount = await prisma.bill.count({ where: { categoryId: id } })
    if (billCount > 0) {
      await prisma.category.update({ where: { id }, data: { isActive: false } })
      return NextResponse.json({ success: true, message: 'Category deactivated' })
    }

    await prisma.category.delete({ where: { id } })
    return NextResponse.json({ success: true, message: 'Category deleted' })
  } catch (error) {
    console.error('[CATEGORY DELETE ERROR]', error)
    return NextResponse.json({ success: false, error: 'Failed to delete category' }, { status: 500 })
  }
}
