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

    // Calculate per-material usage: OUT - IN
    const usageMap = new Map<string, { outQty: number; inQty: number }>();

    for (const entry of entries as any[]) {
      const type = String(entry.type || 'out');
      const items: any[] = Array.isArray(entry.materials) ? entry.materials : [];
      
      for (const item of items) {
        const materialId = String(item.materialId || '');
        if (!materialId) continue;
        
        const qty = Number(item.quantity) || 0;
        const current = usageMap.get(materialId) || { outQty: 0, inQty: 0 };
        
        if (type === 'out') {
          current.outQty += qty;
        } else if (type === 'in') {
          current.inQty += qty;
        }
        
        usageMap.set(materialId, current);
      }
    }

    // Convert to array format
    const usage = Array.from(usageMap.entries()).map(([materialId, data]) => ({
      materialId,
      outQty: data.outQty,
      inQty: data.inQty,
      netQty: data.outQty - data.inQty,
    }));

    return NextResponse.json({ usage });
  } catch (error) {
    console.error('Error fetching material usage:', error);
    return NextResponse.json({ error: 'Failed to fetch material usage' }, { status: 500 });
  }
}
