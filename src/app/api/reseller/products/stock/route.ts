import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import LicenseKey from '@/models/LicenseKey';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session || (session.role !== 'reseller' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Group unsold keys by product ID and duration to count stock
    const stockStats = await LicenseKey.aggregate([
      { $match: { isSold: false } },
      {
        $group: {
          _id: { productId: '$productId', duration: '$duration' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Format structure: { [productId]: { [duration]: count } }
    const stockMap: Record<string, Record<string, number>> = {};
    
    stockStats.forEach((item) => {
      if (!item._id.productId) return;
      const prodId = item._id.productId.toString();
      const dur = item._id.duration;
      
      if (!stockMap[prodId]) {
        stockMap[prodId] = {};
      }
      stockMap[prodId][dur] = item.count;
    });

    return NextResponse.json({ success: true, stock: stockMap });
  } catch (error: any) {
    console.error('Fetch key stock error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
