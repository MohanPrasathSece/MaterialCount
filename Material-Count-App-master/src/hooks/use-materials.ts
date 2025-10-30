
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import type { Material } from "@/lib/types";

export function useMaterials() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Query for materials ordered by name.
    const q = query(
      collection(db, "materials"), 
      orderBy("category"),
      orderBy("name")
    );
    
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const materialsData: Material[] = [];
        querySnapshot.forEach((doc) => {
          materialsData.push({ id: doc.id, ...doc.data() } as Material);
        });
        setMaterials(materialsData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching materials:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { materials, loading };
}
