import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { publicBillSchema } from '@/lib/validations'
import { uploadToStorage } from '@/lib/storage'
import { invalidateDashboard } from '@/lib/cache'
import { getAuthUser } from '@/lib/auth'

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
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Authentication required to submit a bill' }, { status: 401 })
    }

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
    let paidBy = ''
    let amount = 0
    let remarks: string | undefined = undefined
    let file: File | null = null

    let paymentStatus = 'NOT_PAID'
    let amountPaidInput = 0

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      billNumber = (formData.get('billNumber') as string) || ''
      billDate = (formData.get('billDate') as string) || ''
      vendorId = (formData.get('vendorId') as string) || ''
      categoryId = (formData.get('categoryId') as string) || ''
      paymentMethodId = (formData.get('paymentMethodId') as string) || ''
      paidBy = (formData.get('paidBy') as string) || ''
      amount = Number(formData.get('amount') || 0)
      remarks = (formData.get('remarks') as string) || undefined
      file = formData.get('file') as File | null
      paymentStatus = (formData.get('paymentStatus') as string) || 'NOT_PAID'
      amountPaidInput = Number(formData.get('amountPaid') || 0)
    } else {
      const body = await request.json()
      const validated = publicBillSchema.parse(body)
      billNumber = validated.billNumber
      billDate = validated.billDate
      vendorId = validated.vendorId
      categoryId = validated.categoryId
      paymentMethodId = validated.paymentMethodId
      paidBy = validated.paidBy || ''
      amount = validated.amount
      remarks = validated.remarks
      paymentStatus = validated.paymentStatus || 'NOT_PAID'
      amountPaidInput = validated.amountPaid || 0
    }



    // Validate using Zod schema
    const validated = publicBillSchema.parse({
      billNumber,
      billDate,
      vendorId,
      categoryId,
      paymentMethodId,
      paidBy,
      amount,
      remarks,
      paymentStatus,
      amountPaid: amountPaidInput,
    })

    // Server-side recomputation of amountPaid and remainingAmount based on paymentStatus
    const amt = Number(validated.amount)
    let finalAmountPaid = 0
    let finalRemainingAmount = 0

    if (validated.paymentStatus === 'FULLY_PAID') {
      finalAmountPaid = amt
      finalRemainingAmount = 0
    } else if (validated.paymentStatus === 'NOT_PAID') {
      finalAmountPaid = 0
      finalRemainingAmount = amt
    } else if (validated.paymentStatus === 'PARTIALLY_PAID') {
      finalAmountPaid = Math.max(0, validated.amountPaid || 0)
      finalRemainingAmount = Math.max(0, amt - finalAmountPaid)
    }

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
        submittedBy: user.role,
        submittedByUserId: user.userId,
        status: 'PENDING',
        paidById: null,
        paidBy: validated.paidBy || '',
        paymentStatus: validated.paymentStatus,
        amountPaid: finalAmountPaid,
        remainingAmount: finalRemainingAmount,
      },
      include: {
        vendor: { select: { name: true } },
        category: { select: { name: true } },
        paymentMethod: { select: { name: true } },
        images: true,
      },
    })

    // If an image is provided, upload it and create a BillImage record
    if (file && file.size > 0) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer())
        const storageResult = await uploadToStorage(buffer, {
          fileName: `bill-${bill.id}-${Date.now()}`,
          contentType: file.type
        })
        await prisma.billImage.create({
          data: {
            billId: bill.id,
            url: storageResult.url,
            publicId: storageResult.publicId,
            thumbnailUrl: storageResult.thumbnailUrl,
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

    invalidateDashboard()

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
        paidBy: updatedBill?.paidBy,
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
