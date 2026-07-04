import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'
import { loginSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = loginSchema.parse(body)

    let user = await prisma.user.findUnique({ where: { email } })
    
    // Auto-seed super admin if no users exist
    if (!user) {
      const userCount = await prisma.user.count()
      if (userCount === 0) {
        const superAdminPass = await bcrypt.hash('SuperAdmin@123', 12)
        user = await prisma.user.create({
          data: {
            name: 'Jay Super Admin',
            email: 'superadmin@jayskitchen.com',
            password: superAdminPass,
            role: 'SUPER_ADMIN',
          }
        })
        // Also create default admin
        const adminPass = await bcrypt.hash('Admin@123', 12)
        await prisma.user.create({
          data: {
            name: 'Jay Admin',
            email: 'admin@jayskitchen.com',
            password: adminPass,
            role: 'ADMIN',
          }
        })
        // Re-fetch the requested user
        user = await prisma.user.findUnique({ where: { email } })
      }
    }

    if (!user || !user.isActive) {
      return NextResponse.json({
        success: false,
        message: 'Invalid email or password',
        error: 'Invalid email or password'
      }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return NextResponse.json({
        success: false,
        message: 'Invalid email or password',
        error: 'Invalid email or password'
      }, { status: 401 })
    }

    const role = user.role as 'ADMIN' | 'SUPER_ADMIN'
    const token = await signToken({
      userId: user.id,
      email: user.email,
      role,
      name: user.name,
    })

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role },
      data: { id: user.id, name: user.name, email: user.email, role },
      token
    })

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('[LOGIN ERROR]', error)
    return NextResponse.json({
      success: false,
      message: 'Invalid email or password',
      error: 'Login failed'
    }, { status: 400 })
  }
}
