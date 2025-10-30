import { ClientGrid } from "@/components/clients/ClientGrid";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function ClientMaterialPage() {
  return (
    <div className="p-4 md:p-8 lg:p-10">
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
            <Users className="w-6 h-6" />
            <CardTitle className="font-headline">Client Material</CardTitle>
        </CardHeader>
        <CardContent>
            <ClientGrid />
        </CardContent>
      </Card>
    </div>
  );
}
