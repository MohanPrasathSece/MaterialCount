// This file defines the main dashboard page of the application.

// Import Firestore database functions for checking data.
import { collection, getDocs, limit, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Import server action for seeding data.
import { seedData } from "@/app/actions";
// Import icons from the 'lucide-react' library.
import { Package, Users, Info } from "lucide-react";
// Import components for displaying material inventory and client grid.
import { MaterialInventory } from "@/components/materials/MaterialInventory";
import { ClientGrid } from "@/components/clients/ClientGrid";
// Import UI components from ShadCN.
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


// This is the main React component for the dashboard page.
// It is an 'async' component, which allows us to use 'await' at the top level.
export default async function DashboardPage() {
  
  // This line automatically calls the 'seedData' server action when the dashboard is loaded.
  // The 'seedData' function itself contains logic to check if data already exists,
  // so it will only run the seeding process once when the database is empty.
  // This is a simple way to ensure the application has initial data without manual intervention.
  await seedData();

  // We perform a check here to see if any data exists in the database.
  // This helps us display a more user-friendly message on the dashboard if it's empty.
  const materialsQuery = query(collection(db, "materials"), limit(1));
  const materialsSnap = await getDocs(materialsQuery);
  const dataExists = !materialsSnap.empty;


  // If no data exists, we show a welcome message instead of the main dashboard content.
  // This improves the experience for a first-time user.
  if (!dataExists) {
    return (
      <main className="flex-1 p-4 md:p-8 lg:p-10">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle className="font-headline">Welcome to Future Energy Dashboard!</AlertTitle>
          <AlertDescription>
            Your database is currently empty. The application has automatically seeded some dummy data for you. Please refresh the page to see the populated dashboard.
          </AlertDescription>
        </Alert>
      </main>
    )
  }

  return (
    // The 'main' element is the primary content area of the page.
    // Spacing utilities are used for layout.
    <main className="flex-1 p-4 md:p-8 lg:p-10 space-y-8">
      {/* This grid lays out the main dashboard cards. 
          It's a responsive grid that adjusts the number of columns based on screen size. */}
      <div className="grid gap-8 lg:grid-cols-2 xl:grid-cols-5">
        {/* This div contains the Material Inventory card. 
            On extra-large screens (xl), it spans 3 of the 5 columns. */}
        <div className="xl:col-span-3">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Package className="w-6 h-6" />
                <CardTitle className="font-headline">Material Inventory</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {/* The MaterialInventory component is rendered here. 
                  'showDescription' is false to provide a more compact view on the dashboard. */}
              <MaterialInventory showDescription={false} />
            </CardContent>
          </Card>
        </div>
        {/* This div contains the Clients card. 
            On extra-large screens, it spans the remaining 2 columns. */}
        <div className="xl:col-span-2">
           <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
               <div className="flex items-center gap-2">
                <Users className="w-6 h-6" />
                <CardTitle className="font-headline">Clients</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {/* The ClientGrid component displays a grid of all clients. */}
              <ClientGrid />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
