import { unstable_cache } from 'next/cache'
import { revalidateTag } from 'next/cache'
import { prisma } from './prisma'
import { Prisma } from '@prisma/client'

// Granular cache invalidation functions
export function invalidateDashboard() {
  revalidateTag('dashboard-stats')
  revalidateTag('dashboard-details')
}

export function invalidateVendors() {
  revalidateTag('vendors')
  revalidateTag('dashboard-details')
  revalidateTag('dashboard-stats')
}

export function invalidateCategories() {
  revalidateTag('categories')
  revalidateTag('dashboard-details')
  revalidateTag('dashboard-stats')
}

export function invalidatePaymentMethods() {
  revalidateTag('payment-methods')
  revalidateTag('dashboard-details')
  revalidateTag('dashboard-stats')
}

export function invalidateSettings() {
  revalidateTag('settings')
}

// Cached DB selectors
export async function getCachedVendorsList(filters: { search?: string; activeOnly?: boolean }) {
  const key = ['vendors-list', filters.search || '', String(filters.activeOnly || false)]
  return unstable_cache(
    async () => {
      return prisma.vendor.findMany({
        where: {
          ...(filters.activeOnly && { isActive: true }),
          ...(filters.search && { name: { contains: filters.search, mode: 'insensitive' } }),
        },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          address: true,
          gstin: true,
          isActive: true,
          _count: { select: { bills: true } }
        }
      })
    },
    key,
    { tags: ['vendors'] }
  )()
}

export const getCachedCategoriesWithCount = unstable_cache(
  async () => {
    return prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        color: true,
        icon: true,
        isActive: true,
        _count: { select: { bills: true } }
      }
    })
  },
  ['categories-with-count'],
  { tags: ['categories'] }
)

export const getCachedPaymentMethodsWithCount = unstable_cache(
  async () => {
    return prisma.paymentMethod.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        type: true,
        isActive: true,
        _count: { select: { bills: true } }
      }
    })
  },
  ['payment-methods-with-count'],
  { tags: ['payment-methods'] }
)

export const getCachedVendors = unstable_cache(
  async () => {
    return prisma.vendor.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, phone: true, email: true, address: true, gstin: true, isActive: true }
    })
  },
  ['all-vendors'],
  { tags: ['vendors'] }
)

export const getCachedActiveVendors = unstable_cache(
  async () => {
    return prisma.vendor.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true }
    })
  },
  ['active-vendors'],
  { tags: ['vendors'] }
)

export const getCachedCategories = unstable_cache(
  async () => {
    return prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, color: true, icon: true, isActive: true }
    })
  },
  ['all-categories'],
  { tags: ['categories'] }
)

export const getCachedActiveCategories = unstable_cache(
  async () => {
    return prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, color: true }
    })
  },
  ['active-categories'],
  { tags: ['categories'] }
)

export const getCachedPaymentMethods = unstable_cache(
  async () => {
    return prisma.paymentMethod.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, type: true, isActive: true }
    })
  },
  ['all-payment-methods'],
  { tags: ['payment-methods'] }
)

export const getCachedActivePaymentMethods = unstable_cache(
  async () => {
    return prisma.paymentMethod.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, type: true }
    })
  },
  ['active-payment-methods'],
  { tags: ['payment-methods'] }
)

export const getCachedSettings = unstable_cache(
  async () => {
    const settings = await prisma.restaurantSettings.findFirst({
      select: { id: true, name: true, address: true, phone: true, email: true, gstin: true, logo: true, currency: true, timezone: true }
    })
    if (settings) return settings
    return prisma.restaurantSettings.create({
      data: { name: "Jay's Kitchen", currency: "USD", timezone: "America/New_York" },
      select: { id: true, name: true, address: true, phone: true, email: true, gstin: true, logo: true, currency: true, timezone: true }
    })
  },
  ['restaurant-settings'],
  { tags: ['settings'] }
)

