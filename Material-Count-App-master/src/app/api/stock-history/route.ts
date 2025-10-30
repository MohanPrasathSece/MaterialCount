import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET() {
  try {
    const db = await getDatabase();
    const history = await db
      .collection('stockHistory')
      .find({})
      .sort({ timestamp: -1 })
      .toArray();

    // Convert MongoDB _id to id and ensure timestamp is serializable
    const formattedHistory = history.map(item => ({
      id: item._id.toString(),
      timestamp: item.timestamp,
      items: item.items,
      totalItems: item.totalItems,
    }));

    return NextResponse.json(formattedHistory);
  } catch (error) {
    console.error('Error fetching stock history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock history' },
      { status: 500 }
    );
  }
}
