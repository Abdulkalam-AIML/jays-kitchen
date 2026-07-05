import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')
    if (!url) {
      return NextResponse.json({ success: false, error: 'URL is required' }, { status: 400 })
    }

    // Resolve original filename from url or parameter
    let filename = searchParams.get('filename') || 'bill'
    const extension = url.split('.').pop()?.split('?')[0] || 'jpg'
    
    // Ensure filename ends with correct extension
    if (!filename.toLowerCase().endsWith(`.${extension.toLowerCase()}`)) {
      filename = `${filename}.${extension}`
    }

    const fileRes = await fetch(url)
    if (!fileRes.ok) {
      return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 })
    }

    const contentType = fileRes.headers.get('content-type') || 'application/octet-stream'
    const blob = await fileRes.blob()

    return new NextResponse(blob, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('[DOWNLOAD GET ERROR]', error)
    return NextResponse.json({ success: false, error: 'Failed to download file' }, { status: 500 })
  }
}
