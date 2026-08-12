export interface PendingInspection {
	syncId: string;
	payload: unknown;
	createdAt: string;
}

const DB_NAME = 'sosmzl-offline';
const DB_VERSION = 1;
const STORE_DRAFTS = 'drafts';
const STORE_PENDING = 'pending';

function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
				db.createObjectStore(STORE_DRAFTS, { keyPath: 'syncId' });
			}
			if (!db.objectStoreNames.contains(STORE_PENDING)) {
				db.createObjectStore(STORE_PENDING, { keyPath: 'syncId' });
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

async function withStore<T>(
	storeName: string,
	mode: IDBTransactionMode,
	fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
	const db = await openDb();
	return new Promise<T>((resolve, reject) => {
		const tx = db.transaction(storeName, mode);
		const req = fn(tx.objectStore(storeName));
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

export function isOnline(): boolean {
	return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export async function saveDraft(draft: PendingInspection): Promise<void> {
	await withStore(STORE_DRAFTS, 'readwrite', (s) => s.put(draft));
}

export async function getDrafts(): Promise<PendingInspection[]> {
	const all = await withStore(STORE_DRAFTS, 'readonly', (s) => s.getAll());
	return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function deleteDraft(syncId: string): Promise<void> {
	await withStore(STORE_DRAFTS, 'readwrite', (s) => s.delete(syncId));
}

export async function savePending(pending: PendingInspection): Promise<void> {
	await withStore(STORE_PENDING, 'readwrite', (s) => s.put(pending));
}

export async function getPending(): Promise<PendingInspection[]> {
	const all = await withStore(STORE_PENDING, 'readonly', (s) => s.getAll());
	return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function removePending(syncId: string): Promise<void> {
	await withStore(STORE_PENDING, 'readwrite', (s) => s.delete(syncId));
}

export function newSyncId(): string {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
	return `off-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
