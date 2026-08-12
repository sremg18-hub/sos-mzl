<script lang="ts">
	import { getPending } from '$lib/offline/db';
	import { syncPending } from '$lib/offline/sync';

	let pending = $state(0);
	let syncing = $state(false);
	let lastSync = $state('');

	async function refresh() {
		pending = (await getPending()).length;
	}

	$effect(() => {
		refresh();
		const timer = setInterval(refresh, 10000);
		window.addEventListener('online', refresh);
		return () => {
			clearInterval(timer);
			window.removeEventListener('online', refresh);
		};
	});

	async function doSync() {
		if (syncing) return;
		syncing = true;
		const result = await syncPending();
		syncing = false;
		await refresh();
		lastSync = `: ${result.synced} sincronizada${result.synced === 1 ? '' : 's'}`;
	}
</script>

{#if pending > 0}
	<button
		class="flex items-center gap-1 rounded-lg bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-800"
		onclick={doSync}
	>
		<span class="h-2 w-2 animate-pulse rounded-full bg-amber-500"></span>
		{pending} pendiente{syncing ? '…' : ' (sincronizar)'}{lastSync}
	</button>
{:else}
	{#if syncing}
		<span class="text-sm text-gray-500">Sincronizando…</span>
	{:else}
		<span class="text-sm text-gray-400">Al día</span>
	{/if}
{/if}
