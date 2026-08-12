<script lang="ts">
	import { page } from '$app/state';
	import { APP_NAME } from '$lib/constants';
</script>

<svelte:head><title>{APP_NAME}</title></svelte:head>

<div class="grid gap-6">
	<div class="rounded-2xl border border-emerald-100 bg-emerald-50 p-6">
		<h1 class="text-2xl font-bold text-emerald-900">Bienvenido, {page.data.user?.name}</h1>
		<p class="mt-1 text-emerald-700">
			Plataforma de revisión a predios — {APP_NAME}. Seleccione una opción para comenzar.
		</p>
	</div>

	<div class="grid gap-4 sm:grid-cols-2">
		<a
			href="/visita"
			class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-emerald-300 hover:shadow"
		>
			<h2 class="text-lg font-bold text-gray-900">Nueva visita</h2>
			<p class="mt-1 text-sm text-gray-500">Diligenciar formulario GUE-RPD-FR-02 de revisión a predio</p>
		</a>
		<a
			href="/visitas"
			class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-emerald-300 hover:shadow"
		>
			<h2 class="text-lg font-bold text-gray-900">Mis visitas</h2>
			<p class="mt-1 text-sm text-gray-500">Historial y detalle de formularios diligenciados</p>
		</a>
		{#if page.data.user?.role === 'admin'}
			<a
				href="/admin"
				class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-emerald-300 hover:shadow"
			>
				<h2 class="text-lg font-bold text-gray-900">Panel de análisis</h2>
				<p class="mt-1 text-sm text-gray-500">Estadísticas y mapa georreferenciado de las visitas</p>
			</a>
			<a
				href="/admin/usuarios"
				class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-emerald-300 hover:shadow"
			>
				<h2 class="text-lg font-bold text-gray-900">Usuarios</h2>
				<p class="mt-1 text-sm text-gray-500">Gestionar inspectores y administradores del sistema</p>
			</a>
		{/if}
	</div>
</div>
