// This file defines a dynamic route for displaying details of a specific client.
// The [clientId] part in the folder name means that this page will be rendered for URLs like /client-material/some-client-id.

// Import Firestore database instance and functions for data fetching.
import { doc, getDoc, collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { notFound } from "next/navigation";
// Import TypeScript types for our data structures.
import type { Client, Material, ClientMaterialEntry } from "@/lib/types";
import { ClientSheet } from "@/components/clients/ClientSheet";
import { Separator } from "@/components/ui/separator";
import { ClientMaterialHistory } from "@/components/clients/ClientMaterialHistory";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

// Asynchronous function to fetch a single client's data from Firestore.
async function getClientData(clientId: string) {
    const clientRef = doc(db, "clients", clientId);
    const clientSnap = await getDoc(clientRef);
    if (!clientSnap.exists()) {
        return null;
    }
    return { id: clientSnap.id, ...clientSnap.data() } as Client;
}

// Asynchronous function to fetch all materials from the 'materials' collection.
async function getMaterials(): Promise<Material[]> {
    const materialsCol = collection(db, 'materials');
    const q = query(materialsCol, orderBy("name"));
    const materialsSnap = await getDocs(q);
    // Ensure data is serializable by explicitly creating plain objects
    return materialsSnap.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            name: data.name,
            description: data.description || '',
            quantity: data.quantity,
            category: data.category || 'Other',
        } as Material;
    });
}

async function getClientMaterialHistory(clientId: string): Promise<ClientMaterialEntry[]> {
    const historyCol = collection(db, "clients", clientId, "materialEntries");
    const q = query(historyCol, orderBy("date", "desc"));
    const historySnap = await getDocs(q);
    
    // Convert Firestore Timestamps to ISO strings for serialization
    return historySnap.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            date: data.date.toDate().toISOString(),
        }
    }) as unknown as ClientMaterialEntry[];
}


// This is the main React component for the client detail page.
// It's an async component, allowing us to use 'await' for data fetching directly within it.
export default async function ClientDetailPage({ params }: { params: { clientId: string } }) {
    const { clientId } = await params;
    const client = await getClientData(clientId);
    
    if (!client) {
        notFound();
    }
    
    const [materials, clientHistory] = await Promise.all([
        getMaterials(),
        getClientMaterialHistory(clientId)
    ]);

    // Render the JSX for the page.
    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex items-center gap-4">
                <Button asChild variant="outline" size="icon" className="hover:bg-muted">
                    <Link href="/client-material">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="sr-only">Go Back</span>
                    </Link>
                </Button>
                <h1 className="text-lg md:text-xl font-bold font-headline truncate">
                    Client: {client.name}
                </h1>
                <div className="ml-auto">
                    <Button asChild variant="outline">
                        <Link href={`/client-costing/${clientId}`}>
                            View Costing
                        </Link>
                    </Button>
                </div>
            </div>
            <ClientSheet client={client} materials={materials} clientHistory={clientHistory} />
            <Separator />
            <ClientMaterialHistory client={client} clientHistory={clientHistory} />
        </div>
    );
}

// This export forces the page to be dynamically rendered for every request.
// This ensures that the data is always fresh from the database.
export const dynamic = 'force-dynamic';
