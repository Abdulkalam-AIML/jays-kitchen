import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { userSchema } from '@/lib/validations'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    // Allow users to edit their own profile, admin/super admin can edit anyone
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN' && user.userId !== id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validated = userSchema.partial().parse(body)

    const updateData: Record<string, unknown> = {}
    if (validated.name) updateData.name = validated.name
    if (validated.email) updateData.email = validated.email
    if (validated.role && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')) updateData.role = validated.role
    if (validated.password) updateData.password = await bcrypt.hash(validated.password, 10)
    if (body.isActive !== undefined && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')) updateData.isActive = body.isActive

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, avatar: true, isActive: true, updatedAt: true },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('[USER PATCH ERROR]', error)
    return NextResponse.json({ success: false, error: 'Failed to update user' }, { status: 400 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden: Only Super Admin can delete users' }, { status: 403 })
    }

    const { id } = await params
    if (id === user.userId) {
      return NextResponse.json({ success: false, error: 'Cannot delete yourself' }, { status: 400 })
    }

    const targetUser = await prisma.user.findUnique({ where: { id } })
    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    if (targetUser.role === 'SUPER_ADMIN') {
      const superAdminCount = await prisma.user.count({ where: { role: 'SUPER_ADMIN' } })
      if (superAdminCount <= 1) {
        return NextResponse.json({ success: false, error: 'Cannot delete the last remaining Super Admin' }, { status: 400 })
      }
    }

    await prisma.$transaction([
      prisma.auditLog.deleteMany({ where: { userId: id } }),
      prisma.bill.updateMany({
        where: { paidById: id },
        data: {
          paidBy: targetUser.name,
          paidById: null
        }
      }),
      prisma.user.delete({ where: { id } })
    ])

    return NextResponse.json({ success: true, message: 'User deleted successfully' })
  } catch (error) {
    console.error('[USER DELETE ERROR]', error)
    return NextResponse.json({ success: false, error: 'Failed to delete user' }, { status: 500 })
  }
}
