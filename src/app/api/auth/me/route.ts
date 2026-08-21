import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { getSessionUser, clearSessionCookie } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findById(session.userId);
    if (!user || user.isBanned) {
      await clearSessionCookie();
      return NextResponse.json({ error: 'User not found or account banned' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        username: user.username,
        role: user.role,
        balance: user.balance,
        resellerType: user.resellerType || 'budget',
        allowedProducts: user.allowedProducts || [],
      },
    });
  } catch (error) {
    console.error('Session user fetch error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred fetching session' },
      { status: 500 }
    );
  }
}
