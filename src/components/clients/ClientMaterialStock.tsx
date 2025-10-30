"use client";

import { useMemo, useState } from "react";
import { useMaterials } from "@/hooks/use-materials";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Search } from "lucide-react";
import { StockAdjustmentModal } from "@/components/materials/StockAdjustmentModal";

const LOW_STOCK_THRESHOLD = 10;

export function ClientMaterialStock() {
  const { materials, loading } = useMaterials();
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return materials.filter(m =>
      m.name.toLowerCase().includes(term) || (m.description || "").toLowerCase().includes(term)
    );
  }, [materials, searchTerm]);

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search materials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="relative w-full overflow-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[35%]">Material</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-center w-[120px]">Qty</TableHead>
              <TableHead className="text-center w-[120px]">In/Out</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((m) => {
              const isLow = (m.quantity ?? 0) <= LOW_STOCK_THRESHOLD;
              return (
                <TableRow key={m.id} className={isLow ? "bg-destructive/5" : ""}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {isLow && <AlertTriangle className="w-4 h-4 text-destructive" />}
                      {m.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{m.description || "-"}</TableCell>
                  <TableCell className="text-center font-semibold">{m.quantity}</TableCell>
                  <TableCell className="text-center"><StockAdjustmentModal material={m} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
