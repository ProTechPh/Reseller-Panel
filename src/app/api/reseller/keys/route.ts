import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import LicenseKey from '@/models/LicenseKey';
import Product from '@/models/Product';
import User from '@/models/User';
import { getSessionUser, clearSessionCookie } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== 'reseller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Ensure Mongoose models are explicitly initialized and registered before populate
    const ProductModel = Product;
    const UserModel = User;
    const KeyModel = LicenseKey;

    const currentUser = await UserModel.findById(session.userId);
    if (!currentUser || currentUser.isBanned) {
      await clearSessionCookie();
      return NextResponse.json({ error: 'Your account has been banned by the administrator.' }, { status: 403 });
    }

    const keys = await KeyModel.find({ resellerId: session.userId })
      .populate('productId', 'name')
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, keys });
  } catch (error: any) {
    console.error('Fetch reseller keys error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
