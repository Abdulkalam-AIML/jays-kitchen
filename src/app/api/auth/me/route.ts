import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const jwtUser = await getAuthUser()
    if (!jwtUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: jwtUser.userId },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, avatar: true, isActive: true, createdAt: true },
    })

    if (!user || !user.isActive) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    const data = {
      ...user,
      name: `${user.firstName} ${user.lastName}`.trim()
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[ME ERROR]', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch user' }, { status: 500 })
  }
}
