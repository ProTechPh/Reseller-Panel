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

    const currentUser = await User.findById(authSession.userId);
    if (!currentUser || currentUser.isBanned) {
      return NextResponse.json({ error: 'Your account has been banned by the administrator.' }, { status: 403 });
    }

    const { productId, duration } = await req.json();

    if (!productId || !duration) {
      return NextResponse.json({ error: 'Product ID and duration are required' }, { status: 400 });
    }

    // 1. Check Product Locking / Allowed Products restriction
    if (currentUser.allowedProducts && currentUser.allowedProducts.length > 0) {
      const isAllowed = currentUser.allowedProducts.some((id: any) => id.toString() === productId);
      if (!isAllowed) {
        return NextResponse.json(
          { error: 'This product is locked and not available for your reseller account.' },
          { status: 403 }
        );
      }
    }

    // 2. Fetch and validate product (outside transaction, read-only)
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return NextResponse.json({ error: 'Product not found or inactive' }, { status: 404 });
    }

    const priceOption = product.prices.find((p) => p.duration === duration);
    if (!priceOption) {
      return NextResponse.json({ error: 'Invalid duration option selected' }, { status: 400 });
    }

    const price = priceOption.price;
    const isUnlimited = currentUser.resellerType === 'unlimited';

    // 3. Start a MongoDB transaction for atomic claim + balance deduction
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
        price: isUnlimited ? 0 : price,
        soldAt: new Date(),
      },
      { session }
    );

    // Atomically check and deduct reseller balance (if Per Budget reseller tier)
    let updatedUserBalance = currentUser.balance;

    if (!isUnlimited) {
      const updatedUser = await User.findOneAndUpdate(
        {
          _id: authSession.userId,
          role: 'reseller',
          isBanned: { $ne: true },
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
      updatedUserBalance = updatedUser.balance;
    }

    // Create transaction log within the same transaction
    await Transaction.create(
      [
        {
          userId: authSession.userId,
          type: 'purchase',
          amount: isUnlimited ? 0 : price,
          description: isUnlimited
            ? `[Unlimited Tier] Claimed key for ${product.name} (${duration})`
            : `Bought key for ${product.name} (${duration})`,
        },
      ],
      { session }
    );

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    return NextResponse.json({
      success: true,
      licenseKey: keyItem.key,
      newBalance: updatedUserBalance,
      resellerType: currentUser.resellerType || 'budget',
    });
  } catch (error: any) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    console.error('Purchase key error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process purchase' }, { status: 500 });
  }
}
