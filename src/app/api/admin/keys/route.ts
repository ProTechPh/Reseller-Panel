import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import LicenseKey from '@/models/LicenseKey';
import Product from '@/models/Product';
import User from '@/models/User';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    // Ensure Mongoose models are explicitly initialized before populate
    const ProductModel = Product;
    const UserModel = User;
    const KeyModel = LicenseKey;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '25', 10)));
    const status = searchParams.get('status') || 'all';
    const productId = searchParams.get('productId') || 'all';
    const search = (searchParams.get('search') || '').trim();

    // Build filter query
    const query: any = {};

    if (status === 'available') {
      query.isSold = false;
    } else if (status === 'sold') {
      query.isSold = true;
    }

    if (productId && productId !== 'all') {
      query.productId = productId;
    }

    if (search) {
      const [matchingProducts, matchingUsers] = await Promise.all([
        ProductModel.find({ name: { $regex: search, $options: 'i' } }).select('_id'),
        UserModel.find({ username: { $regex: search, $options: 'i' } }).select('_id'),
      ]);
      const prodIds = matchingProducts.map((p) => p._id);
      const userIds = matchingUsers.map((u) => u._id);

      query.$or = [
        { key: { $regex: search, $options: 'i' } },
        { duration: { $regex: search, $options: 'i' } },
        { productId: { $in: prodIds } },
        { resellerId: { $in: userIds } },
      ];
    }

    const skip = (page - 1) * limit;

    // Parallel queries for fast performance
    const [totalKeys, availableCount, soldCount, filteredTotal, keys] = await Promise.all([
      KeyModel.countDocuments({}),
      KeyModel.countDocuments({ isSold: false }),
      KeyModel.countDocuments({ isSold: true }),
      KeyModel.countDocuments(query),
      KeyModel.find(query)
        .populate('productId', 'name')
        .populate('resellerId', 'username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const totalPages = Math.ceil(filteredTotal / limit) || 1;

    return NextResponse.json({
      success: true,
      keys,
      pagination: {
        page,
        limit,
        totalKeys,
        availableCount,
        soldCount,
        filteredTotal,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error('Fetch keys error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const { productId, duration, keys } = await req.json();

    if (!productId || !duration || !keys || !Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 1. Verify product and pricing duration option
    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const priceOption = product.prices.find((p) => p.duration === duration);
    if (!priceOption) {
      return NextResponse.json({ error: `Selected duration '${duration}' does not exist on product` }, { status: 400 });
    }

    // Clean key inputs
    const cleanKeys = Array.from(new Set(keys.map((k: string) => k.trim()).filter(Boolean)));

    // 2. Query database to find duplicate keys
    const existing = await LicenseKey.find({ key: { $in: cleanKeys } }).select('key');
    const existingSet = new Set(existing.map((k) => k.key));

    const finalKeysToInsert = cleanKeys
      .filter((k) => !existingSet.has(k))
      .map((k) => ({
        key: k,
        productId,
        duration,
        isSold: false,
      }));

    if (finalKeysToInsert.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'All keys provided are duplicates of existing keys in the system.',
      }, { status: 400 });
    }

    const inserted = await LicenseKey.insertMany(finalKeysToInsert);

    return NextResponse.json({
      success: true,
      insertedCount: inserted.length,
      skippedCount: cleanKeys.length - inserted.length,
    });
  } catch (error: any) {
    console.error('Bulk stock keys error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Key ID is required' }, { status: 400 });
    }

    await dbConnect();

    // Find key and verify it is not sold yet
    const keyItem = await LicenseKey.findById(id);
    if (!keyItem) {
      return NextResponse.json({ error: 'License key not found' }, { status: 404 });
    }

    if (keyItem.isSold) {
      return NextResponse.json({ error: 'Cannot delete a license key that has already been sold to a reseller.' }, { status: 400 });
    }

    await LicenseKey.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'License key deleted from stock successfully' });
  } catch (error: any) {
    console.error('Delete key error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
