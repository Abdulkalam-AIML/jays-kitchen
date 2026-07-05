# 🍊 Jay's Kitchen — Restaurant Expense Management System

A production-ready, ultra-fast, modern, and fully responsive Restaurant Expense Management System named **Jay's Kitchen**. Built with Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Prisma ORM, Neon PostgreSQL, and Supabase Storage.

This application is designed to run entirely on free tiers, with zero paid dependencies, and is fully optimized for immediate Vercel deployment.

---

## 🌟 Key Features

*   **Premium Brand Integration**: Features a subtle brand signature watermark (at `3%` opacity) centered in light/dark modes, and an animated logo in the header with a golden glow on hover.
*   **Intuitive Unified Layout**: Dashboards, filters, charts, drawers, and tabs are consolidated on single pages to provide a clean SaaS interface (similar to Linear, Vercel, or Stripe).
*   **Fast Analytics**: Parallel queries load Monthly Trends, Category breakdown, Vendor expenditure, and Payment Methods in a single dashboard call, with granular server caching.
*   **Complete CRUD Drawer Flow**: Add, Edit, Delete, or View bills and upload receipts to Supabase Storage directly within sliding Drawers—no annoying page redirects.
*   **Setting Management Tabs**: Unified Admin settings console containing:
    *   Restaurant Details (GSTIN, Address, Phone, Email)
    *   User Management (Add Admin/Staff, Deactivate/Edit)
    *   Vendor Management (Add/Edit/Delete, auto-soft deactivates if active bills exist)
    *   Category Management (Custom color picker support)
    *   Payment Methods (CASH, UPI, CARD, BANK_TRANSFER, CHEQUE, WALLET)
    *   Personal Profile Update (name, email, password update)
*   **Robust Security & Auth**: Password hashing with `bcryptjs`, JWT state in HttpOnly cookies, route authorization middleware, and SQL injection protection through Prisma.
*   **Instant Export**: Print current views or export detailed bills dynamically to CSV/XLSX formats.

---

## 🛠️ Technology Stack

*   **Framework**: Next.js 15 (App Router) & React 19
*   **Database & ORM**: Neon PostgreSQL (Free Tier) & Prisma ORM
*   **Styling**: Tailwind CSS & Vanilla CSS Design Tokens
*   **Icons & Animation**: Lucide React & Framer Motion
*   **Forms & Validation**: React Hook Form & Zod
*   **Storage**: Supabase Storage Bucket (Receipt / Bill image uploads)
*   **State & Alerts**: React Hot Toast & Context API

---

## ⚙️ Initial Configuration

1.  Clone the repository and navigate to the project directory.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up your environment variables by creating `.env` based on `.env.example`:
    ```ini
    DATABASE_URL="postgresql://user:password@your-neon-host/neondb?sslmode=require"
    DIRECT_URL="postgresql://user:password@your-neon-host/neondb?sslmode=require"
    JWT_SECRET="your-jwt-secret-key"
    
    # Supabase Storage Configuration
    NEXT_PUBLIC_SUPABASE_URL="https://your-supabase-project.supabase.co"
    SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

    # Default Seeding Passwords (Optional)
    INITIAL_SUPER_ADMIN_PASSWORD="SuperAdmin@123"
    INITIAL_ADMIN_PASSWORD="Admin@123"
    ```
4.  Generate Prisma Client and apply migrations:
    ```bash
    npx prisma generate
    npx prisma db push
    ```
5.  Run the seeding script to populate initial users, payment methods, vendors, and demo bills:
    ```bash
    npm run seed
    ```
6.  Start the development server:
    ```bash
    npm run dev
    ```

---

## 🔑 Default Access Credentials

After seeding, the following default accounts are created:

*   **Super Admin User**:
    *   **Email**: `superadmin@jayskitchen.com`
    *   **Password**: Value of `INITIAL_SUPER_ADMIN_PASSWORD` (defaults to `SuperAdmin@123`)
*   **Admin User**:
    *   **Email**: `admin@jayskitchen.com`
    *   **Password**: Value of `INITIAL_ADMIN_PASSWORD` (defaults to `Admin@123`)

---

## 🚀 Deployment on Vercel

Deployment to Vercel requires zero adjustments:
1. Connect your GitHub repository to Vercel.
2. Add your environment variables (`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`) inside the Vercel Project Settings.
3. Deploy! The custom `vercel.json` file takes care of building your client assets and generating the Prisma engine automatically.