// Dynamic Filter Cache for Dashboard Stats
export async function getCachedDashboardStats(filters: {
  vendorId?: string | null
  categoryId?: string | null
  paymentMethodId?: string | null
  paidById?: string | null
  startDate?: string | null
  endDate?: string | null
}) {
  const key = [
    'dashboard-stats',
    filters.vendorId || '',
    filters.categoryId || '',
    filters.paymentMethodId || '',
    filters.paidById || '',
    filters.startDate || '',
    filters.endDate || ''
  ]

  const fetchStats = unstable_cache(
    async () => {
      const baseWhere: Prisma.BillWhereInput = {}
      if (filters.vendorId) baseWhere.vendorId = filters.vendorId
      if (filters.categoryId) baseWhere.categoryId = filters.categoryId
      if (filters.paymentMethodId) baseWhere.paymentMethodId = filters.paymentMethodId
      if (filters.paidById) baseWhere.paidById = filters.paidById
      if (filters.startDate || filters.endDate) {
        baseWhere.billDate = {}
        if (filters.startDate) baseWhere.billDate.gte = new Date(filters.startDate)
        if (filters.endDate) {
          const end = new Date(filters.endDate)
          end.setHours(23, 59, 59, 999)
          baseWhere.billDate.lte = end
        }
      }

      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
      const thisWeekStart = new Date(now)
      thisWeekStart.setDate(now.getDate() - 7)

      const [
        totalBills,
        totalExpensesAgg,
        todayAgg,
        thisMonthAgg,
        lastMonthAgg,
        thisWeekAgg,
        statusCountsGroup,
        topVendorGroup,
        topCategoryGroup,
      ] = await Promise.all([
        prisma.bill.count({ where: baseWhere }),
        prisma.bill.aggregate({ where: baseWhere, _sum: { amount: true } }),
        prisma.bill.aggregate({ where: { ...baseWhere, billDate: { gte: todayStart, lte: todayEnd } }, _sum: { amount: true } }),
        prisma.bill.aggregate({ where: { ...baseWhere, billDate: { gte: thisMonthStart } }, _sum: { amount: true } }),
        prisma.bill.aggregate({ where: { ...baseWhere, billDate: { gte: lastMonthStart, lte: lastMonthEnd } }, _sum: { amount: true } }),
        prisma.bill.aggregate({ where: { ...baseWhere, billDate: { gte: thisWeekStart } }, _sum: { amount: true } }),
        prisma.bill.groupBy({ by: ['status'], _count: true }),
        prisma.bill.groupBy({ by: ['vendorId'], where: baseWhere, _sum: { amount: true }, orderBy: { _sum: { amount: 'desc' } }, take: 1 }),
        prisma.bill.groupBy({ by: ['categoryId'], where: baseWhere, _sum: { amount: true }, orderBy: { _sum: { amount: 'desc' } }, take: 1 }),
      ])

      const thisMonth = Number(thisMonthAgg._sum.amount || 0)
      const lastMonth = Number(lastMonthAgg._sum.amount || 0)
      const percentChange = lastMonth === 0 ? 0 : Math.round(((thisMonth - lastMonth) / lastMonth) * 100)

      const statusCounts = { pending: 0, approved: 0, rejected: 0 }
      for (const group of statusCountsGroup) {
        const statusKey = group.status.toLowerCase() as keyof typeof statusCounts
        if (statusKey in statusCounts) {
          statusCounts[statusKey] = group._count
        }
      }

      const topVendorId = topVendorGroup[0]?.vendorId
      const topCategoryId = topCategoryGroup[0]?.categoryId

      // Run fast targeted lookup queries for top items
      const [topVendor, topCategory] = await Promise.all([
        topVendorId ? prisma.vendor.findUnique({ where: { id: topVendorId }, select: { name: true } }) : Promise.resolve(null),
        topCategoryId ? prisma.category.findUnique({ where: { id: topCategoryId }, select: { name: true } }) : Promise.resolve(null),
      ])

      return {
        stats: {
          totalBills,
          totalExpenses: Number(totalExpensesAgg._sum.amount || 0),
          todayExpenses: Number(todayAgg._sum.amount || 0),
          thisMonthExpenses: thisMonth,
          lastMonthExpenses: lastMonth,
          thisWeekExpenses: Number(thisWeekAgg._sum.amount || 0),
          percentChange,
          topVendor: topVendor?.name || null,
          topVendorAmount: Number(topVendorGroup[0]?._sum?.amount || 0),
          topCategory: topCategory?.name || null,
          topCategoryAmount: Number(topCategoryGroup[0]?._sum?.amount || 0),
        },
        billStatusCounts: statusCounts,
      }
    },
    key,
    { tags: ['dashboard-stats'] }
  )

  return fetchStats()
}

