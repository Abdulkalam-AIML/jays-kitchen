import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Clear existing database (order matters for FK constraints)
  await prisma.billImage.deleteMany()
  await prisma.bill.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.user.deleteMany()
  await prisma.vendor.deleteMany()
  await prisma.category.deleteMany()
  await prisma.paymentMethod.deleteMany()
  await prisma.restaurantSettings.deleteMany()

  // Super Admin user
  const superAdminPassword = process.env.INITIAL_SUPER_ADMIN_PASSWORD || 'SuperAdmin@123'
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'Admin@123'

  const superAdminPass = await bcrypt.hash(superAdminPassword, 10)
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@jayskitchen.com' },
    update: {},
    create: {
      name: 'Jay Super Admin',
      email: 'superadmin@jayskitchen.com',
      password: superAdminPass,
      role: 'SUPER_ADMIN',
    },
  })
  console.log('✅ Super Admin user created:', superAdmin.email)

  // Admin user
  const adminPass = await bcrypt.hash(adminPassword, 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@jayskitchen.com' },
    update: {},
    create: {
      name: 'Jay Admin',
      email: 'admin@jayskitchen.com',
      password: adminPass,
      role: 'ADMIN',
    },
  })
  console.log('✅ Admin user created:', admin.email)

  // Categories
  const categories = [
    { name: 'Vegetables', color: '#22c55e', icon: '🥦' },
    { name: 'Meat & Seafood', color: '#ef4444', icon: '🥩' },
    { name: 'Dairy', color: '#f59e0b', icon: '🥛' },
    { name: 'Spices', color: '#f97316', icon: '🌶️' },
    { name: 'Groceries', color: '#8b5cf6', icon: '🛒' },
    { name: 'Beverages', color: '#06b6d4', icon: '🍹' },
    { name: 'Packaging', color: '#6366f1', icon: '📦' },
    { name: 'Cleaning', color: '#14b8a6', icon: '🧹' },
    { name: 'Utilities', color: '#64748b', icon: '⚡' },
    { name: 'Equipment', color: '#a16207', icon: '🔧' },
  ]

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    })
  }
  console.log('✅ Categories seeded')

  // Vendors
  const vendors = [
    { name: 'Fresh Farms Pvt Ltd', phone: '9876543210', email: 'fresh@farms.com', address: 'Koyambedu Market, Chennai' },
    { name: 'Spice World', phone: '9876543211', address: 'T Nagar, Chennai' },
    { name: 'Meat Hub', phone: '9876543212', address: 'Pallikaranai, Chennai' },
    { name: 'Dairy Direct', phone: '9876543213', address: 'Ambattur, Chennai' },
    { name: 'Raj Provisions', phone: '9876543214', address: 'Adyar, Chennai' },
    { name: 'Star Beverages', phone: '9876543215', address: 'Guindy, Chennai' },
    { name: 'Clean Solutions', phone: '9876543216', address: 'Velachery, Chennai' },
    { name: 'Kitchen Essentials', phone: '9876543217', address: 'OMR, Chennai' },
  ]

  for (const v of vendors) {
    await prisma.vendor.upsert({
      where: { name: v.name },
      update: {},
      create: v,
    })
  }
  console.log('✅ Vendors seeded')

  // Payment Methods
  const paymentMethods = [
    { name: 'Cash', type: 'CASH' as const },
    { name: 'UPI / GPay', type: 'UPI' as const },
    { name: 'Credit Card', type: 'CARD' as const },
    { name: 'Debit Card', type: 'CARD' as const },
    { name: 'Bank Transfer', type: 'BANK_TRANSFER' as const },
    { name: 'Cheque', type: 'CHEQUE' as const },
    { name: 'Wallet', type: 'WALLET' as const },
  ]

  for (const pm of paymentMethods) {
    const existing = await prisma.paymentMethod.findFirst({ where: { name: pm.name } })
    if (!existing) {
      await prisma.paymentMethod.create({ data: pm })
    }
  }
  console.log('✅ Payment methods seeded')

  // Restaurant settings
  await prisma.restaurantSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      name: "Jay's Kitchen",
      address: '123 Restaurant Street, New York, NY 10001',
      phone: '+1 (212) 555-0199',
      email: 'info@jayskitchen.com',
      currency: 'USD',
      timezone: 'America/New_York',
    },
  })

  // Demo bills — mix of statuses and public + admin submissions
  const allVendors = await prisma.vendor.findMany()
  const allCategories = await prisma.category.findMany()
  const allPaymentMethods = await prisma.paymentMethod.findMany()

  const statuses = ['PENDING', 'APPROVED', 'APPROVED', 'APPROVED', 'REJECTED'] as const
  const demoBills = [
    { amount: 450.00, remarks: 'Weekly vegetable stock', daysAgo: 1, submittedBy: 'PUBLIC', submitterName: 'Ramesh Kumar' },
    { amount: 1200.00, remarks: 'Chicken and mutton purchase', daysAgo: 2, submittedBy: admin.name, submitterName: null },
    { amount: 320.00, remarks: 'Milk, butter, paneer', daysAgo: 3, submittedBy: 'PUBLIC', submitterName: 'Priya S' },
    { amount: 180.00, remarks: 'Spices restock', daysAgo: 5, submittedBy: admin.name, submitterName: null },
    { amount: 850.00, remarks: 'Monthly grocery purchase', daysAgo: 7, submittedBy: 'PUBLIC', submitterName: 'Suresh M' },
    { amount: 220.00, remarks: 'Soft drinks and juices', daysAgo: 8, submittedBy: admin.name, submitterName: null },
    { amount: 150.00, remarks: 'Cleaning supplies', daysAgo: 10, submittedBy: 'PUBLIC', submitterName: 'Anita V' },
    { amount: 2500.00, remarks: 'New cooking equipment', daysAgo: 12, submittedBy: admin.name, submitterName: null },
    { amount: 380.00, remarks: 'Fresh vegetables', daysAgo: 14, submittedBy: 'PUBLIC', submitterName: 'Ramesh Kumar' },
    { amount: 920.00, remarks: 'Seafood order', daysAgo: 15, submittedBy: admin.name, submitterName: null },
    { amount: 410.00, remarks: 'Provisions', daysAgo: 18, submittedBy: 'PUBLIC', submitterName: 'Kumar D' },
    { amount: 670.00, remarks: 'Packaging materials', daysAgo: 20, submittedBy: admin.name, submitterName: null },
    { amount: 290.00, remarks: 'Dairy products', daysAgo: 22, submittedBy: 'PUBLIC', submitterName: 'Priya S' },
    { amount: 1100.00, remarks: 'Bulk spices', daysAgo: 25, submittedBy: admin.name, submitterName: null },
    { amount: 550.00, remarks: 'Vegetable stock', daysAgo: 28, submittedBy: 'PUBLIC', submitterName: 'Suresh M' },
  ]

  let billIdx = 1
  for (const bill of demoBills) {
    const date = new Date()
    date.setDate(date.getDate() - bill.daysAgo)
    const billNum = `JK-${new Date().getFullYear()}-${String(billIdx).padStart(4, '0')}`
    const existing = await prisma.bill.findUnique({ where: { billNumber: billNum } })
    if (!existing) {
      await prisma.bill.create({
        data: {
          billNumber: billNum,
          billDate: date,
          amount: bill.amount,
          remarks: bill.remarks,
          status: statuses[billIdx % statuses.length],
          submittedBy: bill.submittedBy,
          submitterName: bill.submitterName,
          vendorId: allVendors[billIdx % allVendors.length].id,
          categoryId: allCategories[billIdx % allCategories.length].id,
          paymentMethodId: allPaymentMethods[billIdx % allPaymentMethods.length].id,
          paidById: bill.submittedBy === 'PUBLIC' ? null : admin.id,
        },
      })
    }
    billIdx++
  }
  console.log('✅ Demo bills seeded')

  console.log('🎉 Seed complete!')
  console.log('')
  console.log('🔑 Login credentials:')
  console.log('   Super Admin: superadmin@jayskitchen.com / SuperAdmin@123')
  console.log('   Admin:       admin@jayskitchen.com / Admin@123')
  console.log('')
  console.log('🌐 Public bill submission (no login):')
  console.log('   http://localhost:3001/submit-bill')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
