// This file contains TypeScript type definitions for the main data structures
// used throughout the application. Using types helps ensure data consistency
// and provides better autocompletion and error-checking during development.

// Defines the structure for a single material in the inventory.
export type Material = {
  id: string;          // Unique identifier for the material, usually the Firestore document ID.
  name: string;        // The name of the material (e.g., "Steel Beams").
  description?: string; // An optional description of the material. The '?' means this property can be undefined.
  quantity: number;    // The current quantity of the material in stock.
  category?: 'Wiring' | 'Fabrication' | 'Other'; // Category for grouping materials.
  rate?: number;       // Optional per-unit rate for costing.
  gstPercent?: number; // Optional GST percentage for this material.
};

// Defines the structure for a client.
export type Client = {
  id: string;          // Unique identifier for the client, usually the Firestore document ID.
  name: string;        // The name of the client (e.g., "Innovate Inc.").
  consumerNo: string;  // Unique consumer number for searching.
  avatarUrl?: string;   // A URL for the client's avatar image (optional).
  address: string;     // The client's address.
  plantCapacity: string; // The capacity of the solar plant (e.g., "5 kW").
};

// This type is no longer used and is replaced by ClientMaterialEntry
export type ClientMaterial = {
    materialId: string; // The ID of the material.
    outQty: number;     // The total quantity of this material taken out by the client.
    inQty: number;      // The total quantity of this material returned by the client.
}

export type ClientMaterialEntryItem = {
    materialId: string;
    materialName: string;
    quantity: number;
    serialNumbers?: string;
}

export type ClientMaterialEntry = {
    id: string;
    clientId: string;
    // When passing from server to client, this will be an ISO string.
    // In MongoDB, it's a Date.
    date: Date | string;
    materials: ClientMaterialEntryItem[];
    type: 'in' | 'out';
    entryTitle: string;
}


// Defines the structure for a stock history record.
export type StockHistoryItem = {
    materialId: string;
    materialName: string;
    quantityAdded: number;
}

export type StockHistory = {
    id: string;
    timestamp: Date;
    items: StockHistoryItem[];
    totalItems: number;
}
