"use client";

import { useState } from "react";
// Import the custom hook 'useClients' to fetch client data in real-time.
import { useClients } from "@/hooks/use-clients";
// Import the component for displaying a single client card.
import { ClientCard } from "./ClientCard";
// Import a Skeleton component for loading states.
import { Skeleton } from "@/components/ui/skeleton";
// Import the modal component for adding a new client.
import { AddClientModal } from "./AddClientModal";
import { Input } from "../ui/input";
import { Search } from "lucide-react";

// This component displays a grid of client cards.
export function ClientGrid() {
  // The 'useClients' hook returns the list of clients and a loading state.
  // The component will automatically re-render when the client data changes in Firestore.
  const { clients, loading } = useClients();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredClients = clients.filter(client => {
    const nameMatch = client.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const consumerNoMatch = client.consumerNo?.toString().toLowerCase().includes(searchTerm.toLowerCase()) || false;
    return nameMatch || consumerNoMatch;
  });

  return (
    <div className="space-y-4">
        {/* A container to align the 'AddClientModal' button to the right. */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search by name or consumer no..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>
            <div className="flex justify-end w-full sm:w-auto">
                <AddClientModal />
            </div>
        </div>
        {/* The grid layout for the cards. It's responsive, changing columns on different screen sizes. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {/* Conditional rendering based on the 'loading' state. */}
        {loading ? (
            // If data is loading, display a series of skeleton cards as placeholders.
            // This provides a better user experience than a blank screen.
            Array.from({ length: 4 }).map((_, i) => (
                <CardSkeleton key={i} />
            ))
        ) : filteredClients.length > 0 ? (
            // If loading is complete and there are clients, map over the 'clients' array
            // and render a 'ClientCard' for each one.
            filteredClients.map((client) => (
                <ClientCard key={client.id} client={client} />
            ))
        ) : (
            // If loading is complete and there are no clients, display a helpful message.
            <p className="col-span-full text-center text-muted-foreground py-8">
                {searchTerm ? "No clients match your search." : "No clients found. Add one to get started!"}
            </p>
        )}
        </div>
    </div>
  );
}


// A helper component to render a skeleton placeholder for a client card.
// This improves user experience by showing a visual structure while data is being fetched.
// The structure of the skeleton closely matches the final rendered card to prevent layout shifts.
function CardSkeleton() {
    return (
        <div className="p-4 border rounded-lg h-[88px] flex items-center">
            <div className="flex flex-row items-center gap-4 w-full">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-3/4" />
                </div>
            </div>
        </div>
    )
}
