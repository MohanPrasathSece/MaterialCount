import { doc, getDoc, collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { notFound } from "next/navigation";
import type { Client, Material, ClientMaterialEntry } from "@/lib/types";
import { ClientCosting } from "@/components/clients/ClientCosting";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

async function getClient(clientId: string) {
  const ref = doc(db, "clients", clientId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Client;
}

async function getMaterials(): Promise<Material[]> {
  const col = collection(db, "materials");
  const q = query(col, orderBy("name"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Material[];
}

async function getClientHistory(clientId: string): Promise<ClientMaterialEntry[]> {
  const col = collection(db, "clients", clientId, "materialEntries");
  const q = query(col, orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data: any = d.data();
    return {
      id: d.id,
      ...data,
      date: data.date?.toDate ? data.date.toDate().toISOString() : data.date,
    } as ClientMaterialEntry;
  });
}

export default async function ClientCostingPage({ params }: { params: { clientId: string } }) {
  const { clientId } = await params;
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
