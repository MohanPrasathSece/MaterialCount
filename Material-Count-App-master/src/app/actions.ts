
// This directive marks this file as a "Server Action" file.
// Server Actions are asynchronous functions that are executed on the server.
// They can be called from client-side components, for example, to handle form submissions.
"use server";

// Import 'revalidatePath' from Next.js cache to manually re-validate cache for a specific path.
// This is useful when data is updated and you want to show the latest data.
import { revalidatePath } from "next/cache";

// Import Firestore database instance and functions for database operations.
import { db } from "@/lib/firebase";
import {
  collection, // Reference to a collection
  addDoc, // Add a new document to a collection
  doc, // Reference to a document
  writeBatch, // Perform multiple write operations as a single atomic unit
  runTransaction, // Execute a transaction
  getDocs, // Retrieve all documents in a collection
  query, // Create a query against the collection
  limit, // Limit the number of documents returned
  getDoc, // Retrieve a single document
  deleteDoc,
  serverTimestamp,
  Timestamp,
  collectionGroup,
  where,
} from "firebase/firestore";

// Import 'zod' for schema validation. This helps ensure that the data
// received from forms is in the correct format.
import { z } from "zod";

// Import mock data for seeding the database.
import { mockMaterials, mockClients } from "@/lib/mock-data";
import { Client, ClientMaterialEntry, Material, StockHistory } from "@/lib/types";

// Define a schema for validating material data from a form.
// 'z.object' creates a schema for an object with specified properties.
const materialSchema = z.object({
  // 'name' should be a string with a minimum length of 1.
  name: z.string().min(1, "Material name is required."),
  // 'description' is a required string with a minimum length of 1.
  description: z.string().min(1, "Description is required."),
  // 'quantity' is a number that will be coerced (converted) from a string.
  // It must be an integer and at least 0.
  quantity: z.coerce.number().int().min(0, "Quantity must be a positive number."),
  category: z.enum(["Wiring", "Fabrication", "Other"], {
    required_error: "Category is required.",
  }),
});

// This server action is designed to be used with React's 'useActionState' hook.
// It provides more detailed state updates (loading, success, error messages).
export async function addMaterialAction(prevState: any, formData: FormData) {
  // 'safeParse' validates the form data against the schema.
  // It doesn't throw an error on failure, but returns a success flag and errors.
  const validatedFields = materialSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    quantity: formData.get("quantity"),
    category: formData.get("category"),
  });

  // If validation fails, return detailed error messages.
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Invalid form data.",
      success: false,
    };
  }
 
 

  // 'try...catch' block to handle potential errors during database operations.
  try {
    // 'addDoc' adds a new document to the "materials" collection in Firestore.
    await addDoc(collection(db, "materials"), {
      ...validatedFields.data,
    });
    // 'revalidatePath' tells Next.js to re-fetch data for these paths on the next request.
    // This ensures the UI is updated with the new material.
    revalidatePath("/");
    revalidatePath("/stock");
    // Return a success message.
    return { success: true, message: "Material added successfully." };
  } catch (error) {
    // If an error occurs, log it for debugging and return a failure message.
    console.error("Error adding material:", error);
    return { success: false, message: "Failed to add material. Please try again." };
  }
}

// Server action to delete a material from the database.
export async function deleteMaterial(materialId: string) {
  // Check if a material ID was provided. This is a basic safeguard.
  if (!materialId) {
    return { success: false, error: "Material ID is required." };
  }
  try {
    const materialRef = doc(db, "materials", materialId);
    // Permanently delete the document.
    await deleteDoc(materialRef);
    // Revalidate paths to reflect the deletion in the UI.
    revalidatePath("/");
    revalidatePath("/stock");
    revalidatePath("/needs-to-buy");
    return { success: true };
  } catch (error) {
    // Log the error and return a generic failure message.
    console.error("Error deleting material:", error);
    return { success: false, error: "Failed to delete material." };
  }
}

