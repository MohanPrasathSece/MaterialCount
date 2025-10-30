"use client";

import { useState } from "react";
import { useOwner } from "@/hooks/use-owner";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { backupData } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";

export function BackupData() {
  const isOwner = useOwner();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleBackup = async () => {
    setLoading(true);
    toast({
      title: "Creating Backup",
      description: "Fetching all data from the database. This may take a moment...",
    });

    const result = await backupData();

    if (result.success && result.data) {
      try {
        const jsonString = JSON.stringify(result.data, (key, value) => {
          // Custom replacer to handle Firestore Timestamps
          if (value && typeof value === 'object' && value.seconds !== undefined && value.nanoseconds !== undefined) {
              return new Date(value.seconds * 1000 + value.nanoseconds / 1000000).toISOString();
          }
          return value;
        }, 2);
        
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `firebase-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
          title: "Backup Successful",
          description: "Your data has been downloaded as a JSON file.",
        });
      } catch (e) {
          toast({
            variant: "destructive",
            title: "Error Creating File",
            description: "Could not create the backup file on your device.",
          });
      }
    } else {
      toast({
        variant: "destructive",
        title: "Backup Failed",
        description: result.message || "An unknown error occurred.",
      });
    }

    setLoading(false);
  };

  if (!isOwner) {
    return null;
  }

  return (
    <Card className="bg-muted/40 border-dashed">
      <CardHeader>
        <CardTitle className="font-headline">Admin Controls</CardTitle>
        <CardDescription>
          As an owner, you can perform administrative actions like creating a full backup of the database.
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button 
            onClick={handleBackup} 
            disabled={loading}
            // 💡 FIX: Forces button to full width on mobile, then auto on small screens and up.
            className="w-full sm:w-auto" 
        >
          <Download className="w-4 h-4 mr-2" />
          {loading ? "Backing up..." : "Take Backup"}
        </Button>
      </CardFooter>
    </Card>
  );
}