// Dynamic Filter Cache for Dashboard Details
export async function getCachedDashboardDetails(filters: {
  vendorId?: string | null
  categoryId?: string | null
  paymentMethodId?: string | null
  paidById?: string | null
  startDate?: string | null
  endDate?: string | null
}) {
  const key = [
    'dashboard-details',
    filters.vendorId || '',
    filters.categoryId || '',
    filters.paymentMethodId || '',
    filters.paidById || '',
    filters.startDate || '',
    filters.endDate || ''
  ]

  const fetchDetails = unstable_cache(
    async () => {
      const baseWhere: Prisma.BillWhereInput = {}
      if (filters.vendorId) baseWhere.vendorId = filters.vendorId
      if (filters.categoryId) baseWhere.categoryId = filters.categoryId
      if (filters.paymentMethodId) baseWhere.paymentMethodId = filters.paymentMethodId
      if (filters.paidById) baseWhere.paidById = filters.paidById
      if (filters.startDate || filters.endDate) {
        baseWhere.billDate = {}
        if (filters.startDate) baseWhere.billDate.gte = new Date(filters.startDate)
        if (filters.endDate) {
          const end = new Date(filters.endDate)
          end.setHours(23, 59, 59, 999)
          baseWhere.billDate.lte = end
        }
      }

      const now = new Date()

      let monthlyData: { month: string; amount: number }[] = []
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
          amount: Number(r.total || 0)
        }))
      } catch (err) {
        console.warn('[DASHBOARD MONTHLY RAW QUERY FAILED, USING FALLBACK]', err)
        const fallbackBills = await prisma.bill.findMany({
          where: {
            ...baseWhere,
            billDate: { gte: new Date(now.getFullYear() - 1, now.getMonth(), 1) }
          },
          select: { billDate: true, amount: true },
          orderBy: { billDate: 'asc' },
        })
        const months: Record<string, number> = {}
        for (const bill of fallbackBills) {
          const d = new Date(bill.billDate)
          const key = d.toLocaleString('default', { month: 'short', year: 'numeric' })
          months[key] = (months[key] || 0) + Number(bill.amount)
        }
        monthlyData = Object.entries(months).map(([month, total]) => ({ month, amount: total }))
      }

      const [
        recentBills,
        categoryExpenses,
        vendorExpenses,
        paymentMethodExpenses,
        categoriesData,
        vendorsData,
        pmData,
      ] = await Promise.all([
        prisma.bill.findMany({
          where: baseWhere,
          select: {
            id: true,
            billNumber: true,
            billDate: true,
            amount: true,
            remarks: true,
            status: true,
            submittedBy: true,
            paidBy: true,
            vendor: { select: { name: true } },
            category: { select: { name: true, color: true } },
            paymentMethod: { select: { name: true, type: true } },
            paidByUser: { select: { name: true } },
            images: { select: { thumbnailUrl: true } },
          },
          orderBy: { billDate: 'desc' },
          take: 10,
        }),
        prisma.bill.groupBy({
          by: ['categoryId'],
          where: baseWhere,
          _sum: { amount: true },
          _count: true,
          orderBy: { _sum: { amount: 'desc' } },
          take: 8,
        }),
        prisma.bill.groupBy({
          by: ['vendorId'],
          where: baseWhere,
          _sum: { amount: true },
          _count: true,
          orderBy: { _sum: { amount: 'desc' } },
          take: 8,
        }),
        prisma.bill.groupBy({
          by: ['paymentMethodId'],
          where: baseWhere,
          _sum: { amount: true },
          _count: true,
        }),
        prisma.category.findMany({ select: { id: true, name: true, color: true } }),
        prisma.vendor.findMany({ select: { id: true, name: true } }),
        prisma.paymentMethod.findMany({ select: { id: true, name: true, type: true } }),
      ])

      const categoryMap = Object.fromEntries(categoriesData.map((c) => [c.id, c]))
      const categoryChartData = categoryExpenses.map((c) => ({
        name: categoryMap[c.categoryId]?.name || 'Unknown',
        value: Number(c._sum.amount || 0),
        color: categoryMap[c.categoryId]?.color || '#f97316',
        count: c._count,
      }))

      const vendorMap = Object.fromEntries(vendorsData.map((v) => [v.id, v]))
      const vendorChartData = vendorExpenses.map((v) => ({
        name: vendorMap[v.vendorId]?.name || 'Unknown',
        value: Number(v._sum.amount || 0),
        count: v._count,
      }))

      const pmMap = Object.fromEntries(pmData.map((p) => [p.id, p]))
      const paymentChartData = paymentMethodExpenses.map((p) => ({
        name: pmMap[p.paymentMethodId]?.name || 'Unknown',
        type: pmMap[p.paymentMethodId]?.type || 'CASH',
        value: Number(p._sum.amount || 0),
        count: p._count,
      }))

      const mappedBills = recentBills.map((bill) => {
        const { paidByUser, ...rest } = bill
        return {
          ...rest,
          paidBy: bill.paidBy
            ? { name: bill.paidBy }
            : (paidByUser ? { name: paidByUser.name } : null)
        }
      })

      return {
        recentBills: mappedBills,
        categoryChartData,
        vendorChartData,
        paymentChartData,
        monthlyData,
      }
    },
    key,
    { tags: ['dashboard-details'] }
  )

  return fetchDetails()
}
