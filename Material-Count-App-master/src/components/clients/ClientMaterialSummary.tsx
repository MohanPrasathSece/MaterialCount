"use client";

import { useMemo } from 'react';
import type { ClientMaterialEntry, Material } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { FileStack } from 'lucide-react';

type ClientMaterialSummaryProps = {
    clientHistory: ClientMaterialEntry[];
    materials: Material[]; // Master list of all materials
};

export function ClientMaterialSummary({ clientHistory, materials }: ClientMaterialSummaryProps) {
    const summary = useMemo(() => {
        const summaryMap: Record<string, { materialName: string, outQty: number, inQty: number }> = {};
        
        // Initialize summary map with all materials to ensure all are listed
        materials.forEach(material => {
            summaryMap[material.id] = {
                materialName: material.name,
                outQty: 0,
                inQty: 0,
            };
        });

        // Populate quantities from history
        clientHistory.forEach(entry => {
            entry.materials.forEach(item => {
                if (summaryMap[item.materialId]) {
                    if (entry.type === 'out') {
                        summaryMap[item.materialId].outQty += Number(item.quantity);
                    } else if (entry.type === 'in') {
                        summaryMap[item.materialId].inQty += Number(item.quantity);
                    }
                }
            });
        });

        return Object.values(summaryMap);
    }, [clientHistory, materials]);

    return (
        <Card>
            <CardHeader>
                <div className='flex items-center gap-2'>
                    <FileStack className="w-6 h-6" />
                    <CardTitle className="font-headline">Material Summary</CardTitle>
                </div>
                <CardDescription>
                    A summary of total materials taken out and returned by this client. This table lists all materials from your main inventory.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="border rounded-lg max-h-96 overflow-y-auto">
                    <Table>
                        <TableHeader className='sticky top-0 bg-muted/50'>
                            <TableRow>
                                <TableHead>Material</TableHead>
                                <TableHead className="text-right">Total Out</TableHead>
                                <TableHead className="text-right">Total In</TableHead>
                                <TableHead className="text-right">Net Balance</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {summary.map((item, index) => {
                                const balance = item.outQty - item.inQty;
                                return (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium">{item.materialName}</TableCell>
                                        <TableCell className="text-right">{item.outQty}</TableCell>
                                        <TableCell className="text-right text-green-600">{item.inQty}</TableCell>
                                        <TableCell className={`text-right font-bold ${balance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                                            {balance}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
