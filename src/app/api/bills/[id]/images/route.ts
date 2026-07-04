import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { uploadToStorage } from '@/lib/storage'
import { createAuditLog } from '@/lib/audit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const bill = await prisma.bill.findUnique({ where: { id } })
    if (!bill) return NextResponse.json({ success: false, error: 'Bill not found' }, { status: 404 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'File too large (max 10MB)' }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ success: false, error: 'Invalid file type' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await uploadToStorage(buffer, {
      fileName: `bill_${id}_${Date.now()}_${file.name}`,
      contentType: file.type,
    })

    const image = await prisma.billImage.create({
      data: {
        billId: id,
        url: result.url,
        publicId: result.publicId,
        thumbnailUrl: result.thumbnailUrl,
      },
    })

    await createAuditLog({
      userId: user.userId,
      action: 'CREATE',
      entity: 'BillImage',
      entityId: image.id,
      details: { billId: id, billNumber: bill.billNumber },
    })

    return NextResponse.json({ success: true, data: image }, { status: 201 })
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
    const images = await prisma.billImage.findMany({ where: { billId: id } })
    return NextResponse.json({ success: true, data: images })
  } catch (error) {
    console.error('[IMAGES GET ERROR]', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch images' }, { status: 500 })
  }
}
