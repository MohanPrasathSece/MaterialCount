// This directive specifies that this is a Client Component, which is necessary
// because it uses React hooks like 'useState', 'useRef', 'useEffect', and 'useActionState'.
"use client";

// Import necessary hooks from React for managing state, form references, and side effects.
import { useState, useRef, useActionState, useEffect } from "react";
// Import 'useFormStatus' to get the pending state of a form submission.
import { useFormStatus } from "react-dom";
// Import an icon for the button.
import { PlusCircle } from "lucide-react";
// Import UI components from the component library.
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Import the server action that will handle adding a new material to the database.
import { addMaterialAction } from "@/app/actions";
// Import the custom hook for showing toast notifications.
import { useToast } from "@/hooks/use-toast";
// Import the Textarea component for multi-line input.
import { Textarea } from "../ui/textarea";

// A dedicated component for the submit button.
// This is a common pattern when using 'useFormStatus' because the hook must be used
// in a component that is a child of the <form> element.
function SubmitButton() {
  // The 'pending' property from 'useFormStatus' is true when the form is being submitted.
  const { pending } = useFormStatus();
  return (
    // Disable the button while the form is pending to prevent multiple submissions.
    <Button type="submit" disabled={pending}>
      {/* Change the button text to give the user visual feedback. */}
      {pending ? "Adding..." : "Add Material"}
    </Button>
  );
}

// Defines the initial shape of the state object that will be managed by 'useActionState'.
// This helps ensure type safety and predictability.
const initialState = {
  success: false,
  message: null,
  errors: null,
};


// This is the main component for the "Add Material" modal dialog.
export function AddMaterialModal() {
  // State to control whether the dialog is open or closed.
  const [open, setOpen] = useState(false);
  // A ref to the form element, used to programmatically reset the form.
  const formRef = useRef<HTMLFormElement>(null);
  // The 'toast' function for showing notifications.
  const { toast } = useToast();
  // 'useActionState' is a React hook that manages the state of a form action.
  // It takes the server action ('addMaterialAction') and the initial state as arguments.
  // It returns the current state and a wrapped action function ('formAction') to be used in the form.
  const [state, formAction] = useActionState(addMaterialAction, initialState);
  const [categoryMode, setCategoryMode] = useState<"existing" | "new">("existing");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [pricePerPiece, setPricePerPiece] = useState<string>("");
  const [pricePerMeter, setPricePerMeter] = useState<string>("");

  // The 'useEffect' hook runs after the component renders and whenever 'state' changes.
  // This is the perfect place to handle the result of the form submission.
  useEffect(() => {
    // We only want to show a toast if there is a message from the server action.
    if (state.message) {
      if (state.success) {
        // If the action was successful, show a success toast.
        toast({
          title: "Success",
          description: state.message,
        });
        // Close the modal dialog.
        setOpen(false);
        // Reset the form fields to be empty for the next time the modal is opened.
        formRef.current?.reset();
        // Also reset local states for controlled inputs
        setPricePerPiece("");
        setPricePerMeter("");
        setSelectedCategory("");
        setCategoryMode("existing");
      } else {
        // If the action was not successful (e.g., validation error), show a destructive toast.
        toast({
          variant: "destructive",
          title: "Error",
          description: state.message,
        });
      }
    }
  // The dependency array ensures this effect only runs when the 'state' or 'toast' objects change.
  }, [state, toast]);
  
  // Render the component's JSX.
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* The DialogTrigger wraps the button that opens the modal. */}
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="w-4 h-4 mr-2" />
          Add Material
        </Button>
      </DialogTrigger>
      {/* DialogContent contains the modal's content. */}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Add New Material</DialogTitle>
        </DialogHeader>
        {/* The form element uses the ref and calls the 'formAction' on submission. */}
        <form ref={formRef} action={formAction} className="space-y-4">
          {/* Input field for the material's name. */}
          <div className="space-y-2">
            <Label htmlFor="name">Material Name</Label>
             <Input 
              id="name" 
              name="name" 
              placeholder="e.g., Steel Rods" 
              required 
              onInput={(e) => {
                const target = e.target as HTMLInputElement;
                // Allow letters, spaces, hyphens, and apostrophes
                target.value = target.value.replace(/[^A-Za-z\s'-]/g, '');
              }}
            />
            {/* Display validation errors for the 'name' field, if any. */}
             {state.errors?.name && <p className="text-sm text-destructive">{state.errors.name[0]}</p>}
          </div>
          {/* Textarea for the material's description. */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" placeholder="e.g., 10mm thick, 2m long" required />
            {/* Display validation errors for the 'description' field, if any. */}
            {state.errors?.description && <p className="text-sm text-destructive">{state.errors.description[0]}</p>}
          </div>
          {/* Input field for the material's quantity. */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input id="quantity" name="quantity" type="number" placeholder="e.g., 100" required min="0" />
            {/* Display validation errors for the 'quantity' field, if any. */}
            {state.errors?.quantity && <p className="text-sm text-destructive">{state.errors.quantity[0]}</p>}
          </div>
          {/* Category selection or new category creation */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <input type="hidden" name="category" value={categoryMode === "existing" ? selectedCategory : ""} />
            <div className="grid grid-cols-1 gap-2">
              <Select
                value={categoryMode === "existing" ? selectedCategory : "__new__"}
                onValueChange={(val) => {
                  if (val === "__new__") {
                    setCategoryMode("new");
                    setSelectedCategory("");
                  } else {
                    setCategoryMode("existing");
                    setSelectedCategory(val);
                  }
                }}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select or create a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Wiring">Wiring</SelectItem>
                  <SelectItem value="Fabrication">Fabrication</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                  <SelectItem value="__new__">Create new…</SelectItem>
                </SelectContent>
              </Select>
              {categoryMode === "new" && (
                <div className="space-y-1">
                  <Label htmlFor="newCategory" className="text-muted-foreground">New Category</Label>
                  <Input id="newCategory" name="newCategory" placeholder="e.g., Hardware" />
                </div>
              )}
              {state.errors?.category && <p className="text-sm text-destructive">{state.errors.category[0]}</p>}
            </div>
          </div>
          {/* Optional Pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pricePerPiece">Price per Piece (optional)</Label>
              <Input
                id="pricePerPiece"
                name="pricePerPiece"
                type="number"
                min={0}
                step={0.01}
                inputMode="decimal"
                value={pricePerPiece}
                onChange={(e) => {
                  setPricePerPiece(e.target.value);
                  if ((Number(e.target.value) || 0) > 0) {
                    setPricePerMeter("");
                  }
                }}
                placeholder="e.g., 12.50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pricePerMeter">Price per Meter (optional)</Label>
              <Input
                id="pricePerMeter"
                name="pricePerMeter"
                type="number"
                min={0}
                step={0.01}
                inputMode="decimal"
                value={pricePerMeter}
                onChange={(e) => {
                  setPricePerMeter(e.target.value);
                  if ((Number(e.target.value) || 0) > 0) {
                    setPricePerPiece("");
                  }
                }}
                placeholder="e.g., 8.75"
              />
            </div>
          </div>
          <DialogFooter>
            {/* The 'Cancel' button closes the dialog. */}
            <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
            </DialogClose>
            {/* The custom 'SubmitButton' component which shows the pending state. */}
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
