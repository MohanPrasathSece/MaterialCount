
"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useMaterials } from "@/hooks/use-materials";
import { useOwner } from "@/hooks/use-owner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { UserOptions } from "jspdf-autotable";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AddMaterialModal } from "./AddMaterialModal";
import { DeleteMaterialDialog } from "./DeleteMaterialDialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Search, FileDown, AlertTriangle } from "lucide-react";
import { FillStockModal } from "./FillStockModal";
import { Input } from "../ui/input";
import type { Material } from "@/lib/types";
import { Button } from "../ui/button";
import { setMaterialQuantityAction, setMaterialPricesAction, updateMaterialsPricingAction } from "@/app/actions";
import { useActionState } from "react";
import { useToast } from "@/hooks/use-toast";

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: UserOptions) => jsPDF;
}

const LOW_STOCK_THRESHOLD = 10;

export function MaterialInventory() {
  const { materials, loading } = useMaterials();
  const isOwner = useOwner();
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const [setState, setQtyAction] = useActionState(setMaterialQuantityAction as any, { success: false, submissionId: 0, message: null } as any);
  const [lastSetSubmission, setLastSetSubmission] = useState<number>(0);
  const [priceState, priceAction] = useActionState(setMaterialPricesAction as any, { success: false, submissionId: 0, message: null } as any);
  const [pricingState, pricingAction] = useActionState(updateMaterialsPricingAction as any, { success: false, message: "" } as any);
  const qtyDraft = useRef<Record<string, number>>({});
  const qtyTimers = useRef<Record<string, any>>({});
  const priceTimers = useRef<Record<string, any>>({});
  const priceDraft = useRef<Record<string, { pc?: string; pm?: string; gst?: string }>>({});

  

  // Only show errors for manual set quantity
  useEffect(() => {
    if (setState && setState.submissionId && setState.submissionId !== lastSetSubmission) {
      setLastSetSubmission(setState.submissionId);
      if (!(setState as any).success && (setState as any).message) {
        toast({ variant: "destructive", title: "Error", description: (setState as any).message });
      }
    }
  }, [setState, lastSetSubmission, toast]);

  const handleQtyInputChange = (materialId: string, value: number, formEl: HTMLFormElement | null) => {
    qtyDraft.current[materialId] = value;
    if (!formEl) return;
    if (qtyTimers.current[materialId]) clearTimeout(qtyTimers.current[materialId]);
    qtyTimers.current[materialId] = setTimeout(() => {
      formEl.requestSubmit();
    }, 700);
  };

  const filteredMaterials = materials.filter(material => 
    material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (material.description && material.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const groupedMaterials = useMemo(() => {
    return filteredMaterials.reduce((acc, material) => {
        const category = material.category || 'Other';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(material);
        return acc;
    }, {} as Record<string, Material[]>);
  }, [filteredMaterials]);


  const handleDownloadPdf = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text("Material Inventory Report", 14, 22);
    doc.setFontSize(10);
    doc.text(`Report generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    let finalY = 0;

    const categories = ['Fabrication', 'Wiring', 'Other'];

    categories.forEach((category, index) => {
        if (groupedMaterials[category] && groupedMaterials[category].length > 0) {
            
            autoTable(doc, {
                head: [['Material', 'Description', 'Quantity']],
                body: groupedMaterials[category].map(m => [m.name, m.description, m.quantity]),
                startY: finalY === 0 ? 40 : finalY + 15,
                didDrawPage: (data) => {
                    if (data.pageNumber === 1) {
                        doc.setFontSize(20);
                        doc.text("Material Inventory Report", 14, 22);
                    }
                },
                 didParseCell: (data) => {
                    if (data.section === 'head') {
                       data.cell.styles.fillColor = '#1e3a8a';
                    }
                },
                didDrawCell: (data) => {
                    if (data.row.index === 0 && data.column.index === 0 && data.section === 'body') {
                        doc.setFontSize(14);
                        doc.setTextColor(40);
                        doc.text(category, data.cell.x, data.cell.y - 8);
                    }
                },
                margin: { top: 35 }
            });
            finalY = (doc as any).lastAutoTable.finalY;
        }
    });

    doc.save(`inventory-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };


  const renderMaterialTable = (category: string, materialList: Material[]) => {
    return (
        <div key={category} className="mb-8">
             <h2 className="text-xl font-bold font-headline mb-2 underline">{category}</h2>
            
            {/* Desktop Table View */}
            <div className="relative w-full overflow-auto border rounded-lg hidden md:block">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="font-headline w-[25%]">Material</TableHead>
                            <TableHead className="font-headline w-[35%]">Description</TableHead>
                            <TableHead className="text-center font-headline w-[15%]">Quantity</TableHead>
                            <TableHead className="text-center font-headline w-[7.5%]">Price/Pc</TableHead>
                            <TableHead className="text-center font-headline w-[7.5%]">Price/m</TableHead>
                            <TableHead className="text-center font-headline w-[7%]">GST %</TableHead>
                            {isOwner && <TableHead className="w-[10%]"><span className="sr-only">Actions</span></TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {materialList.map((material) => {
                            const isLowStock = material.quantity <= LOW_STOCK_THRESHOLD;
                            return (
                            <TableRow key={material.id} className={isLowStock ? "bg-destructive/5" : ""}>
                                <TableCell className="font-medium break-words">
                                    <div className="flex items-center gap-2">
                                        {isLowStock && <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />}
                                        {material.name}
                                    </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground break-words">{material.description || '-'}</TableCell>
                                <TableCell className="text-center">
                                    <form action={setQtyAction} className="inline-flex items-center justify-center gap-2">
                                      <input type="hidden" name="materialId" value={material.id} />
                                      <Input
                                        name="newQuantity"
                                        type="number"
                                        min={0}
                                        step={1}
                                        inputMode="numeric"
                                        value={
                                          qtyDraft.current[material.id] !== undefined
                                            ? qtyDraft.current[material.id]
                                            : material.quantity
                                        }
                                        className={`w-24 text-center ${isLowStock ? 'text-destructive font-bold' : 'font-semibold'}`}
                                        onChange={(e) => handleQtyInputChange(material.id, Number(e.target.value || 0), (e.target as HTMLInputElement).form)}
                                      />
                                    </form>
                                </TableCell>
                                <TableCell className="text-center">
                                  <form action={priceAction} className="inline-flex items-center justify-center">
                                    <input type="hidden" name="materialId" value={material.id} />
                                    <Input
                                      name="pricePerPiece"
                                      type="number"
                                      min={0}
                                      step={0.01}
                                      inputMode="decimal"
                                      value={priceDraft.current[material.id]?.pc ?? (material.pricePerPiece ?? '')}
                                      className="w-24 text-center"
                                      disabled={(Number(priceDraft.current[material.id]?.pm ?? material.pricePerMeter ?? 0) || 0) > 0}
                                      onChange={(e) => {
                                        const form = (e.target as HTMLInputElement).form;
                                        if (!form) return;
                                        priceDraft.current[material.id] = {
                                          ...(priceDraft.current[material.id] || {}),
                                          pc: e.target.value,
                                        };
                                        if (priceTimers.current[material.id+"_pc"]) clearTimeout(priceTimers.current[material.id+"_pc"]);
                                        priceTimers.current[material.id+"_pc"] = setTimeout(() => {
                                          if (priceDraft.current[material.id]?.pc === '') return;
                                          form.requestSubmit();
                                        }, 800);
                                      }}
                                    />
                                  </form>
                                </TableCell>
                                <TableCell className="text-center">
                                  <form action={priceAction} className="inline-flex items-center justify-center">
                                    <input type="hidden" name="materialId" value={material.id} />
                                    <Input
                                      name="pricePerMeter"
                                      type="number"
                                      min={0}
                                      step={0.01}
                                      inputMode="decimal"
                                      value={priceDraft.current[material.id]?.pm ?? (material.pricePerMeter ?? '')}
                                      className="w-24 text-center"
                                      disabled={(Number(priceDraft.current[material.id]?.pc ?? material.pricePerPiece ?? 0) || 0) > 0}
                                      onChange={(e) => {
                                        const form = (e.target as HTMLInputElement).form;
                                        if (!form) return;
                                        priceDraft.current[material.id] = {
                                          ...(priceDraft.current[material.id] || {}),
                                          pm: e.target.value,
                                        };
                                        if (priceTimers.current[material.id+"_pm"]) clearTimeout(priceTimers.current[material.id+"_pm"]);
                                        priceTimers.current[material.id+"_pm"] = setTimeout(() => {
                                          if (priceDraft.current[material.id]?.pm === '') return;
                                          form.requestSubmit();
                                        }, 800);
                                      }}
                                    />
                                  </form>
                                </TableCell>
                                <TableCell className="text-center">
                                  <form action={pricingAction} className="inline-flex items-center justify-center">
                                    <Input
                                      name={`pricing[${material.id}][gstPercent]`}
                                      type="number"
                                      min={0}
                                      step={1}
                                      inputMode="numeric"
                                      value={priceDraft.current[material.id]?.gst ?? (material.gstPercent ?? '')}
                                      className="w-20 text-center"
                                      onChange={(e) => {
                                        const form = (e.target as HTMLInputElement).form;
                                        if (!form) return;
                                        priceDraft.current[material.id] = {
                                          ...(priceDraft.current[material.id] || {}),
                                          gst: e.target.value,
                                        };
                                        if (priceTimers.current[material.id+"_gst"]) clearTimeout(priceTimers.current[material.id+"_gst"]);
                                        priceTimers.current[material.id+"_gst"] = setTimeout(() => {
                                          if (priceDraft.current[material.id]?.gst === '') return;
                                          form.requestSubmit();
                                        }, 800);
                                      }}
                                    />
                                  </form>
                                </TableCell>
                                <TableCell className="text-center">
                                  <form action={pricingAction} className="inline-flex items-center justify-center">
                                    <Input
                                      name={`pricing[${material.id}][gstPercent]`}
                                      type="number"
                                      min={0}
                                      step={1}
                                      inputMode="numeric"
                                      defaultValue={material.gstPercent ?? 0}
                                      className="w-20 text-center"
                                      onChange={(e) => {
                                        const form = (e.target as HTMLInputElement).form;
                                        if (!form) return;
                                        if (priceTimers.current[material.id+"_gst"]) clearTimeout(priceTimers.current[material.id+"_gst"]);
                                        priceTimers.current[material.id+"_gst"] = setTimeout(() => form.requestSubmit(), 800);
                                      }}
                                    />
                                  </form>
                                </TableCell>
                                {isOwner && (
                                    <TableCell className="text-right">
                                        <DeleteMaterialDialog materialId={material.id} materialName={material.name} />
                                    </TableCell>
                                )}
                            </TableRow>
                        )})}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile Card View */}
            <div className="space-y-3 md:hidden">
                {materialList.map((material) => {
                    const isLowStock = material.quantity <= LOW_STOCK_THRESHOLD;
                    return (
                    <div key={material.id} className={`border rounded-lg p-4 ${isLowStock ? 'bg-destructive/5 border-destructive/20' : ''}`}>
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex-1 space-y-1 pr-4">
                                <div className="flex items-center gap-2">
                                    {isLowStock && <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />}
                                    <p className="font-bold break-words">{material.name}</p>
                                </div>
                                <p className="text-sm text-muted-foreground break-words">{material.description || '-'}</p>
                            </div>
                            {isOwner && (
                                 <div className="flex-shrink-0">
                                    <DeleteMaterialDialog materialId={material.id} materialName={material.name} />
                                </div>
                            )}
                        </div>
                        <div className="space-y-2 pt-2 border-t">
                            <div className="flex items-center justify-between">
                                <form action={setQtyAction} className="flex items-center gap-2">
                                    <input type="hidden" name="materialId" value={material.id} />
                                    <span className="text-sm font-medium">Qty:</span>
                                    <Input
                                      name="newQuantity"
                                      type="number"
                                      min={0}
                                      step={1}
                                      inputMode="numeric"
                                      value={
                                        qtyDraft.current[material.id] !== undefined
                                          ? qtyDraft.current[material.id]
                                          : material.quantity
                                      }
                                      className={`w-24 text-center ${isLowStock ? 'text-destructive font-bold' : 'text-primary font-bold'}`}
                                      onChange={(e) => handleQtyInputChange(material.id, Number(e.target.value || 0), (e.target as HTMLInputElement).form)}
                                    />
                                </form>
                                
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <form action={priceAction} className="flex items-center gap-2">
                                <input type="hidden" name="materialId" value={material.id} />
                                <span className="text-sm">Price/Pc</span>
                                <Input
                                  name="pricePerPiece"
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  inputMode="decimal"
                                  value={priceDraft.current[material.id]?.pc ?? (material.pricePerPiece ?? '')}
                                  className="text-center"
                                  disabled={(Number(priceDraft.current[material.id]?.pm ?? material.pricePerMeter ?? 0) || 0) > 0}
                                  onChange={(e) => {
                                    const form = (e.target as HTMLInputElement).form;
                                    if (!form) return;
                                    priceDraft.current[material.id] = {
                                      ...(priceDraft.current[material.id] || {}),
                                      pc: e.target.value,
                                    };
                                    if (priceTimers.current[material.id+"_pc_m"]) clearTimeout(priceTimers.current[material.id+"_pc_m"]);
                                    priceTimers.current[material.id+"_pc_m"] = setTimeout(() => {
                                      if (priceDraft.current[material.id]?.pc === '') return;
                                      form.requestSubmit();
                                    }, 800);
                                  }}
                                />
                              </form>
                              <form action={priceAction} className="flex items-center gap-2 justify-end">
                                <input type="hidden" name="materialId" value={material.id} />
                                <span className="text-sm">Price/m</span>
                                <Input
                                  name="pricePerMeter"
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  inputMode="decimal"
                                  value={priceDraft.current[material.id]?.pm ?? (material.pricePerMeter ?? '')}
                                  className="text-center"
                                  disabled={(Number(priceDraft.current[material.id]?.pc ?? material.pricePerPiece ?? 0) || 0) > 0}
                                  onChange={(e) => {
                                    const form = (e.target as HTMLInputElement).form;
                                    if (!form) return;
                                    priceDraft.current[material.id] = {
                                      ...(priceDraft.current[material.id] || {}),
                                      pm: e.target.value,
                                    };
                                    if (priceTimers.current[material.id+"_pm_m"]) clearTimeout(priceTimers.current[material.id+"_pm_m"]);
                                    priceTimers.current[material.id+"_pm_m"] = setTimeout(() => {
                                      if (priceDraft.current[material.id]?.pm === '') return;
                                      form.requestSubmit();
                                    }, 800);
                                  }}
                                />
                              </form>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <form action={pricingAction} className="flex items-center gap-2">
                                <span className="text-sm">GST %</span>
                                <Input
                                  name={`pricing[${material.id}][gstPercent]`}
                                  type="number"
                                  min={0}
                                  step={1}
                                  inputMode="numeric"
                                  value={priceDraft.current[material.id]?.gst ?? (material.gstPercent ?? '')}
                                  className="text-center"
                                  onChange={(e) => {
                                    const form = (e.target as HTMLInputElement).form;
                                    if (!form) return;
                                    priceDraft.current[material.id] = {
                                      ...(priceDraft.current[material.id] || {}),
                                      gst: e.target.value,
                                    };
                                    if (priceTimers.current[material.id+"_gst_m"]) clearTimeout(priceTimers.current[material.id+"_gst_m"]);
                                    priceTimers.current[material.id+"_gst_m"] = setTimeout(() => {
                                      if (priceDraft.current[material.id]?.gst === '') return;
                                      form.requestSubmit();
                                    }, 800);
                                  }}
                                />
                              </form>
                            </div>
                            
                        </div>
                    </div>
                )})}
            </div>
        </div>
    );
  };


  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="Search materials..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
            />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleDownloadPdf} className="w-full sm:w-auto">
            <FileDown className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          <FillStockModal materials={materials} />
          <AddMaterialModal />
        </div>
      </div>
      
      {loading ? (
         <div className="space-y-4">
            <Skeleton className="h-10 w-1/4" />
            <div className="border rounded-lg p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 py-2">
                        <Skeleton className="h-5 w-1/3" />
                        <Skeleton className="h-5 w-2/3" />
                    </div>
                ))}
            </div>
        </div>
      ) : filteredMaterials.length > 0 ? (
          <div>
            {['Fabrication', 'Wiring', 'Other'].map(category => {
                const categoryMaterials = groupedMaterials[category];
                if (categoryMaterials && categoryMaterials.length > 0) {
                    return renderMaterialTable(category, categoryMaterials);
                }
                return null;
            })}
        </div>
      ) : (
        <div className="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="font-headline">Material</TableHead>
                        <TableHead className="font-headline">Description</TableHead>
                        <TableHead className="text-right font-headline">Quantity</TableHead>
                        {isOwner && <TableHead className="w-[50px]"><span className="sr-only">Actions</span></TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow>
                        <TableCell colSpan={isOwner ? 4 : 3} className="h-24 text-center text-muted-foreground">
                            {searchTerm ? "No materials match your search." : "No materials found. Add one to get started!"}
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>
      )}

      
    </div>
  );
}
