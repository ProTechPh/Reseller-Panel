import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Product from '@/models/Product';
import LicenseKey from '@/models/LicenseKey';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    // Fetch products and aggregate unsold stock counts in parallel
    const [products, stockStats] = await Promise.all([
      Product.find({}).sort({ createdAt: -1 }),
      LicenseKey.aggregate([
        { $match: { isSold: false } },
        {
          $group: {
            _id: { productId: '$productId', duration: '$duration' },
            count: { $sum: 1 },
          },
        },
      ]),
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

    return NextResponse.json({ success: true, products, stock: stockMap });
  } catch (error: any) {
    console.error('Fetch products error:', error);
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
    const { name, description, image, platform, prices, isActive, deliveryType, telegramUsername } = await req.json();

    if (!name || !description || !prices || !Array.isArray(prices) || prices.length === 0) {
      return NextResponse.json({ error: 'Missing required product information' }, { status: 400 });
    }

    const newProduct = await Product.create({
      name: name.trim(),
      description: description.trim(),
      image: image ? image.trim() : undefined,
      platform: platform || 'Android',
      prices,
      isActive: isActive !== undefined ? isActive : true,
      deliveryType: deliveryType || 'instant',
      telegramUsername: telegramUsername ? telegramUsername.trim().replace(/^@/, '') : 'Sylvieofficeal',
    });

    return NextResponse.json({ success: true, product: newProduct });
  } catch (error: any) {
    console.error('Create product error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const body = await req.json();
    const id = body.id || body._id || searchParams.get('id');
    const { name, description, image, platform, prices, isActive, deliveryType, telegramUsername } = body;

    if (!id || !name || !description || !prices || !Array.isArray(prices) || prices.length === 0) {
      return NextResponse.json({ error: 'Missing required product information for update' }, { status: 400 });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        description: description.trim(),
        image: image ? image.trim() : undefined,
        platform: platform || 'Android',
        prices,
        isActive,
        deliveryType: deliveryType || 'instant',
        telegramUsername: telegramUsername ? telegramUsername.trim().replace(/^@/, '') : 'Sylvieofficeal',
      },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, product: updatedProduct });
  } catch (error: any) {
    console.error('Update product error:', error);
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
      return NextResponse.json({ error: 'Product ID is required for deletion' }, { status: 400 });
    }

    await dbConnect();
    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Product deleted successfully' });
  } catch (error: any) {
    console.error('Delete product error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
