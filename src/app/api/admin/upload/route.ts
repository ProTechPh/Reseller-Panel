import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary if credentials are present
const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export async function POST(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Admin privileges required.' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No image file uploaded' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Uploaded file must be an image (PNG, JPG, WEBP, etc.)' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 1. If Cloudinary credentials are fully configured, upload directly to Cloudinary
    if (cloudName && apiKey && apiSecret) {
      try {
        const uploadResult: any = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'reseller-products',
              resource_type: 'image',
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(buffer);
        });

        if (uploadResult && uploadResult.secure_url) {
          return NextResponse.json({ success: true, url: uploadResult.secure_url });
        }
      } catch (cloudErr) {
        console.error('Cloudinary upload error, falling back to local:', cloudErr);
      }
    }

    // 2. Fallback: Save to local public/uploads directory
    const ext = path.extname(file.name) || '.png';
    const cleanExt = ext.toLowerCase();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const filename = `prod-${Date.now()}-${randomSuffix}${cleanExt}`;

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);

    const fileUrl = `/uploads/${filename}`;
    return NextResponse.json({ success: true, url: fileUrl });
  } catch (error: any) {
    console.error('Image upload failed:', error);
    return NextResponse.json({ error: error.message || 'Image upload failed' }, { status: 500 });
  }
}
