<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import SignaturePad from 'signature_pad';
	import 'leaflet/dist/leaflet.css';
	import {
		ROL_ENCUESTADO_OPTIONS,
		TIPO_EVENTO_OPTIONS,
		DETERIORO_OPTIONS,
		NIVEL_AFECTACION_OPTIONS,
		INFRA_OPTIONS,
		ENTIDADES_VISITA_OPTIONS,
		TIPO_DOC_OPTIONS,
		FORM_CODE,
		FORM_VERSION,
		CRUZ_ROJA_PHONE
	} from '$lib/constants';
	import { saveDraft, deleteDraft, savePending, newSyncId } from '$lib/offline/db';

	let { data } = $props();

	const inputCls =
		'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30';
	const labelCls = 'mb-1 block text-sm font-medium text-gray-700';

	function todayLocal(): string {
		const d = new Date();
		const mm = String(d.getMonth() + 1).padStart(2, '0');
		const dd = String(d.getDate()).padStart(2, '0');
		return `${d.getFullYear()}-${mm}-${dd}`;
	}

	function currentTime(): string {
		const d = new Date();
		return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
	}

	type RolValue = 'Propietario' | 'Arrendatario' | 'Sucesion' | 'Otro';
	type RolOption = (typeof ROL_ENCUESTADO_OPTIONS)[number];
	const rolToValue = (r: RolOption): RolValue => (r === 'Sucesión' ? 'Sucesion' : r);

	type EventoEstado = 'Inminente' | 'Sucedido';
	type NivelAfectacion = 'Total' | 'Parcial' | 'Ninguna';

	interface ResidentRow {
		id: number;
		tipoDoc: string;
		numDoc: string;
		nombre: string;
		parentesco: string;
		fechaNacimiento: string;
	}

	interface InfraRow {
		checked: boolean;
		tipo: string;
		label: string;
		area: number | null;
	}

	let numRevision = $derived(data.nextNumRevision);
	let barrio = $state('');
	let direccion = $state('');
	let encuestadoDoc = $state('');
	let encuestadoNombre = $state('');
	let encuestadoTelefono = $state('');
	let encuestadoFechaNacimiento = $state('');
	let rolEncuestado = $state<RolValue>('Propietario');
	let rolOtro = $state('');
	let propietarioDoc = $state('');
	let propietarioNombre = $state('');
	let propietarioTelefono = $state('');
	let residents = $state<ResidentRow[]>([]);
	let eventoEstado = $state<EventoEstado>('Inminente');
	let tipoEvento = $state('');
	let tipoEventoOtro = $state('');
	let deterioro = $state('');
	let nivelAfectacion = $state<NivelAfectacion>('Total');
	let infra = $state<InfraRow[]>(
		INFRA_OPTIONS.map((o) => ({ checked: false, tipo: o.value, label: o.label, area: null }))
	);
	let perdidaBienes = $state('');
	let requiereVisita = $state<string[]>([]);
	let requiereVisitaOtro = $state('');
	let evacuacion = $state(false);
	let fecha = $state(todayLocal());
	let hora = $state(currentTime());
	let bomberoFirma = $state<string | null>(null);
	let bomberoNombre = $state('');
	let bomberoCedula = $state('');
	let notificadoFirma = $state<string | null>(null);
	let notificadoNombre = $state('');
	let notificadoCedula = $state('');
	let lat = $state<number | null>(null);
	let lng = $state<number | null>(null);

	let notice = $state<{ kind: 'ok' | 'err' | 'warn'; text: string } | null>(null);
	let saving = $state(false);
	let draftSyncId = $state<string | null>(null);
	let geoMsg = $state('');
	let photos = $state<string[]>([]);

	async function addPhoto(file: File) {
		if (photos.length >= 3) return;
		try {
			const dataUrl = await compressImage(file);
			if (dataUrl) photos = [...photos, dataUrl];
		} catch {
			notice = { kind: 'err', text: 'No se pudo procesar la foto.' };
		}
	}

	function removePhoto(index: number) {
		photos = photos.filter((_, i) => i !== index);
	}

	function compressImage(file: File): Promise<string | null> {
		return new Promise((resolve, reject) => {
			const url = URL.createObjectURL(file);
			const img = new Image();
			img.onload = () => {
				try {
					const MAX = 1280;
					const scale = Math.min(1, MAX / Math.max(img.width, img.height));
					const canvas = document.createElement('canvas');
					canvas.width = Math.round(img.width * scale);
					canvas.height = Math.round(img.height * scale);
					const ctx = canvas.getContext('2d');
					if (!ctx) return reject(new Error('canvas'));
					ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
					resolve(canvas.toDataURL('image/jpeg', 0.7));
				} catch (e) {
					reject(e);
				} finally {
					URL.revokeObjectURL(url);
				}
			};
			img.onerror = () => {
				URL.revokeObjectURL(url);
				reject(new Error('img'));
			};
			img.src = url;
		});
	}

	let bomberoCanvas: HTMLCanvasElement | undefined;
	let notificadoCanvas: HTMLCanvasElement | undefined;
	let mapEl: HTMLDivElement | undefined;
	let leaflet: typeof import('leaflet') | null = null;
	let map: import('leaflet').Map | null = null;
	let marker: import('leaflet').Marker | null = null;
	let padBombero: SignaturePad | null = null;
	let padNotificado: SignaturePad | null = null;
	let markerIcon: import('leaflet').DivIcon | null = null;

	onMount(() => {
		if (!bomberoCanvas || !notificadoCanvas || !mapEl) return;
		const mapDiv = mapEl;

		padBombero = new SignaturePad(bomberoCanvas, { penColor: '#111827', backgroundColor: '#ffffff' });
		padNotificado = new SignaturePad(notificadoCanvas, {
			penColor: '#111827',
			backgroundColor: '#ffffff'
		});
		padBombero.addEventListener('end', () => {
			bomberoFirma = padBombero ? padBombero.toDataURL('image/png') : null;
		});
		padNotificado.addEventListener('end', () => {
			notificadoFirma = padNotificado ? padNotificado.toDataURL('image/png') : null;
		});

		import('leaflet').then((mod) => {
			leaflet = mod;
			markerIcon = mod.divIcon({
				className: '',
				html: '<div style="width:28px;height:28px;border-radius:9999px;background:#059669;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;font-weight:800;line-height:1">+</div>',
				iconSize: [28, 28],
				iconAnchor: [14, 14]
			});
			map = mod.map(mapDiv, { scrollWheelZoom: true }).setView([5.0703, -75.5138], 13);
			mod
				.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
					attribution: '&copy; OpenStreetMap contributors'
				})
				.addTo(map);
			map.on('click', (e: import('leaflet').LeafletMouseEvent) => {
				setMarker(e.latlng.lat, e.latlng.lng);
			});
			if (lat !== null && lng !== null) setMarker(lat, lng);
		});

		return () => {
			map?.remove();
			map = null;
			marker = null;
			markerIcon = null;
			leaflet = null;
			padBombero = null;
			padNotificado = null;
		};
	});

	function setMarker(latv: number, lngv: number) {
		lat = latv;
		lng = lngv;
		if (!map || !leaflet || !markerIcon) return;
		if (marker) {
			marker.setLatLng([latv, lngv]);
		} else {
			marker = leaflet.marker([latv, lngv], { icon: markerIcon, draggable: true }).addTo(map);
			marker.on('dragend', () => {
				const p = marker?.getLatLng();
				if (p) {
					lat = p.lat;
					lng = p.lng;
				}
			});
		}
	}

	function useMyLocation() {
		geoMsg = '';
		if (typeof navigator === 'undefined' || !navigator.geolocation) {
			geoMsg = 'La geolocalización no está disponible en este dispositivo.';
			return;
		}
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				setMarker(pos.coords.latitude, pos.coords.longitude);
			},
			() => {
				geoMsg =
					'No se pudo obtener la ubicación. Verifique los permisos o ubique el marcador en el mapa.';
			},
			{ enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
		);
	}

	function clearSignature(which: 'bombero' | 'notificado') {
		const pad = which === 'bombero' ? padBombero : padNotificado;
		pad?.clear();
		if (which === 'bombero') bomberoFirma = null;
		else notificadoFirma = null;
	}

	function addResident() {
		if (residents.length >= 15) return;
		residents.push({
			id: Date.now() + Math.random(),
			tipoDoc: 'CC',
			numDoc: '',
			nombre: '',
			parentesco: '',
			fechaNacimiento: ''
		});
	}

	function removeResident(index: number) {
		residents.splice(index, 1);
	}

	function toggleEntity(entity: string) {
		if (requiereVisita.includes(entity)) {
			requiereVisita = requiereVisita.filter((e) => e !== entity);
		} else {
			requiereVisita = [...requiereVisita, entity];
		}
	}

	function validate(): string | null {
		if (!barrio.trim()) return 'El campo Barrio es obligatorio';
		if (!direccion.trim()) return 'El campo Dirección es obligatorio';
		if (!encuestadoNombre.trim()) return 'El campo Nombre(s) del encuestado es obligatorio';
		if (rolEncuestado === 'Otro' && !rolOtro.trim()) return 'Especifique el rol cuando selecciona "Otro"';
		if (!eventoEstado) return 'Indique si el evento es Inminente o Sucedido';
		if (!tipoEvento) return 'Seleccione el tipo de evento';
		if (tipoEvento === 'Otro' && !tipoEventoOtro.trim()) return 'Especifique el tipo de evento cuando selecciona "Otro"';
		if (!deterioro) return 'Seleccione la posible causa de deterioro';
		if (!nivelAfectacion) return 'Seleccione el nivel de afectación';
		if (requiereVisita.includes('Otro') && !requiereVisitaOtro.trim())
			return 'Especifique la entidad cuando selecciona "Otro"';
		return null;
	}

	function buildPayload(syncId: string) {
		return {
			syncId,
			numRevision: numRevision || undefined,
			barrio: barrio.trim(),
			direccion: direccion.trim(),
			encuestadoDoc: encuestadoDoc.trim() || undefined,
			encuestadoNombre: encuestadoNombre.trim(),
			encuestadoTelefono: encuestadoTelefono.trim() || undefined,
			encuestadoFechaNacimiento: encuestadoFechaNacimiento || undefined,
			rolEncuestado,
			rolOtro: rolEncuestado === 'Otro' ? rolOtro.trim() || undefined : undefined,
			propietarioDoc:
				rolEncuestado === 'Arrendatario' ? propietarioDoc.trim() || undefined : undefined,
			propietarioNombre:
				rolEncuestado === 'Arrendatario' ? propietarioNombre.trim() || undefined : undefined,
			propietarioTelefono:
				rolEncuestado === 'Arrendatario' ? propietarioTelefono.trim() || undefined : undefined,
			eventoEstado,
			tipoEvento,
			tipoEventoOtro: tipoEvento === 'Otro' ? tipoEventoOtro.trim() || undefined : undefined,
			deterioro,
			nivelAfectacion,
			infraAfectada: infra
				.filter((i) => i.checked)
				.map((i) => ({ tipo: i.tipo, area: i.area })),
			perdidaBienes: perdidaBienes.trim() || undefined,
			requiereVisita,
			requiereVisitaOtro: requiereVisita.includes('Otro') ? requiereVisitaOtro.trim() : undefined,
			evacuacion,
			fecha: fecha || todayLocal(),
			hora: hora || currentTime(),
			bomberoFirma: bomberoFirma ?? undefined,
			bomberoNombre: bomberoNombre.trim() || undefined,
			bomberoCedula: bomberoCedula.trim() || undefined,
			notificadoFirma: notificadoFirma ?? undefined,
			notificadoNombre: notificadoNombre.trim() || undefined,
			notificadoCedula: notificadoCedula.trim() || undefined,
			photos,
			lat: lat ?? null,
			lng: lng ?? null,
			residents: residents
				.filter(
					(r) =>
						r.nombre.trim() !== '' ||
						r.numDoc.trim() !== '' ||
						r.parentesco.trim() !== '' ||
						r.fechaNacimiento !== ''
				)
				.map((r) => ({
					tipoDoc: r.tipoDoc || null,
					numDoc: r.numDoc.trim() || null,
					nombre: r.nombre.trim(),
					parentesco: r.parentesco.trim() || null,
					fechaNacimiento: r.fechaNacimiento || null
				}))
		};
	}

	async function queueOffline(syncId: string, payload: unknown) {
		await savePending({ syncId, payload, createdAt: new Date().toISOString() });
		if (draftSyncId) {
			await deleteDraft(draftSyncId);
			draftSyncId = null;
		}
		notice = {
			kind: 'warn',
			text: 'Guardado en el dispositivo — se sincronizará al recuperar la conexión'
		};
	}

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		submit();
	}

	async function submit() {
		const errorMsg = validate();
		if (errorMsg) {
			notice = { kind: 'err', text: errorMsg };
			return;
		}
		saving = true;
		notice = null;
		const syncId = draftSyncId ?? newSyncId();
		const payload = buildPayload(syncId);
		try {
			const res = await fetch('/api/inspections', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (res.ok) {
				if (draftSyncId) await deleteDraft(draftSyncId);
				goto('/visitas?saved=1');
				return;
			}
			if (res.status >= 500) {
				await queueOffline(syncId, payload);
				return;
			}
			const body = await res.json().catch(() => null);
			notice = {
				kind: 'err',
				text:
					body && typeof body.message === 'string'
						? body.message
						: 'No se pudo enviar la revisión'
			};
		} catch {
			await queueOffline(syncId, payload);
		} finally {
			saving = false;
		}
	}

	async function saveAsDraft() {
		const syncId = draftSyncId ?? newSyncId();
		draftSyncId = syncId;
		await saveDraft({ syncId, payload: buildPayload(syncId), createdAt: new Date().toISOString() });
		notice = { kind: 'ok', text: 'Borrador guardado en este dispositivo' };
	}
</script>

<svelte:head>
	<title>Nueva revisión a predio — {FORM_CODE}</title>
</svelte:head>

<div class="mx-auto max-w-3xl">
	{#if notice}
		<div
			class="no-print mb-4 rounded-xl border px-4 py-3 text-sm font-medium {notice.kind === 'err'
				? 'border-red-200 bg-red-50 text-red-700'
				: notice.kind === 'warn'
					? 'border-amber-200 bg-amber-50 text-amber-800'
					: 'border-emerald-200 bg-emerald-50 text-emerald-800'}"
		>
			{notice.text}
		</div>
	{/if}

	<form
		onsubmit={handleSubmit}
		class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
	>
		<header class="border-b border-emerald-100 bg-emerald-50 px-4 py-5 text-center sm:px-6">
			<div class="flex items-center justify-center gap-2 text-emerald-700">
				<span
					class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-lg font-bold text-white"
					>+</span
				>
				<h1 class="text-sm font-bold uppercase tracking-wide sm:text-base">
					Alcaldía de Manizales
				</h1>
			</div>
			<p class="mt-1 text-xs font-semibold uppercase text-emerald-600 sm:text-sm">
				Gestión para la prevención y atención de urgencias y emergencias
			</p>
			<h2 class="mt-2 text-lg font-extrabold uppercase text-gray-900 sm:text-xl">
				Revisión a predio
			</h2>
			<div class="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-gray-600">
				<span><b>Código:</b> {FORM_CODE}</span>
				<span><b>Estado:</b> Vigente</span>
				<span><b>{FORM_VERSION}</b></span>
			</div>
			<div class="mt-3 flex items-center justify-end gap-2 text-sm">
				<label for="numRevision" class="font-semibold text-gray-700">N°</label>
				<input
					id="numRevision"
					type="text"
					readonly
					value={numRevision}
					class="w-24 rounded-lg border border-gray-300 bg-gray-100 px-3 py-1.5 text-center font-bold text-gray-700"
				/>
			</div>
		</header>

		<section class="border-b border-gray-100 px-4 py-5 sm:px-6">
			<h3 class="mb-4 flex items-center gap-2 text-sm font-bold uppercase text-emerald-700">
				<span
					class="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs text-white"
					>1</span
				>
				Dirección del predio
			</h3>
			<div class="grid gap-4 sm:grid-cols-2">
				<div>
					<label for="barrio" class={labelCls}>Barrio *</label>
					<input
						id="barrio"
						type="text"
						list="barrios-list"
						bind:value={barrio}
						class={inputCls}
						placeholder="Ej: La Enea"
					/>
					<datalist id="barrios-list">
						{#each data.barrios as b}
							<option value={b}></option>
						{/each}
					</datalist>
				</div>
				<div>
					<label for="direccion" class={labelCls}>Dirección *</label>
					<input
						id="direccion"
						type="text"
						bind:value={direccion}
						class={inputCls}
						placeholder="Ej: Cra 20 # 12-34"
					/>
				</div>
			</div>
		</section>

		<section class="border-b border-gray-100 px-4 py-5 sm:px-6">
			<h3 class="mb-4 flex items-center gap-2 text-sm font-bold uppercase text-emerald-700">
				<span
					class="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs text-white"
					>2</span
				>
				Encuestado
			</h3>
			<div class="grid gap-4 sm:grid-cols-2">
				<div>
					<label for="encuestadoDoc" class={labelCls}>Documento</label>
					<input
						id="encuestadoDoc"
						type="text"
						bind:value={encuestadoDoc}
						class={inputCls}
						placeholder="Ej: 75012345"
					/>
				</div>
				<div>
					<label for="encuestadoNombre" class={labelCls}>Nombre(s) *</label>
					<input
						id="encuestadoNombre"
						type="text"
						bind:value={encuestadoNombre}
						class={inputCls}
						placeholder="Nombres y apellidos"
					/>
				</div>
				<div>
					<label for="encuestadoTelefono" class={labelCls}>Teléfono</label>
					<input
						id="encuestadoTelefono"
						type="tel"
						bind:value={encuestadoTelefono}
						class={inputCls}
						placeholder="Ej: 310 000 0000"
					/>
				</div>
				<div>
					<label for="encuestadoFechaNacimiento" class={labelCls}>Fecha de nacimiento</label>
					<input
						id="encuestadoFechaNacimiento"
						type="date"
						bind:value={encuestadoFechaNacimiento}
						class={inputCls}
					/>
				</div>
				<div class="sm:col-span-2">
					<span class="mb-1 block text-sm font-medium text-gray-700">Rol del encuestado *</span>
					<div class="flex flex-wrap gap-x-6 gap-y-2">
						{#each ROL_ENCUESTADO_OPTIONS as rol}
							<label class="flex items-center gap-2 text-sm text-gray-800">
								<input
									type="radio"
									name="rolEncuestado"
									value={rolToValue(rol)}
									checked={rolEncuestado === rolToValue(rol)}
									onchange={() => (rolEncuestado = rolToValue(rol))}
									class="h-4 w-4 accent-emerald-600"
								/>
								{rol}
							</label>
						{/each}
					</div>
					{#if rolEncuestado === 'Otro'}
						<div class="mt-3">
							<label for="rolOtro" class={labelCls}>¿Cuál? *</label>
							<input
								id="rolOtro"
								type="text"
								bind:value={rolOtro}
								class={inputCls}
								placeholder="Especifique el rol"
							/>
						</div>
					{/if}
				</div>
			</div>

			{#if rolEncuestado === 'Arrendatario'}
				<div class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
					<h4 class="mb-3 text-sm font-bold uppercase text-emerald-800">
						Datos del Propietario
					</h4>
					<div class="grid gap-4 sm:grid-cols-3">
						<div>
							<label for="propietarioDoc" class={labelCls}>Documento</label>
							<input
								id="propietarioDoc"
								type="text"
								bind:value={propietarioDoc}
								class={inputCls}
							/>
						</div>
						<div>
							<label for="propietarioNombre" class={labelCls}>Nombre</label>
							<input
								id="propietarioNombre"
								type="text"
								bind:value={propietarioNombre}
								class={inputCls}
							/>
						</div>
						<div>
							<label for="propietarioTelefono" class={labelCls}>Teléfono</label>
							<input
								id="propietarioTelefono"
								type="tel"
								bind:value={propietarioTelefono}
								class={inputCls}
							/>
						</div>
					</div>
				</div>
			{/if}
		</section>

		<section class="border-b border-gray-100 px-4 py-5 sm:px-6">
			<h3 class="mb-4 flex items-center gap-2 text-sm font-bold uppercase text-emerald-700">
				<span
					class="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs text-white"
					>3</span
				>
				Residentes
			</h3>
			<div class="overflow-x-auto">
				<table class="w-full min-w-[680px] text-sm">
					<thead>
						<tr class="border-b border-gray-200 text-left text-xs font-semibold uppercase text-gray-500">
							<th class="py-2 pr-2">Tipo doc</th>
							<th class="py-2 pr-2">N° documento</th>
							<th class="py-2 pr-2">Nombre(s)</th>
							<th class="py-2 pr-2">Parentesco</th>
							<th class="py-2 pr-2">Fecha nacimiento</th>
							<th class="py-2"></th>
						</tr>
					</thead>
					<tbody>
						{#each residents as r, i (r.id)}
							<tr class="border-b border-gray-100 align-top">
								<td class="py-2 pr-2">
									<select bind:value={r.tipoDoc} class={inputCls}>
										{#each TIPO_DOC_OPTIONS as t}
											<option value={t}>{t}</option>
										{/each}
									</select>
								</td>
								<td class="py-2 pr-2">
									<input type="text" bind:value={r.numDoc} class={inputCls} />
								</td>
								<td class="py-2 pr-2">
									<input type="text" bind:value={r.nombre} class={inputCls} />
								</td>
								<td class="py-2 pr-2">
									<input type="text" bind:value={r.parentesco} class={inputCls} />
								</td>
								<td class="py-2 pr-2">
									<input type="date" bind:value={r.fechaNacimiento} class={inputCls} />
								</td>
								<td class="py-2">
									<button
										type="button"
										onclick={() => removeResident(i)}
										class="rounded-lg p-2 text-sm font-semibold text-red-600 hover:bg-red-50"
										aria-label="Eliminar residente"
									>
										✕
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			{#if residents.length === 0}
				<p class="mt-2 text-sm text-gray-400">Sin residentes registrados.</p>
			{/if}
			<div class="mt-3 flex items-center gap-2">
				<button
					type="button"
					onclick={addResident}
					class="rounded-lg border border-emerald-600 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
				>
					+ Agregar
				</button>
				<span class="text-xs text-gray-400">Máximo 15 — {residents.length}/15</span>
			</div>
		</section>

		<section class="border-b border-gray-100 px-4 py-5 sm:px-6">
			<h3 class="mb-4 flex items-center gap-2 text-sm font-bold uppercase text-emerald-700">
				<span
					class="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs text-white"
					>4</span
				>
				Evento
			</h3>
			<div class="grid gap-5 sm:grid-cols-2">
				<div>
					<span class="mb-1 block text-sm font-medium text-gray-700">Evento *</span>
					<div class="flex gap-6">
						<label class="flex items-center gap-2 text-sm text-gray-800">
							<input
								type="radio"
								name="eventoEstado"
								value="Inminente"
								checked={eventoEstado === 'Inminente'}
								onchange={() => (eventoEstado = 'Inminente')}
								class="h-4 w-4 accent-emerald-600"
							/>
							Inminente
						</label>
						<label class="flex items-center gap-2 text-sm text-gray-800">
							<input
								type="radio"
								name="eventoEstado"
								value="Sucedido"
								checked={eventoEstado === 'Sucedido'}
								onchange={() => (eventoEstado = 'Sucedido')}
								class="h-4 w-4 accent-emerald-600"
							/>
							Sucedido
						</label>
					</div>
				</div>
				<div>
					<span class="mb-1 block text-sm font-medium text-gray-700">Tipo *</span>
					<div class="flex flex-wrap gap-x-6 gap-y-2">
						{#each TIPO_EVENTO_OPTIONS as t}
							<label class="flex items-center gap-2 text-sm text-gray-800">
								<input
									type="radio"
									name="tipoEvento"
									value={t}
									checked={tipoEvento === t}
									onchange={() => (tipoEvento = t)}
									class="h-4 w-4 accent-emerald-600"
								/>
								{t}
							</label>
						{/each}
					</div>
					{#if tipoEvento === 'Otro'}
						<div class="mt-3">
							<label for="tipoEventoOtro" class={labelCls}>¿Cuál? *</label>
							<input
								id="tipoEventoOtro"
								type="text"
								bind:value={tipoEventoOtro}
								class={inputCls}
								placeholder="Especifique el tipo de evento"
							/>
						</div>
					{/if}
				</div>
				<div class="sm:col-span-2">
					<span class="mb-1 block text-sm font-medium text-gray-700">
						Deterioro estructural — posible causa *
					</span>
					<div class="flex flex-wrap gap-x-6 gap-y-2">
						{#each DETERIORO_OPTIONS as d}
							<label class="flex items-center gap-2 text-sm text-gray-800">
								<input
									type="radio"
									name="deterioro"
									value={d}
									checked={deterioro === d}
									onchange={() => (deterioro = d)}
									class="h-4 w-4 accent-emerald-600"
								/>
								{d}
							</label>
						{/each}
					</div>
				</div>
			</div>
		</section>

		<section class="border-b border-gray-100 px-4 py-5 sm:px-6">
			<h3 class="mb-4 flex items-center gap-2 text-sm font-bold uppercase text-emerald-700">
				<span
					class="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs text-white"
					>5</span
				>
				Afectación
			</h3>
			<div class="grid gap-5">
				<div>
					<span class="mb-1 block text-sm font-medium text-gray-700">Nivel de afectación *</span>
					<div class="flex flex-wrap gap-x-6 gap-y-2">
						{#each NIVEL_AFECTACION_OPTIONS as n}
							<label class="flex items-center gap-2 text-sm text-gray-800">
								<input
									type="radio"
									name="nivelAfectacion"
									value={n}
									checked={nivelAfectacion === n}
									onchange={() => (nivelAfectacion = n)}
									class="h-4 w-4 accent-emerald-600"
								/>
								{n}
							</label>
						{/each}
					</div>
				</div>
				<div>
					<span class="mb-1 block text-sm font-medium text-gray-700">
						Infraestructura afectada
					</span>
					<div class="space-y-2">
						{#each infra as inf}
							<div class="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 p-3">
								<label class="flex flex-1 items-center gap-2 text-sm font-medium text-gray-800">
									<input
										type="checkbox"
										bind:checked={inf.checked}
										class="h-4 w-4 accent-emerald-600"
									/>
									{inf.label}
								</label>
								<div class="flex items-center gap-2">
									<label for={`infra-area-${inf.tipo}`} class="text-xs text-gray-500">Área m²</label>
									<input
										id={`infra-area-${inf.tipo}`}
										type="number"
										min="0"
										step="0.01"
										value={inf.area ?? ''}
										disabled={!inf.checked}
										oninput={(e) => {
											const t = e.currentTarget as HTMLInputElement;
											inf.area = t.value === '' ? null : Number(t.value);
										}}
										class="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
									/>
								</div>
							</div>
						{/each}
					</div>
				</div>
				<div>
					<label for="perdidaBienes" class={labelCls}>
						Pérdida de Bienes Muebles y Enseres
					</label>
					<textarea
						id="perdidaBienes"
						rows="2"
						bind:value={perdidaBienes}
						class={inputCls}
						placeholder="¿Cuál?"
					></textarea>
				</div>
			</div>
		</section>

		<section class="border-b border-gray-100 px-4 py-5 sm:px-6">
			<h3 class="mb-4 flex items-center gap-2 text-sm font-bold uppercase text-emerald-700">
				<span
					class="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs text-white"
					>6</span
				>
				Requiere visita
			</h3>
			<div class="grid gap-x-6 gap-y-2 sm:grid-cols-2">
				{#each ENTIDADES_VISITA_OPTIONS as e}
					<label class="flex items-center gap-2 text-sm text-gray-800">
						<input
							type="checkbox"
							checked={requiereVisita.includes(e)}
							onchange={() => toggleEntity(e)}
							class="h-4 w-4 accent-emerald-600"
						/>
						{e}
					</label>
				{/each}
			</div>
			{#if requiereVisita.includes('Otro')}
				<div class="mt-3">
					<label for="requiereVisitaOtro" class={labelCls}>¿Cuál? *</label>
					<input
						id="requiereVisitaOtro"
						type="text"
						bind:value={requiereVisitaOtro}
						class={inputCls}
						placeholder="Especifique la entidad"
					/>
				</div>
			{/if}
		</section>

		<section class="border-b border-gray-100 px-4 py-5 sm:px-6">
			<h3 class="mb-4 flex items-center gap-2 text-sm font-bold uppercase text-emerald-700">
				<span
					class="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs text-white"
					>7</span
				>
				Se recomienda evacuación
			</h3>
			<div class="flex gap-6">
				<label class="flex items-center gap-2 text-sm text-gray-800">
					<input
						type="radio"
						name="evacuacion"
						value="Si"
						checked={evacuacion}
						onchange={() => (evacuacion = true)}
						class="h-4 w-4 accent-emerald-600"
					/>
					Sí
				</label>
				<label class="flex items-center gap-2 text-sm text-gray-800">
					<input
						type="radio"
						name="evacuacion"
						value="No"
						checked={!evacuacion}
						onchange={() => (evacuacion = false)}
						class="h-4 w-4 accent-emerald-600"
					/>
					No
				</label>
			</div>
			{#if evacuacion}
				<div class="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
					<p class="font-semibold">Importante</p>
					<p class="mt-1">
						En caso de recomendación de evacuación favor llamar a la sede de la Cruz Roja
						Colombiana Seccional Caldas al teléfono {CRUZ_ROJA_PHONE} y preguntar si ya puede
						reclamar el auxilio de arrendamiento o la ayuda humanitaria, si aplica. Una vez
						autorizado su auxilio, favor llevar fotocopia de la revisión en domicilio realizada
						por Bomberos, fotocopia de la cédula de ciudadanía del titular de la revisión y del
						arrendatario, quien lo debe acompañar.
					</p>
				</div>
			{/if}
		</section>

		<section class="border-b border-gray-100 px-4 py-5 sm:px-6">
			<h3 class="mb-4 text-sm font-bold uppercase text-emerald-700">Fecha y Hora</h3>
			<div class="grid gap-4 sm:grid-cols-2">
				<div>
					<label for="fecha" class={labelCls}>Fecha</label>
					<input id="fecha" type="date" bind:value={fecha} class={inputCls} />
				</div>
				<div>
					<label for="hora" class={labelCls}>Hora</label>
					<input id="hora" type="time" bind:value={hora} class={inputCls} />
				</div>
			</div>
		</section>

		<section class="border-b border-gray-100 px-4 py-5 sm:px-6">
			<h3 class="mb-4 text-sm font-bold uppercase text-emerald-700">Firmas</h3>
			<div class="grid gap-6 sm:grid-cols-2">
				<div class="rounded-xl border border-gray-200 p-4">
					<h4 class="mb-3 text-sm font-bold uppercase text-gray-700">Firma del Bombero</h4>
					<div class="rounded-lg border border-dashed border-gray-300 bg-white p-2">
						<canvas
							bind:this={bomberoCanvas}
							width="600"
							height="200"
							class="h-[100px] w-full max-w-[300px] touch-none"
						></canvas>
					</div>
					<div class="mt-2 flex items-center gap-3">
						<button
							type="button"
							onclick={() => clearSignature('bombero')}
							class="text-xs font-semibold text-gray-500 underline"
						>
							Limpiar
						</button>
						{#if bomberoFirma}
							<span class="text-xs font-medium text-emerald-600">Firma registrada</span>
						{/if}
					</div>
					<div class="mt-3 grid gap-3">
						<input
							type="text"
							bind:value={bomberoNombre}
							placeholder="Nombre del bombero"
							class={inputCls}
						/>
						<input
							type="text"
							bind:value={bomberoCedula}
							placeholder="Cédula"
							class={inputCls}
						/>
					</div>
				</div>
				<div class="rounded-xl border border-gray-200 p-4">
					<h4 class="mb-3 text-sm font-bold uppercase text-gray-700">Firma del Notificado</h4>
					<div class="rounded-lg border border-dashed border-gray-300 bg-white p-2">
						<canvas
							bind:this={notificadoCanvas}
							width="600"
							height="200"
							class="h-[100px] w-full max-w-[300px] touch-none"
						></canvas>
					</div>
					<div class="mt-2 flex items-center gap-3">
						<button
							type="button"
							onclick={() => clearSignature('notificado')}
							class="text-xs font-semibold text-gray-500 underline"
						>
							Limpiar
						</button>
						{#if notificadoFirma}
							<span class="text-xs font-medium text-emerald-600">Firma registrada</span>
						{/if}
					</div>
					<div class="mt-3 grid gap-3">
						<input
							type="text"
							bind:value={notificadoNombre}
							placeholder="Nombre del notificado"
							class={inputCls}
						/>
						<input
							type="text"
							bind:value={notificadoCedula}
							placeholder="Cédula"
							class={inputCls}
						/>
					</div>
				</div>
			</div>
		</section>

		<section class="border-b border-gray-100 px-4 py-5 sm:px-6">
			<h3 class="mb-4 text-sm font-bold uppercase text-emerald-700">Fotos del predio</h3>
			<div class="grid grid-cols-3 gap-3 sm:grid-cols-5">
				{#each photos as photo, i (i)}
					<div class="relative overflow-hidden rounded-xl border border-gray-200">
						<img src={photo} alt="Foto del predio" class="aspect-square w-full object-cover" />
						<button
							type="button"
							onclick={() => removePhoto(i)}
							aria-label="Quitar foto"
							class="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white"
						>
							✕
						</button>
					</div>
				{/each}
				{#if photos.length < 3}
					<label
						class="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-emerald-400 hover:text-emerald-600"
					>
						<span class="text-2xl">📷</span>
						<span class="text-[10px] font-semibold">Agregar foto</span>
						<input
							type="file"
							accept="image/*"
							capture="environment"
							class="hidden"
							onchange={(e) => {
								const f = e.currentTarget.files?.[0];
								if (f) addPhoto(f);
								e.currentTarget.value = '';
							}}
						/>
					</label>
				{/if}
			</div>
			<p class="mt-2 text-xs text-gray-400">
				Máximo 3 fotos (cámara o galería). Se comprimen automáticamente — evidencia para el PMU.
			</p>
		</section>

		<section class="border-b border-gray-100 px-4 py-5 sm:px-6">
			<h3 class="mb-4 text-sm font-bold uppercase text-emerald-700">Geolocalización del predio</h3>
			<div class="grid gap-4 sm:grid-cols-[auto_1fr]">
				<div class="flex flex-col gap-2">
					<button
						type="button"
						onclick={useMyLocation}
						class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
					>
						Usar mi ubicación
					</button>
					{#if geoMsg}
						<p class="text-xs font-medium text-amber-700">{geoMsg}</p>
					{/if}
					<div class="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
						<p><b>Lat:</b> {lat !== null ? lat.toFixed(6) : '—'}</p>
						<p><b>Lng:</b> {lng !== null ? lng.toFixed(6) : '—'}</p>
					</div>
					<p class="text-xs text-gray-400">
						Arrastre el marcador o haga clic en el mapa para ubicar el predio.
					</p>
				</div>
				<div bind:this={mapEl} class="z-0 h-64 w-full rounded-xl border border-gray-300"></div>
			</div>
		</section>

		<footer
			class="no-print sticky bottom-0 z-30 flex gap-3 border-t border-gray-200 bg-white px-4 py-4 sm:px-6"
		>
			<button
				type="button"
				onclick={saveAsDraft}
				disabled={saving}
				class="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
			>
				Guardar borrador
			</button>
			<button
				type="submit"
				disabled={saving}
				class="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60 sm:flex-none sm:px-8"
			>
				{saving ? 'Enviando…' : 'Enviar'}
			</button>
		</footer>
	</form>
</div>
