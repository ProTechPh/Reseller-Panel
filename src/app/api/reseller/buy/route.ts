import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import Product from '@/models/Product';
import LicenseKey from '@/models/LicenseKey';
import Transaction from '@/models/Transaction';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: Request) {
  let session: mongoose.ClientSession | null = null;

  try {
    const authSession = await getSessionUser();
    if (!authSession || authSession.role !== 'reseller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { productId, duration } = await req.json();

    if (!productId || !duration) {
      return NextResponse.json({ error: 'Product ID and duration are required' }, { status: 400 });
    }

    // 1. Fetch and validate product (outside transaction, read-only)
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return NextResponse.json({ error: 'Product not found or inactive' }, { status: 404 });
    }

    const priceOption = product.prices.find((p) => p.duration === duration);
    if (!priceOption) {
      return NextResponse.json({ error: 'Invalid duration option selected' }, { status: 400 });
    }

    const price = priceOption.price;

    // 2. Start a MongoDB transaction for atomic claim + balance deduction
    session = await mongoose.startSession();
    session.startTransaction();

    // Atomically find and claim an unsold key
    const [keyItem] = await LicenseKey.find(
      {
        productId: product._id,
        duration: duration,
        isSold: false,
      },
      null,
      { session, sort: { createdAt: 1 } } // FIFO: oldest key first
    ).limit(1);

    if (!keyItem) {
      await session.abortTransaction();
      return NextResponse.json(
        { error: 'Out of Stock: There are no available license keys for this product and duration.' },
        { status: 400 }
      );
    }

    // Mark key as sold within the transaction
    await LicenseKey.findByIdAndUpdate(
      keyItem._id,
      {
        isSold: true,
        resellerId: authSession.userId,
        price: price,
        soldAt: new Date(),
      },
      { session }
    );

    // Atomically check and deduct reseller balance
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: authSession.userId,
        role: 'reseller',
        balance: { $gte: price },
      },
      {
        $inc: { balance: -price },
      },
      { session, new: true }
    );

    if (!updatedUser) {
      await session.abortTransaction();
      return NextResponse.json(
        { error: 'Insufficient balance to purchase this license key.' },
        { status: 400 }
      );
    }

    // Create transaction log within the same transaction
    await Transaction.create(
      [
        {
          userId: updatedUser._id,
          type: 'purchase',
          amount: price,
          description: `Bought key for ${product.name} (${duration})`,
        },
      ],
      { session }
    );

    // Commit the transaction — all three operations are atomic
    await session.commitTransaction();

    return NextResponse.json({
      success: true,
      licenseKey: {
        id: keyItem._id.toString(),
        key: keyItem.key,
        productName: product.name,
        duration: keyItem.duration,
        price: price,
        createdAt: new Date(),
      },
      newBalance: updatedUser.balance,
    });
  } catch (error: any) {
    if (session && session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error('Purchase key error:', error);
    return NextResponse.json({ error: error.message || 'Purchase failed' }, { status: 500 });
  } finally {
    if (session) {
      session.endSession();
    }
  }
}
