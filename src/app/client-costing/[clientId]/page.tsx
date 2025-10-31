import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { notFound } from "next/navigation";
import type { Client, Material, ClientMaterialEntry } from "@/lib/types";
import { ClientCosting } from "@/components/clients/ClientCosting";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

async function getClient(clientId: string) {
  try {
    const db = await getDatabase();
    const client = await db.collection("clients").findOne({ _id: new ObjectId(clientId) });
    if (!client) return null;
    const { _id, ...clientData } = client;
    return { id: _id.toString(), ...clientData } as Client;
  } catch (error) {
    return null;
  }
}

async function getMaterials(): Promise<Material[]> {
  const db = await getDatabase();
  const materials = await db.collection("materials").find({}).sort({ name: 1 }).toArray();
  return materials.map(m => {
    const { _id, ...data } = m;
    return { id: _id.toString(), ...data } as Material;
  });
}

async function getClientHistory(clientId: string): Promise<ClientMaterialEntry[]> {
  // In/Out quantity features have been removed
  // Return empty array for now - costing will show no usage
  return [];
}

export default async function ClientCostingPage({ params }: { params: { clientId: string } }) {
  const { clientId } = params;
  const client = await getClient(clientId);
  if (!client) notFound();
  const [materials, clientHistory] = await Promise.all([
    getMaterials(),
    getClientHistory(clientId)
  ]);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon" className="hover:bg-muted">
          <Link href={`/client-material/${clientId}`}>
            <ArrowLeft className="w-4 h-4" />
            <span className="sr-only">Go Back</span>
          </Link>
        </Button>
        <h1 className="text-lg md:text-xl font-bold font-headline truncate">
          Costing: {client.name}
        </h1>
      </div>
      <ClientCosting client={client} materials={materials} clientHistory={clientHistory} />
    </div>
  );
}

export const dynamic = 'force-dynamic';
