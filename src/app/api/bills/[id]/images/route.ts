import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const bill = await prisma.bill.findUnique({ where: { id }, select: { id: true, billNumber: true } })
    if (!bill) return NextResponse.json({ success: false, error: 'Bill not found' }, { status: 404 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'File too large (max 5MB)' }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ success: false, error: 'Invalid file type (jpg, png, webp, pdf only)' }, { status: 400 })
    }

    // ✅ Store as base64 data URL directly in DB — no external storage calls
    const buffer = Buffer.from(await file.arrayBuffer())
    const base64 = buffer.toString('base64')
    const dataUrl = `data:${file.type};base64,${base64}`

    const image = await prisma.billImage.create({
      data: {
        billId: id,
        url: dataUrl,
        publicId: `local_${id}_${Date.now()}`,
        thumbnailUrl: dataUrl,
      },
    })

    await createAuditLog({
      userId: user.userId,
      action: 'CREATE',
      entity: 'BillImage',
      entityId: image.id,
      details: { billId: id, billNumber: bill.billNumber },
    })

    // Return without the heavy base64 data to keep response small
    return NextResponse.json({
      success: true,
      data: { id: image.id, billId: id }
    }, { status: 201 })
  } catch (error) {
    console.error('[IMAGE UPLOAD ERROR]', error)
    return NextResponse.json({ success: false, error: 'Image upload failed' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    // Only return id + url (url contains base64 or storage URL)
    const images = await prisma.billImage.findMany({
      where: { billId: id },
      select: { id: true, url: true },
    })
    return NextResponse.json({ success: true, data: images })
  } catch (error) {
    console.error('[IMAGES GET ERROR]', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch images' }, { status: 500 })
  }
}
