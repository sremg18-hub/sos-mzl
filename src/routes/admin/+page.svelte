<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { Chart } from 'chart.js/auto';
	import type { Map as LeafletMap, LayerGroup } from 'leaflet';
	import type { BiStats } from '$lib/server/bi';
	import 'leaflet/dist/leaflet.css';

	const stats: BiStats = $derived(page.data.stats);

	const NIVEL_COLORS: Record<string, string> = {
		Total: '#ef4444',
		Parcial: '#f59e0b',
		Ninguna: '#22c55e'
	};

	const totales = $derived(stats.totales);
	const visitasPorDia = $derived(stats.visitasPorDia);
	const porBarrio = $derived(stats.porBarrio.slice(0, 10));
	const porNivel = $derived(stats.porNivel);
	const puntos = $derived(stats.puntos);
	const puntosRecientes = $derived(stats.puntos.slice(0, 15));
	const hayDatos = $derived(stats.totales.total > 0);

	const filterDesde = $derived(page.url.searchParams.get('desde') ?? '');
	const filterHasta = $derived(page.url.searchParams.get('hasta') ?? '');
	const filterBarrio = $derived(page.url.searchParams.get('barrio') ?? '');
	const hayFiltros = $derived(Boolean(filterDesde || filterHasta || filterBarrio));

	const kpis = $derived([
		{
			label: 'Total de visitas',
			value: totales.total.toLocaleString('es-CO'),
			sub: 'Inspecciones registradas',
			dot: 'bg-emerald-600'
		},
		{
			label: 'Visitas hoy',
			value: totales.hoy.toLocaleString('es-CO'),
			sub: 'Creadas en el día de hoy',
			dot: 'bg-sky-600'
		},
		{
			label: 'Evacuaciones recomendadas',
			value: totales.evacuaciones.toLocaleString('es-CO'),
			sub: 'Predios con riesgo de evacuación',
			dot: 'bg-red-500'
		},
		{
			label: 'Con georeferenciación',
			value: totales.conGeo.toLocaleString('es-CO'),
			sub: `de ${totales.total.toLocaleString('es-CO')} inspecciones`,
			dot: 'bg-amber-500'
		}
	]);

	function esc(s: string): string {
		return s
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}

	let visitasCanvas = $state<HTMLCanvasElement | null>(null);
	let barriosCanvas = $state<HTMLCanvasElement | null>(null);
	let nivelCanvas = $state<HTMLCanvasElement | null>(null);

	$effect(() => {
		const canvas = visitasCanvas;
		if (!canvas) return;
		const chart = new Chart(canvas, {
			type: 'line',
			data: {
				labels: visitasPorDia.map((d) => d.dia),
				datasets: [
					{
						label: 'Visitas',
						data: visitasPorDia.map((d) => d.total),
						borderColor: '#059669',
						backgroundColor: 'rgba(5, 150, 105, 0.12)',
						fill: true,
						tension: 0.3,
						borderWidth: 2,
						pointRadius: 3
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: { legend: { display: false } },
				scales: {
					y: { beginAtZero: true, ticks: { precision: 0 } },
					x: { ticks: { maxTicksLimit: 14 } }
				}
			}
		});
		return () => {
			chart.destroy();
		};
	});

	$effect(() => {
		const canvas = barriosCanvas;
		if (!canvas || porBarrio.length === 0) return;
		const chart = new Chart(canvas, {
			type: 'bar',
			data: {
				labels: porBarrio.map((b) => b.barrio),
				datasets: [
					{
						label: 'Inspecciones',
						data: porBarrio.map((b) => b.total),
						backgroundColor: '#059669',
						borderRadius: 4
					}
				]
			},
			options: {
				indexAxis: 'y',
				responsive: true,
				maintainAspectRatio: false,
				plugins: { legend: { display: false } },
				scales: {
					x: { beginAtZero: true, ticks: { precision: 0 } }
				}
			}
		});
		return () => {
			chart.destroy();
		};
	});

	$effect(() => {
		const canvas = nivelCanvas;
		if (!canvas || !porNivel.some((n) => n.total > 0)) return;
		const chart = new Chart(canvas, {
			type: 'doughnut',
			data: {
				labels: porNivel.map((n) => n.nivel),
				datasets: [
					{
						data: porNivel.map((n) => n.total),
						backgroundColor: porNivel.map((n) => NIVEL_COLORS[n.nivel] ?? '#9ca3af'),
						borderWidth: 2,
						borderColor: '#ffffff'
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: { legend: { position: 'bottom' } }
			}
		});
		return () => {
			chart.destroy();
		};
	});

	let mapEl = $state<HTMLDivElement | null>(null);
	let map: LeafletMap | null = null;
	let layerGroup: LayerGroup | null = null;
	let leafletLib: {
		divIcon: typeof import('leaflet')['divIcon'];
		marker: typeof import('leaflet')['marker'];
	} | null = null;

	function renderMarkers() {
		if (!map || !layerGroup || !leafletLib) return;
		layerGroup.clearLayers();
		for (const p of puntos) {
			const anillo = p.evacuacion ? 'box-shadow:0 0 0 2px #ef4444;' : '';
			const icon = leafletLib.divIcon({
				className: '',
				html: `<div style="width:14px;height:14px;border-radius:9999px;background:${NIVEL_COLORS[p.nivelAfectacion] ?? '#9ca3af'};border:2px solid #ffffff;${anillo}"></div>`,
				iconSize: [14, 14],
				iconAnchor: [7, 7]
			});
			const popup = [
				`<strong>${esc(p.barrio)}</strong>`,
				esc(p.direccion),
				`<span style="opacity:.7">${esc(p.fecha)}${p.numRevision ? ` · Revisión ${esc(p.numRevision)}` : ''}</span>`,
				`<span style="color:${NIVEL_COLORS[p.nivelAfectacion] ?? '#6b7280'};font-weight:600">${esc(p.nivelAfectacion)}</span>`,
				p.evacuacion
					? '<span style="color:#dc2626;font-weight:600">Evacuación recomendada</span>'
					: ''
			]
				.filter(Boolean)
				.join('<br>');
			leafletLib.marker([p.lat, p.lng], { icon }).addTo(layerGroup).bindPopup(popup);
		}
	}

	onMount(() => {
		let disposed = false;
		import('leaflet').then((mod) => {
			if (disposed || !mapEl) return;
			leafletLib = { divIcon: mod.divIcon, marker: mod.marker };
			map = mod.map(mapEl, { center: [5.0703, -75.5138], zoom: 12 });
			mod
				.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
					attribution: '&copy; OpenStreetMap contributors',
					maxZoom: 19
				})
				.addTo(map);
			layerGroup = mod.layerGroup().addTo(map);
			renderMarkers();
		});
		return () => {
			disposed = true;
			layerGroup?.clearLayers();
			map?.remove();
			map = null;
			layerGroup = null;
			leafletLib = null;
		};
	});

	$effect(() => {
		if (map && layerGroup && leafletLib) {
			renderMarkers();
		}
	});
</script>

<svelte:head>
	<title>Panel de análisis — SOS Manizales</title>
</svelte:head>

<div class="grid gap-6">
	<div>
		<h1 class="text-2xl font-bold text-gray-900">Panel de análisis</h1>
		<p class="mt-1 text-sm text-gray-500">
			Estadísticas de revisión a predios tras la emergencia — SOS Manizales
		</p>
	</div>

	<form method="GET" class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
		<div class="flex flex-wrap items-end gap-3">
			<label class="flex flex-col gap-1 text-xs font-medium text-gray-600">
				Desde
				<input
					type="date"
					name="desde"
					value={filterDesde}
					class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
				/>
			</label>
			<label class="flex flex-col gap-1 text-xs font-medium text-gray-600">
				Hasta
				<input
					type="date"
					name="hasta"
					value={filterHasta}
					class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
				/>
			</label>
			<label class="flex flex-col gap-1 text-xs font-medium text-gray-600">
				Barrio
				<select
					name="barrio"
					class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
				>
					<option value="">Todos los barrios</option>
					{#each stats.barrios as barrio}
						<option value={barrio} selected={barrio === filterBarrio}>{barrio}</option>
					{/each}
				</select>
			</label>
			<button
				type="submit"
				class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
			>
				Aplicar
			</button>
			{#if hayFiltros}
				<a
					href="/admin"
					class="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
				>
					Limpiar
				</a>
			{/if}
		</div>
	</form>

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		{#each kpis as kpi}
			<div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
				<div class="flex items-center gap-2">
					<span class={`h-2.5 w-2.5 rounded-full ${kpi.dot}`}></span>
					<p class="text-xs font-medium uppercase tracking-wide text-gray-500">{kpi.label}</p>
				</div>
				<p class="mt-2 text-3xl font-bold text-gray-900">{kpi.value}</p>
				<p class="mt-1 text-xs text-gray-400">{kpi.sub}</p>
			</div>
		{/each}
	</div>

	{#if hayDatos}
		<div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
			<h2 class="text-sm font-semibold text-gray-900">Visitas por día (últimos 14 días)</h2>
			<div class="relative mt-3 h-64">
				<canvas bind:this={visitasCanvas} class="h-full w-full"></canvas>
			</div>
		</div>

		<div class="grid gap-4 lg:grid-cols-2">
			<div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
				<h2 class="text-sm font-semibold text-gray-900">Inspecciones por barrio (top 10)</h2>
				<div class="relative mt-3 h-64">
					<canvas bind:this={barriosCanvas} class="h-full w-full"></canvas>
				</div>
			</div>
			<div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
				<h2 class="text-sm font-semibold text-gray-900">Distribución de afectación</h2>
				<div class="relative mt-3 h-64">
					<canvas bind:this={nivelCanvas} class="h-full w-full"></canvas>
				</div>
			</div>
		</div>

		<div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
			<h2 class="border-b border-gray-100 px-5 py-4 text-sm font-semibold text-gray-900">
				Mapa de georreferenciación
			</h2>
			<div bind:this={mapEl} class="h-[60vh] w-full"></div>
			<div
				class="flex flex-wrap items-center gap-4 border-t border-gray-100 px-5 py-3 text-xs text-gray-600"
			>
				<span class="flex items-center gap-1.5">
					<span class="h-3 w-3 rounded-full bg-red-500 border-2 border-white shadow"></span>
					Total
				</span>
				<span class="flex items-center gap-1.5">
					<span class="h-3 w-3 rounded-full bg-amber-500 border-2 border-white shadow"></span>
					Parcial
				</span>
				<span class="flex items-center gap-1.5">
					<span class="h-3 w-3 rounded-full bg-green-500 border-2 border-white shadow"></span>
					Ninguna
				</span>
				<span class="flex items-center gap-1.5">
					<span class="h-3 w-3 rounded-full bg-gray-300 border-2 border-white shadow" style="box-shadow:0 0 0 2px #ef4444"></span>
					Con evacuación recomendada
				</span>
			</div>
		</div>

		<div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
			<h2 class="border-b border-gray-100 px-5 py-4 text-sm font-semibold text-gray-900">
				Últimas inspecciones con georreferenciación
			</h2>
			{#if puntosRecientes.length > 0}
				<div class="overflow-x-auto">
					<table class="w-full text-left text-sm">
						<thead class="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
							<tr>
								<th class="px-5 py-3">Revisión</th>
								<th class="px-5 py-3">Barrio</th>
								<th class="px-5 py-3">Dirección</th>
								<th class="px-5 py-3">Fecha</th>
								<th class="px-5 py-3">Nivel</th>
								<th class="px-5 py-3">Evacuación</th>
								<th class="px-5 py-3"></th>
							</tr>
						</thead>
						<tbody>
							{#each puntosRecientes as p}
								<tr class="border-b border-gray-100 last:border-0 hover:bg-gray-50">
									<td class="px-5 py-2 font-medium text-gray-900">{p.numRevision ?? '—'}</td>
									<td class="px-5 py-2">{p.barrio}</td>
									<td class="px-5 py-2">{p.direccion}</td>
									<td class="px-5 py-2">{p.fecha}</td>
									<td class="px-5 py-2">
										<span class="inline-flex items-center gap-1.5">
											<span
												class="h-2.5 w-2.5 rounded-full"
												style:background={NIVEL_COLORS[p.nivelAfectacion] ?? '#9ca3af'}
											></span>
											{p.nivelAfectacion}
										</span>
									</td>
									<td class="px-5 py-2">{p.evacuacion ? 'Sí' : 'No'}</td>
									<td class="px-5 py-2">
										<a href={`/visita/${p.id}`} class="font-medium text-emerald-600 hover:underline"
											>Ver</a
										>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="px-5 py-8 text-center text-sm text-gray-500">
					No hay inspecciones georreferenciadas con los filtros seleccionados.
				</p>
			{/if}
		</div>
	{:else}
		<div class="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
			<h2 class="text-lg font-semibold text-gray-900">Sin datos para mostrar</h2>
			<p class="mt-1 text-sm text-gray-500">
				No hay inspecciones que coincidan con los filtros seleccionados. Ajusta el rango de fechas
				o el barrio.
			</p>
		</div>
	{/if}
</div>

<style>
	:global(.leaflet-container) {
		font-family: inherit;
	}
	:global(.leaflet-pane),
	:global(.leaflet-top),
	:global(.leaflet-bottom) {
		z-index: 10;
	}
	:global(.leaflet-popup-content-wrapper) {
		border-radius: 0.75rem;
		font-size: 0.8rem;
	}
</style>
