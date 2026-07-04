# Vercel Deployment Guide — Jay's Kitchen SaaS

This guide explains how to deploy the **Jay's Kitchen Expense Management System** to production on **Vercel** with **Supabase PostgreSQL & Storage**.

---

## 1. Database Setup (Supabase)

1. Go to the [Supabase Dashboard](https://supabase.com/dashboard) and navigate to your project settings.
2. In **Project Settings → Database**:
   - Copy the **Connection pooler** URI string. Ensure the mode is set to **Transaction** (typically port `6543`).
   - Copy the **Direct connection** URI string (typically port `5432`).
3. In **Project Settings → API**:
   - Copy the **Project URL** (`NEXT_PUBLIC_SUPABASE_URL`).
   - Copy the **anon / public** API key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`).
   - Copy the **service_role** API key (`SUPABASE_SERVICE_ROLE_KEY`).

---

## 2. Storage Setup (Supabase)

1. Navigate to **Storage** in your Supabase project sidebar.
2. Click **New Bucket** and name it `bill-images`.
3. Set the bucket to **Public** (so Vercel can fetch the image URLs).
4. Save the bucket. No RLS rules are needed since the server-side API writes using the service role key.

---

## 3. Deployment to Vercel

### Option A: Via Vercel Dashboard (Recommended)

1. Push your code to a GitHub, GitLab, or Bitbucket repository.
2. Go to the [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New → Project**.
3. Import your repository.
4. Under **Environment Variables**, add the following:
   - `DATABASE_URL`: Your Supabase pooler connection URI (port `6543`).
   - `DIRECT_URL`: Your Supabase direct connection URI (port `5432`).
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase API URL.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key.
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key.
   - `JWT_SECRET`: A secure random secret string for JWT signing.
   - `NEXT_PUBLIC_APP_URL`: The production URL of your deployment (e.g. `https://jays-kitchen.vercel.app`).
   - `NODE_ENV`: `production`
5. Click **Deploy**. Vercel will build the Next.js app, auto-generate the Prisma client, deploy the database migrations, and deploy the serverless functions.

---

## 4. Verification

After deployment:
1. Navigate to `https://your-app-domain.vercel.app/admin/login` and check the login flow.
2. Verify public submissions at `/submit-bill`. Upload an image and verify it uploads successfully to your Supabase Storage bucket (`bill-images`) and appears on the admin dashboard.
