"use client";

import { useState, useEffect, useActionState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Minus, PackagePlus, PackageMinus } from "lucide-react";
import { stockAdjustmentAction, clientStockAdjustmentAction } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import type { Material } from "@/lib/types";

type StockAdjustmentModalProps = {
  material: Material;
  clientId?: string;
  currentOutQty?: number;
  currentInQty?: number;
};

const initialState = {
  success: false,
  message: null as string | null,
  errors: null as Record<string, string[]> | null,
  submissionId: 0,
};

export function StockAdjustmentModal({ material, clientId, currentOutQty = 0, currentInQty = 0 }: StockAdjustmentModalProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"in" | "out">("in");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const { toast } = useToast();
  
  const [state, formAction] = useActionState((clientId ? clientStockAdjustmentAction : stockAdjustmentAction) as any, initialState as any);
  const [lastSubmissionId, setLastSubmissionId] = useState(0);
  
  // Calculate max IN quantity for client (cannot exceed OUT quantity)
  const maxInQty = clientId ? Math.max(0, currentOutQty - currentInQty) : Infinity;

  useEffect(() => {
    if (state.submissionId && state.submissionId !== lastSubmissionId) {
      setLastSubmissionId(state.submissionId);
      
      if (state.success) {
        toast({
          title: "Success",
          description: state.message || "Stock adjusted successfully.",
        });
        // Reset form and close modal
        setQuantity("1");
        setReason("");
        setOpen(false);
      } else if (state.message) {
        const fieldErr = state.errors?.quantity?.[0]
          || state.errors?.type?.[0]
          || state.errors?.materialId?.[0]
          || state.errors?.materialName?.[0]
          || state.message;
        toast({
          variant: "destructive",
          title: "Error",
          description: fieldErr,
        });
      }
    }
  }, [state, lastSubmissionId, toast]);

  // No manual submit; we use form action={formAction} and include clientId as hidden input when present.

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PackagePlus className="w-4 h-4 mr-2" />
          In/Out
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            Stock Adjustment - {material.name} {" "}
            <span className={activeTab === "in" ? "ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800 border border-green-200" : "ml-2 inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-800 border border-orange-200"}>
              {activeTab === "in" ? "IN" : "OUT"}
            </span>
          </DialogTitle>
          <DialogDescription>
            Add stock (In) or remove stock (Out). Current stock: <strong>{material.quantity}</strong>
          </DialogDescription>
        </DialogHeader>

        {clientId && (
          <div className="mb-2 text-xs sm:text-sm rounded-md border px-3 py-2 bg-muted/30 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span>Client Out: <strong>{currentOutQty}</strong></span>
              <span>Client In: <strong>{currentInQty}</strong></span>
              <span>Net: <strong>{Math.max(0, currentOutQty - currentInQty)}</strong></span>
            </div>
            <div className="text-muted-foreground">
              Max returnable now: <strong>{Math.max(0, currentOutQty - currentInQty)}</strong>
            </div>
          </div>
        )}

        

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "in" | "out")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="in" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              In (Add)
            </TabsTrigger>
            <TabsTrigger value="out" className="flex items-center gap-2">
              <Minus className="w-4 h-4" />
              Out (Remove)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="in" className="space-y-4 mt-4">
            <form action={formAction as any} className="space-y-4">
              <input type="hidden" name="materialId" value={material.id} />
              {clientId && <input type="hidden" name="clientId" value={clientId} />}
              <input type="hidden" name="materialName" value={material.name} />
              <input type="hidden" name="type" value="in" />

              <div className="space-y-2">
                <Label htmlFor="quantity-in">Quantity</Label>
                <Input
                  id="quantity-in"
                  name="quantity"
                  type="number"
                  min="1"
                  max={clientId ? maxInQty : undefined}
                  step="1"
                  inputMode="numeric"
                  pattern="\\d*"
                  value={quantity}
                  onChange={(e) => {
                    const v = (e.target.value || '').replace(/[^0-9]/g, '');
                    setQuantity(v);
                  }}
                  onKeyDown={(e) => { if (e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === '+' || e.key === '.' || e.key === ',') e.preventDefault(); }}
                  placeholder="Enter quantity"
                  required
                  disabled={clientId && maxInQty === 0}
                />
                {state.errors?.quantity && (
                  <p className="text-sm text-destructive">{state.errors.quantity[0]}</p>
                )}
                {clientId && Number(quantity || 0) > maxInQty && (
                  <p className="text-sm text-destructive">⚠ Cannot return more than what was taken out!</p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={(Number(quantity || 0) < 1) || (clientId && (maxInQty === 0 || Number(quantity || 0) > maxInQty))}
              >
                <Plus className="w-4 h-4 mr-2" />
                {clientId ? "Return to Stock" : "Add to Stock"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="out" className="space-y-4 mt-4">
            <form action={formAction as any} className="space-y-4">
              <input type="hidden" name="materialId" value={material.id} />
              {clientId && <input type="hidden" name="clientId" value={clientId} />}
              <input type="hidden" name="materialName" value={material.name} />
              <input type="hidden" name="type" value="out" />

              <div className="space-y-2">
                <Label htmlFor="quantity-out">Quantity</Label>
                <Input
                  id="quantity-out"
                  name="quantity"
                  type="number"
                  min="1"
                  max={material.quantity}
                  step="1"
                  inputMode="numeric"
                  pattern="\\d*"
                  value={quantity}
                  onChange={(e) => {
                    const v = (e.target.value || '').replace(/[^0-9]/g, '');
                    setQuantity(v);
                  }}
                  onKeyDown={(e) => { if (e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === '+' || e.key === '.' || e.key === ',') e.preventDefault(); }}
                  placeholder="Enter quantity"
                  required
                />
                {state.errors?.quantity && (
                  <p className="text-sm text-destructive">{state.errors.quantity[0]}</p>
                )}
              </div>
              {Number(quantity || 0) > material.quantity && (
                <p className="text-sm text-destructive">⚠ Insufficient stock!</p>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                variant="destructive"
                disabled={(Number(quantity || 0) < 1) || (Number(quantity || 0) > material.quantity)}
              >
                <Minus className="w-4 h-4 mr-2" />
                Remove from Stock
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