// Batch update material pricing (rate, gstPercent)
export async function updateMaterialsPricingAction(prevState: any, formData: FormData) {
  try {
    const updates: { id: string; rate: number; gstPercent: number }[] = [];
    const temp: Record<string, any> = {};
    for (const [key, value] of formData.entries()) {
      const match = key.match(/^pricing\[(.+)\]\[(rate|gstPercent)\]$/);
      if (match) {
        const [, id, field] = match;
        if (!temp[id]) temp[id] = {};
        temp[id][field] = value;
      }
    }

    for (const id of Object.keys(temp)) {
      const rate = Number(temp[id].rate ?? 0) || 0;
      const gstPercent = Number(temp[id].gstPercent ?? 0) || 0;
      updates.push({ id, rate, gstPercent });
    }

    if (updates.length === 0) {
      return { success: false, message: "No pricing changes provided." };
    }

    const batch = writeBatch(db);
    for (const u of updates) {
      const ref = doc(db, "materials", u.id);
      batch.update(ref, { rate: u.rate, gstPercent: u.gstPercent });
    }
    await batch.commit();
    revalidatePath("/stock/admin");
    return { success: true, message: "Pricing updated." };
  } catch (error) {
    console.error("Error updating materials pricing:", error);
    return { success: false, message: "Failed to update pricing." };
  }
}

// Schema for validating new client data.
const clientSchema = z.object({
  name: z.string().min(1, "Client name is required."),
  address: z.string().min(1, "Address is required."),
  plantCapacity: z.string().min(1, "Plant capacity is required."),
  consumerNo: z.string().length(12, "Consumer No. must be 12 digits."),
});

// Server action to add a new client. It is designed to be used with 'useActionState'.
export async function addClientAction(prevState: any, formData: FormData) {
  // Validate the form data against the client schema.
  const validatedFields = clientSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address"),
    plantCapacity: formData.get("plantCapacity"),
    consumerNo: formData.get("consumerNo"),
  });

  // If validation fails, return the errors.
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Invalid form data.",
      success: false,
    };
  }

  try {
    // Check if the consumer number already exists
    const consumerNo = validatedFields.data.consumerNo;
    const clientsRef = collection(db, "clients");
    const q = query(clientsRef, where("consumerNo", "==", consumerNo));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return {
        success: false,
        message: "A client with this consumer number already exists.",
        errors: {
          consumerNo: ["This consumer number is already in use."],
        },
      };
    }


    // Add a new document to the "clients" collection with the validated data.
    const docRef = await addDoc(collection(db, "clients"), {
      name: validatedFields.data.name,
      address: validatedFields.data.address,
      plantCapacity: validatedFields.data.plantCapacity,
      consumerNo: validatedFields.data.consumerNo,
    });
    
    // Revalidate the client material page to ensure the new client appears in the grid.
    revalidatePath("/client-material");
    
    // Return success status, a message, and the new client's ID.
    // The ID can be be used on the client-side to redirect to the new client's detail page.
    return { success: true, message: "Client added successfully.", clientId: docRef.id };
  } catch (error) {
    // Log the error and return a failure message.
    console.error("Error adding client:", error);
    return { success: false, message: "Failed to add client." };
  }
}

const materialEntrySheetSchema = z.object({
    materialId: z.string(),
    materialName: z.string(),
    outQty: z.coerce.number().min(0, "Out Qty must be a positive number."),
    inQty: z.coerce.number().min(0, "In Qty must be a positive number."),
    originalOut: z.coerce.number(),
    originalIn: z.coerce.number(),
});

const updateSheetSchema = z.object({
    clientId: z.string(),
    materials: z.array(materialEntrySheetSchema),
});


