import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const vendors = await prisma.vendor.findMany({
      where: { isActive: true },
      select: { id: true, name: true, phone: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ success: true, data: vendors })
  } catch (error) {
    console.error('[PUBLIC VENDORS ERROR]', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch vendors' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json()
    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'Vendor name is required' }, { status: 400 })
    }
    const existing = await prisma.vendor.findUnique({ where: { name: name.trim() } })
    if (existing) {
      return NextResponse.json({ success: true, data: existing })
    }
    const vendor = await prisma.vendor.create({
      data: { name: name.trim() },
      select: { id: true, name: true },
    })
    return NextResponse.json({ success: true, data: vendor }, { status: 201 })
  } catch (error) {
    console.error('[PUBLIC VENDOR CREATE ERROR]', error)
    return NextResponse.json({ success: false, error: 'Failed to create vendor' }, { status: 500 })
  }
}
