<script lang="ts">
	import { goto } from '$app/navigation';
	import { FORM_CODE, FORM_VERSION, CRUZ_ROJA_PHONE } from '$lib/constants';

	let { data } = $props();

	const ins = $derived(data.inspection);

	function fmtFecha(f: string | null | undefined): string {
		if (!f) return '—';
		const [y, m, d] = f.split('-');
		return d && m && y ? `${d}/${m}/${y}` : f;
	}

	function fmtArea(a: number | null | undefined): string {
		if (a === null || a === undefined) return '—';
		return `${a} m²`;
	}

	let deleting = $state(false);

	async function eliminar() {
		if (!confirm('¿Eliminar esta revisión? Esta acción no se puede deshacer.')) return;
		deleting = true;
		try {
			const res = await fetch(`/api/inspections/${ins.id}`, { method: 'DELETE' });
			if (res.ok) {
				goto('/visitas');
				return;
			}
			alert('No se pudo eliminar la revisión.');
		} catch {
			alert('No se pudo eliminar la revisión.');
		} finally {
			deleting = false;
		}
	}
</script>

<svelte:head>
	<title>Revisión N° {ins.numRevision ?? ins.id} — {FORM_CODE}</title>
</svelte:head>

<div class="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
	<a href="/visitas" class="text-sm font-semibold text-emerald-700 hover:underline">← Volver</a>
	<div class="flex gap-2">
		<button
			onclick={() => window.print()}
			class="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700"
		>
			Imprimir
		</button>
		{#if data.isAdmin}
			<button
				onclick={eliminar}
				disabled={deleting}
				class="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
			>
				{deleting ? 'Eliminando…' : 'Eliminar'}
			</button>
		{/if}
	</div>
</div>

<article
	class="print-sheet mx-auto max-w-3xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
>
	<header class="border-b-4 border-double border-gray-900 bg-gray-50 px-6 py-5 text-center">
		<h1 class="text-base font-bold uppercase tracking-wide">Alcaldía de Manizales</h1>
		<p class="mt-0.5 text-xs font-semibold uppercase tracking-wide">
			Gestión para la prevención y atención de urgencias y emergencias
		</p>
		<h2 class="mt-2 text-xl font-extrabold uppercase underline">Revisión a predio</h2>
		<div class="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs">
			<span>Código: <b>{FORM_CODE}</b></span>
			<span>Estado: <b>Vigente</b></span>
			<span><b>{FORM_VERSION}</b></span>
			<span>N°: <b>{ins.numRevision ?? '—'}</b></span>
		</div>
	</header>

	<section class="border-b border-gray-200 px-6 py-4">
		<h3 class="mb-3 flex items-center gap-2 text-sm font-bold uppercase">
			<span class="flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-xs text-white">1</span>
			Dirección del predio
		</h3>
		<div class="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
			<div>
				<p class="text-xs font-semibold uppercase text-gray-500">Barrio</p>
				<p class="text-sm font-medium">{ins.barrio || '—'}</p>
			</div>
			<div>
				<p class="text-xs font-semibold uppercase text-gray-500">Dirección</p>
				<p class="text-sm font-medium">{ins.direccion || '—'}</p>
			</div>
		</div>
	</section>

	<section class="border-b border-gray-200 px-6 py-4">
		<h3 class="mb-3 flex items-center gap-2 text-sm font-bold uppercase">
			<span class="flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-xs text-white">2</span>
			Encuestado
		</h3>
		<div class="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
			<div>
				<p class="text-xs font-semibold uppercase text-gray-500">Documento</p>
				<p class="text-sm font-medium">{ins.encuestadoDoc || '—'}</p>
			</div>
			<div>
				<p class="text-xs font-semibold uppercase text-gray-500">Nombre(s)</p>
				<p class="text-sm font-medium">{ins.encuestadoNombre || '—'}</p>
			</div>
			<div>
				<p class="text-xs font-semibold uppercase text-gray-500">Teléfono</p>
				<p class="text-sm font-medium">{ins.encuestadoTelefono || '—'}</p>
			</div>
			<div>
				<p class="text-xs font-semibold uppercase text-gray-500">Fecha de nacimiento</p>
				<p class="text-sm font-medium">{fmtFecha(ins.encuestadoFechaNacimiento)}</p>
			</div>
			<div>
				<p class="text-xs font-semibold uppercase text-gray-500">Rol</p>
				<p class="text-sm font-medium">
					{ins.rolEncuestado === 'Sucesion' ? 'Sucesión' : ins.rolEncuestado}
					{#if ins.rolEncuestado === 'Otro' && ins.rolOtro} — {ins.rolOtro}{/if}
				</p>
			</div>
		</div>
		{#if ins.rolEncuestado === 'Arrendatario'}
			<div class="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
				<h4 class="mb-3 text-sm font-bold uppercase">Datos del Propietario</h4>
				<div class="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-3">
					<div>
						<p class="text-xs font-semibold uppercase text-gray-500">Documento</p>
						<p class="text-sm font-medium">{ins.propietarioDoc || '—'}</p>
					</div>
					<div>
						<p class="text-xs font-semibold uppercase text-gray-500">Nombre</p>
						<p class="text-sm font-medium">{ins.propietarioNombre || '—'}</p>
					</div>
					<div>
						<p class="text-xs font-semibold uppercase text-gray-500">Teléfono</p>
						<p class="text-sm font-medium">{ins.propietarioTelefono || '—'}</p>
					</div>
				</div>
			</div>
		{/if}
	</section>

	<section class="border-b border-gray-200 px-6 py-4">
		<h3 class="mb-3 flex items-center gap-2 text-sm font-bold uppercase">
			<span class="flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-xs text-white">3</span>
			Residentes
		</h3>
		<table class="w-full text-sm">
			<thead>
				<tr>
					<th class="border border-gray-300 px-2 py-1.5 text-left text-xs font-bold uppercase">Tipo doc</th>
					<th class="border border-gray-300 px-2 py-1.5 text-left text-xs font-bold uppercase">N° documento</th>
					<th class="border border-gray-300 px-2 py-1.5 text-left text-xs font-bold uppercase">Nombre(s)</th>
					<th class="border border-gray-300 px-2 py-1.5 text-left text-xs font-bold uppercase">Parentesco</th>
					<th class="border border-gray-300 px-2 py-1.5 text-left text-xs font-bold uppercase">Fecha nacimiento</th>
				</tr>
			</thead>
			<tbody>
				{#each data.residents as r (r.id)}
					<tr>
						<td class="border border-gray-300 px-2 py-1.5">{r.tipoDoc || '—'}</td>
						<td class="border border-gray-300 px-2 py-1.5">{r.numDoc || '—'}</td>
						<td class="border border-gray-300 px-2 py-1.5">{r.nombre}</td>
						<td class="border border-gray-300 px-2 py-1.5">{r.parentesco || '—'}</td>
						<td class="border border-gray-300 px-2 py-1.5">{fmtFecha(r.fechaNacimiento)}</td>
					</tr>
				{:else}
					<tr>
						<td colspan="5" class="border border-gray-300 px-2 py-2 text-center text-gray-400">
							Sin residentes registrados
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>

	<section class="border-b border-gray-200 px-6 py-4">
		<h3 class="mb-3 flex items-center gap-2 text-sm font-bold uppercase">
			<span class="flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-xs text-white">4</span>
			Evento
		</h3>
		<div class="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-3">
			<div>
				<p class="text-xs font-semibold uppercase text-gray-500">Evento</p>
				<p class="text-sm font-medium">{ins.eventoEstado || '—'}</p>
			</div>
			<div>
				<p class="text-xs font-semibold uppercase text-gray-500">Tipo</p>
				<p class="text-sm font-medium">
					{ins.tipoEvento || '—'}
					{#if ins.tipoEvento === 'Otro' && ins.tipoEventoOtro} — {ins.tipoEventoOtro}{/if}
				</p>
			</div>
			<div>
				<p class="text-xs font-semibold uppercase text-gray-500">Deterioro estructural — posible causa</p>
				<p class="text-sm font-medium">{ins.deterioro || '—'}</p>
			</div>
		</div>
	</section>

	<section class="border-b border-gray-200 px-6 py-4">
		<h3 class="mb-3 flex items-center gap-2 text-sm font-bold uppercase">
			<span class="flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-xs text-white">5</span>
			Afectación
		</h3>
		<div class="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
			<div>
				<p class="text-xs font-semibold uppercase text-gray-500">Nivel de afectación</p>
				<p class="text-sm font-medium">{ins.nivelAfectacion || '—'}</p>
			</div>
			<div>
				<p class="text-xs font-semibold uppercase text-gray-500">Pérdida de bienes muebles y enseres</p>
				<p class="text-sm font-medium">{ins.perdidaBienes || '—'}</p>
			</div>
		</div>
		<div class="mt-3">
			<p class="text-xs font-semibold uppercase text-gray-500">Infraestructura afectada</p>
			{#if ins.infraAfectada.length > 0}
				<ul class="mt-1 space-y-1 text-sm">
					{#each ins.infraAfectada as i}
						<li class="flex items-center gap-2">
							<span class="inline-block h-3 w-3 rounded-sm border border-gray-400 bg-white"></span>
							<span class="font-medium">{i.tipo}</span>
							<span class="text-gray-500">— {fmtArea(i.area)}</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-sm text-gray-400">Sin registro</p>
			{/if}
		</div>
	</section>

	<section class="border-b border-gray-200 px-6 py-4">
		<h3 class="mb-3 flex items-center gap-2 text-sm font-bold uppercase">
			<span class="flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-xs text-white">6</span>
			Requiere visita
		</h3>
		{#if ins.requiereVisita.length > 0}
			<ul class="flex flex-wrap gap-x-6 gap-y-2 text-sm">
				{#each ins.requiereVisita as e}
					<li class="flex items-center gap-2">
						<span class="inline-block h-3 w-3 rounded-sm border border-gray-400 bg-white"></span>
						<span>
							{e}
							{#if e === 'Otro' && ins.requiereVisitaOtro} — {ins.requiereVisitaOtro}{/if}
						</span>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-sm text-gray-400">Sin registro</p>
		{/if}
	</section>

	<section class="border-b border-gray-200 px-6 py-4">
		<h3 class="mb-3 flex items-center gap-2 text-sm font-bold uppercase">
			<span class="flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-xs text-white">7</span>
			Se recomienda evacuación
		</h3>
		<p class="text-sm font-medium">{ins.evacuacion ? 'Sí' : 'No'}</p>
		{#if ins.evacuacion}
			<div class="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
				<p class="font-semibold">Importante</p>
				<p class="mt-1">
					En caso de recomendación de evacuación favor llamar a la sede de la Cruz Roja Colombiana
					Seccional Caldas al teléfono {CRUZ_ROJA_PHONE} y preguntar si ya puede reclamar el
					auxilio de arrendamiento o la ayuda humanitaria, si aplica. Una vez autorizado su auxilio,
					favor llevar fotocopia de la revisión en domicilio realizada por Bomberos, fotocopia de la
					cédula de ciudadanía del titular de la revisión y del arrendatario, quien lo debe acompañar.
				</p>
			</div>
		{/if}
	</section>

	<section class="border-b border-gray-200 px-6 py-4">
		<h3 class="mb-3 text-sm font-bold uppercase">Fecha y Hora</h3>
		<div class="grid grid-cols-2 gap-x-6 gap-y-3">
			<div>
				<p class="text-xs font-semibold uppercase text-gray-500">Fecha</p>
				<p class="text-sm font-medium">{fmtFecha(ins.fecha)}</p>
			</div>
			<div>
				<p class="text-xs font-semibold uppercase text-gray-500">Hora</p>
				<p class="text-sm font-medium">{ins.hora || '—'}</p>
			</div>
		</div>
	</section>

	<section class="border-b border-gray-200 px-6 py-4">
		<h3 class="mb-3 text-sm font-bold uppercase">Firmas</h3>
		<div class="grid gap-6 sm:grid-cols-2">
			<div>
				<p class="text-xs font-semibold uppercase text-gray-500">Firma del Bombero</p>
				<div class="mt-1 flex h-28 items-center justify-center rounded-lg border border-gray-300 bg-white">
					{#if ins.bomberoFirma}
						<img src={ins.bomberoFirma} alt="Firma del bombero" class="max-h-24 max-w-full object-contain" />
					{:else}
						<span class="text-xs text-gray-400">Sin firma</span>
					{/if}
				</div>
				<div class="mt-2 grid grid-cols-2 gap-3 text-sm">
					<div>
						<p class="text-xs font-semibold uppercase text-gray-500">Nombre</p>
						<p class="text-sm font-medium">{ins.bomberoNombre || '—'}</p>
					</div>
					<div>
						<p class="text-xs font-semibold uppercase text-gray-500">Cédula</p>
						<p class="text-sm font-medium">{ins.bomberoCedula || '—'}</p>
					</div>
				</div>
			</div>
			<div>
				<p class="text-xs font-semibold uppercase text-gray-500">Firma del Notificado</p>
				<div class="mt-1 flex h-28 items-center justify-center rounded-lg border border-gray-300 bg-white">
					{#if ins.notificadoFirma}
						<img src={ins.notificadoFirma} alt="Firma del notificado" class="max-h-24 max-w-full object-contain" />
					{:else}
						<span class="text-xs text-gray-400">Sin firma</span>
					{/if}
				</div>
				<div class="mt-2 grid grid-cols-2 gap-3 text-sm">
					<div>
						<p class="text-xs font-semibold uppercase text-gray-500">Nombre</p>
						<p class="text-sm font-medium">{ins.notificadoNombre || '—'}</p>
					</div>
					<div>
						<p class="text-xs font-semibold uppercase text-gray-500">Cédula</p>
						<p class="text-sm font-medium">{ins.notificadoCedula || '—'}</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<section class="px-6 py-4">
		<h3 class="mb-3 text-sm font-bold uppercase">Geolocalización</h3>
		<div class="grid grid-cols-2 gap-x-6 gap-y-3">
			<div>
				<p class="text-xs font-semibold uppercase text-gray-500">Latitud</p>
				<p class="text-sm font-medium">{ins.lat !== null && ins.lat !== undefined ? ins.lat : '—'}</p>
			</div>
			<div>
				<p class="text-xs font-semibold uppercase text-gray-500">Longitud</p>
				<p class="text-sm font-medium">{ins.lng !== null && ins.lng !== undefined ? ins.lng : '—'}</p>
			</div>
		</div>
	</section>

	{#if ins.photos && ins.photos.length > 0}
		<section class="px-6 py-4">
			<h3 class="mb-3 text-sm font-bold uppercase">Fotos del predio</h3>
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
				{#each ins.photos as photo, i (i)}
					<a href={photo} target="_blank" rel="noopener">
						<img
							src={photo}
							alt={`Foto ${i + 1} del predio`}
							class="aspect-square w-full rounded-xl border border-gray-200 object-cover"
						/>
					</a>
				{/each}
			</div>
		</section>
	{/if}

	<footer class="border-t border-gray-200 bg-gray-50 px-6 py-3 text-center text-xs text-gray-500">
		Registrada por {ins.inspectorName || '—'} · Código {FORM_CODE} · {FORM_VERSION}
	</footer>
</article>

<style>
	@page {
		size: A4;
		margin: 12mm;
	}

	@media print {
		.print-sheet {
			max-width: 210mm;
			border: none;
			box-shadow: none;
			border-radius: 0;
		}

		:global(body) {
			font-family: Georgia, 'Times New Roman', serif;
		}

		:global(body) .print-sheet section {
			break-inside: avoid;
		}
	}
</style>
