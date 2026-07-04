/**
 * Supabase Storage — replaces Cloudinary for bill image uploads
 * Bucket: bill-images (public)
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'

// Server-side client with service role key (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
})

const BUCKET = 'bill-images'

export interface UploadResult {
  url: string
  publicId: string
  thumbnailUrl: string
}

/**
 * Upload a file buffer to Supabase Storage
 */
export async function uploadToStorage(
  file: Buffer,
  options: { fileName?: string; contentType?: string } = {}
): Promise<UploadResult> {
  const ext = options.contentType?.includes('png')
    ? 'png'
    : options.contentType?.includes('webp')
    ? 'webp'
    : 'jpg'
  const fileName = options.fileName || `bill-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const filePath = `bills/${fileName}`

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(filePath, file, {
      contentType: options.contentType || 'image/jpeg',
      upsert: false,
    })

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`)
  }

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(filePath)

  return {
    url: publicUrl,
    publicId: filePath, // used as the "publicId" stored in DB for deletion
    thumbnailUrl: publicUrl, // Supabase doesn't auto-thumbnail; use same URL
  }
}

/**
 * Delete a file from Supabase Storage by its path (publicId)
 */
export async function deleteFromStorage(publicId: string): Promise<void> {
  const { error } = await supabaseAdmin.storage.from(BUCKET).remove([publicId])
  if (error) {
    console.error('[STORAGE DELETE ERROR]', error.message)
  }
}
