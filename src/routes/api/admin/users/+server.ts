import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
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

const createSchema = z.object({
	email: z.email('Correo inválido').transform((v) => v.trim().toLowerCase()),
	password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
	name: z.string().trim().min(1, 'El nombre es requerido'),
	role: z.enum(['admin', 'inspector'])
});

function requireAdmin(locals: App.Locals) {
	if (!locals.user || locals.user.role !== 'admin') {
		throw error(403, { message: 'No autorizado' });
	}
}

export function GET({ locals }) {
	requireAdmin(locals);
	return db
		.select(userFields)
		.from(users)
		.orderBy(desc(users.createdAt))
		.then((list) => json({ users: list }));
}

export async function POST({ request, locals }) {
	requireAdmin(locals);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, { message: 'JSON inválido' });
	}

	const parsed = createSchema.safeParse(body);
	if (!parsed.success) {
		throw error(400, { message: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
	}

	const { email, password, name, role } = parsed.data;

	const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
	if (existing.length > 0) {
		throw error(409, { message: 'El correo ya está registrado' });
	}

	const [user] = await db
		.insert(users)
		.values({ email, passwordHash: await hashPassword(password), name, role })
		.returning(userFields);

	return json({ ok: true, user });
}
