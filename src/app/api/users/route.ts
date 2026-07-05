import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { userSchema } from '@/lib/validations'
import { createAuditLog } from '@/lib/audit'

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'SUPER_ADMIN') return NextResponse.json({ success: false, error: 'Forbidden: Super Admin access required' }, { status: 403 })

    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, avatar: true, isActive: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: users })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'SUPER_ADMIN') return NextResponse.json({ success: false, error: 'Forbidden: Super Admin access required' }, { status: 403 })

    const body = await request.json()
    const validated = userSchema.parse(body)

    if (!validated.password) {
      return NextResponse.json({ success: false, error: 'Password is required' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email: validated.email } })
    if (existing) {
      return NextResponse.json({ success: false, error: 'Email already exists' }, { status: 409 })
    }

    const hashed = await bcrypt.hash(validated.password, 10)
    const newUser = await prisma.user.create({
      data: { name: validated.name, email: validated.email, password: hashed, role: validated.role },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    })

    await createAuditLog({ userId: user.userId, action: 'CREATE', entity: 'User', entityId: newUser.id })
    return NextResponse.json({ success: true, data: newUser }, { status: 201 })
  } catch (error) {
    console.error('[USER POST ERROR]', error)
    return NextResponse.json({ success: false, error: 'Failed to create user' }, { status: 400 })
  }
}
