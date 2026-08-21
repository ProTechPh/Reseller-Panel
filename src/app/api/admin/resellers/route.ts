import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import { getSessionUser, hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    // Import LicenseKey model dynamically if needed or rely on registered model
    const LicenseKey = (await import('@/models/LicenseKey')).default;

    // Find all users with role 'reseller'
    const resellers = await User.find({ role: 'reseller' }).select('-passwordHash').sort({ createdAt: -1 });

    const resellerIds = resellers.map(r => r._id);

    // Fetch all sold keys for these resellers
    const soldKeys = await LicenseKey.find({
      resellerId: { $in: resellerIds },
      isSold: true,
    }).populate('productId', 'name image').sort({ soldAt: -1, updatedAt: -1 });

    const salesByReseller: Record<string, { totalPurchases: number; totalSpent: number; purchases: any[] }> = {};

    for (const r of resellers) {
      salesByReseller[r._id.toString()] = { totalPurchases: 0, totalSpent: 0, purchases: [] };
    }

    for (const key of soldKeys) {
      if (key.resellerId) {
        const rId = key.resellerId.toString();
        if (!salesByReseller[rId]) {
          salesByReseller[rId] = { totalPurchases: 0, totalSpent: 0, purchases: [] };
        }
        salesByReseller[rId].totalPurchases += 1;
        salesByReseller[rId].totalSpent += (key.price || 0);
        salesByReseller[rId].purchases.push({
          _id: key._id,
          key: key.key,
          productName: (key.productId as any)?.name || 'Deleted Product',
          duration: key.duration,
          price: key.price || 0,
          soldAt: key.soldAt || key.updatedAt || key.createdAt,
        });
      }
    }

    const resellersWithSales = resellers.map((r) => {
      const rObj = r.toObject();
      const sales = salesByReseller[r._id.toString()] || { totalPurchases: 0, totalSpent: 0, purchases: [] };
      return {
        ...rObj,
        totalPurchases: sales.totalPurchases,
        totalSpent: sales.totalSpent,
        purchases: sales.purchases,
      };
    });

    return NextResponse.json({ success: true, resellers: resellersWithSales });
  } catch (error: any) {
    console.error('Fetch resellers error:', error);
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
    const body = await req.json();
    const { action } = body;

    if (action === 'create') {
      const { username, password, initialBalance } = body;

      if (!username || !password) {
        return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
      }

      const existing = await User.findOne({ username: username.toLowerCase().trim() });
      if (existing) {
        return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
      }

      const passwordHash = await hashPassword(password);
      const balanceValue = parseFloat(initialBalance) || 0;

      if (balanceValue < 0) {
        return NextResponse.json({ error: 'Initial balance cannot be negative' }, { status: 400 });
      }

      const newReseller = await User.create({
        username: username.toLowerCase().trim(),
        passwordHash,
        role: 'reseller',
        balance: balanceValue,
      });

      // If initial balance is positive, log a transaction
      if (balanceValue > 0) {
        await Transaction.create({
          userId: newReseller._id,
          type: 'balance_add',
          amount: balanceValue,
          description: 'Initial balance set by admin',
        });
      }

      return NextResponse.json({
        success: true,
        reseller: {
          id: newReseller._id.toString(),
          username: newReseller.username,
          role: newReseller.role,
          balance: newReseller.balance,
          createdAt: newReseller.createdAt,
        },
      });
    }

    if (action === 'adjust_balance') {
      const { resellerId, type, amount, description } = body;

      if (!resellerId || !type || amount === undefined || amount <= 0) {
        return NextResponse.json({ error: 'Invalid balance adjustment parameters' }, { status: 400 });
      }

      if (type !== 'balance_add' && type !== 'balance_deduct') {
        return NextResponse.json({ error: 'Invalid adjustment type' }, { status: 400 });
      }

      const reseller = await User.findById(resellerId);
      if (!reseller || reseller.role !== 'reseller') {
        return NextResponse.json({ error: 'Reseller not found' }, { status: 404 });
      }

      const adjustmentAmount = parseFloat(amount);

      if (type === 'balance_add') {
        reseller.balance += adjustmentAmount;
      } else {
        if (reseller.balance < adjustmentAmount) {
          return NextResponse.json({ error: 'Reseller has insufficient balance for deduction' }, { status: 400 });
        }
        reseller.balance -= adjustmentAmount;
      }

      await reseller.save();

      await Transaction.create({
        userId: reseller._id,
        type,
        amount: adjustmentAmount,
        description: description || `Balance adjusted by admin (${type === 'balance_add' ? 'credited' : 'debited'})`,
      });

      return NextResponse.json({
        success: true,
        balance: reseller.balance,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Adjust resellers error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
