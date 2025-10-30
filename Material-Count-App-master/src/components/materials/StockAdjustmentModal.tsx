"use client";

import { useState, useEffect, useActionState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Minus, PackagePlus, PackageMinus } from "lucide-react";
import { stockAdjustmentAction } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import type { Material } from "@/lib/types";

type StockAdjustmentModalProps = {
  material: Material;
};

const initialState = {
  success: false,
  message: null as string | null,
  errors: null as Record<string, string[]> | null,
  submissionId: 0,
};

export function StockAdjustmentModal({ material }: StockAdjustmentModalProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"in" | "out">("in");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const { toast } = useToast();
  
  const [state, formAction] = useActionState(stockAdjustmentAction, initialState);
  const [lastSubmissionId, setLastSubmissionId] = useState(0);

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
        toast({
          variant: "destructive",
          title: "Error",
          description: state.message,
        });
      }
    }
  }, [state, lastSubmissionId, toast]);

  const handleSubmit = (formData: FormData) => {
    formAction(formData);
  };

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

        {activeTab === "in" ? (
          <div className="mb-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            Mode: IN – Adding to stock
          </div>
        ) : (
          <div className="mb-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800">
            Mode: OUT – Removing from stock
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
            <form action={handleSubmit} className="space-y-4">
              <input type="hidden" name="materialId" value={material.id} />
              <input type="hidden" name="materialName" value={material.name} />
              <input type="hidden" name="type" value="in" />

              <div className="space-y-2">
                <Label htmlFor="quantity-in">Quantity to Add</Label>
                <Input
                  id="quantity-in"
                  name="quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Enter quantity"
                  required
                />
                {state.errors?.quantity && (
                  <p className="text-sm text-destructive">{state.errors.quantity[0]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason-in">Reason (Optional)</Label>
                <Textarea
                  id="reason-in"
                  name="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., New purchase, Supplier delivery"
                  rows={3}
                />
              </div>

              <div className="bg-green-50 dark:bg-green-950 p-3 rounded-md border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-800 dark:text-green-200">
                  <strong>New Stock:</strong> {material.quantity} + {quantity || 0} = <strong>{material.quantity + Number(quantity || 0)}</strong>
                </p>
              </div>

              <Button type="submit" className="w-full" size="lg">
                <Plus className="w-4 h-4 mr-2" />
                Add to Stock
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="out" className="space-y-4 mt-4">
            <form action={handleSubmit} className="space-y-4">
              <input type="hidden" name="materialId" value={material.id} />
              <input type="hidden" name="materialName" value={material.name} />
              <input type="hidden" name="type" value="out" />

              <div className="space-y-2">
                <Label htmlFor="quantity-out">Quantity to Remove</Label>
                <Input
                  id="quantity-out"
                  name="quantity"
                  type="number"
                  min="1"
                  max={material.quantity}
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Enter quantity"
                  required
                />
                {state.errors?.quantity && (
                  <p className="text-sm text-destructive">{state.errors.quantity[0]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason-out">Reason (Optional)</Label>
                <Textarea
                  id="reason-out"
                  name="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Client dispatch, Damaged goods"
                  rows={3}
                />
              </div>

              <div className="bg-orange-50 dark:bg-orange-950 p-3 rounded-md border border-orange-200 dark:border-orange-800">
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  <strong>New Stock:</strong> {material.quantity} - {quantity || 0} = <strong>{Math.max(0, material.quantity - Number(quantity || 0))}</strong>
                </p>
                {Number(quantity || 0) > material.quantity && (
                  <p className="text-sm text-destructive mt-1">⚠ Insufficient stock!</p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                variant="destructive"
                disabled={Number(quantity || 0) > material.quantity}
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
