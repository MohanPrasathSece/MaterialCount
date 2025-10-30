"use client";

import React from "react";
import { useMaterials } from "@/hooks/use-materials";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useActionState } from "react";
import { updateMaterialsPricingAction } from "@/app/actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const initial = { success: false, message: "" } as any;

export function PricingEditor() {
  const { materials } = useMaterials();
  const [state, formAction] = useActionState(updateMaterialsPricingAction, initial);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Material Pricing</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="w-full overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-center">Rate</TableHead>
                  <TableHead className="text-center">GST %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">No materials found.</TableCell>
                  </TableRow>
                ) : (
                  materials.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell className="text-center">
                        <Input
                          name={`pricing[${m.id}][rate]`}
                          type="number"
                          defaultValue={m.rate ?? 0}
                          min={0}
                          step={0.01}
                          inputMode="decimal"
                          className="w-32 mx-auto text-center"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          name={`pricing[${m.id}][gstPercent]`}
                          type="number"
                          defaultValue={m.gstPercent ?? 0}
                          min={0}
                          step={1}
                          inputMode="numeric"
                          className="w-24 mx-auto text-center"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end">
            <Button type="submit">Save Pricing</Button>
          </div>
          {state?.message && (
            <p className={state.success ? "text-green-600" : "text-red-600"}>{state.message}</p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
