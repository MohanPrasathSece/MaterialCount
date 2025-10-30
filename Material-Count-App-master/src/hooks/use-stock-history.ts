"use client";

import { useState, useEffect } from "react";
import type { StockHistory } from "@/lib/types";

export function useStockHistory() {
  const [history, setHistory] = useState<StockHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch('/api/stock-history');
        if (!response.ok) {
          throw new Error('Failed to fetch stock history');
        }
        const data = await response.json();
        // Convert timestamp strings back to Date objects
        const formattedData = data.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
        setHistory(formattedData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching stock history:", error);
        setLoading(false);
      }
    };

    fetchHistory();
    
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchHistory, 5000);
    
    return () => clearInterval(interval);
  }, []);

  return { history, loading };
}
