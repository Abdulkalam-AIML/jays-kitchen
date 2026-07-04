import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { publicBillSchema } from '@/lib/validations'
import { uploadToStorage } from '@/lib/storage'

// Rate-limit map (simple in-memory; resets on server restart)
const submissions = new Map<string, number[]>()
const RATE_LIMIT = 10
const WINDOW_MS = 60 * 60 * 1000 // 1 hour

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0] ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

export async function POST(request: NextRequest) {
  try {
    // Simple rate limiting
    const ip = getClientIp(request)
    const now = Date.now()
    const times = (submissions.get(ip) || []).filter((t) => now - t < WINDOW_MS)
    if (times.length >= RATE_LIMIT) {
      return NextResponse.json(
        { success: false, error: 'Too many submissions. Please try again later.' },
        { status: 429 }
      )
    }
    times.push(now)
    submissions.set(ip, times)

    // Check content type (JSON vs FormData)
    const contentType = request.headers.get('content-type') || ''
    
    let billNumber = ''
    let billDate = ''
    let vendorId = ''
    let categoryId = ''
    let paymentMethodId = ''
    let submitterName = ''
    let amount = 0
    let remarks: string | undefined = undefined
    let file: File | null = null

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      billNumber = (formData.get('billNumber') as string) || ''
      billDate = (formData.get('billDate') as string) || ''
      vendorId = (formData.get('vendorId') as string) || ''
      categoryId = (formData.get('categoryId') as string) || ''
      paymentMethodId = (formData.get('paymentMethodId') as string) || ''
      submitterName = (formData.get('submitterName') as string) || ''
      amount = Number(formData.get('amount') || 0)
      remarks = (formData.get('remarks') as string) || undefined
      file = formData.get('file') as File | null
    } else {
      const body = await request.json()
      const validated = publicBillSchema.parse(body)
      billNumber = validated.billNumber
      billDate = validated.billDate
      vendorId = validated.vendorId
      categoryId = validated.categoryId
      paymentMethodId = validated.paymentMethodId
      submitterName = validated.submitterName
      amount = validated.amount
      remarks = validated.remarks
    }

    // Validate using Zod schema
    const validated = publicBillSchema.parse({
      billNumber,
      billDate,
      vendorId,
      categoryId,
      paymentMethodId,
      submitterName,
      amount,
      remarks,
    })

    // Ensure unique billNumber
    let finalBillNumber = validated.billNumber.trim()
    const existing = await prisma.bill.findUnique({ where: { billNumber: finalBillNumber } })
    if (existing) {
      finalBillNumber = `${finalBillNumber}-${Date.now()}`
    }

    // Create the bill first
    const bill = await prisma.bill.create({
      data: {
        billNumber: finalBillNumber,
        billDate: new Date(validated.billDate),
        amount: validated.amount,
        remarks: validated.remarks,
        vendorId: validated.vendorId,
        categoryId: validated.categoryId,
        paymentMethodId: validated.paymentMethodId,
        submittedBy: 'PUBLIC',
        submitterName: validated.submitterName,
        status: 'PENDING',
        paidById: null,
      },
      include: {
        vendor: { select: { name: true } },
        category: { select: { name: true } },
        paymentMethod: { select: { name: true } },
        images: true,
      },
    })

    // If an image is provided, upload it and create a BillImage record
    if (file) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer())
        const uploadResult = await uploadToStorage(buffer, {
          fileName: `public_${bill.id}_${Date.now()}_${file.name}`,
          contentType: file.type,
        })
        await prisma.billImage.create({
          data: {
            billId: bill.id,
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            thumbnailUrl: uploadResult.thumbnailUrl,
          },
        })
      } catch (uploadError) {
        console.error('[PUBLIC BILL IMAGE UPLOAD FAILED]', uploadError)
      }
    }

    // Refetch bill to get updated images array
    const updatedBill = await prisma.bill.findUnique({
      where: { id: bill.id },
      include: {
        vendor: { select: { name: true } },
        category: { select: { name: true } },
        paymentMethod: { select: { name: true } },
        images: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Bill submitted successfully! It will be reviewed by our admin.',
      data: {
        billNumber: updatedBill?.billNumber,
        billDate: updatedBill?.billDate,
        amount: updatedBill?.amount,
        vendor: updatedBill?.vendor.name,
        category: updatedBill?.category.name,
        paymentMethod: updatedBill?.paymentMethod.name,
        submitterName: updatedBill?.submitterName,
        status: updatedBill?.status,
        images: updatedBill?.images,
      }
    }, { status: 201 })
  } catch (error) {
    console.error('[PUBLIC SUBMIT BILL ERROR]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to submit bill. Please check all fields and try again.' },
      { status: 400 }
    )
  }
}
