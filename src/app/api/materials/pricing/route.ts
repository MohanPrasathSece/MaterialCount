import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { revalidatePath } from 'next/cache';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const updates: { id: string; gstPercent?: number; price?: number; quantity?: number }[] = [];
    const temp: Record<string, any> = {};

    for (const [key, value] of formData.entries()) {
      const match = key.match(/^pricing\[(.+)\]\[(gstPercent|price|quantity)\]$/);
      if (match) {
        const [, id, field] = match;
        if (!temp[id]) temp[id] = {};
        temp[id][field] = value;
      }
    }

    for (const id of Object.keys(temp)) {
      const gstPercent = temp[id].gstPercent !== undefined ? (Number(temp[id].gstPercent) || 0) : undefined;
      const price = temp[id].price !== undefined ? (Number(temp[id].price) || 0) : undefined;
      const quantity = temp[id].quantity !== undefined ? (Number(temp[id].quantity) || 0) : undefined;
      updates.push({ id, gstPercent, price, quantity });
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, message: "No pricing changes provided." });
    }

    const db = await getDatabase();
    const bulkOps = updates.map(u => {
      const $set: Record<string, any> = {};
      if (u.gstPercent !== undefined) $set.gstPercent = u.gstPercent;
      if (u.quantity !== undefined) $set.quantity = Math.max(0, Math.floor(u.quantity));
      const $unset: Record<string, any> = {};
      
      // Store unified price and clear legacy fields
      if (u.price !== undefined) {
        $set.price = u.price;
      }
      $unset.pricePerPiece = "";
      $unset.pricePerMeter = "";
      
      const update: Record<string, any> = {};
      if (Object.keys($set).length) update.$set = $set;
      if (Object.keys($unset).length) update.$unset = $unset;
      
      return {
        updateOne: {
          filter: { _id: new ObjectId(u.id) },
          update,
        }
      };
    });
    
    await db.collection("materials").bulkWrite(bulkOps);
    
    // Revalidate paths
    revalidatePath("/stock");
    revalidatePath("/stock/admin");
    revalidatePath("/client-costing");
    
    return NextResponse.json({ success: true, message: "Pricing updated successfully." });
  } catch (error) {
    console.error("Error updating materials pricing:", error);
    return NextResponse.json({ success: false, message: "Failed to update pricing." }, { status: 500 });
  }
}
