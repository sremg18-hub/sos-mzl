<script lang="ts">
	import { APP_NAME } from '$lib/constants';
</script>

<svelte:head><title>Sin conexión — {APP_NAME}</title></svelte:head>

<div class="flex min-h-screen flex-col items-center justify-center bg-white p-8 text-center">
	<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-200 text-3xl">📡</div>
	<h1 class="text-xl font-bold text-gray-900">Sin conexión</h1>
	<p class="mt-2 max-w-sm text-sm text-gray-500">
		No hay acceso al servidor en este momento. Los formularios se guardan en su dispositivo y se
		sincronizan automáticamente cuando vuelva la conexión.
	</p>
	<p class="mt-4 text-sm text-gray-500">
		Si estaba diligenciando un formulario, los datos quedaron guardados. Presione
		<strong>volver</strong> y continúe desde el dispositivo.
	</p>
	<button onclick={() => location.reload()} class="mt-6 rounded-lg bg-emerald-600 px-6 py-2.5 font-semibold text-white">
		Reintentar
	</button>
</div>
