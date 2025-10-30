"use client";

import { useState, useRef } from "react";
import { useOwner } from "@/hooks/use-owner";
import { Button } from "@/components/ui/button";
import { Download, Upload, ShieldAlert, DatabaseBackup } from "lucide-react";
import { backupData, restoreData } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "../ui/separator";

export function AdminControls() {
  const isOwner = useOwner();
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleTakeBackup = async () => {
    setBackupLoading(true);
    toast({
      title: "Creating Backup",
      description: "Fetching all data from the database. This may take a moment...",
    });

    const result = await backupData();

    if (result.success && result.data) {
      try {
        const jsonString = JSON.stringify(result.data, (key, value) => {
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

    setBackupLoading(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/json") {
      setBackupFile(file);
      setShowRestoreConfirm(true);
    } else {
      toast({
        variant: "destructive",
        title: "Invalid File",
        description: "Please select a valid JSON backup file.",
      });
      if(fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };
  
  const handleRestoreBackup = async () => {
    if (!backupFile) return;

    setRestoreLoading(true);
    setShowRestoreConfirm(false);
    toast({
      title: "Restoring Backup",
      description: "This may take a while. Please do not close this page.",
    });

    try {
        const fileContent = await backupFile.text();
        const backupJson = JSON.parse(fileContent);
        const result = await restoreData(backupJson);

        if (result.success) {
            toast({
                title: "Restore Successful",
                description: result.message,
            });
        } else {
            toast({
                variant: "destructive",
                title: "Restore Failed",
                description: result.message || "An unknown error occurred.",
            });
        }
    } catch(e: any) {
        toast({
            variant: "destructive",
            title: "Error Reading File",
            description: e.message || "Could not read or parse the backup file.",
        });
    }

    setBackupFile(null);
    setRestoreLoading(false);
    if(fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (!isOwner) {
    return null;
  }

  return (
    <>
      <Card className="bg-muted/40 border-dashed">
        <CardHeader>
          <div className="flex items-center gap-2">
            <DatabaseBackup className="w-6 h-6" />
            <CardTitle className="font-headline">Admin Controls</CardTitle>
          </div>
          <CardDescription>
            Perform administrative actions like creating or restoring a database backup.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                    <h3 className="font-semibold">Download Backup</h3>
                    <p className="text-sm text-muted-foreground">
                        Create a full JSON backup of the entire database.
                    </p>
                </div>
                <Button onClick={handleTakeBackup} disabled={backupLoading} className="w-full sm:w-auto shrink-0">
                    <Download className="w-4 h-4 mr-2" />
                    {backupLoading ? "Backing up..." : "Take Backup"}
                </Button>
            </div>

             <Separator />

             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                 <div className="flex-1">
                    <h3 className="font-semibold">Restore from Backup</h3>
                    <p className="text-sm text-muted-foreground">
                        Restore from a JSON file. This will overwrite all existing data.
                    </p>
                </div>
                <input
                    type="file"
                    accept=".json"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                />
                <Button 
                    variant="destructive" 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={restoreLoading}
                    className="w-full sm:w-auto shrink-0"
                >
                    <Upload className="w-4 h-4 mr-2" />
                    {restoreLoading ? "Restoring..." : "Upload Backup"}
                </Button>
            </div>
        </CardContent>
      </Card>

      <AlertDialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
                <ShieldAlert className="w-6 h-6 text-destructive" />
                Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="py-4">
              This action cannot be undone. This will permanently **delete all current data** in the database and replace it with the data from the backup file:
              <br />
              <strong className="mt-2 block">{backupFile?.name}</strong>
              <br />
              Please confirm you want to proceed with the restoration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBackupFile(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleRestoreBackup}
            >
              Yes, Restore Database
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
