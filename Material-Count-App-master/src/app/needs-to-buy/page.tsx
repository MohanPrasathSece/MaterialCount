
// This file defines the "Needs To Buy" page, which displays materials with low inventory.

// Import MongoDB database instance and functions for data fetching.
import { getDatabase } from "@/lib/mongodb";
// Import UI components from the component library.
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// Import icons from lucide-react.
import { ShoppingCart, Info } from "lucide-react";
// Import the TypeScript type for a Material.
import type { Material } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

// This is the threshold for what is considered "low stock".
const LOW_STOCK_THRESHOLD = 10;

// Asynchronous function to fetch materials that are low in stock from Firestore.
// This is a server-side data fetching function.
async function getLowStockMaterials(): Promise<Material[]> {
  // Get MongoDB database instance
  const db = await getDatabase();
  
  // Query for materials where quantity is less than or equal to threshold
  const materials = await db.collection("materials")
    .find({ quantity: { $lte: LOW_STOCK_THRESHOLD } })
    .toArray();
  
  // Map through the documents to create an array of Material objects.
  // This transforms the raw MongoDB document data into the structure defined by our 'Material' type.
  return materials.map(material => {
      const { _id, ...data } = material;
      return { 
        id: _id.toString(), 
        ...data,
      } as Material;
  });
}


// This is the main React component for the NeedsToBuyPage.
// It's an 'async' component, allowing us to use 'await' for data fetching directly.
export default async function NeedsToBuyPage() {
    // Fetch the low stock materials when the page is rendered on the server.
    const materialsToBuy = await getLowStockMaterials();

    return (
        <div className="p-4 md:p-8 lg:p-10">
            <Card>
                <CardHeader className="flex flex-row items-center gap-2">
                    <ShoppingCart className="w-6 h-6" />
                    <CardTitle className="font-headline">Needs To Buy</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Check if there are any materials to display. */}
                    {materialsToBuy.length > 0 ? (
                       <div className="space-y-4">
                        {materialsToBuy.map((material) => (
                           <Card key={material.id} className="p-4">
                               <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-lg break-words">{material.name}</h3>
                                        <p className="text-sm text-muted-foreground break-words">{material.description}</p>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                                        <span className="text-sm font-medium text-muted-foreground">Qty Remaining:</span>
                                        <Badge variant="destructive" className="text-base">{material.quantity}</Badge>
                                    </div>
                               </div>
                           </Card>
                        ))}
                       </div>
                    ) : (
                        // If all materials are well-stocked, display an informational alert.
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertTitle className="font-headline">All Stocked Up!</AlertTitle>
                            <AlertDescription>
                                There are currently no materials with a quantity of {LOW_STOCK_THRESHOLD} or less.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// This export forces the page to be dynamically rendered for every request.
// This ensures that the low-stock list is always up-to-date.
export const dynamic = 'force-dynamic';

