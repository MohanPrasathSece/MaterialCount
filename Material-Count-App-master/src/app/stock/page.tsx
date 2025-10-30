// This file defines the page for displaying the full material inventory.

// Import the component responsible for showing the material list.
import { MaterialInventory } from "@/components/materials/MaterialInventory";
// Import UI components from ShadCN.
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Package } from "lucide-react";
import { StockHistory } from "@/components/materials/StockHistory";
import { Separator } from "@/components/ui/separator";
import { AdminControls } from "@/components/admin/AdminControls";

// This is the main React component for the Stock page.
export default function StockPage() {
  return (
    // Add padding around the main content area.
    <div className="p-4 md:p-8 lg:p-10 space-y-8">
      <AdminControls />
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Package className="w-6 h-6" />
          <CardTitle className="font-headline">Full Material Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          {/* The MaterialInventory component is rendered here. 
              By default (without props), it shows all details including the description column. */}
          <MaterialInventory />
        </CardContent>
      </Card>

      <Separator />

      <StockHistory />
    </div>
  );
}
