import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET() {
  try {
    const db = await getDatabase();
    const clients = await db
      .collection('clients')
      .find({})
      .sort({ name: 1 })
      .toArray();

    // Convert MongoDB _id to id for consistency
    const formattedClients = clients.map(client => ({
      id: client._id.toString(),
      name: client.name,
      consumerNo: client.consumerNo,
      avatarUrl: client.avatarUrl,
      address: client.address,
      plantCapacity: client.plantCapacity,
    }));

    return NextResponse.json(formattedClients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}
