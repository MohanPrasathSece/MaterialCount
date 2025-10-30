"use client";

import { useState, useEffect } from "react";
import type { Material } from "@/lib/types";

export function useMaterials() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const response = await fetch('/api/materials');
        if (!response.ok) {
          throw new Error('Failed to fetch materials');
        }
        const data = await response.json();
        setMaterials(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching materials:", error);
        setLoading(false);
      }
    };

    fetchMaterials();
    
    // Poll for updates more frequently so availability reflects quickly
    const interval = setInterval(fetchMaterials, 1500);
    
    return () => clearInterval(interval);
  }, []);

  return { materials, loading };
}
