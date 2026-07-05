import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCachedActiveCategories, invalidateCategories } from '@/lib/cache'

export async function GET() {
  try {
    const categories = await getCachedActiveCategories()
    return NextResponse.json(
      { success: true, data: categories },
      { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' } }
    )
  } catch (error) {
    console.error('[PUBLIC CATEGORIES ERROR]', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch categories' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { name, color } = await request.json()
    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'Category name is required' }, { status: 400 })
    }
    const existing = await prisma.category.findUnique({ where: { name: name.trim() } })
    if (existing) {
      return NextResponse.json({ success: true, data: existing })
    }
    const category = await prisma.category.create({
      data: { name: name.trim(), color: color || '#f97316' },
      select: { id: true, name: true, color: true },
    })

    invalidateCategories()

    return NextResponse.json({ success: true, data: category }, { status: 201 })
  } catch (error) {
    console.error('[PUBLIC CATEGORY CREATE ERROR]', error)
    return NextResponse.json({ success: false, error: 'Failed to create category' }, { status: 500 })
  }
}
