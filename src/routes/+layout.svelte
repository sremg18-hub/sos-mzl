<script lang="ts">
	import { registerSW } from 'virtual:pwa-register';
	import { page } from '$app/state';
	import SyncStatus from '$lib/components/SyncStatus.svelte';

	let { children } = $props();

	let updateSW = $state<((reload?: boolean) => Promise<void>) | null>(null);

	$effect(() => {
		if ('serviceWorker' in navigator) {
			updateSW = registerSW({
				onNeedRefresh() {
					updateSW?.(true);
				}
			});
		}
	});
</script>

<svelte:head>
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<meta name="theme-color" content="#10b981" />
	<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
</svelte:head>

{#if updateSW}
	<div class="no-print fixed inset-x-0 top-0 z-50 bg-amber-500 px-4 py-2 text-center text-sm font-semibold text-white">
		Nueva versión disponible.
		<button class="underline" onclick={() => updateSW?.(true)}>Actualizar ahora</button>
	</div>
{/if}

<div class="no-print flex min-h-screen flex-col">
	<header class="sticky top-0 z-40 border-b border-gray-200 bg-white">
		<nav class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
			<a href="/" class="flex items-center gap-2 font-bold text-emerald-700">
				<span class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">+</span>
				SOS Manizales
			</a>
			<div class="flex items-center gap-1 text-sm">
				<a href="/visitas" class="rounded-lg px-3 py-2 hover:bg-gray-100">Mis visitas</a>
				<a href="/visita" class="rounded-lg px-3 py-2 hover:bg-gray-100">Nueva visita</a>
				{#if page.data.user?.role === 'admin'}
					<a href="/admin" class="rounded-lg px-3 py-2 hover:bg-gray-100">Panel</a>
					<a href="/admin/usuarios" class="rounded-lg px-3 py-2 hover:bg-gray-100">Usuarios</a>
				{/if}
			</div>
			<div class="flex items-center gap-2">
				<SyncStatus />
				<form method="POST" action="?/logout" class="no-print">
					<button class="rounded-lg bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200">Salir</button>
				</form>
			</div>
		</nav>
	</header>
	<main class="flex-1">
		<div class="mx-auto max-w-6xl px-4 py-6">{@render children()}</div>
	</main>
</div>
