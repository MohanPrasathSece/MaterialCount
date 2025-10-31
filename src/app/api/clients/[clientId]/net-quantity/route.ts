import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const db = await getDatabase();

    // Fetch all client material entries
    const entries = await db
      .collection('client_material_entries')
      .find({ clientId })
      .toArray();

    // Calculate net quantity: OUT - IN
    let totalOut = 0;
    let totalIn = 0;

    for (const entry of entries as any[]) {
      const type = String(entry.type || 'out');
      const items: any[] = Array.isArray(entry.materials) ? entry.materials : [];
      
      for (const item of items) {
        const qty = Number(item.quantity) || 0;
        if (type === 'out') {
          totalOut += qty;
        } else if (type === 'in') {
          totalIn += qty;
        }
      }
    }

    const netQuantity = totalOut - totalIn;

    return NextResponse.json({ netQuantity, totalOut, totalIn });
  } catch (error) {
    console.error('Error fetching net quantity:', error);
    return NextResponse.json({ error: 'Failed to fetch net quantity' }, { status: 500 });
  }
}
