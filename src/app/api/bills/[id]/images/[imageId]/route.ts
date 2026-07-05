import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { deleteFromStorage } from '@/lib/storage'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { id, imageId } = await params
    const image = await prisma.billImage.findFirst({ where: { id: imageId, billId: id } })
    if (!image) return NextResponse.json({ success: false, error: 'Image not found' }, { status: 404 })

    if (!image.publicId.startsWith('local_') && !image.publicId.startsWith('public_')) {
      await deleteFromStorage(image.publicId)
    }
    await prisma.billImage.delete({ where: { id: imageId } })

    return NextResponse.json({ success: true, message: 'Image deleted' })
  } catch (error) {
    console.error('[IMAGE DELETE ERROR]', error)
    return NextResponse.json({ success: false, error: 'Failed to delete image' }, { status: 500 })
  }
}
