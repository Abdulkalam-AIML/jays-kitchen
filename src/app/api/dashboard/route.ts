import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getCachedDashboardStats, getCachedDashboardDetails } from '@/lib/cache'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'stats' | 'details' | null (all)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const vendorId = searchParams.get('vendorId')
    const categoryId = searchParams.get('categoryId')
    const paymentMethodId = searchParams.get('paymentMethodId')
    const paidById = searchParams.get('paidById')

    const filters = { startDate, endDate, vendorId, categoryId, paymentMethodId, paidById }

    // 1. STATS ONLY (Fast aggregation and counts)
    if (type === 'stats') {
      const cachedData = await getCachedDashboardStats(filters)
      return NextResponse.json({
        success: true,
        data: cachedData
      })
    }

    // 2. DETAILS ONLY (Recent activity and charts)
    if (type === 'details') {
      const cachedData = await getCachedDashboardDetails(filters)
      return NextResponse.json({
        success: true,
        data: cachedData
      })
    }

    // 3. DEFAULT: ALL (stats + details for full payload)
    const [statsData, detailsData] = await Promise.all([
      getCachedDashboardStats(filters),
      getCachedDashboardDetails(filters)
    ])

    return NextResponse.json({
      success: true,
      data: {
        ...statsData,
        ...detailsData
      },
    })
  } catch (error) {
    console.error('[DASHBOARD ERROR]', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
