import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(
  _req: Request,
  { params }: { params: { clientId: string } }
) {
  try {
    const { clientId } = params;
    const db = await getDatabase();

    const existing = await db.collection('client_costing').findOne({ clientId });
    if (existing) {
      const { _id, ...rest } = existing;
      return NextResponse.json({ id: _id.toString(), ...rest });
    }

    // If no saved costing, compute defaults from client material entries (Out - In)
    const entries = await db
      .collection('client_material_entries')
      .find({ clientId })
      .toArray();

    const usageMap = new Map<string, { name: string; qty: number }>();
    for (const entry of entries as any[]) {
      const type = String(entry.type || 'out');
      const sign = type === 'in' ? -1 : 1;
      const items: any[] = Array.isArray(entry.materials) ? entry.materials : [];
      for (const it of items) {
        const materialId = String(it.materialId || '');
        if (!materialId) continue;
        const name = String(it.materialName || '');
        const qty = Number(it.quantity) || 0;
        const prev = usageMap.get(materialId) || { name, qty: 0 };
        const nextQty = prev.qty + sign * qty;
        usageMap.set(materialId, { name: prev.name || name, qty: nextQty });
      }
    }

    // Join with materials for rate and gstPercent
    const materialIds = Array.from(usageMap.keys());
    let materialsById: Record<string, any> = {};
    let materialsByName: Record<string, any> = {};
    if (materialIds.length > 0) {
      const validObjIds = materialIds.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id));
      if (validObjIds.length > 0) {
        const mats = await db
          .collection('materials')
          .find({ _id: { $in: validObjIds } })
          .toArray();
        for (const m of mats) {
          materialsById[m._id.toString()] = m;
          if (m.name) materialsByName[String(m.name).toLowerCase()] = m;
        }
      }
    }

    const items = materialIds
      .map(id => {
        const usage = usageMap.get(id)!;
        const qty = Math.max(0, Number(usage.qty) || 0);
        let mat = materialsById[id] || {};
        if (!mat || Object.keys(mat).length === 0) {
          // Fallback by name if available
          const key = String(usage.name || '').toLowerCase();
          if (key && materialsByName[key]) mat = materialsByName[key];
        }
        let unitPrice = 0;
        const pp = Number(mat?.pricePerPiece ?? 0) || 0;
        const pm = Number(mat?.pricePerMeter ?? 0) || 0;
        unitPrice = pp > 0 ? pp : pm > 0 ? pm : 0;
        const gstPercent = Number(mat.gstPercent) || 0;
        const base = qty * unitPrice;
        const gst = base * (gstPercent / 100);
        const total = base + gst;
        return { materialId: id, name: usage.name || mat.name || '', qty, rate: unitPrice, gstPercent, base, gst, total };
      })
      .filter(r => r.qty > 0)
      .sort((a, b) => a.name.localeCompare(b.name));

    const beforeTax = items.reduce((s, r) => s + r.base, 0);
    const gst = items.reduce((s, r) => s + r.gst, 0);
    const grand = beforeTax + gst;

    return NextResponse.json({
      clientId,
      items,
      beforeTax,
      gst,
      grand,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching client costing:', error);
    return NextResponse.json({ error: 'Failed to fetch client costing' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { clientId: string } }
) {
  try {
    const { clientId } = params;
    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : [];

    // Recompute amounts server-side
    const computedItems = items.map((it: any) => {
      const qty = Number(it.qty) || 0;
      const rate = Number(it.rate) || 0;
      const gstPercent = Number(it.gstPercent) || 0;
      const base = qty * rate;
      const gst = base * (gstPercent / 100);
      const total = base + gst;
      return {
        materialId: String(it.materialId || ''),
        name: String(it.name || ''),
        qty,
        rate,
        gstPercent,
        base,
        gst,
        total,
      };
    });

    const beforeTax = computedItems.reduce((s: number, r: any) => s + r.base, 0);
    const gst = computedItems.reduce((s: number, r: any) => s + r.gst, 0);
    const grand = beforeTax + gst;

    const doc = {
      clientId,
      items: computedItems,
      beforeTax,
      gst,
      grand,
      updatedAt: new Date(),
    };

    const db = await getDatabase();
    const res = await db.collection('client_costing').findOneAndUpdate(
      { clientId },
      { $set: doc },
      { upsert: true, returnDocument: 'after' as any }
    );

    const saved = res.value || (await db.collection('client_costing').findOne({ clientId }));
    if (!saved) throw new Error('Failed to save');
    const { _id, ...rest } = saved as any;
    return NextResponse.json({ id: _id.toString(), ...rest });
  } catch (error) {
    console.error('Error saving client costing:', error);
    return NextResponse.json({ error: 'Failed to save client costing' }, { status: 500 });
  }
}