export async function updateClientSheetAction(prevState: any, formData: FormData) {
    const materialEntries: Record<string, any> = {};
    for (const [key, value] of formData.entries()) {
        const match = key.match(/materials\[(\d+)\]\[(\w+)\]/);
        if (match) {
            const [, index, field] = match;
            if (!materialEntries[index]) {
                materialEntries[index] = {};
            }
            materialEntries[index][field] = value;
        }
    }

    const rawData = {
        clientId: formData.get('clientId'),
        materials: Object.values(materialEntries),
    };
    
    const validatedFields = updateSheetSchema.safeParse(rawData);
    
    if (!validatedFields.success) {
        return {
            success: false,
            message: "Invalid data submitted.",
            errors: validatedFields.error.flatten().fieldErrors,
            submissionId: Date.now(),
        };
    }

    const { clientId, materials: materialsData } = validatedFields.data;
    const now = new Date();

    try {
        const transactionResult = await runTransaction(db, async (transaction) => {
            const fieldErrors: Record<string, string[]> = {};
            const outMaterials: { materialId: string; materialName: string; quantity: number; }[] = [];
            const inMaterials: { materialId: string; materialName: string; quantity: number; }[] = [];
            const stockUpdates: Map<string, number> = new Map();

            // 1. First, read all material documents to get current stock levels.
            const materialRefs = materialsData.map(item => doc(db, 'materials', item.materialId));
            const materialDocs = await Promise.all(materialRefs.map(ref => transaction.get(ref)));
            const materialStockMap = new Map<string, number>();
            materialDocs.forEach(doc => {
                 if (doc.exists()) {
                    materialStockMap.set(doc.id, doc.data().quantity || 0);
                }
            });

            // 2. Process validations and prepare changes.
            for (const [index, item] of materialsData.entries()) {
                const newOut = item.outQty - item.originalOut;
                const newIn = item.inQty - item.originalIn;

                // Validation checks
                if (newOut < 0) {
                    fieldErrors[`materials[${index}].outQty`] = [`Out Qty for "${item.materialName}" cannot be decreased.`];
                }
                if (newIn < 0) {
                    fieldErrors[`materials[${index}].inQty`] = [`In Qty for "${item.materialName}" cannot be decreased.`];
                }
                if (item.inQty > item.outQty) {
                    fieldErrors[`materials[${index}].inQty`] = [`In Qty for "${item.materialName}" cannot be greater than Out Qty.`];
                }

                if (newOut > 0) {
                    const currentStock = materialStockMap.get(item.materialId) || 0;
                    if (newOut > currentStock) {
                        fieldErrors[`materials[${index}].outQty`] = [`Not enough stock for "${item.materialName}". Only ${currentStock} available.`];
                    }
                }

                // If no errors for this item so far, prepare writes
                if (Object.keys(fieldErrors).length === 0) {
                     if (newOut > 0) {
                        outMaterials.push({ materialId: item.materialId, materialName: item.materialName, quantity: newOut });
                    }
                    if (newIn > 0) {
                        inMaterials.push({ materialId: item.materialId, materialName: item.materialName, quantity: newIn });
                    }

                    const stockChange = newIn - newOut;
                    if (stockChange !== 0) {
                        const currentUpdate = stockUpdates.get(item.materialId) || 0;
                        stockUpdates.set(item.materialId, currentUpdate + stockChange);
                    }
                }
            }

            // 3. If any validation errors occurred, return errors and abort.
            if (Object.keys(fieldErrors).length > 0) {
                // By returning inside a transaction, we abort it.
                return { success: false, message: "Please fix the errors before saving.", errors: fieldErrors };
            }
            
            // 4. Perform all write operations.
            // Create history entries
            if (outMaterials.length > 0) {
                const outEntryRef = doc(collection(db, `clients/${clientId}/materialEntries`));
                transaction.set(outEntryRef, {
                    clientId, date: Timestamp.fromDate(now), materials: outMaterials,
                    type: 'out', entryTitle: `Sheet Update - Unloaded`,
                });
            }
            if (inMaterials.length > 0) {
                const inEntryRef = doc(collection(db, `clients/${clientId}/materialEntries`));
                transaction.set(inEntryRef, {
                    clientId, date: Timestamp.fromDate(now), materials: inMaterials,
                    type: 'in', entryTitle: `Sheet Update - Returned`,
                });
            }

            // Update material stock quantities
            for (const [materialId, stockChange] of stockUpdates.entries()) {
                const materialRef = doc(db, 'materials', materialId);
                const currentStock = materialStockMap.get(materialId) || 0;
                transaction.update(materialRef, { quantity: currentStock + stockChange });
            }

            return { success: true, message: 'Client sheet updated successfully.' };
        });

        // 5. If transaction was successful and didn't return errors, revalidate paths.
        if (transactionResult.success) {
            revalidatePath(`/client-material/${clientId}`);
            revalidatePath('/stock');
            revalidatePath('/dashboard');
            revalidatePath('/needs-to-buy');
        }
        
        return { ...transactionResult, submissionId: Date.now() };

    } catch (error: any) {
        console.error("Error updating client sheet:", error);
        return { success: false, message: "An unexpected server error occurred.", submissionId: Date.now() };
    }
}


