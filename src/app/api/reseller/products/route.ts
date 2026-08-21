import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Product from '@/models/Product';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== 'reseller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const products = await Product.find({ isActive: true }).sort({ name: 1 });

    return NextResponse.json({ success: true, products });
  } catch (error: any) {
    console.error('Fetch reseller products error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
