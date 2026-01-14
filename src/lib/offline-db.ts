import { openDB, IDBPDatabase } from 'idb';

export interface PendingAttendance {
  id: string;
  child_id: string;
  service_date: string;
  present: boolean;
  notes: string;
  recorded_by: string;
  created_at: number;
  synced: boolean;
}

export interface CachedChild {
  id: string;
  full_name: string;
  cached_at: number;
}

const DB_NAME = 'churchkidz-offline';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase | null = null;

export async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Store for pending attendance records
      if (!db.objectStoreNames.contains('pending-attendance')) {
        const attendanceStore = db.createObjectStore('pending-attendance', {
          keyPath: 'id',
        });
        attendanceStore.createIndex('by-synced', 'synced');
        attendanceStore.createIndex('by-date', 'service_date');
      }

      // Store for cached children list
      if (!db.objectStoreNames.contains('cached-children')) {
        db.createObjectStore('cached-children', {
          keyPath: 'id',
        });
      }
    },
  });

  return dbInstance;
}

// Pending Attendance Operations
export async function savePendingAttendance(
  records: Omit<PendingAttendance, 'id' | 'created_at' | 'synced'>[]
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('pending-attendance', 'readwrite');
  
  for (const record of records) {
    const id = `${record.child_id}_${record.service_date}`;
    await tx.store.put({
      ...record,
      id,
      created_at: Date.now(),
      synced: false,
    });
  }
  
  await tx.done;
}

export async function getPendingAttendance(): Promise<PendingAttendance[]> {
  const db = await getDB();
  const tx = db.transaction('pending-attendance', 'readonly');
  const index = tx.store.index('by-synced');
  const records: PendingAttendance[] = [];
  
  let cursor = await index.openCursor(IDBKeyRange.only(0));
  while (cursor) {
    // Check if synced is false (stored as 0 in IndexedDB)
    if (cursor.value.synced === false) {
      records.push(cursor.value as PendingAttendance);
    }
    cursor = await cursor.continue();
  }
  
  // Fallback: get all and filter
  if (records.length === 0) {
    const allRecords = await db.getAll('pending-attendance');
    return allRecords.filter(r => r.synced === false) as PendingAttendance[];
  }
  
  return records;
}

export async function getAttendanceByDate(serviceDate: string): Promise<PendingAttendance[]> {
  const db = await getDB();
  const tx = db.transaction('pending-attendance', 'readonly');
  const index = tx.store.index('by-date');
  const records = await index.getAll(serviceDate);
  return records as PendingAttendance[];
}

export async function markAttendanceSynced(ids: string[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('pending-attendance', 'readwrite');
  
  for (const id of ids) {
    const record = await tx.store.get(id);
    if (record) {
      await tx.store.put({ ...record, synced: true });
    }
  }
  
  await tx.done;
}

export async function clearSyncedAttendance(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('pending-attendance', 'readwrite');
  const allRecords = await tx.store.getAll();
  
  for (const record of allRecords) {
    if (record.synced === true) {
      await tx.store.delete(record.id);
    }
  }
  
  await tx.done;
}

export async function getPendingCount(): Promise<number> {
  const db = await getDB();
  const allRecords = await db.getAll('pending-attendance');
  return allRecords.filter(r => r.synced === false).length;
}

// Cached Children Operations
export async function cacheChildren(children: { id: string; full_name: string }[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('cached-children', 'readwrite');
  
  // Clear existing cache
  await tx.store.clear();
  
  // Add new children
  const cached_at = Date.now();
  for (const child of children) {
    await tx.store.put({ ...child, cached_at });
  }
  
  await tx.done;
}

export async function getCachedChildren(): Promise<CachedChild[]> {
  const db = await getDB();
  const records = await db.getAll('cached-children');
  return records as CachedChild[];
}

export async function isCacheValid(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<boolean> {
  const db = await getDB();
  const children = await db.getAll('cached-children') as CachedChild[];
  
  if (children.length === 0) return false;
  
  const oldestCache = Math.min(...children.map(c => c.cached_at));
  return Date.now() - oldestCache < maxAgeMs;
}
