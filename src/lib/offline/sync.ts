import { getPending, removePending, isOnline } from './db';
import type { PendingInspection } from './db';

export interface SyncResult {
	synced: number;
	failed: number;
}

export async function syncPending(): Promise<SyncResult> {
	const result: SyncResult = { synced: 0, failed: 0 };
	if (!isOnline()) return result;

	const pending = await getPending();
	for (const item of pending) {
		try {
			const res = await fetch('/api/inspections', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(item.payload)
			});
			if (res.ok) {
				await removePending(item.syncId);
				result.synced++;
			} else {
				result.failed++;
			}
		} catch {
			result.failed++;
		}
	}
	return result;
}

export function registerSyncHandlers() {
	if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

	const onOnline = () => {
		syncPending().then(() => {
			window.dispatchEvent(new CustomEvent('sosmzl:sync-done'));
		});
	};

	navigator.serviceWorker.ready
		.then((reg) => {
			const sw = reg as unknown as { sync?: { register: (tag: string) => Promise<void> } };
			if (sw.sync) {
				sw.sync.register('sync-pending').catch(() => {});
			}
		})
		.catch(() => {});

	window.addEventListener('online', onOnline);
}
