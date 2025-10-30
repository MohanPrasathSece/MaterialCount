"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { fillStockAction } from "@/app/actions";
import type { Material } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Info } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Updating Stock..." : "Update Stock"}
    </Button>
  );
}

const initialState = {
  success: false,
  message: null,
};

type FillStockModalProps = {
    materials: Material[];
}

export function FillStockModal({ materials }: FillStockModalProps) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();
  const [state, formAction] = useActionState(fillStockAction, initialState);

  useEffect(() => {
    if (state.message) {
      if (state.success) {
        toast({
          title: "Success",
          description: state.message,
        });
        setOpen(false);
        formRef.current?.reset();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: state.message,
        });
      }
    }
  }, [state, toast]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto">
          <Boxes className="w-4 h-4 mr-2" />
          Fill Stock
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">Fill Stock</DialogTitle>
          <DialogDescription>
            Add quantities to your existing materials. The amounts entered below will be added to the current stock levels.
          </DialogDescription>
        </DialogHeader>
        {materials.length > 0 ? (
            <form ref={formRef} action={formAction} className="space-y-4">
                <div className="max-h-[60vh] overflow-y-auto pr-2">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Material</TableHead>
                                <TableHead className="text-right w-32">Add Quantity</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {materials.map((material) => (
                                <TableRow key={material.id}>
                                    <TableCell>
                                        <Label htmlFor={`material-${material.id}`}>{material.name}</Label>
                                        <p className="text-xs text-muted-foreground">Current: {material.quantity}</p>
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                        id={`material-${material.id}`}
                                        name={`material-${material.id}`}
                                        type="number"
                                        placeholder="0"
                                        min="0"
                                        defaultValue="0"
                                        className="text-right"
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <SubmitButton />
                </DialogFooter>
            </form>
        ) : (
             <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle className="font-headline">No Materials</AlertTitle>
                <AlertDescription>
                    There are no materials in your inventory. Add a material first before filling stock.
                </AlertDescription>
            </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
}
