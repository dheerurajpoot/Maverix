import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import ImageKit from 'imagekit';

export const dynamic = 'force-dynamic';

// Initialize ImageKit
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || '',
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || '',
});

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

    // Validate file type - only images for profile pictures
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ 
        error: 'File must be an image' 
      }, { status: 400 });
    }

    // Validate file size - max 5MB
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSizeBytes) {
      return NextResponse.json({ 
        error: `File size must be less than ${Math.round(maxSizeBytes / 1024 / 1024)}MB. Current size: ${Math.round(file.size / 1024 / 1024)}MB` 
      }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique file name with user ID
    const userId = (session.user as any).id;
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `profile-${userId}-${timestamp}.${fileExtension}`;

    // Upload to ImageKit
    const uploadResult = await imagekit.upload({
      file: buffer,
      fileName: fileName,
      folder: '/profiles', // Organize in profiles folder
      useUniqueFileName: false, // We're already using unique names
      overwriteFile: false, // Don't overwrite existing files
      tags: ['profile', `user-${userId}`], // Add tags for easier management
    });

    // Return ImageKit URL
    return NextResponse.json({
      message: 'File uploaded successfully',
      url: uploadResult.url, // ImageKit CDN URL
      fileId: uploadResult.fileId, // Store fileId for future deletion if needed
    });
  } catch (error: any) {
    console.error('ImageKit upload error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to upload image. Please try again.' 
    }, { status: 500 });
  }
}
