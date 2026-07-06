import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

const meUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  email: z.string().email('Invalid email format').optional(),
  currentPassword: z.string().optional(),
  password: z.string().min(8, 'New password must be at least 8 characters').optional(),
})

export async function PATCH(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = meUpdateSchema.parse(body)

    // Retrieve full user record from database (including current password hash)
    const dbUser = await prisma.user.findUnique({
      where: { id: authUser.userId }
    })

    if (!dbUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    let logoutRequired = false

    // 1. If modifying name
    if (validated.name && validated.name !== dbUser.name) {
      updateData.name = validated.name
    }

    // 2. If modifying email
    if (validated.email && validated.email !== dbUser.email) {
      if (!validated.currentPassword) {
        return NextResponse.json({ success: false, error: 'Current password is required to change email' }, { status: 400 })
      }
      
      // Check current password
      const isMatch = await bcrypt.compare(validated.currentPassword, dbUser.password)
      if (!isMatch) {
        return NextResponse.json({ success: false, error: 'Incorrect current password' }, { status: 400 })
      }

      // Check if email is in use by another user
      const existingUser = await prisma.user.findFirst({
        where: { email: validated.email, NOT: { id: dbUser.id } }
      })
      if (existingUser) {
        return NextResponse.json({ success: false, error: 'Email is already in use by another account' }, { status: 400 })
      }

      updateData.email = validated.email
      logoutRequired = true
    }

    // 3. If modifying password
    if (validated.password) {
      if (!validated.currentPassword) {
        return NextResponse.json({ success: false, error: 'Current password is required to change password' }, { status: 400 })
      }

      // Check current password
      const isMatch = await bcrypt.compare(validated.currentPassword, dbUser.password)
      if (!isMatch) {
        return NextResponse.json({ success: false, error: 'Incorrect current password' }, { status: 400 })
      }

      // Check if new password is same as current password
      const isSame = await bcrypt.compare(validated.password, dbUser.password)
      if (isSame) {
        return NextResponse.json({ success: false, error: 'New password cannot be identical to your current password' }, { status: 400 })
      }

      updateData.password = await bcrypt.hash(validated.password, 10)
      logoutRequired = true
    }

    // Perform database update if any fields changed
    let updatedUser = dbUser
    if (Object.keys(updateData).length > 0) {
      updatedUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: updateData
      })
    }

    const response = NextResponse.json({
      success: true,
      logoutRequired,
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role
      }
    })

    // If logout is required due to security details change, invalidate cookies
    if (logoutRequired) {
      response.cookies.set('auth-token', '', { maxAge: -1, path: '/' })
    }

    return response
  } catch (error) {
    console.error('[USER ME PATCH ERROR]', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ success: false, error: 'Failed to update credentials' }, { status: 400 })
  }
}
