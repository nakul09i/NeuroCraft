import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase/config";
import { ScanResponse, ReportResponse } from "../types";

export type SyncStatus = "pending" | "synced" | "failed";

export interface SyncQueueItem {
  id: string;
  userId: string;
  subcollection: "scans" | "reports" | "settings";
  docId: string;
  data: Record<string, any>;
  updatedAt: string;
  syncStatus: SyncStatus;
  retries: number;
}

const QUEUE_STORAGE_KEY = "nc_offline_sync_queue";

/**
 * Reads pending sync queue items from localStorage.
 */
export function getSyncQueue(): SyncQueueItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("[NeuroCraft Sync] Failed reading offline queue:", err);
    return [];
  }
}

/**
 * Saves sync queue items back to localStorage.
 */
export function saveSyncQueue(queue: SyncQueueItem[]): void {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error("[NeuroCraft Sync] Failed saving offline queue:", err);
  }
}

let activeListeners: Unsubscribe[] = [];

/**
 * Syncs scan metadata to Cloud Firestore under users/{userId}/scans/{scanId}.
 * Operates with 100% offline fallback: if offline or Firebase unconfigured,
 * enqueues item into local storage queue with syncStatus='pending'.
 */
export async function syncScanMetadata(
  userId: string,
  scan: ScanResponse
): Promise<{ synced: boolean; status: SyncStatus }> {
  if (!userId || !scan?.scan_id) {
    return { synced: false, status: "failed" };
  }

  const now = new Date().toISOString();
  // Sanitize: Store metadata ONLY. NEVER store raw binary content or payload bytes.
  const payload: Record<string, any> = {
    scanId: scan.scan_id,
    userId,
    fileName: scan.file.name,
    fileSize: scan.file.size,
    fileType: scan.file.type,
    sha256: scan.file.sha256,
    verdict: scan.verdict.level,
    riskScore: scan.verdict.score,
    findingsCount: scan.findings?.length || 0,
    engines: scan.engines || {},
    createdAt: (scan.metadata?.created_at as string) || now,
    updatedAt: now,
    syncStatus: "synced",
  };

  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

  if (isOnline && isFirebaseConfigured() && db) {
    try {
      const docRef = doc(db, "users", userId, "scans", scan.scan_id);
      // Conflict check: fetch remote doc if exists
      const existingSnap = await getDoc(docRef);
      if (existingSnap.exists()) {
        const remoteData = existingSnap.data();
        if (remoteData.updatedAt && new Date(remoteData.updatedAt) > new Date(payload.updatedAt)) {
          console.info("[NeuroCraft Sync] Remote document is newer; keeping cloud record.");
          return { synced: true, status: "synced" };
        }
      }

      await setDoc(docRef, payload, { merge: true });
      return { synced: true, status: "synced" };
    } catch (err) {
      console.warn("[NeuroCraft Sync] Cloud write failed. Enqueuing for offline sync.", err);
      // Fall through to offline queue
    }
  }

  // Offline or unconfigured: Add to queue
  enqueueSyncItem({
    id: `sync_scan_${scan.scan_id}`,
    userId,
    subcollection: "scans",
    docId: scan.scan_id,
    data: { ...payload, syncStatus: "pending" },
    updatedAt: now,
    syncStatus: "pending",
    retries: 0,
  });

  return { synced: false, status: "pending" };
}

/**
 * Syncs report metadata to Cloud Firestore under users/{userId}/reports/{reportId}.
 */
