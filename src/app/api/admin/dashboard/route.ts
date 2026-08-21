import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import LicenseKey from '@/models/LicenseKey';
import Product from '@/models/Product';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    // Ensure Mongoose models are explicitly initialized and registered before populate
    const ProductModel = Product;
    const UserModel = User;
    const KeyModel = LicenseKey;

    // 1. Total resellers count (indexed query)
    const totalResellers = await UserModel.countDocuments({ role: 'reseller' });

    // 2. Aggregate stats in a single DB round-trip instead of fetching all keys
    const [aggResult] = await KeyModel.aggregate([
      {
        $group: {
          _id: null,
          totalKeys: { $sum: 1 },
          totalRevenue: { $sum: { $ifNull: ['$price', 0] } },
        },
      },
    ]);

    const totalKeysSold = aggResult?.totalKeys || 0;
    const totalRevenue = aggResult?.totalRevenue || 0;

    // 3. Get recent keys sold (last 10) - uses indexes
    const recentKeys = await KeyModel.find({})
      .populate('productId', 'name')
      .populate('resellerId', 'username')
      .sort({ createdAt: -1 })
      .limit(10);

    return NextResponse.json({
      success: true,
      stats: {
        totalResellers,
        totalKeysSold,
        totalRevenue,
      },
      recentKeys,
    });
  } catch (error: any) {
    console.error('Fetch dashboard stats error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
