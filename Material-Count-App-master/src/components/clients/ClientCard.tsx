// This is a Client Component, allowing it to have interactivity and use hooks.
"use client";

// Import Next.js's Link component for client-side navigation.
import Link from "next/link";
// Import UI components from ShadCN.
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// Import the TypeScript type definition for a Client.
import type { Client } from "@/lib/types";

// Define the props that this component will accept.
type ClientCardProps = {
  client: Client; // It expects a single 'client' object.
};

// This component displays a single client's information in a card format.
export function ClientCard({ client }: ClientCardProps) {
  // Generate initials from the client's name to use as a fallback for the avatar.
  // This splits the name by spaces, takes the first character of each part, and joins them.
  const initials = client.name.split(' ').map(n => n[0]).join('');

  // The entire card is wrapped in a Link component.
  // Clicking anywhere on the card will navigate to the client's detail page.
  return (
    <Link href={`/client-material/${client.id}`} passHref>
        {/* 'passHref' is important for accessibility and SEO when wrapping custom components. */}
        <Card className="transition-all duration-300 ease-in-out cursor-pointer hover:shadow-lg hover:border-primary">
            {/* The card has hover effects to provide visual feedback. */}
            <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="w-12 h-12">
                    {/* If the client has an avatar URL, the AvatarImage will be displayed. */}
                    {client.avatarUrl && <AvatarImage src={client.avatarUrl} alt={client.name} />}
                    {/* If there's no avatar URL or it fails to load, the AvatarFallback with initials is shown. */}
                    <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle className="text-lg font-headline">{client.name}</CardTitle>
                </div>
            </CardHeader>
        </Card>
    </Link>
  );
}
