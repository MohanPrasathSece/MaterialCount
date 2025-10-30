"use client";

import type { Client, ClientMaterialEntry } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { ArrowDownLeft, ArrowUpRight, History, List } from 'lucide-react';
import { Badge } from '../ui/badge';
import { format } from 'date-fns';

type ClientMaterialHistoryProps = {
    client: Client;
    clientHistory: ClientMaterialEntry[];
};

function formatTimestamp(isoString: string): string {
  if (!isoString) return "No date";
  // The timestamp is now an ISO string, so we create a new Date object from it
  const date = new Date(isoString);
  return format(date, "MMMM d, yyyy 'at' h:mm a");
}

export function ClientMaterialHistory({ client, clientHistory }: ClientMaterialHistoryProps) {
    
    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div className='flex items-center gap-2'>
                        <History className="w-6 h-6" />
                        <CardTitle className="font-headline">Transaction History</CardTitle>
                    </div>
                </div>
                <CardDescription>
                    A detailed log of all materials unloaded to or returned from this client.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {clientHistory.length > 0 ? (
                    clientHistory.map((entry) => (
                        <Card key={entry.id} className="overflow-hidden">
                            <CardHeader className="bg-muted/50 p-4 flex flex-col sm:flex-row justify-between sm:items-start gap-2">
                               <div className="flex-1">
                                 <CardTitle className="text-base font-medium">
                                    {entry.entryTitle}
                                 </CardTitle>
                                <CardDescription className="text-xs">
                                    {formatTimestamp(entry.date as string)}
                                </CardDescription>
                               </div>
                                <Badge variant={entry.type === 'out' ? 'destructive' : 'default'} className="capitalize shrink-0">
                                    {entry.type === 'out' ? 
                                        <ArrowUpRight className="w-3 h-3 mr-1" /> : 
                                        <ArrowDownLeft className="w-3 h-3 mr-1" />
                                    }
                                    {entry.type}
                                </Badge>
                            </CardHeader>
                            <CardContent className="p-4">
                                <ul className="space-y-3">
                                    {entry.materials.map((item) => (
                                        <li key={item.materialId} className="flex flex-col sm:flex-row justify-between sm:items-center p-3 rounded-md border bg-background">
                                            <div className="flex-1 mb-2 sm:mb-0">
                                                <span className="font-semibold">{item.materialName}</span>
                                                {item.serialNumbers && (
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        <span className="font-medium">Serial Nos: </span>{item.serialNumbers}
                                                    </p>
                                                )}
                                            </div>
                                            <Badge variant="secondary" className="self-start sm:self-center">Qty: {item.quantity}</Badge>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <Alert>
                        <List className="h-4 w-4" />
                        <AlertTitle>No Material History</AlertTitle>
                        <AlertDescription>
                            This client has no material transaction history yet. Use the editable sheet above to add transactions.
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
