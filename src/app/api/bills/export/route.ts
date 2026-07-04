import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: Record<string, unknown> = {}
    if (startDate || endDate) {
      where.billDate = {}
      if (startDate) (where.billDate as Record<string, Date>).gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        ;(where.billDate as Record<string, Date>).lte = end
      }
    }

    const bills = await prisma.bill.findMany({
      where,
      include: {
        vendor: { select: { name: true } },
        category: { select: { name: true, color: true } },
        paymentMethod: { select: { name: true, type: true } },
        paidBy: { select: { name: true } },
      },
      orderBy: { billDate: 'desc' },
    })

    const settings = await prisma.restaurantSettings.findFirst()
    const locale = settings?.currency === 'INR' ? 'en-IN' : 'en-US'

    // CSV format
    const format = searchParams.get('format') || 'csv'
    
    if (format === 'csv') {
      const headers = ['Bill No', 'Date', 'Vendor', 'Category', 'Payment Method', 'Paid By', 'Amount', 'Remarks']
      const rows = bills.map((b) => [
        b.billNumber,
        new Date(b.billDate).toLocaleDateString(locale),
        b.vendor.name,
        b.category.name,
        b.paymentMethod.name,
        b.paidBy?.name ?? 'Public',
        Number(b.amount).toFixed(2),
        b.remarks || '',
      ])

      const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="jays-kitchen-bills-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    // JSON for client-side Excel generation
    return NextResponse.json({
      success: true,
      data: bills.map((b) => ({
        billNumber: b.billNumber,
        billDate: new Date(b.billDate).toLocaleDateString(locale),
        vendor: b.vendor.name,
        category: b.category.name,
        paymentMethod: b.paymentMethod.name,
        paidBy: b.paidBy?.name ?? 'Public',
        amount: Number(b.amount),
        remarks: b.remarks || '',
      })),
    })
  } catch (error) {
    console.error('[EXPORT ERROR]', error)
    return NextResponse.json({ success: false, error: 'Export failed' }, { status: 500 })
  }
}
