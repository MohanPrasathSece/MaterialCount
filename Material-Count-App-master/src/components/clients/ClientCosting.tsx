"use client";

import React, { useMemo } from "react";
import type { Client, Material, ClientMaterialEntry } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Props = {
  client: Client;
  materials: Material[];
  clientHistory: ClientMaterialEntry[];
};

export function ClientCosting({ client, materials, clientHistory }: Props) {
  const rateMap = useMemo(() => {
    const m = new Map<string, { name: string; rate: number; gstPercent: number }>();
    for (const mat of materials) {
      m.set(mat.id, { name: mat.name, rate: Number(mat.rate || 0), gstPercent: Number(mat.gstPercent || 0) });
    }
    return m;
  }, [materials]);

  const usedQtyMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const entry of clientHistory) {
      for (const item of entry.materials) {
        const prev = m.get(item.materialId) || 0;
        const q = Number(item.quantity) || 0;
        if (entry.type === "out") m.set(item.materialId, prev + q);
        else m.set(item.materialId, prev - q);
      }
    }
    return m;
  }, [clientHistory]);

  const rows = useMemo(() => {
    const result: { materialId: string; name: string; qty: number; rate: number; gstPercent: number; base: number; gst: number; total: number }[] = [];
    for (const [materialId, qty] of usedQtyMap.entries()) {
      if (qty <= 0) continue; // ignore non-positive usage
      const info = rateMap.get(materialId) || { name: materialId, rate: 0, gstPercent: 0 };
      const base = qty * info.rate;
      const gst = base * (info.gstPercent / 100);
      const total = base + gst;
      result.push({ materialId, name: info.name, qty, rate: info.rate, gstPercent: info.gstPercent, base, gst, total });
    }
    // Sort by name for stable PDF and UI
    result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [usedQtyMap, rateMap]);

  const summary = useMemo(() => {
    const beforeTax = rows.reduce((s, r) => s + r.base, 0);
    const gst = rows.reduce((s, r) => s + r.gst, 0);
    const grand = beforeTax + gst;
    return { beforeTax, gst, grand };
  }, [rows]);

  const downloadPdf = () => {
    const doc = new jsPDF();
    const title = `Client Costing - ${client.name}`;
    doc.setFontSize(16);
    doc.text(title, 14, 16);
    doc.setFontSize(10);
    doc.text(`Address: ${client.address}`, 14, 22);
    doc.text(`Consumer No: ${client.consumerNo} | Plant Capacity: ${client.plantCapacity}`, 14, 28);
    autoTable(doc, {
      head: [["Item", "Used Qty", "Rate", "GST %", "Base Amt", "GST Amt", "Total"]],
      body: rows.map(r => [
        r.name,
        String(r.qty),
        r.rate.toFixed(2),
        String(r.gstPercent),
        r.base.toFixed(2),
        r.gst.toFixed(2),
        r.total.toFixed(2)
      ]),
      startY: 36,
      styles: { fontSize: 9 },
    });
    const y = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(12);
    doc.text(`Total Before Tax: ${summary.beforeTax.toFixed(2)}`, 14, y);
    doc.text(`Total GST: ${summary.gst.toFixed(2)}`, 14, y + 6);
    doc.text(`Grand Total: ${summary.grand.toFixed(2)}`, 14, y + 12);
    const fileName = `Costing_${client.name.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0,10)}.pdf`;
    doc.save(fileName);
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-between flex-row">
        <CardTitle className="font-headline">Client Costing</CardTitle>
        <Button variant="outline" onClick={downloadPdf}>Download PDF</Button>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-center">Used Qty</TableHead>
                <TableHead className="text-center">Rate</TableHead>
                <TableHead className="text-center">GST %</TableHead>
                <TableHead className="text-right">Base Amt</TableHead>
                <TableHead className="text-right">GST Amt</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">No usage found for this client yet.</TableCell>
                </TableRow>
              ) : (
                rows.map((r, idx) => (
                  <TableRow key={r.materialId + idx}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-center">{r.qty}</TableCell>
                    <TableCell className="text-center">{r.rate.toFixed(2)}</TableCell>
                    <TableCell className="text-center">{r.gstPercent}</TableCell>
                    <TableCell className="text-right">{r.base.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{r.gst.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{r.total.toFixed(2)}</TableCell>
                  </TableRow>
                ))
              )}
              <TableRow>
                <TableCell colSpan={4} className="text-right font-semibold">Total Before Tax</TableCell>
                <TableCell className="text-right font-semibold">{summary.beforeTax.toFixed(2)}</TableCell>
                <TableCell className="text-right"/>
                <TableCell className="text-right"/>
              </TableRow>
              <TableRow>
                <TableCell colSpan={4} className="text-right font-semibold">Total GST</TableCell>
                <TableCell className="text-right font-semibold">{summary.gst.toFixed(2)}</TableCell>
                <TableCell className="text-right"/>
                <TableCell className="text-right"/>
              </TableRow>
              <TableRow>
                <TableCell colSpan={4} className="text-right font-bold">Grand Total</TableCell>
                <TableCell className="text-right font-bold">{summary.grand.toFixed(2)}</TableCell>
                <TableCell className="text-right"/>
                <TableCell className="text-right"/>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