// Server action to seed the database with initial dummy data.
// This function is designed to be called automatically if the database is found to be empty.
export async function seedData() {
  try {
    // First, perform a quick check to see if there's any data in the 'materials' collection.
    // We only query for one document to be efficient.
    const materialsQuery = query(collection(db, "materials"), limit(1));
    const materialsSnap = await getDocs(materialsQuery);

    // Only proceed to seed if the collection is empty.
    if (materialsSnap.empty) {
        console.log("Database is empty. Seeding with mock data...");
        // A 'writeBatch' allows performing multiple write operations as a single atomic unit.
        // This is much more efficient than sending many individual write requests.
        const batch = writeBatch(db);

        // Add each mock material from the mock-data file to the batch.
        mockMaterials.forEach(material => {
            const docRef = doc(collection(db, "materials")); // Create a new document reference with an auto-generated ID.
            batch.set(docRef, material); // Add the 'set' operation for this material to the batch.
        });

        // Add each mock client from the mock-data file to the batch.
        mockClients.forEach(client => {
            const docRef = doc(collection(db, "clients"));
            batch.set(docRef, client);
        });

        // 'commit' the batch to execute all the write operations together.
        // This is an all-or-nothing operation.
        await batch.commit();

        // Revalidate all relevant paths to make sure the UI shows the new data immediately.
        revalidatePath('/dashboard');
        revalidatePath('/stock');
        revalidatePath('/client-material');
        console.log("Dummy data seeded successfully!");
        return { success: true, message: "Dummy data seeded successfully!" };
    } else {
        // If data already exists, we do nothing.
        console.log("Data already exists. Seeding skipped.");
        return { success: false, message: "Data already exists. Seeding skipped." };
    }
  } catch (error) {
      // Log any errors that occur during the seeding process.
      console.error("Error seeding data:", error);
      return { success: false, message: "Failed to seed data." };
  }
}

const fillStockSchema = z.record(z.coerce.number().int().min(0, "Quantity must be a positive number."));

export async function fillStockAction(prevState: any, formData: FormData) {
  const updates: Record<string, number> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("material-")) {
      const materialId = key.replace("material-", "");
      updates[materialId] = Number(value) || 0;
    }
  }

  const validatedFields = fillStockSchema.safeParse(updates);

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Invalid data. Please ensure all quantities are positive numbers.",
    };
  }

  const batch = writeBatch(db);
  const historyItems: { materialId: string; materialName: string; quantityAdded: number }[] = [];
  let totalItemsAdded = 0;

  try {
    for (const materialId in validatedFields.data) {
      const quantityToAdd = validatedFields.data[materialId];
      if (quantityToAdd > 0) {
        const materialRef = doc(db, "materials", materialId);
        const materialDoc = await getDoc(materialRef);

        if (materialDoc.exists()) {
          const currentQuantity = materialDoc.data().quantity;
          const newQuantity = currentQuantity + quantityToAdd;
          batch.update(materialRef, { quantity: newQuantity });
          
          historyItems.push({
            materialId,
            materialName: materialDoc.data().name,
            quantityAdded: quantityToAdd
          });
          totalItemsAdded += quantityToAdd;
        }
      }
    }

    if (historyItems.length > 0) {
      const historyRef = doc(collection(db, "stockHistory"));
      batch.set(historyRef, {
        timestamp: serverTimestamp(),
        items: historyItems,
        totalItems: totalItemsAdded,
      });
    }

    await batch.commit();
    revalidatePath("/stock");
    revalidatePath("/dashboard");
    revalidatePath("/needs-to-buy");
    return { success: true, message: "Stock quantities updated successfully." };
  } catch (error: any) {
    console.error("Error filling stock:", error);
    return { success: false, message: error.message || "Failed to update stock." };
  }
}

