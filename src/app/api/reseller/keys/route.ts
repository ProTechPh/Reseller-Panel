import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import LicenseKey from '@/models/LicenseKey';
import Product from '@/models/Product'; // For population
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== 'reseller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const keys = await LicenseKey.find({ resellerId: session.userId })
      .populate('productId', 'name')
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, keys });
  } catch (error: any) {
    console.error('Fetch reseller keys error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
