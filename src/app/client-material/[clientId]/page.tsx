// This file defines a dynamic route for displaying details of a specific client.
// The [clientId] part in the folder name means that this page will be rendered for URLs like /client-material/some-client-id.

// Import MongoDB database instance and functions for data fetching.
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { notFound } from "next/navigation";
// Import TypeScript types for our data structures.
import type { Client } from "@/lib/types";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ClientMaterialStock } from "@/components/clients/ClientMaterialStock";
import { ArrowLeft, Calculator } from "lucide-react";

// Asynchronous function to fetch a single client's data from MongoDB.
async function getClientData(clientId: string) {
    try {
        const db = await getDatabase();
        const client = await db.collection("clients").findOne({ _id: new ObjectId(clientId) });
        if (!client) {
            return null;
        }
        const { _id, ...clientData } = client;
        return { id: _id.toString(), ...clientData } as Client;
    } catch (error) {
        return null;
    }
}



// This is the main React component for the client detail page.
// It's an async component, allowing us to use 'await' for data fetching directly within it.
export default async function ClientDetailPage({ params }: { params: Promise<{ clientId: string }> }) {
    const { clientId } = await params;
    const client = await getClientData(clientId);
    
    if (!client) {
        notFound();
    }

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
            </div>
            
            <Card>
                <CardHeader>
                    <div className="text-center mb-4">
                        <h1 className="text-2xl font-bold font-headline mb-2">FUTURE ENERGY</h1>
                        <h2 className="text-xl font-semibold">{client.name}</h2>
                        <p className="text-sm text-muted-foreground px-4">{client.address}</p>
                        <p className="text-sm text-muted-foreground">
                            Consumer No: {client.consumerNo} | Plant Capacity: {client.plantCapacity}
                        </p>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col gap-4">
                        <Button asChild size="lg" className="w-full">
                            <Link href={`/client-costing/${clientId}`}>
                                <Calculator className="w-4 h-4 mr-2" />
                                View Client Costing
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Separator />

            {/* Client-specific view of materials with In/Out controls */}
            <ClientMaterialStock clientId={clientId} />
        </div>
    );
}

// This export forces the page to be dynamically rendered for every request.
// This ensures that the data is always fresh from the database.
export const dynamic = 'force-dynamic';