export async function backupData() {
  try {
    const backupObject: any = {};

    // 1. Backup materials
    const materialsSnap = await getDocs(collection(db, "materials"));
    backupObject.materials = materialsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 2. Backup stockHistory
    const stockHistorySnap = await getDocs(collection(db, "stockHistory"));
    backupObject.stockHistory = stockHistorySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 3. Backup clients and their subcollections
    const clientsSnap = await getDocs(collection(db, "clients"));
    backupObject.clients = [];
    for (const clientDoc of clientsSnap.docs) {
      const clientData = { id: clientDoc.id, ...clientDoc.data() };

      // Backup materialEntries subcollection for each client
      const materialEntriesSnap = await getDocs(collection(db, "clients", clientDoc.id, "materialEntries"));
      const materialEntries = materialEntriesSnap.docs.map(entryDoc => ({ id: entryDoc.id, ...entryDoc.data() }));
      
      backupObject.clients.push({
        ...clientData,
        materialEntries: materialEntries,
      });
    }

    return { success: true, data: backupObject };
  } catch (error) {
    console.error("Error backing up data:", error);
    return { success: false, message: "Failed to create backup." };
  }
}

const backupSchema = z.object({
  materials: z.array(z.any()),
  clients: z.array(z.any()),
  stockHistory: z.array(z.any()),
});


export async function restoreData(backup: unknown) {
  const validation = backupSchema.safeParse(backup);
  if (!validation.success) {
    console.error("Invalid backup file structure:", validation.error);
    return { success: false, message: "Invalid backup file structure." };
  }
  const data = validation.data;

  try {
    // Transaction to delete all old data
    await runTransaction(db, async (transaction) => {
      console.log("Deleting old data...");
      const collectionsToDelete = [
        collection(db, "materials"),
        collection(db, "stockHistory"),
        collection(db, "clients"),
      ];
      // Also need to delete all subcollections
      const allMaterialEntries = await getDocs(collectionGroup(db, 'materialEntries'));

      const deletePromises: Promise<any>[] = [];
      
      for (const coll of collectionsToDelete) {
        const snapshot = await getDocs(coll);
        snapshot.docs.forEach(doc => transaction.delete(doc.ref));
      }
      allMaterialEntries.docs.forEach(doc => transaction.delete(doc.ref));
      console.log("Old data deletion transaction prepared.");
    });
     console.log("Old data deleted successfully.");

    // Batch write to add all new data
    const batch = writeBatch(db);
    
    console.log("Restoring new data...");
    (data.materials as Material[]).forEach(material => {
      const { id, ...rest } = material;
      batch.set(doc(db, "materials", id), rest);
    });

    (data.stockHistory as StockHistory[]).forEach(history => {
        const { id, ...rest } = history;
        // Convert ISO string back to Firestore Timestamp
        const timestamp = Timestamp.fromDate(new Date(rest.timestamp as any));
        batch.set(doc(db, "stockHistory", id), {...rest, timestamp});
    });

    (data.clients as any[]).forEach(client => {
      const { id, materialEntries, ...rest } = client;
      batch.set(doc(db, "clients", id), rest);
      
      (materialEntries as ClientMaterialEntry[]).forEach(entry => {
        const { id: entryId, ...entryRest } = entry;
         // Convert ISO string back to Firestore Timestamp
        const date = Timestamp.fromDate(new Date(entryRest.date as any));
        batch.set(doc(db, `clients/${id}/materialEntries`, entryId), {...entryRest, date});
      });
    });

    await batch.commit();
    console.log("New data restored successfully.");

    revalidatePath("/dashboard");
    revalidatePath("/stock");
    revalidatePath("/client-material");
    revalidatePath("/needs-to-buy");

    return { success: true, message: "Data restored successfully from backup." };
  } catch (error) {
    console.error("Error during restore process:", error);
    return { success: false, message: `Failed to restore data: ${error}` };
  }
}

    
