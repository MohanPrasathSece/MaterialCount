"use client";

import React, { useMemo, useEffect, useState } from "react";
import type { Client, Material, ClientMaterialEntry } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Props = {
  client: Client;
  materials: Material[];
  clientHistory: ClientMaterialEntry[];
};

export function ClientCosting({ client, materials, clientHistory }: Props) {
  const initialRateMap = useMemo(() => {
    const m = new Map<string, { name: string; rate: number; gstPercent: number; pp: number; pm: number }>();
    for (const mat of materials) {
      m.set(mat.id, {
        name: mat.name,
        rate: Number(mat.rate || 0),
        gstPercent: Number(mat.gstPercent || 0),
        pp: Number((mat as any).pricePerPiece || 0),
        pm: Number((mat as any).pricePerMeter || 0),
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
        const unit = (() => { const meta = initialRateMap.get(materialId); return meta ? (meta.pp > 0 ? meta.pp : meta.pm > 0 ? meta.pm : 0) : 0; })();
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
    const unit = meta ? (meta.pp > 0 ? meta.pp : meta.pm > 0 ? meta.pm : 0) : 0;
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
    const title = `Client Costing - ${client.name}`;
    doc.setFontSize(16);
    doc.text(title, 14, 16);
    doc.setFontSize(10);
    doc.text(`Address: ${client.address}`, 14, 22);
    doc.text(`Consumer No: ${client.consumerNo} | Plant Capacity: ${client.plantCapacity}`, 14, 28);
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadPdf}>Download PDF</Button>
          <Button variant="outline" onClick={recomputeFromUsage} disabled={reloading}>{reloading ? 'Recomputing...' : 'Recompute from usage'}</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
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
                  const meta = initialRateMap.get(r.materialId);
                  const source = meta && meta.pp > 0 ? "Pc" : meta && meta.pm > 0 ? "m" : "-";
                  return (
                  <TableRow key={r.materialId + idx}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{r.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border">
                          {source}
                        </span>
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
