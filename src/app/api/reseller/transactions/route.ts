import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Transaction from '@/models/Transaction';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== 'reseller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const transactions = await Transaction.find({ userId: session.userId }).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, transactions });
  } catch (error: any) {
    console.error('Fetch reseller transactions error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
