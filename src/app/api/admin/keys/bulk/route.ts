import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import LicenseKey from '@/models/LicenseKey';
import { getSessionUser } from '@/lib/auth';

export async function DELETE(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const duration = searchParams.get('duration');
    const deleteType = searchParams.get('type') || 'available'; // 'available' or 'all'

    if (!productId || !duration) {
      return NextResponse.json({ error: 'Product ID and duration are required' }, { status: 400 });
    }

    await dbConnect();

    const query: any = { productId, duration };

    if (deleteType === 'available') {
      query.isSold = false;
    }

    const count = await LicenseKey.countDocuments(query);

    if (count === 0) {
      return NextResponse.json({ error: 'No matching keys found to delete' }, { status: 404 });
    }

    const result = await LicenseKey.deleteMany(query);

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} key(s) (${duration})`,
      deletedCount: result.deletedCount,
    });
  } catch (error: any) {
    console.error('Bulk delete keys error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
