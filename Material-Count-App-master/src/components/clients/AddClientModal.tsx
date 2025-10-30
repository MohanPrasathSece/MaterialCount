// This directive specifies that this is a Client Component.
// This is necessary because it uses React hooks like 'useState', 'useRef', 'useEffect', and 'useActionState'.
"use client";

// Import necessary hooks from React for managing state, side effects, and form references.
import { useState, useRef, useEffect, useActionState } from "react";
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
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Import the server action that will handle adding a new client to the database.
import { addClientAction } from "@/app/actions";
// Import the custom hook for showing toast notifications.
import { useToast } from "@/hooks/use-toast";
// Import Next.js's router for programmatic navigation.
import { useRouter } from "next/navigation";
import { DialogTrigger } from "@radix-ui/react-dialog";
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
      {pending ? "Adding..." : "Add Client"}
    </Button>
  );
}

// Defines the initial shape of the state object that will be managed by 'useActionState'.
// This helps ensure type safety and predictability.
const initialState = {
  success: false,
  message: null,
  errors: null,
  clientId: null,
};


// This is the main component for the "Add Client" modal dialog.
export function AddClientModal() {
  // State to control whether the dialog is open or closed.
  const [open, setOpen] = useState(false);
  // A ref to the form element, used to programmatically reset the form.
  const formRef = useRef<HTMLFormElement>(null);
  // The 'toast' function for showing notifications.
  const { toast } = useToast();
  // The Next.js router instance.
  const router = useRouter();
  // 'useActionState' is a React hook that manages the state of a form action.
  // It takes the server action ('addClientAction') and the initial state as arguments.
  // It returns the current state and a wrapped action function ('formAction') to be used in the form.
  const [state, formAction] = useActionState(addClientAction, initialState);


  // The 'useEffect' hook runs after the component renders and whenever 'state' changes.
  // This is the perfect place to handle the result of the form submission.
  useEffect(() => {
    // Check if the form submission was successful and we received a new client ID.
    if (state.success && state.clientId) {
        // Show a success toast notification.
        toast({
            title: "Success",
            description: state.message,
        });
        // Close the modal dialog.
        setOpen(false);
        // Reset the form fields to be empty for the next time the modal is opened.
        formRef.current?.reset();
        // Programmatically navigate to the new client's detail page.
        router.push(`/client-material/${state.clientId}`);
    } else if (state.message && !state.success) {
        // If the submission failed (e.g., validation error or database error), show an error toast.
        toast({
            variant: "destructive",
            title: "Error",
            description: state.message,
        });
    }
  // The dependency array ensures this effect only runs when the 'state', 'toast', or 'router' objects change.
  }, [state, toast, router]);
  

  // Render the component's JSX.
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* The DialogTrigger wraps the button that opens the modal. */}
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="w-4 h-4 mr-2" />
          Add New Client
        </Button>
      </DialogTrigger>
      {/* DialogContent contains the modal's content. */}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Add New Client</DialogTitle>
        </DialogHeader>
        {/* The form element uses the ref and calls the 'formAction' on submission. */}
        <form ref={formRef} action={formAction} className="space-y-4">
          {/* Input field for the client's name. */}
          <div className="space-y-2">
            <Label htmlFor="name">Client Name</Label>
              <Input 
                id="name" 
                name="name" 
                placeholder="e.g., John Doe" 
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
           <div className="space-y-2">
            <Label htmlFor="consumerNo">Consumer No.</Label>
            <Input 
              id="consumerNo" 
              name="consumerNo" 
              placeholder="e.g., 123456789012" 
              required
              type="text"
              maxLength={12}
              onInput={(e) => {
                const target = e.target as HTMLInputElement;
                target.value = target.value.replace(/[^0-9]/g, '');
              }}
            />
            {state.errors?.consumerNo && <p className="text-sm text-destructive">{state.errors.consumerNo[0]}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" name="address" placeholder="Gandhinagar" required />
            {state.errors?.address && <p className="text-sm text-destructive">{state.errors.address[0]}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="plantCapacity">Solar Plant Capacity( KW )</Label>
            <Input id="plantCapacity" name="plantCapacity" placeholder="e.g., 5 kW"  type="number"  required />
            {state.errors?.plantCapacity && <p className="text-sm text-destructive">{state.errors.plantCapacity[0]}</p>}
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
