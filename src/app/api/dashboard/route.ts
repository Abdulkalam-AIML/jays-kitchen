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
    const vendorId = searchParams.get('vendorId')
    const categoryId = searchParams.get('categoryId')
    const paymentMethodId = searchParams.get('paymentMethodId')
    const paidById = searchParams.get('paidById')

    // Build date filter
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    const thisWeekStart = new Date(now)
    thisWeekStart.setDate(now.getDate() - 7)

    const baseWhere: Record<string, unknown> = {}
    if (vendorId) baseWhere.vendorId = vendorId
    if (categoryId) baseWhere.categoryId = categoryId
    if (paymentMethodId) baseWhere.paymentMethodId = paymentMethodId
    if (paidById) baseWhere.paidById = paidById
    if (startDate || endDate) {
      baseWhere.billDate = {}
      if (startDate) (baseWhere.billDate as Record<string, Date>).gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        ;(baseWhere.billDate as Record<string, Date>).lte = end
      }
    }

    // Run all queries in parallel
    const [
      totalBills,
      totalExpensesAgg,
      todayAgg,
      thisMonthAgg,
      lastMonthAgg,
      thisWeekAgg,
      recentBills,
      categoryExpenses,
      vendorExpenses,
      paymentMethodExpenses,
      pendingCount,
      approvedCount,
      rejectedCount,
    ] = await Promise.all([
      prisma.bill.count({ where: baseWhere }),

      prisma.bill.aggregate({ where: baseWhere, _sum: { amount: true } }),

      prisma.bill.aggregate({
        where: { ...baseWhere, billDate: { gte: todayStart, lte: todayEnd } },
        _sum: { amount: true },
      }),

      prisma.bill.aggregate({
        where: { ...baseWhere, billDate: { gte: thisMonthStart } },
        _sum: { amount: true },
      }),

      prisma.bill.aggregate({
        where: { ...baseWhere, billDate: { gte: lastMonthStart, lte: lastMonthEnd } },
        _sum: { amount: true },
      }),

      prisma.bill.aggregate({
        where: { ...baseWhere, billDate: { gte: thisWeekStart } },
        _sum: { amount: true },
      }),

      prisma.bill.findMany({
        where: baseWhere,
        include: {
          vendor: { select: { name: true } },
          category: { select: { name: true, color: true } },
          paymentMethod: { select: { name: true, type: true } },
          paidBy: { select: { name: true } },
          images: { select: { thumbnailUrl: true } },
        },
        orderBy: { billDate: 'desc' },
        take: 10,
      }),

      // Category spending
      prisma.bill.groupBy({
        by: ['categoryId'],
        where: baseWhere,
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: 'desc' } },
        take: 8,
      }),

      // Vendor spending
      prisma.bill.groupBy({
        by: ['vendorId'],
        where: baseWhere,
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: 'desc' } },
        take: 8,
      }),

      // Payment method breakdown
      prisma.bill.groupBy({
        by: ['paymentMethodId'],
        where: baseWhere,
        _sum: { amount: true },
        _count: true,
      }),

      // Status counts (global, unaffected by date filters)
      prisma.bill.count({ where: { status: 'PENDING' as const } }),
      prisma.bill.count({ where: { status: 'APPROVED' as const } }),
      prisma.bill.count({ where: { status: 'REJECTED' as const } }),
    ])

    // Monthly aggregation via PostgreSQL (Supabase)
    let monthlyData: { month: string; total: number }[] = []
    try {
      const rawData = await prisma.$queryRaw<{ month: string; total: number }[]>`
        SELECT 
          TO_CHAR(DATE_TRUNC('month', "billDate"), 'Mon YYYY') as month,
          EXTRACT(YEAR FROM "billDate") as year,
          EXTRACT(MONTH FROM "billDate") as month_num,
          SUM(amount)::float as total
        FROM bills
        WHERE "billDate" >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', "billDate"), EXTRACT(YEAR FROM "billDate"), EXTRACT(MONTH FROM "billDate")
        ORDER BY year ASC, month_num ASC
      `
      monthlyData = rawData.map(r => ({
        month: r.month,
        total: Number(r.total || 0)
      }))
    } catch {
      // Fallback: compute from Prisma
      const allBills = await prisma.bill.findMany({
        select: { billDate: true, amount: true },
        orderBy: { billDate: 'asc' },
      })
      const months: Record<string, number> = {}
      for (const bill of allBills) {
        const d = new Date(bill.billDate)
        const key = d.toLocaleString('default', { month: 'short', year: 'numeric' })
        months[key] = (months[key] || 0) + Number(bill.amount)
      }
      monthlyData = Object.entries(months).map(([month, total]) => ({ month, total }))
    }


    // Enrich category data
    const categoryIds = categoryExpenses.map((c) => c.categoryId)
    const categoriesData = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, color: true },
    })
    const categoryMap = Object.fromEntries(categoriesData.map((c) => [c.id, c]))

    const categoryChartData = categoryExpenses.map((c) => ({
      name: categoryMap[c.categoryId]?.name || 'Unknown',
      value: Number(c._sum.amount || 0),
      color: categoryMap[c.categoryId]?.color || '#f97316',
      count: c._count,
    }))

    // Enrich vendor data
    const vendorIds = vendorExpenses.map((v) => v.vendorId)
    const vendorsData = await prisma.vendor.findMany({
      where: { id: { in: vendorIds } },
      select: { id: true, name: true },
    })
    const vendorMap = Object.fromEntries(vendorsData.map((v) => [v.id, v]))

    const vendorChartData = vendorExpenses.map((v) => ({
      name: vendorMap[v.vendorId]?.name || 'Unknown',
      value: Number(v._sum.amount || 0),
      count: v._count,
    }))

    // Enrich payment method data
    const pmIds = paymentMethodExpenses.map((p) => p.paymentMethodId)
    const pmData = await prisma.paymentMethod.findMany({
      where: { id: { in: pmIds } },
      select: { id: true, name: true, type: true },
    })
    const pmMap = Object.fromEntries(pmData.map((p) => [p.id, p]))

    const paymentChartData = paymentMethodExpenses.map((p) => ({
      name: pmMap[p.paymentMethodId]?.name || 'Unknown',
      type: pmMap[p.paymentMethodId]?.type || 'CASH',
      value: Number(p._sum.amount || 0),
      count: p._count,
    }))

    const thisMonth = Number(thisMonthAgg._sum.amount || 0)
    const lastMonth = Number(lastMonthAgg._sum.amount || 0)
    const percentChange = lastMonth === 0 ? 0 : Math.round(((thisMonth - lastMonth) / lastMonth) * 100)

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalBills,
          totalExpenses: Number(totalExpensesAgg._sum.amount || 0),
          todayExpenses: Number(todayAgg._sum.amount || 0),
          thisMonthExpenses: thisMonth,
          lastMonthExpenses: lastMonth,
          thisWeekExpenses: Number(thisWeekAgg._sum.amount || 0),
          percentChange,
          topVendor: vendorChartData[0]?.name || null,
          topVendorAmount: vendorChartData[0]?.value || 0,
          topCategory: categoryChartData[0]?.name || null,
          topCategoryAmount: categoryChartData[0]?.value || 0,
        },
        billStatusCounts: {
          pending: pendingCount,
          approved: approvedCount,
          rejected: rejectedCount,
        },
        recentBills,
        categoryChartData,
        vendorChartData,
        paymentChartData,
        monthlyData: monthlyData.map((m) => ({ month: m.month, amount: m.total })),
      },
    })
  } catch (error) {
    console.error('[DASHBOARD ERROR]', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