export async function syncReportMetadata(
  userId: string,
  report: ReportResponse
): Promise<{ synced: boolean; status: SyncStatus }> {
  const reportId = report?.id || (report as any)?.report_id;
  if (!userId || !reportId) {
    return { synced: false, status: "failed" };
  }

  const now = new Date().toISOString();
  const payload: Record<string, any> = {
    reportId,
    scanId: report.scan_id || null,
    userId,
    title: report.title,
    reportType: report.report_type,
    summary: report.summary || "",
    createdAt: report.created_at || now,
    updatedAt: now,
    syncStatus: "synced",
  };

  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

  if (isOnline && isFirebaseConfigured() && db) {
    try {
      const docRef = doc(db, "users", userId, "reports", reportId);
      await setDoc(docRef, payload, { merge: true });
      return { synced: true, status: "synced" };
    } catch (err) {
      console.warn("[NeuroCraft Sync] Report cloud write failed. Enqueuing for offline sync.", err);
    }
  }

  enqueueSyncItem({
    id: `sync_report_${reportId}`,
    userId,
    subcollection: "reports",
    docId: reportId,
    data: { ...payload, syncStatus: "pending" },
    updatedAt: now,
    syncStatus: "pending",
    retries: 0,
  });

  return { synced: false, status: "pending" };
}

/**
 * Enqueue item into offline sync queue with duplicate deduplication.
 */
function enqueueSyncItem(item: SyncQueueItem): void {
  const queue = getSyncQueue();
  const index = queue.findIndex((q) => q.id === item.id);
  if (index >= 0) {
    queue[index] = item;
  } else {
    queue.push(item);
  }
  saveSyncQueue(queue);
}

/**
 * Processes all pending items in the offline queue when online.
 */
export async function processSyncQueue(userId?: string): Promise<number> {
  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
  if (!isOnline || !isFirebaseConfigured() || !db) {
    return 0;
  }

  const queue = getSyncQueue();
  if (queue.length === 0) return 0;

  const remaining: SyncQueueItem[] = [];
  let syncedCount = 0;

  for (const item of queue) {
    // If specific userId is requested, only sync matching user's items
    if (userId && item.userId !== userId) {
      remaining.push(item);
      continue;
    }

    try {
      const docRef = doc(db, "users", item.userId, item.subcollection, item.docId);

      // Check remote timestamp conflict
      const remoteSnap = await getDoc(docRef);
      if (remoteSnap.exists()) {
        const remoteData = remoteSnap.data();
        if (remoteData.updatedAt && new Date(remoteData.updatedAt) > new Date(item.updatedAt)) {
          // Remote wins
          console.info(`[NeuroCraft Sync] Remote conflict: ${item.docId} remote is newer. Discarding local pending item.`);
          syncedCount++;
          continue;
        }
      }

      await setDoc(docRef, { ...item.data, syncStatus: "synced" }, { merge: true });
      syncedCount++;
    } catch (err) {
      console.warn(`[NeuroCraft Sync] Retry failed for item ${item.id}:`, err);
      if (item.retries < 5) {
        remaining.push({ ...item, retries: item.retries + 1, syncStatus: "pending" });
      }
    }
  }

  saveSyncQueue(remaining);
  if (syncedCount > 0) {
    console.info(`[NeuroCraft Sync] Successfully flushed ${syncedCount} queued items to Cloud Firestore.`);
  }
  return syncedCount;
}

/**
 * Fetches cloud-synced scan metadata from users/{userId}/scans.
 */
export async function fetchUserCloudScans(userId: string): Promise<any[]> {
  if (!userId || !isFirebaseConfigured() || !db) {
    return [];
  }

  try {
    const q = query(
      collection(db, "users", userId, "scans"),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => ({
      ...docSnap.data(),
      scan_id: docSnap.id,
      id: docSnap.id,
    }));
  } catch (err) {
    console.warn("[NeuroCraft Sync] Could not fetch cloud scans:", err);
    return [];
  }
}

/**
 * Clears active Firestore snapshot listeners and user-specific sync state on logout.
 */
export function clearUserSyncListeners(): void {
  activeListeners.forEach((unsub) => unsub());
  activeListeners = [];
}

// Auto-register network reconnection listener
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    console.info("[NeuroCraft Sync] Network connectivity restored. Triggering offline sync queue flush...");
    processSyncQueue();
  });
}
