import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { paramsToSign } = body;

    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!apiSecret) {
      return NextResponse.json({ error: 'Cloudinary API Secret not configured' }, { status: 500 });
    }

    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

    return NextResponse.json({ signature });
  } catch (error: any) {
    console.error('Signing error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
