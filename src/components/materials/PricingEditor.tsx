"use client";

import React, { useState, useEffect } from "react";
import { useMaterials } from "@/hooks/use-materials";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type PricingData = {
  gstPercent: number;
  price: number;
  quantity: number;
};

export function PricingEditor() {
  const { materials } = useMaterials();
  const [pricing, setPricing] = useState<Record<string, PricingData>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Initialize pricing state from materials without overwriting user edits
  useEffect(() => {
    setPricing(prev => {
      const next: Record<string, PricingData> = { ...prev };
      for (const m of materials) {
        if (!next[m.id]) {
          const price = (m as any).price ?? (m as any).pricePerPiece ?? (m as any).pricePerMeter ?? 0;
          next[m.id] = {
            gstPercent: m.gstPercent ?? 0,
            price,
            quantity: m.quantity ?? 0,
          };
        }
      }
      return next;
    });
  }, [materials]);

  const updatePricing = (materialId: string, field: keyof PricingData, value: number) => {
    setPricing(prev => ({
      ...prev,
      [materialId]: {
        ...prev[materialId],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      
      Object.entries(pricing).forEach(([id, data]) => {
        const mat = materials.find(m => m.id === id);
        const currentPrice = mat ? ((mat as any).price ?? (mat as any).pricePerPiece ?? (mat as any).pricePerMeter ?? 0) : 0;
        const currentGst = mat?.gstPercent ?? 0;
        if (data.gstPercent !== currentGst) {
          formData.append(`pricing[${id}][gstPercent]`, String(data.gstPercent));
        }
        if (data.price !== currentPrice) {
          formData.append(`pricing[${id}][price]`, String(data.price));
        }
        if (mat && data.quantity !== mat.quantity) {
          formData.append(`pricing[${id}][quantity]`, String(data.quantity));
        }
      });

      const response = await fetch('/api/materials/pricing', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: result.message || "Pricing updated successfully.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message || "Failed to update pricing.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while saving pricing.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Material Pricing</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="w-full overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead className="text-center">GST %</TableHead>
                  <TableHead className="text-center">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">No materials found.</TableCell>
                  </TableRow>
                ) : (
                  materials.map(m => {
                    const data = pricing[m.id] || { quantity: 0, gstPercent: 0, price: 0 };
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            value={data.quantity}
                            onChange={(e) => updatePricing(m.id, 'quantity' as any, Number(e.target.value) || 0)}
                            min={0}
                            step={1}
                            inputMode="numeric"
                            className="w-28 mx-auto text-center"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            value={data.gstPercent}
                            onChange={(e) => updatePricing(m.id, 'gstPercent', Number(e.target.value) || 0)}
                            min={0}
                            step={1}
                            inputMode="numeric"
                            className="w-24 mx-auto text-center"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            value={data.price}
                            onChange={(e) => updatePricing(m.id, 'price', Number(e.target.value) || 0)}
                            min={0}
                            step={0.01}
                            inputMode="decimal"
                            className="w-32 mx-auto text-center"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Pricing"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
