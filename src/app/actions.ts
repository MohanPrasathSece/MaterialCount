// This directive marks this file as a "Server Action" file.
// Server Actions are asynchronous functions that are executed on the server.
// They can be called from client-side components, for example, to handle form submissions.
"use server";

// Import 'revalidatePath' from Next.js cache to manually re-validate cache for a specific path.
// This is useful when data is updated and you want to show the latest data.
import { revalidatePath } from "next/cache";

// Import MongoDB database instance and functions for database operations.
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

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
  // Accept any non-empty category; UI may provide either a selected category or a custom newCategory
  category: z.string().min(1, "Category is required."),
  // Optional prices
  pricePerPiece: z.coerce.number().min(0).optional(),
  pricePerMeter: z.coerce.number().min(0).optional(),
});

// This server action is designed to be used with React's 'useActionState' hook.
// It provides more detailed state updates (loading, success, error messages).
export async function addMaterialAction(prevState: any, formData: FormData) {
  // 'safeParse' validates the form data against the schema.
  // It doesn't throw an error on failure, but returns a success flag and errors.
  const selectedCategory = String(formData.get("category") || "").trim();
  const newCategoryRaw = String(formData.get("newCategory") || "").trim();
  const finalCategory = newCategoryRaw || selectedCategory;
  const validatedFields = materialSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    quantity: formData.get("quantity"),
    category: finalCategory,
    pricePerPiece: formData.get("pricePerPiece"),
    pricePerMeter: formData.get("pricePerMeter"),
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
    const db = await getDatabase();
    const { pricePerPiece = undefined, pricePerMeter = undefined, ...rest } = validatedFields.data as any;
    const pc = Number(pricePerPiece ?? 0) || 0;
    const pm = Number(pricePerMeter ?? 0) || 0;
    const doc: Record<string, any> = { ...rest };
    if (pc > 0 && pm > 0) {
      // Prefer per-piece if both provided
      doc.pricePerPiece = pc;
    } else if (pc > 0) {
      doc.pricePerPiece = pc;
    } else if (pm > 0) {
      doc.pricePerMeter = pm;
    }
    await db.collection("materials").insertOne(doc);
    
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

// Optional: normalize existing materials to keep only one of pricePerPiece/pricePerMeter when both > 0
export async function normalizeMaterialPricesAction() {
  try {
    const db = await getDatabase();
    const mats = await db.collection("materials").find({}).toArray();
    const ops: any[] = [];
    for (const m of mats) {
      const pc = Number(m.pricePerPiece ?? 0) || 0;
      const pm = Number(m.pricePerMeter ?? 0) || 0;
      if (pc > 0 && pm > 0) {
        ops.push({
          updateOne: {
            filter: { _id: m._id },
            update: { $unset: { pricePerMeter: "" } },
          },
        });
      }
    }
    if (ops.length) await db.collection("materials").bulkWrite(ops);
    revalidatePath("/stock");
    revalidatePath("/stock/admin");
    return { success: true, normalized: ops.length };
  } catch (e) {
    console.error("normalizeMaterialPricesAction error", e);
    return { success: false };
  }
}

// FormData-based server action wrapper for client forms
export async function adjustMaterialQuantityAction(prevState: any, formData: FormData) {
  const materialId = String(formData.get("materialId") || "");
  const adjustment = Number(formData.get("adjustment") || 0);
  const submissionId = Date.now();
  if (!materialId || !Number.isFinite(adjustment)) {
    return { success: false, message: "Invalid parameters.", submissionId } as any;
  }
  const res = await adjustMaterialQuantity(materialId, adjustment);
  return { ...res, submissionId } as any;
}

// Schema for In/Out quantity adjustments
const stockAdjustmentSchema = z.object({
  materialId: z.string().min(1, "Material ID is required."),
  materialName: z.string().min(1, "Material name is required."),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1."),
  type: z.enum(['in', 'out'], { errorMap: () => ({ message: "Type must be 'in' or 'out'." }) }),
  reason: z.string().optional(),
});

const clientStockAdjustmentSchema = stockAdjustmentSchema.extend({
  clientId: z.string().min(1, "Client ID is required."),
});

// Server action for In/Out quantity adjustments
export async function stockAdjustmentAction(prevState: any, formData: FormData) {
  const submissionId = Date.now();
  
  const validatedFields = stockAdjustmentSchema.safeParse({
    materialId: formData.get("materialId"),
    materialName: formData.get("materialName"),
    quantity: formData.get("quantity"),
    type: formData.get("type"),
    reason: formData.get("reason"),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Invalid data submitted.",
      errors: validatedFields.error.flatten().fieldErrors,
      submissionId,
    };
  }

  const { materialId, materialName, quantity, type, reason } = validatedFields.data;

  try {
    const db = await getDatabase();
    
    // Fetch current material
    const material = await db.collection('materials').findOne({ _id: new ObjectId(materialId) });
    
    if (!material) {
      return {
        success: false,
        message: "Material not found.",
        submissionId,
      };
    }

    const currentStock = material.quantity || 0;
    
    // Calculate new stock based on type
    let newStock: number;
    let stockChange: number;
    
    if (type === 'in') {
      // In: Add to stock
      newStock = currentStock + quantity;
      stockChange = quantity;
    } else {
      // Out: Reduce from stock
      if (quantity > currentStock) {
        return {
          success: false,
          message: `Insufficient stock. Available: ${currentStock}, Requested: ${quantity}`,
          submissionId,
        };
      }
      newStock = currentStock - quantity;
      stockChange = -quantity;
    }

    // Update material stock
    await db.collection('materials').updateOne(
      { _id: new ObjectId(materialId) },
      { $set: { quantity: newStock } }
    );

    // Record in stock history
    await db.collection('stockHistory').insertOne({
      materialId,
      materialName,
      type,
      quantity,
      previousStock: currentStock,
      newStock,
      reason: reason || (type === 'in' ? 'Stock Added' : 'Stock Removed'),
      date: new Date(),
    });

    // Revalidate paths
    revalidatePath('/stock');
    revalidatePath('/dashboard');
    revalidatePath('/needs-to-buy');

    return {
      success: true,
      message: type === 'in' 
        ? `Added ${quantity} units. New stock: ${newStock}` 
        : `Removed ${quantity} units. New stock: ${newStock}`,
      submissionId,
    };

  } catch (error: any) {
    console.error("Error adjusting stock:", error);
    return {
      success: false,
      message: "Server error occurred. Please try again.",
      submissionId,
    };
  }
}

// Server action to delete a material from the database.
export async function deleteMaterial(materialId: string) {
  // Check if a material ID was provided. This is a basic safeguard.
  if (!materialId) {
    return { success: false, error: "Material ID is required." };
  }
  try {
    const db = await getDatabase();
    await db.collection("materials").deleteOne({ _id: new ObjectId(materialId) });
    
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
    const updates: { id: string; rate: number; gstPercent: number; pricePerPiece?: number; pricePerMeter?: number }[] = [];
    const temp: Record<string, any> = {};
    for (const [key, value] of formData.entries()) {
      const match = key.match(/^pricing\[(.+)\]\[(rate|gstPercent|pricePerPiece|pricePerMeter)\]$/);
      if (match) {
        const [, id, field] = match;
        if (!temp[id]) temp[id] = {};
        temp[id][field] = value;
      }
    }

    for (const id of Object.keys(temp)) {
      const rate = Number(temp[id].rate ?? 0) || 0;
      const gstPercent = Number(temp[id].gstPercent ?? 0) || 0;
      const pricePerPiece = temp[id].pricePerPiece !== undefined ? Number(temp[id].pricePerPiece) || 0 : undefined;
      const pricePerMeter = temp[id].pricePerMeter !== undefined ? Number(temp[id].pricePerMeter) || 0 : undefined;
      updates.push({ id, rate, gstPercent, pricePerPiece, pricePerMeter });
    }

    if (updates.length === 0) {
      return { success: false, message: "No pricing changes provided." };
    }

    const db = await getDatabase();
    const bulkOps = updates.map(u => {
      const $set: Record<string, any> = { rate: u.rate, gstPercent: u.gstPercent };
      const $unset: Record<string, any> = {};
      const hasPc = u.pricePerPiece !== undefined;
      const hasPm = u.pricePerMeter !== undefined;
      const pc = Number(u.pricePerPiece ?? 0) || 0;
      const pm = Number(u.pricePerMeter ?? 0) || 0;
      if (hasPc) {
        $set.pricePerPiece = pc;
        if (pc > 0) $unset.pricePerMeter = "";
      }
      if (hasPm) {
        $set.pricePerMeter = pm;
        if (pm > 0) $unset.pricePerPiece = "";
      }
      const update: Record<string, any> = {};
      if (Object.keys($set).length) update.$set = $set;
      if (Object.keys($unset).length) update.$unset = $unset;
      return {
        updateOne: {
          filter: { _id: new ObjectId(u.id) },
          update,
        }
      };
    });
    
    await db.collection("materials").bulkWrite(bulkOps);
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
    const db = await getDatabase();
    
    // Check if the consumer number already exists
    const consumerNo = validatedFields.data.consumerNo;
    const existingClient = await db.collection("clients").findOne({ consumerNo });

    if (existingClient) {
      return {
        success: false,
        message: "A client with this consumer number already exists.",
        errors: {
          consumerNo: ["This consumer number is already in use."],
        },
      };
    }

    // Add a new document to the "clients" collection with the validated data.
    const result = await db.collection("clients").insertOne({
      name: validatedFields.data.name,
      address: validatedFields.data.address,
      plantCapacity: validatedFields.data.plantCapacity,
      consumerNo: validatedFields.data.consumerNo,
    });
    
    // Revalidate the client material page to ensure the new client appears in the grid.
    revalidatePath("/client-material");
    
    // Return success status, a message, and the new client's ID.
    // The ID can be be used on the client-side to redirect to the new client's detail page.
    return { success: true, message: "Client added successfully.", clientId: result.insertedId.toString() };
  } catch (error) {
    // Log the error and return a failure message.
    console.error("Error adding client:", error);
    return { success: false, message: "Failed to add client." };
  }
}


// Server action to seed the database with initial dummy data.
// This function is designed to be called automatically if the database is found to be empty.
export async function seedData() {
  try {
    const db = await getDatabase();
    
    // First, perform a quick check to see if there's any data in the 'materials' collection.
    const materialsCount = await db.collection("materials").countDocuments({}, { limit: 1 });

    // Only proceed to seed if the collection is empty.
    if (materialsCount === 0) {
        console.log("Database is empty. Seeding with mock data...");
        
        // Insert mock materials
        await db.collection("materials").insertMany(mockMaterials);
        
        // Insert mock clients
        await db.collection("clients").insertMany(mockClients);

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

  const historyItems: { materialId: string; materialName: string; quantityAdded: number }[] = [];
  let totalItemsAdded = 0;

  try {
    const db = await getDatabase();
    
    for (const materialId in validatedFields.data) {
      const quantityToAdd = validatedFields.data[materialId];
      if (quantityToAdd > 0) {
        const material = await db.collection("materials").findOne({ _id: new ObjectId(materialId) });

        if (material) {
          const currentQuantity = material.quantity;
          const newQuantity = currentQuantity + quantityToAdd;
          await db.collection("materials").updateOne(
            { _id: new ObjectId(materialId) },
            { $set: { quantity: newQuantity } }
          );
          
          historyItems.push({
            materialId,
            materialName: material.name,
            quantityAdded: quantityToAdd
          });
          totalItemsAdded += quantityToAdd;
        }
      }
    }

    if (historyItems.length > 0) {
      await db.collection("stockHistory").insertOne({
        timestamp: new Date(),
        items: historyItems,
        totalItems: totalItemsAdded,
      });
    }

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
    const db = await getDatabase();
    const backupObject: any = {};

    // 1. Backup materials
    const materials = await db.collection("materials").find({}).toArray();
    backupObject.materials = materials.map(doc => ({ 
      id: doc._id.toString(), 
      ...doc,
      _id: undefined 
    }));

    // 2. Backup stockHistory
    const stockHistory = await db.collection("stockHistory").find({}).toArray();
    backupObject.stockHistory = stockHistory.map(doc => ({ 
      id: doc._id.toString(), 
      ...doc,
      _id: undefined 
    }));

    // 3. Backup clients and their material entries
    const clients = await db.collection("clients").find({}).toArray();
    backupObject.clients = [];
    
    for (const client of clients) {
      const clientId = client._id.toString();
      
      // Get material entries for this client
      const materialEntries = await db.collection("client_material_entries")
        .find({ clientId })
        .toArray();
      
      backupObject.clients.push({
        id: clientId,
        ...client,
        _id: undefined,
        materialEntries: materialEntries.map(entry => ({
          id: entry._id.toString(),
          ...entry,
          _id: undefined,
        })),
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
    const db = await getDatabase();
    
    console.log("Deleting old data...");
    // Delete all old data
    await db.collection("materials").deleteMany({});
    await db.collection("stockHistory").deleteMany({});
    await db.collection("clients").deleteMany({});
    await db.collection("client_material_entries").deleteMany({});
    console.log("Old data deleted successfully.");

    console.log("Restoring new data...");
    
    // Restore materials
    if (data.materials.length > 0) {
      const materialsToInsert = (data.materials as Material[]).map(material => {
        const { id, ...rest } = material;
        return { _id: new ObjectId(id), ...rest };
      });
      await db.collection("materials").insertMany(materialsToInsert);
    }

    // Restore stock history
    if (data.stockHistory.length > 0) {
      const historyToInsert = (data.stockHistory as StockHistory[]).map(history => {
        const { id, ...rest } = history;
        return { 
          _id: new ObjectId(id), 
          ...rest,
          timestamp: new Date(rest.timestamp)
        };
      });
      await db.collection("stockHistory").insertMany(historyToInsert);
    }

    // Restore clients and their material entries
    for (const client of data.clients as any[]) {
      const { id, materialEntries, ...rest } = client;
      await db.collection("clients").insertOne({ _id: new ObjectId(id), ...rest });
      
      if (materialEntries && materialEntries.length > 0) {
        const entriesToInsert = (materialEntries as ClientMaterialEntry[]).map(entry => {
          const { id: entryId, ...entryRest } = entry;
          return {
            _id: new ObjectId(entryId),
            ...entryRest,
            date: new Date(entryRest.date as any),
          };
        });
        await db.collection("client_material_entries").insertMany(entriesToInsert);
      }
    }

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

// Quick stock adjustment actions
export async function adjustMaterialQuantity(materialId: string, adjustment: number) {
  try {
    const db = await getDatabase();
    const material = await db.collection("materials").findOne({ _id: new ObjectId(materialId) });
    
    if (!material) {
      return { success: false, message: "Material not found." };
    }

    const newQuantity = Math.max(0, material.quantity + adjustment);
    
    await db.collection("materials").updateOne(
      { _id: new ObjectId(materialId) },
      { $set: { quantity: newQuantity } }
    );

    // Record in stock history if it's an increase
    if (adjustment > 0) {
      await db.collection("stockHistory").insertOne({
        timestamp: new Date(),
        items: [{
          materialId,
          materialName: material.name,
          quantityAdded: adjustment
        }],
        totalItems: adjustment,
      });
    }

    revalidatePath("/stock");
    revalidatePath("/dashboard");
    revalidatePath("/needs-to-buy");
    
    return { success: true, newQuantity };
  } catch (error) {
    console.error("Error adjusting material quantity:", error);
    return { success: false, message: "Failed to adjust quantity." };
  }
}

// Absolute set: material quantity
export async function setMaterialQuantity(materialId: string, newQuantity: number) {
  try {
    const db = await getDatabase();
    if (!materialId || !Number.isFinite(newQuantity) || newQuantity < 0) {
      return { success: false, message: "Invalid quantity." };
    }
    const material = await db.collection("materials").findOne({ _id: new ObjectId(materialId) });
    if (!material) return { success: false, message: "Material not found." };
    await db.collection("materials").updateOne(
      { _id: new ObjectId(materialId) },
      { $set: { quantity: Math.floor(newQuantity) } }
    );
    revalidatePath("/stock");
    revalidatePath("/dashboard");
    revalidatePath("/needs-to-buy");
    return { success: true };
  } catch (error) {
    console.error("Error setting material quantity:", error);
    return { success: false, message: "Failed to set quantity." };
  }
}

// FormData wrapper for absolute set
export async function setMaterialQuantityAction(prevState: any, formData: FormData) {
  const materialId = String(formData.get("materialId") || "");
  const newQuantity = Number(formData.get("newQuantity") || 0);
  const submissionId = Date.now();
  const res = await setMaterialQuantity(materialId, newQuantity);
  return { ...res, submissionId } as any;
}

// Pricing: single material price setters
const materialPriceSchema = z.object({
  materialId: z.string().min(1),
  pricePerPiece: z.coerce.number().min(0).optional(),
  pricePerMeter: z.coerce.number().min(0).optional(),
});

export async function setMaterialPrices(materialId: string, pricePerPiece?: number, pricePerMeter?: number) {
  try {
    const db = await getDatabase();
    const setUpdate: Record<string, any> = {};
    const unsetUpdate: Record<string, any> = {};
    if (pricePerPiece !== undefined && Number.isFinite(pricePerPiece)) {
      setUpdate.pricePerPiece = pricePerPiece;
      if (pricePerPiece > 0) unsetUpdate.pricePerMeter = "";
    }
    if (pricePerMeter !== undefined && Number.isFinite(pricePerMeter)) {
      setUpdate.pricePerMeter = pricePerMeter;
      if (pricePerMeter > 0) unsetUpdate.pricePerPiece = "";
    }
    if (Object.keys(setUpdate).length === 0 && Object.keys(unsetUpdate).length === 0) {
      return { success: false, message: "No price fields provided." };
    }
    await db.collection("materials").updateOne(
      { _id: new ObjectId(materialId) },
      { ...(Object.keys(setUpdate).length ? { $set: setUpdate } : {}), ...(Object.keys(unsetUpdate).length ? { $unset: unsetUpdate } : {}) }
    );
    // Avoid revalidating /stock here to prevent input resets while typing
    revalidatePath("/stock/admin");
    return { success: true };
  } catch (error) {
    console.error("Error setting material prices:", error);
    return { success: false, message: "Failed to set prices." };
  }
}

export async function setMaterialPricesAction(prevState: any, formData: FormData) {
  const submissionId = Date.now();
  const validated = materialPriceSchema.safeParse({
    materialId: formData.get("materialId"),
    pricePerPiece: formData.get("pricePerPiece"),
    pricePerMeter: formData.get("pricePerMeter"),
  });
  if (!validated.success) {
    return { success: false, message: "Invalid price data.", submissionId } as any;
  }
  const { materialId, pricePerPiece, pricePerMeter } = validated.data as any;
  const res = await setMaterialPrices(materialId, pricePerPiece, pricePerMeter);
  return { ...res, submissionId } as any;
}

// Client-specific In/Out that also updates client usage and costing
export async function clientStockAdjustmentAction(prevState: any, formData: FormData) {
  const submissionId = Date.now();
  const validated = clientStockAdjustmentSchema.safeParse({
    clientId: formData.get("clientId"),
    materialId: formData.get("materialId"),
    materialName: formData.get("materialName"),
    quantity: formData.get("quantity"),
    type: formData.get("type"),
    reason: formData.get("reason"),
  });
  if (!validated.success) {
    return {
      success: false,
      message: "Invalid data submitted.",
      errors: validated.error.flatten().fieldErrors,
      submissionId,
    };
  }
  const { clientId, materialId, materialName, quantity, type, reason } = validated.data;

  try {
    const db = await getDatabase();
    // Adjust global stock same as normal action
    const material = await db.collection('materials').findOne({ _id: new ObjectId(materialId) });
    if (!material) {
      return { success: false, message: "Material not found.", submissionId };
    }
    const currentStock = material.quantity || 0;
    let newStock: number;
    if (type === 'in') {
      newStock = currentStock + quantity;
    } else {
      if (quantity > currentStock) {
        return { success: false, message: `Insufficient stock. Available: ${currentStock}, Requested: ${quantity}`, submissionId };
      }
      newStock = currentStock - quantity;
    }
    await db.collection('materials').updateOne({ _id: new ObjectId(materialId) }, { $set: { quantity: newStock } });
    // Record client entry
    await db.collection('client_material_entries').insertOne({
      clientId,
      type,
      date: new Date(),
      reason: reason || (type === 'in' ? 'Client Return' : 'Client Dispatch'),
      materials: [
        { materialId, materialName, quantity }
      ],
    });
    // Recompute client costing and upsert snapshot for quick load
    const entries = await db.collection('client_material_entries').find({ clientId }).toArray();
    const usageMap = new Map<string, { name: string; qty: number }>();
    for (const entry of entries as any[]) {
      const sign = entry.type === 'in' ? -1 : 1;
      const items: any[] = Array.isArray(entry.materials) ? entry.materials : [];
      for (const it of items) {
        const mid = String(it.materialId || '');
        if (!mid) continue;
        const name = String(it.materialName || '');
        const q = Number(it.quantity) || 0;
        const prev = usageMap.get(mid) || { name, qty: 0 };
        usageMap.set(mid, { name: prev.name || name, qty: prev.qty + sign * q });
      }
    }
    const materialIds = Array.from(usageMap.keys());
    const validObjIds = materialIds.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id));
    const mats = validObjIds.length > 0 ? await db.collection('materials').find({ _id: { $in: validObjIds } }).toArray() : [];
    const byId: Record<string, any> = {};
    const byName: Record<string, any> = {};
    for (const m of mats) { byId[m._id.toString()] = m; if (m.name) byName[String(m.name).toLowerCase()] = m; }
    const items = materialIds.map(id => {
      const u = usageMap.get(id)!;
      const qty = Math.max(0, Number(u.qty) || 0);
      let m = byId[id] || {};
      if (!m || Object.keys(m).length === 0) {
        const key = String(u.name || '').toLowerCase();
        if (key && byName[key]) m = byName[key];
      }
      const pp = Number(m?.pricePerPiece ?? 0) || 0;
      const pm = Number(m?.pricePerMeter ?? 0) || 0;
      const r = Number(m?.rate ?? 0) || 0;
      const unitPrice = pp > 0 ? pp : pm > 0 ? pm : r > 0 ? r : 0;
      const gstPercent = Number(m.gstPercent) || 0;
      const base = qty * unitPrice;
      const gst = base * (gstPercent / 100);
      const total = base + gst;
      return { materialId: id, name: u.name || m.name || '', qty, rate: unitPrice, gstPercent, base, gst, total };
    }).filter(r => r.qty > 0).sort((a, b) => a.name.localeCompare(b.name));
    const beforeTax = items.reduce((s, r) => s + r.base, 0);
    const gstSum = items.reduce((s, r) => s + r.gst, 0);
    const grand = beforeTax + gstSum;
    await db.collection('client_costing').updateOne(
      { clientId },
      { $set: { clientId, items, beforeTax, gst: gstSum, grand, updatedAt: new Date() } },
      { upsert: true }
    );

    // Revalidate
    revalidatePath(`/client-costing/${clientId}`);
    revalidatePath(`/client-material/${clientId}`);
    revalidatePath('/stock');
    return {
      success: true,
      message: type === 'in' ? `Client returned ${quantity}. New stock: ${newStock}` : `Client used ${quantity}. New stock: ${newStock}`,
      submissionId,
    };
  } catch (error) {
    console.error('Error in client stock adjustment:', error);
    return { success: false, message: 'Server error occurred. Please try again.', submissionId };
  }
}
