"use client";

import { useState } from "react";
import { useStockHistory } from "@/hooks/use-stock-history";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { List, History, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Input } from "../ui/input";

function formatTimestamp(timestamp: any) {
    if (!timestamp) return "No date";
    let date: Date;
    // Support Date instance, ISO string, number, and fallback objects
    if (timestamp instanceof Date) {
        date = timestamp;
    } else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
    } else if (typeof timestamp === 'number') {
        date = new Date(timestamp);
    } else if (timestamp && typeof timestamp.toDate === 'function') {
        // Backward-compat for Firebase Timestamp
        date = timestamp.toDate();
    } else {
        date = new Date(timestamp);
    }
    if (isNaN(date.getTime())) return "Invalid date";
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    }).format(date);
}

export function StockHistory() {
    const { history, loading } = useStockHistory();
    const [searchTerm, setSearchTerm] = useState("");

    const filteredHistory = history.filter(record => 
        record.items.some(item => item.materialName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <History className="w-6 h-6" />
                    <CardTitle className="font-headline">Stock Fill History</CardTitle>
                </div>
                <CardDescription>A log of all previous stock updates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search by material name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {loading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                ) : filteredHistory.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full">
                        {filteredHistory.map((record) => (
                            <AccordionItem value={record.id} key={record.id}>
                                <AccordionTrigger>
                                    <div className="flex justify-between items-center w-full pr-4">
                                        <div className="flex flex-col text-left">
                                            <span className="font-semibold">{formatTimestamp(record.timestamp)}</span>
                                            <span className="text-sm text-muted-foreground">{record.items.length} material types updated</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-semibold text-primary">+{record.totalItems}</span>
                                            <span className="text-sm text-muted-foreground ml-1">total units</span>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <ul className="space-y-2 pl-4 pt-2 border-l ml-2">
                                        {record.items.map((item) => (
                                            <li key={item.materialId} className="flex justify-between">
                                                <span>{item.materialName}</span>
                                                <span className="font-mono text-green-600">+{item.quantityAdded}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                ) : (
                    <Alert>
                        <List className="h-4 w-4" />
                        <AlertTitle>{searchTerm ? "No Results" : "No History"}</AlertTitle>
                        <AlertDescription>
                            {searchTerm 
                                ? "No history records match your search." 
                                : "There are no stock history records yet. Fill stock from the inventory table to create one."
                            }
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}