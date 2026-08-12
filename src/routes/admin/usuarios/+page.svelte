<script lang="ts">
	import { untrack } from 'svelte';

	let { data } = $props();

	type UserRow = {
		id: number;
		email: string;
		name: string;
		role: 'admin' | 'inspector';
		active: boolean;
		createdAt: string | Date;
	};

	let users = $state<UserRow[]>(untrack(() => data.users));
	let showForm = $state(false);
	let formName = $state('');
	let formEmail = $state('');
	let formPassword = $state('');
	let formRole = $state<'admin' | 'inspector'>('inspector');
	let submitting = $state(false);
	let toast = $state<{ kind: 'ok' | 'err'; msg: string } | null>(null);

	$effect(() => {
		if (!toast) return;
		const t = setTimeout(() => (toast = null), 4000);
		return () => clearTimeout(t);
	});

	async function api<T>(path: string, init?: RequestInit): Promise<T> {
		const res = await fetch(path, {
			...init,
			headers: { 'Content-Type': 'application/json', ...init?.headers }
		});
		const body = await res.json().catch(() => null);
		if (!res.ok) {
			throw new Error(body?.message ?? `Error ${res.status}`);
		}
		return body as T;
	}

	async function refresh() {
		const res = await api<{ users: UserRow[] }>('/api/admin/users');
		users = res.users;
	}

	async function crearUsuario() {
		submitting = true;
		try {
			await api<{ ok: boolean }>('/api/admin/users', {
				method: 'POST',
				body: JSON.stringify({
					email: formEmail,
					password: formPassword,
					name: formName,
					role: formRole
				})
			});
			toast = { kind: 'ok', msg: 'Usuario creado' };
			formName = '';
			formEmail = '';
			formPassword = '';
			formRole = 'inspector';
			showForm = false;
			await refresh();
		} catch (e) {
			toast = { kind: 'err', msg: e instanceof Error ? e.message : 'Error al crear usuario' };
		} finally {
			submitting = false;
		}
	}

	async function toggleActive(u: UserRow) {
		try {
			await api<{ ok: boolean }>(`/api/admin/users/${u.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ active: !u.active })
			});
			toast = { kind: 'ok', msg: u.active ? 'Usuario desactivado' : 'Usuario activado' };
			await refresh();
		} catch (e) {
			toast = { kind: 'err', msg: e instanceof Error ? e.message : 'Error al actualizar' };
		}
	}

	async function toggleRol(u: UserRow) {
		const nuevo = u.role === 'admin' ? 'inspector' : 'admin';
		try {
			await api<{ ok: boolean }>(`/api/admin/users/${u.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ role: nuevo })
			});
			toast = { kind: 'ok', msg: `Rol cambiado a ${nuevo}` };
			await refresh();
		} catch (e) {
			toast = { kind: 'err', msg: e instanceof Error ? e.message : 'Error al actualizar' };
		}
	}

	async function resetPassword(u: UserRow) {
		const pwd = prompt(`Nueva contraseña para ${u.name} (mínimo 6 caracteres):`);
		if (pwd === null || pwd === '') return;
		if (pwd.length < 6) {
			toast = { kind: 'err', msg: 'La contraseña debe tener al menos 6 caracteres' };
			return;
		}
		try {
			await api<{ ok: boolean }>(`/api/admin/users/${u.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ password: pwd })
			});
			toast = { kind: 'ok', msg: 'Contraseña actualizada' };
		} catch (e) {
			toast = { kind: 'err', msg: e instanceof Error ? e.message : 'Error al actualizar' };
		}
	}

	async function eliminar(u: UserRow) {
		if (!confirm(`¿Eliminar a ${u.name} (${u.email})?`)) return;
		try {
			await api<{ ok: boolean }>(`/api/admin/users/${u.id}`, { method: 'DELETE' });
			toast = { kind: 'ok', msg: 'Usuario eliminado' };
			await refresh();
		} catch (e) {
			toast = { kind: 'err', msg: e instanceof Error ? e.message : 'Error al eliminar' };
		}
	}
</script>

<svelte:head><title>Usuarios — SOS Manizales</title></svelte:head>

{#if toast}
	<div class="fixed inset-x-0 top-20 z-50 flex justify-center px-4">
		<div
			class="rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg {toast.kind === 'ok'
				? 'bg-emerald-600'
				: 'bg-red-600'}"
		>
			{toast.msg}
		</div>
	</div>
{/if}

<div class="mx-auto max-w-5xl">
	<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Usuarios</h1>
			<p class="mt-1 text-sm text-gray-500">Gestión de cuentas del sistema</p>
		</div>
		<button
			class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
			onclick={() => (showForm = !showForm)}
		>
			{showForm ? 'Cancelar' : '+ Nuevo usuario'}
		</button>
	</div>

	{#if showForm}
		<div class="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
			<h2 class="mb-4 font-bold text-gray-900">Nuevo usuario</h2>
			<form
				class="grid gap-4 sm:grid-cols-2"
				onsubmit={(e) => {
					e.preventDefault();
					crearUsuario();
				}}
			>
				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700" for="nu-name">Nombre</label>
					<input
						id="nu-name"
						type="text"
						required
						bind:value={formName}
						placeholder="Nombre completo"
						class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
					/>
				</div>
				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700" for="nu-email">Correo</label>
					<input
						id="nu-email"
						type="email"
						required
						bind:value={formEmail}
						placeholder="correo@manizales.gov.co"
						class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
					/>
				</div>
				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700" for="nu-password">Contraseña</label>
					<input
						id="nu-password"
						type="password"
						required
						minlength="6"
						bind:value={formPassword}
						placeholder="Mínimo 6 caracteres"
						class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
					/>
				</div>
				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700" for="nu-role">Rol</label>
					<select
						id="nu-role"
						bind:value={formRole}
						class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
					>
						<option value="inspector">Inspector</option>
						<option value="admin">Administrador</option>
					</select>
				</div>
				<div class="sm:col-span-2">
					<button
						type="submit"
						disabled={submitting}
						class="rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
					>
						{submitting ? 'Creando…' : 'Crear usuario'}
					</button>
				</div>
			</form>
		</div>
	{/if}

	<div class="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
		<table class="w-full min-w-[640px] text-left text-sm">
			<thead class="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
				<tr>
					<th class="px-4 py-3 font-semibold">Nombre</th>
					<th class="px-4 py-3 font-semibold">Correo</th>
					<th class="px-4 py-3 font-semibold">Rol</th>
					<th class="px-4 py-3 font-semibold">Estado</th>
					<th class="px-4 py-3 font-semibold">Creado</th>
					<th class="px-4 py-3 text-right font-semibold">Acciones</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-100">
				{#each users as u (u.id)}
					<tr class="hover:bg-gray-50">
						<td class="px-4 py-3 font-medium text-gray-900">{u.name}</td>
						<td class="px-4 py-3 text-gray-600">{u.email}</td>
						<td class="px-4 py-3">
							{#if u.role === 'admin'}
								<span class="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Admin</span>
							{:else}
								<span class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">Inspector</span>
							{/if}
						</td>
						<td class="px-4 py-3">
							{#if u.active}
								<span class="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">Activo</span>
							{:else}
								<span class="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">Inactivo</span>
							{/if}
						</td>
						<td class="px-4 py-3 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
						<td class="px-4 py-3">
							<div class="flex flex-wrap justify-end gap-1 text-xs">
								<button
									class="rounded-md px-2 py-1 font-semibold {u.active
										? 'text-amber-600 hover:bg-amber-50'
										: 'text-emerald-600 hover:bg-emerald-50'}"
									onclick={() => toggleActive(u)}
								>
									{u.active ? 'Desactivar' : 'Activar'}
								</button>
								<button
									class="rounded-md px-2 py-1 font-semibold text-blue-600 hover:bg-blue-50"
									onclick={() => toggleRol(u)}
								>
									Cambiar rol
								</button>
								<button
									class="rounded-md px-2 py-1 font-semibold text-gray-600 hover:bg-gray-100"
									onclick={() => resetPassword(u)}
								>
									Clave
								</button>
								<button
									class="rounded-md px-2 py-1 font-semibold text-red-600 hover:bg-red-50"
									onclick={() => eliminar(u)}
								>
									Eliminar
								</button>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
		{#if users.length === 0}
			<p class="px-4 py-8 text-center text-sm text-gray-500">No hay usuarios registrados.</p>
		{/if}
	</div>
</div>
