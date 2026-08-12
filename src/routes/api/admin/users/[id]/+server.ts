import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/auth';

const userFields = {
	id: users.id,
	email: users.email,
	name: users.name,
	role: users.role,
	active: users.active,
	createdAt: users.createdAt
};

const patchSchema = z
	.object({
		name: z.string().trim().min(1, 'El nombre no puede estar vacío').optional(),
		role: z.enum(['admin', 'inspector']).optional(),
		active: z.boolean().optional(),
		password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional()
	})
	.strict()
	.refine((v) => Object.keys(v).length > 0, { message: 'No hay campos para actualizar' });

function requireAdmin(locals: App.Locals): NonNullable<App.Locals['user']> {
	if (!locals.user || locals.user.role !== 'admin') {
		throw error(403, { message: 'No autorizado' });
	}
	return locals.user;
}

function parseId(raw: string): number {
	const id = Number(raw);
	if (!Number.isInteger(id) || id <= 0) {
		throw error(400, { message: 'ID inválido' });
	}
	return id;
}

export async function PATCH({ request, locals, params }) {
	requireAdmin(locals);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, { message: 'JSON inválido' });
	}

	const parsed = patchSchema.safeParse(body);
	if (!parsed.success) {
		throw error(400, { message: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
	}

	const id = parseId(params.id);

	const existing = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);
	if (existing.length === 0) {
		throw error(404, { message: 'Usuario no encontrado' });
	}

	const { name, role, active, password } = parsed.data;
	const values: Partial<typeof users.$inferInsert> = {};
	if (name !== undefined) values.name = name;
	if (role !== undefined) values.role = role;
	if (active !== undefined) values.active = active;
	if (password !== undefined) values.passwordHash = await hashPassword(password);

	const [user] = await db.update(users).set(values).where(eq(users.id, id)).returning(userFields);

	return json({ ok: true, user });
}

export async function DELETE({ locals, params }) {
	const me = requireAdmin(locals);

	const id = parseId(params.id);

	if (id === me.id) {
		throw error(400, { message: 'No puedes eliminar tu propio usuario' });
	}

	const existing = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);
	if (existing.length === 0) {
		throw error(404, { message: 'Usuario no encontrado' });
	}

	await db.delete(users).where(eq(users.id, id));

	return json({ ok: true });
}
