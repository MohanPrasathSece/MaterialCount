
"use client";

import { useMemo, useState } from "react";
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
import { Terminal, Search, FileDown } from "lucide-react";
import { FillStockModal } from "./FillStockModal";
import { Input } from "../ui/input";
import type { Material } from "@/lib/types";
import { Button } from "../ui/button";

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: UserOptions) => jsPDF;
}

export function MaterialInventory() {
  const { materials, loading } = useMaterials();
  const isOwner = useOwner();
  const [searchTerm, setSearchTerm] = useState("");

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
                            <TableHead className="font-headline w-[30%]">Material</TableHead>
                            <TableHead className="font-headline w-[45%]">Description</TableHead>
                            <TableHead className="text-right font-headline w-[15%]">Quantity</TableHead>
                            {isOwner && <TableHead className="w-[10%]"><span className="sr-only">Actions</span></TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {materialList.map((material) => (
                            <TableRow key={material.id}>
                                <TableCell className="font-medium break-words">{material.name}</TableCell>
                                <TableCell className="text-muted-foreground break-words">{material.description || '-'}</TableCell>
                                <TableCell className="text-right">{material.quantity}</TableCell>
                                {isOwner && (
                                    <TableCell className="text-right">
                                        <DeleteMaterialDialog materialId={material.id} materialName={material.name} />
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile Card View */}
            <div className="space-y-3 md:hidden">
                {materialList.map((material) => (
                    <div key={material.id} className="border rounded-lg p-4 flex justify-between items-start">
                        <div className="flex-1 space-y-1 pr-4">
                            <p className="font-bold break-words">{material.name}</p>
                            <p className="text-sm text-muted-foreground break-words">{material.description || '-'}</p>
                            <p className="text-sm font-medium pt-1">
                                Qty: <span className="font-bold text-primary">{material.quantity}</span>
                            </p>
                        </div>
                        {isOwner && (
                             <div className="flex-shrink-0">
                                <DeleteMaterialDialog materialId={material.id} materialName={material.name} />
                            </div>
                        )}
                    </div>
                ))}
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
        
        {isOwner && (
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={handleDownloadPdf} className="w-full sm:w-auto">
              <FileDown className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            <FillStockModal materials={materials} />
            <AddMaterialModal />
          </div>
        )}
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

      {isOwner && (
        <Alert>
            <Terminal className="h-4 w-4" />
            <AlertTitle className="font-headline">Admin Tip!</AlertTitle>
            <AlertDescription>
                You are viewing as an owner because the URL contains <code className="font-mono bg-muted px-1.5 py-1 rounded-sm text-xs">/admin</code>. To disable this, navigate to a URL without it.
            </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
