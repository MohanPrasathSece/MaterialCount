"use client";

import { useState, useEffect } from "react";
import type { Client } from "@/lib/types";

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch('/api/clients');
        if (!response.ok) {
          throw new Error('Failed to fetch clients');
        }
        const data = await response.json();
        setClients(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching clients:", error);
        setLoading(false);
      }
    };

    fetchClients();
    
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchClients, 5000);
    
    return () => clearInterval(interval);
  }, []);

  return { clients, loading };
}
