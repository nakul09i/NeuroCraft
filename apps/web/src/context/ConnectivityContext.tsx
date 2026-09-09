import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "../api";
import { SyncState, SyncSummary } from "../types";
import { processSyncQueue } from "../services/syncService";

interface ConnectivityContextValue {
  isOnline: boolean;
  syncState: SyncState;
  summary: SyncSummary | null;
  isFlushing: boolean;
  flushSync: () => Promise<void>;
  retryItem: (id: string) => Promise<void>;
  retryAll: () => Promise<void>;
  refreshSync: () => Promise<void>;
}

const ConnectivityContext = createContext<ConnectivityContextValue>({
  isOnline: true,
  syncState: "online",
  summary: null,
  isFlushing: false,
  flushSync: async () => {},
  retryItem: async () => {},
  retryAll: async () => {},
  refreshSync: async () => {},
});

export const useConnectivity = () => useContext(ConnectivityContext);

export const ConnectivityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [summary, setSummary] = useState<SyncSummary | null>(null);
  const [isFlushing, setIsFlushing] = useState<boolean>(false);

  const refreshSync = useCallback(async () => {
    try {
      const data = await api.getSyncStatus();
      setSummary(data);
    } catch {
      // Offline fallback
    }
  }, []);

  const flushSync = useCallback(async () => {
    if (isFlushing) return;
    setIsFlushing(true);
    try {
      // 1. Flush backend persistent queue
      await api.flushSyncQueue();
      // 2. Flush client-side cache queue
      await processSyncQueue();
      // 3. Refresh metrics
      await refreshSync();
    } catch (err) {
      console.warn("[NeuroCraft Sync] Flush encountered an issue:", err);
    } finally {
      setIsFlushing(false);
    }
  }, [isFlushing, refreshSync]);

  const retryItem = useCallback(
    async (id: string) => {
      try {
        await api.retrySyncItem(id);
        await flushSync();
      } catch (err) {
        console.error(`[NeuroCraft Sync] Error retrying item ${id}:`, err);
      }
    },
    [flushSync]
  );

  const retryAll = useCallback(async () => {
    try {
      await api.retryAllSync();
      await flushSync();
    } catch (err) {
      console.error("[NeuroCraft Sync] Error retrying all failed items:", err);
    }
  }, [flushSync]);

  // Network online/offline event handlers
  useEffect(() => {
    const handleOnline = () => {
      console.info("[NeuroCraft Sync] Network connectivity restored (online). Triggering flush...");
      setIsOnline(true);
      flushSync();
    };

    const handleOffline = () => {
      console.warn("[NeuroCraft Sync] Network connectivity lost (offline). Local offline mode active.");
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial load
    refreshSync();

    // Periodic sync status polling every 15 seconds
    const interval = setInterval(() => {
      if (typeof navigator !== "undefined" && navigator.onLine) {
        refreshSync();
      }
    }, 15000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [flushSync, refreshSync]);

  // Determine aggregate state label
  let syncState: SyncState = "online";
  if (!isOnline) {
    syncState = "offline";
  } else if (isFlushing || summary?.is_syncing) {
    syncState = "syncing";
  } else if (summary && summary.failed_count > 0) {
    syncState = "failed";
  } else if (summary && summary.pending_count > 0) {
    syncState = "pending";
  } else {
    syncState = "synced";
  }

  return (
    <ConnectivityContext.Provider
      value={{
        isOnline,
        syncState,
        summary,
        isFlushing,
        flushSync,
        retryItem,
        retryAll,
        refreshSync,
      }}
    >
      {children}
    </ConnectivityContext.Provider>
  );
};
