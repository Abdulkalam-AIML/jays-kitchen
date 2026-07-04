import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { categorySchema } from '@/lib/validations'
import { createAuditLog } from '@/lib/audit'

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { bills: true } } },
    })

    return NextResponse.json({ success: true, data: categories })
  } catch (error) {
    console.error('[CATEGORIES GET ERROR]', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch categories' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'ADMIN') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const validated = categorySchema.parse(body)
    const category = await prisma.category.create({ data: validated })

    await createAuditLog({ userId: user.userId, action: 'CREATE', entity: 'Category', entityId: category.id })
    return NextResponse.json({ success: true, data: category }, { status: 201 })
  } catch (error) {
    console.error('[CATEGORY POST ERROR]', error)
    return NextResponse.json({ success: false, error: 'Failed to create category' }, { status: 400 })
  }
}
