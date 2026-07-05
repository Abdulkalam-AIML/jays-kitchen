import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { restaurantSchema } from '@/lib/validations'
import { getCachedSettings, invalidateSettings } from '@/lib/cache'

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const settings = await getCachedSettings()
    return NextResponse.json({ success: true, data: settings })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'ADMIN') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const validated = restaurantSchema.partial().parse(body)

    const existing = await prisma.restaurantSettings.findFirst()
    const settings = existing
      ? await prisma.restaurantSettings.update({ where: { id: existing.id }, data: validated })
      : await prisma.restaurantSettings.create({ data: { id: 'default', ...validated } })

    invalidateSettings()

    return NextResponse.json({ success: true, data: settings })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update settings' }, { status: 400 })
  }
}
