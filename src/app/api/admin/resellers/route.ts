import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import { getSessionUser, hashPassword } from '@/lib/auth';

function computeExpiresAt(planOption: string, customExpiresAt?: string | null, baseDate?: Date | null): Date | null {
  if (!planOption || planOption === 'lifetime') return null;
  
  if (planOption === 'custom' && customExpiresAt) {
    const d = new Date(customExpiresAt);
    return isNaN(d.getTime()) ? null : d;
  }

  const start = (baseDate && new Date(baseDate) > new Date()) ? new Date(baseDate) : new Date();
  const result = new Date(start);

  if (planOption === '1_month') {
    result.setMonth(result.getMonth() + 1);
    return result;
  }
  if (planOption === '3_months') {
    result.setMonth(result.getMonth() + 3);
    return result;
  }
  if (planOption === '6_months') {
    result.setMonth(result.getMonth() + 6);
    return result;
  }
  if (planOption === '1_year') {
    result.setFullYear(result.getFullYear() + 1);
    return result;
  }

  return null;
}

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const LicenseKeyModel = (await import('@/models/LicenseKey')).default;
    const ProductModel = (await import('@/models/Product')).default;

    // Find all users (admins and resellers) with populated allowedProducts
    const users = await User.find({})
      .select('-passwordHash')
      .populate('allowedProducts', 'name image')
      .sort({ createdAt: -1 });

    const userIds = users.map(u => u._id);

    // Fetch all sold keys for sales breakdown
    const soldKeys = await LicenseKeyModel.find({
      resellerId: { $in: userIds },
      isSold: true,
    }).populate('productId', 'name image').sort({ soldAt: -1, updatedAt: -1 });

    const salesByUser: Record<string, { totalPurchases: number; totalSpent: number; purchases: any[] }> = {};

    for (const u of users) {
      salesByUser[u._id.toString()] = { totalPurchases: 0, totalSpent: 0, purchases: [] };
    }

    for (const key of soldKeys) {
      if (key.resellerId) {
        const uId = key.resellerId.toString();
        if (!salesByUser[uId]) {
          salesByUser[uId] = { totalPurchases: 0, totalSpent: 0, purchases: [] };
        }
        salesByUser[uId].totalPurchases += 1;
        salesByUser[uId].totalSpent += (key.price || 0);
        salesByUser[uId].purchases.push({
          _id: key._id,
          key: key.key,
          productName: (key.productId as any)?.name || 'Deleted Product',
          duration: key.duration,
          price: key.price || 0,
          soldAt: key.soldAt || key.updatedAt || key.createdAt,
        });
      }
    }

    const usersWithSales = users.map((u) => {
      const uObj = u.toObject();
      const sales = salesByUser[u._id.toString()] || { totalPurchases: 0, totalSpent: 0, purchases: [] };
      const isExpired = u.role === 'reseller' && u.expiresAt ? new Date() > new Date(u.expiresAt) : false;

      return {
        ...uObj,
        isBanned: Boolean(u.isBanned),
        isExpired,
        resellerType: u.resellerType || 'budget',
        allowedProducts: u.allowedProducts || [],
        expiresAt: u.expiresAt || null,
        totalPurchases: sales.totalPurchases,
        totalSpent: sales.totalSpent,
        purchases: sales.purchases,
      };
    });

    return NextResponse.json({ success: true, resellers: usersWithSales, currentAdminId: session.userId });
  } catch (error: any) {
    console.error('Fetch users error:', error);
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

    // 1. Create User (Admin or Reseller)
    if (action === 'create') {
      const {
        username,
        password,
        role = 'reseller',
        resellerType = 'budget',
        allowedProducts = [],
        initialBalance = 0,
        planOption = 'lifetime',
        customExpiresAt = null,
      } = body;

      if (!username || !password) {
        return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
      }

      if (role !== 'admin' && role !== 'reseller') {
        return NextResponse.json({ error: 'Invalid user role selected' }, { status: 400 });
      }

      const existing = await User.findOne({ username: username.toLowerCase().trim() });
      if (existing) {
        return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
      }

      const passwordHash = await hashPassword(password);
      const balanceValue = role === 'reseller' ? (parseFloat(initialBalance) || 0) : 0;

      if (balanceValue < 0) {
        return NextResponse.json({ error: 'Initial balance cannot be negative' }, { status: 400 });
      }

      const calculatedExpiresAt = role === 'reseller' ? computeExpiresAt(planOption, customExpiresAt) : null;

      const newUser = await User.create({
        username: username.toLowerCase().trim(),
        passwordHash,
        role,
        balance: balanceValue,
        isBanned: false,
        resellerType: role === 'reseller' ? (resellerType === 'unlimited' ? 'unlimited' : 'budget') : 'budget',
        allowedProducts: Array.isArray(allowedProducts) ? allowedProducts : [],
        expiresAt: calculatedExpiresAt,
      });

      if (role === 'reseller' && balanceValue > 0 && resellerType !== 'unlimited') {
        await Transaction.create({
          userId: newUser._id,
          type: 'balance_add',
          amount: balanceValue,
          description: 'Initial balance set by admin',
        });
      }

      return NextResponse.json({
        success: true,
        user: {
          id: newUser._id.toString(),
          username: newUser.username,
          role: newUser.role,
          balance: newUser.balance,
          isBanned: newUser.isBanned,
          resellerType: newUser.resellerType,
          allowedProducts: newUser.allowedProducts,
          expiresAt: newUser.expiresAt,
          createdAt: newUser.createdAt,
        },
      });
    }

    // 2. Update Reseller Settings (Reseller Type, Allowed Products, & Plan Expiration)
    if (action === 'update_reseller') {
      const { userId, resellerType, allowedProducts, planOption, customExpiresAt } = body;
      if (!userId) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      }

      const existingUser = await User.findById(userId);
      if (!existingUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      let nextExpiresAt = existingUser.expiresAt;
      if (planOption !== undefined) {
        nextExpiresAt = computeExpiresAt(planOption, customExpiresAt, existingUser.expiresAt);
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            resellerType: resellerType === 'unlimited' ? 'unlimited' : 'budget',
            allowedProducts: Array.isArray(allowedProducts) ? allowedProducts : [],
            expiresAt: nextExpiresAt,
          },
        },
        { new: true }
      ).populate('allowedProducts', 'name image');

      return NextResponse.json({
        success: true,
        user: updatedUser,
      });
    }

    // 3. Extend Reseller Account Plan (+1 Month, +3 Months, +6 Months, +1 Year)
    if (action === 'extend_plan') {
      const { userId, planOption = '1_month', customExpiresAt } = body;
      if (!userId) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      }

      const targetUser = await User.findById(userId);
      if (!targetUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const newExpiresAt = computeExpiresAt(planOption, customExpiresAt, targetUser.expiresAt);

      targetUser.expiresAt = newExpiresAt;
      await targetUser.save();

      return NextResponse.json({
        success: true,
        expiresAt: targetUser.expiresAt,
        message: targetUser.expiresAt
          ? `Reseller plan extended until ${new Date(targetUser.expiresAt).toLocaleDateString()}.`
          : 'Reseller plan set to Lifetime (No expiration).',
      });
    }

    // 4. Toggle Ban Status (Ban / Unban)
    if (action === 'toggle_ban') {
      const { userId } = body;
      if (!userId) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      }

      if (userId === session.userId) {
        return NextResponse.json({ error: 'You cannot ban your own admin account.' }, { status: 400 });
      }

      const targetUser = await User.findById(userId);
      if (!targetUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const nextBannedState = !Boolean(targetUser.isBanned);

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: { isBanned: nextBannedState } },
        { new: true }
      );

      return NextResponse.json({
        success: true,
        isBanned: Boolean(updatedUser?.isBanned),
        message: updatedUser?.isBanned ? `User ${updatedUser.username} has been banned.` : `User ${updatedUser?.username} has been unbanned.`,
      });
    }

    // 5. Adjust Balance
    if (action === 'adjust_balance') {
      const { resellerId, type, amount, description } = body;

      if (!resellerId || !type || amount === undefined || amount <= 0) {
        return NextResponse.json({ error: 'Invalid balance adjustment parameters' }, { status: 400 });
      }

      if (type !== 'balance_add' && type !== 'balance_deduct') {
        return NextResponse.json({ error: 'Invalid adjustment type' }, { status: 400 });
      }

      const reseller = await User.findById(resellerId);
      if (!reseller) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
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
    console.error('Admin user POST error:', error);
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
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID parameter is required' }, { status: 400 });
    }

    if (userId === session.userId) {
      return NextResponse.json({ error: 'You cannot delete your own admin account.' }, { status: 400 });
    }

    await dbConnect();
    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `User ${deletedUser.username} deleted successfully.`,
    });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
