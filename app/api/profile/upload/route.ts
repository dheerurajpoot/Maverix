import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate file size (max 100KB after compression - images should be compressed client-side)
    // This is a safety check in case compression fails
    const maxSizeBytes = 100 * 1024; // 100KB
    if (file.size > maxSizeBytes) {
      return NextResponse.json({ 
        error: `File size must be less than 100KB after compression. Current size: ${Math.round(file.size / 1024)}KB` 
      }, { status: 400 });
    }

    // Convert file to base64 data URL
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64String = buffer.toString('base64');
    
    // Create data URL (works in serverless environments)
    const dataUrl = `data:${file.type};base64,${base64String}`;

    return NextResponse.json({
      message: 'File uploaded successfully',
      url: dataUrl,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

