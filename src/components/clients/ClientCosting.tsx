"use client";

import React, { useMemo, useEffect, useState } from "react";
import type { Client, Material, ClientMaterialEntry } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOwner } from "@/hooks/use-owner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Props = {
  client: Client;
  materials: Material[];
  clientHistory: ClientMaterialEntry[];
};

export function ClientCosting({ client, materials, clientHistory }: Props) {
  const isOwner = useOwner();
  const initialRateMap = useMemo(() => {
    const m = new Map<string, { name: string; rate: number; gstPercent: number; price: number }>();
    for (const mat of materials) {
      m.set(mat.id, {
        name: mat.name,
        rate: Number(mat.rate || 0),
        gstPercent: Number(mat.gstPercent || 0),
        price: Number((mat as any).price ?? (mat as any).pricePerPiece ?? (mat as any).pricePerMeter ?? 0),
      });
    }
    return m;
  }, [materials]);

  const [rows, setRows] = useState<{ materialId: string; name: string; qty: number; rate: number; gstPercent: number; base: number; gst: number; total: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reloading, setReloading] = useState(false);

  const loadCosting = async () => {
    const res = await fetch(`/api/client-costing/${client.id}`);
    if (!res.ok) throw new Error("Failed to load costing");
    const data = await res.json();
    if (Array.isArray(data.items) && data.items.length > 0) {
      const sorted = data.items.map((r: any) => {
        const materialId = String(r.materialId);
        const name = String(r.name || initialRateMap.get(materialId)?.name || '');
        const qty = Number(r.qty) || 0;
        const gstPercent = Number(r.gstPercent) || 0;
        const baseIn = Number(r.base);
        const gstIn = Number(r.gst);
        const totalIn = Number(r.total);
        if (Number.isFinite(baseIn) && Number.isFinite(gstIn) && Number.isFinite(totalIn)) {
          return { materialId, name, qty, rate: Number(r.rate) || 0, gstPercent, base: baseIn, gst: gstIn, total: totalIn };
        }
        const unit = (() => { const meta = initialRateMap.get(materialId); return meta ? (meta.price > 0 ? meta.price : 0) : 0; })();
        const base = qty * unit;
        const gst = base * (gstPercent / 100);
        const total = base + gst;
        return { materialId, name, qty, rate: unit, gstPercent, base, gst, total };
      }).sort((a: any, b: any) => a.name.localeCompare(b.name));
      setRows(sorted);
    } else {
      setRows([]);
    }
  };

  // Load existing costing if available; otherwise initialize with empty list
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        await loadCosting();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [client.id, initialRateMap]);

  const recomputeFromUsage = async () => {
    try {
      setReloading(true);
      await loadCosting();
    } finally {
      setReloading(false);
    }
  };

  const recalcRow = (materialId: string, r: { qty: number; gstPercent: number }) => {
    const meta = initialRateMap.get(materialId);
    const unit = meta ? (meta.price > 0 ? meta.price : 0) : 0;
    const base = r.qty * unit;
    const gst = base * (r.gstPercent / 100);
    const total = base + gst;
    return { base, gst, total };
  };

  const upsertRow = (materialId: string, name: string, patch: Partial<{ qty: number; rate: number; gstPercent: number }>) => {
    setRows(prev => {
      const next = [...prev];
      const idx = next.findIndex(x => x.materialId === materialId);
      if (idx >= 0) {
        const current = { ...next[idx], ...patch } as any;
        const { base, gst, total } = recalcRow(materialId, { qty: current.qty, gstPercent: current.gstPercent });
        next[idx] = { ...current, base, gst, total };
      } else {
        const qty = Number(patch.qty ?? 0) || 0;
        const gstPercent = Number(patch.gstPercent ?? (initialRateMap.get(materialId)?.gstPercent || 0)) || 0;
        const { base, gst, total } = recalcRow(materialId, { qty, gstPercent });
        next.push({ materialId, name, qty, rate: 0, gstPercent, base, gst, total });
      }
      next.sort((a, b) => a.name.localeCompare(b.name));
      return next;
    });
  };

  const summary = useMemo(() => {
    const beforeTax = rows.reduce((s, r) => s + r.base, 0);
    const gst = rows.reduce((s, r) => s + r.gst, 0);
    const grand = beforeTax + gst;
    return { beforeTax, gst, grand };
  }, [rows]);

  const save = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/client-costing/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: rows }),
      });
      if (!res.ok) throw new Error('Failed to save');
      // reload to normalize and ensure server computed
      const data = await res.json();
      const normalized = Array.isArray(data.items) ? data.items.map((r: any) => ({
        materialId: String(r.materialId),
        name: String(r.name),
        qty: Number(r.qty)||0,
        rate: Number(r.rate)||0,
        gstPercent: Number(r.gstPercent)||0,
        base: Number(r.base)||0,
        gst: Number(r.gst)||0,
        total: Number(r.total)||0,
      })) : [];
      setRows(normalized.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e) {
      // ignore for now or integrate toast if available
    } finally {
      setSaving(false);
    }
  };

  const downloadPdf = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 14;
    const lineY = 30;
    const dateStr = new Date().toLocaleString();

    // Header
    doc.setFontSize(18);
    doc.text("Client Costing", marginX, 16);
    doc.setFontSize(10);
    doc.text(`Generated: ${dateStr}`, pageWidth - marginX - 50, 16, { align: "left" });

    // Client details block
    doc.setDrawColor(200);
    doc.line(marginX, 20, pageWidth - marginX, 20);
    doc.setFontSize(11);
    doc.text(`Client: ${client.name}`, marginX, 26);
    const addr = client.address || "-";
    const addrLines = doc.splitTextToSize(`Address: ${addr}`, pageWidth - marginX * 2);
    doc.text(addrLines, marginX, lineY);
    const yAfterAddr = lineY + (Array.isArray(addrLines) ? addrLines.length * 5 : 5);
    doc.text(`Consumer No: ${client.consumerNo ?? '-'}`, marginX, yAfterAddr);
    doc.text(`Plant Capacity: ${client.plantCapacity ?? '-'}`, marginX + 80, yAfterAddr);

    // Table
    autoTable(doc, {
      head: [["Item", "Used Qty", "GST %", "Base Amt", "GST Amt", "Total"]],
      body: rows.map(r => [
        r.name,
        String(r.qty),
        String(r.gstPercent),
        r.base.toFixed(2),
        r.gst.toFixed(2),
        r.total.toFixed(2)
      ]),
      startY: yAfterAddr + 6,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [30, 58, 138], textColor: 255 },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
      },
    });

    // Totals block
    let y = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(12);
    doc.text("Summary", marginX, y);
    y += 2;
    doc.setDrawColor(200);
    doc.line(marginX, y, marginX + 30, y);
    y += 6;
    doc.setFontSize(11);
    doc.text(`Total Before Tax: ${summary.beforeTax.toFixed(2)}`, marginX, y);
    y += 6;
    doc.text(`Total GST: ${summary.gst.toFixed(2)}`, marginX, y);
    y += 6;
    doc.setFontSize(12);
    doc.text(`Grand Total: ${summary.grand.toFixed(2)}`, marginX, y);

    // Footer page number
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - marginX, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
    }

    const fileName = `Costing_${client.name.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0,10)}.pdf`;
    doc.save(fileName);
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-between flex-row">
        <CardTitle className="font-headline">Client Costing</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadPdf}>Download PDF</Button>
          {isOwner && (
            <>
              <Button variant="outline" onClick={recomputeFromUsage} disabled={reloading}>{reloading ? 'Recomputing...' : 'Recompute from usage'}</Button>
              <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-center">Used Qty</TableHead>
                <TableHead className="text-center">GST %</TableHead>
                <TableHead className="text-right">Base Amt</TableHead>
                <TableHead className="text-right">GST Amt</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">No usage found for this client yet.</TableCell>
                </TableRow>
              ) : (
                rows.map((r, idx) => {
                  return (
                  <TableRow key={r.materialId + idx}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{r.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        className="w-24 mx-auto text-center"
                        value={r.qty}
                        onChange={(e) => upsertRow(r.materialId, r.name, { qty: Number(e.target.value || 0) })}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        className="w-20 mx-auto text-center"
                        value={r.gstPercent}
                        onChange={(e) => upsertRow(r.materialId, r.name, { gstPercent: Number(e.target.value || 0) })}
                      />
                    </TableCell>
                    <TableCell className="text-right">{r.base.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{r.gst.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{r.total.toFixed(2)}</TableCell>
                  </TableRow>
                )})
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
