import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET() {
  try {
    const db = await getDatabase();
    const materials = await db
      .collection('materials')
      .find({})
      .sort({ category: 1, name: 1 })
      .toArray();

    // Convert MongoDB _id to id for consistency
    const formattedMaterials = materials.map(material => ({
      id: material._id.toString(),
      name: material.name,
      description: material.description,
      quantity: material.quantity,
      category: material.category,
      rate: material.rate,
      gstPercent: material.gstPercent,
      price: material.price ?? material.pricePerPiece ?? material.pricePerMeter,
      investedBase: material.investedBase ?? 0,
      investedGst: material.investedGst ?? 0,
      investedTotal: material.investedTotal ?? 0,
    }));

    return NextResponse.json(formattedMaterials);
  } catch (error) {
    console.error('Error fetching materials:', error);
    return NextResponse.json(
      { error: 'Failed to fetch materials' },
      { status: 500 }
    );
  }
}
