<script lang="ts">
	import { onMount } from 'svelte';
	import { getDrafts } from '$lib/offline/db';
	import type { PendingInspection } from '$lib/offline/db';

	let { data } = $props();

	interface DraftPayload {
		numRevision?: string;
		barrio?: string;
		direccion?: string;
		encuestadoNombre?: string;
		fecha?: string;
		nivelAfectacion?: string;
		evacuacion?: boolean;
	}

	let drafts = $state<PendingInspection[]>([]);

	onMount(async () => {
		drafts = await getDrafts();
	});

	function draftPayload(d: PendingInspection): DraftPayload {
		return (d.payload ?? {}) as DraftPayload;
	}

	function fmtFecha(f: string | null | undefined): string {
		if (!f) return '—';
		const [y, m, d] = f.split('-');
		return d && m && y ? `${d}/${m}/${y}` : f;
	}

	const nivelBadge: Record<string, string> = {
		Total: 'bg-red-100 text-red-700',
		Parcial: 'bg-amber-100 text-amber-700',
		Ninguna: 'bg-green-100 text-green-700'
	};
</script>

<svelte:head>
	<title>Mis visitas — SOS Manizales</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Mis visitas</h1>
			<p class="mt-1 text-sm text-gray-500">
				Revisiones a predio registradas {data.isAdmin ? '' : 'por usted'}
			</p>
		</div>
		<a
			href="/visita"
			class="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
		>
			+ Nueva visita
		</a>
	</div>

	{#if data.saved}
		<div
			class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
		>
			Revisión guardada correctamente.
		</div>
	{/if}

	<form method="GET" action="/visitas" class="flex gap-2">
		<input
			type="search"
			name="q"
			value={data.q}
			placeholder="Buscar por barrio, dirección o nombre…"
			class="w-full max-w-md rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
		/>
		<button
			class="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700"
		>
			Buscar
		</button>
	</form>

	{#if drafts.length > 0}
		<div class="rounded-2xl border border-amber-200 bg-amber-50 p-4">
			<h2 class="text-sm font-bold uppercase text-amber-800">
				Borradores en este dispositivo ({drafts.length})
			</h2>
			<ul class="mt-2 divide-y divide-amber-200">
				{#each drafts as d (d.syncId)}
					<li class="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
						<div>
							<span class="font-semibold text-gray-900">
								{draftPayload(d).barrio || 'Sin barrio'}
							</span>
							<span class="text-gray-500">
								— {draftPayload(d).direccion || 'Sin dirección'}
							</span>
							{#if draftPayload(d).encuestadoNombre}
								<span class="text-gray-500">— {draftPayload(d).encuestadoNombre}</span>
							{/if}
						</div>
						<span
							class="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white"
						>
							Pendiente de sync
						</span>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	{#if data.inspections.length === 0 && drafts.length === 0}
		<div class="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
			<p class="text-gray-500">No hay revisiones registradas todavía.</p>
			<a
				href="/visita"
				class="mt-4 inline-block rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
			>
				Diligenciar primera revisión
			</a>
		</div>
	{:else if data.inspections.length === 0}
		<div class="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
			<p class="text-gray-500">
				No se encontraron revisiones con los criterios de búsqueda.
			</p>
		</div>
	{:else}
		<div class="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
			<table class="w-full min-w-[720px] text-sm">
				<thead>
					<tr
						class="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
					>
						<th class="px-4 py-3">N°</th>
						<th class="px-4 py-3">Fecha</th>
						<th class="px-4 py-3">Barrio</th>
						<th class="px-4 py-3">Dirección</th>
						<th class="px-4 py-3">Afectación</th>
						<th class="px-4 py-3">Evacuación</th>
						{#if data.isAdmin}
							<th class="px-4 py-3">Inspector</th>
						{/if}
						<th class="px-4 py-3"></th>
					</tr>
				</thead>
				<tbody>
					{#each data.inspections as ins (ins.id)}
						<tr class="border-b border-gray-100 hover:bg-gray-50">
							<td class="px-4 py-3 font-semibold text-gray-900">{ins.numRevision ?? '—'}</td>
							<td class="px-4 py-3">{fmtFecha(ins.fecha)}</td>
							<td class="px-4 py-3">{ins.barrio}</td>
							<td class="px-4 py-3">{ins.direccion}</td>
							<td class="px-4 py-3">
								<span
									class="rounded-full px-2.5 py-1 text-xs font-semibold {nivelBadge[ins.nivelAfectacion]}"
								>
									{ins.nivelAfectacion}
								</span>
							</td>
							<td class="px-4 py-3">
								<span
									class="rounded-full px-2.5 py-1 text-xs font-semibold {ins.evacuacion
										? 'bg-red-100 text-red-700'
										: 'bg-green-100 text-green-700'}"
								>
									{ins.evacuacion ? 'Sí' : 'No'}
								</span>
							</td>
							{#if data.isAdmin}
								<td class="px-4 py-3 text-gray-600">{ins.inspectorName ?? '—'}</td>
							{/if}
							<td class="px-4 py-3 text-right">
								<a href={`/visita/${ins.id}`} class="font-semibold text-emerald-700 hover:underline">
									Ver
								</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
