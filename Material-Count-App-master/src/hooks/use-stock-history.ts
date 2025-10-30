"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import type { StockHistory } from "@/lib/types";

export function useStockHistory() {
  const [history, setHistory] = useState<StockHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "stockHistory"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const historyData: StockHistory[] = [];
        querySnapshot.forEach((doc) => {
          historyData.push({ id: doc.id, ...doc.data() } as StockHistory);
        });
        setHistory(historyData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching stock history:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { history, loading };
}
