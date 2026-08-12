<script lang="ts">
	import { enhance } from '$app/forms';
	import { APP_NAME, APP_FULL_NAME, ALCALDIA_PHONE, FREE_LINE } from '$lib/constants';

	let { form } = $props();
</script>

<svelte:head><title>Ingreso — {APP_NAME}</title></svelte:head>

<div class="flex min-h-screen items-center justify-center bg-gray-100 p-4">
	<div class="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
		<div class="mb-6 text-center">
			<div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-3xl font-bold text-white">
				+
			</div>
			<h1 class="text-xl font-bold text-gray-900">{APP_NAME}</h1>
			<p class="mt-1 text-sm text-gray-500">{APP_FULL_NAME}</p>
		</div>

		{#if form?.error}
			<div class="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
				{form.error}
			</div>
		{/if}

		<form method="POST" action="?/login" use:enhance class="space-y-4">
			<div>
				<label class="mb-1 block text-sm font-medium text-gray-700" for="email">Correo</label>
				<input
					id="email"
					name="email"
					type="email"
					required
					value={form?.email ?? ''}
					autocomplete="username"
					class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
				/>
			</div>
			<div>
				<label class="mb-1 block text-sm font-medium text-gray-700" for="password">Contraseña</label>
				<input
					id="password"
					name="password"
					type="password"
					required
					autocomplete="current-password"
					class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
				/>
			</div>
			<button
				type="submit"
				class="w-full rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white hover:bg-emerald-700"
			>
				Ingresar
			</button>
		</form>

		<p class="mt-6 text-center text-xs text-gray-400">
			Alcaldía de Manizales — Tel: {ALCALDIA_PHONE} · Línea gratuita {FREE_LINE}
		</p>
	</div>
</div>
