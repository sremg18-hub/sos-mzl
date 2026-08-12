import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { verifyPassword, createSession, sessionCookieOptions } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { SESSION_COOKIE } from '$lib/constants';

export const actions: Actions = {
	login: async ({ request, cookies }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim().toLowerCase();
		const password = String(data.get('password') ?? '');

		if (!email || !password) {
			return fail(400, { error: 'Ingrese correo y contraseña', email });
		}

		const user = await db.query.users.findFirst({ where: eq(users.email, email) });
		if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) {
			return fail(401, { error: 'Credenciales inválidas o usuario inactivo', email });
		}

		const token = await createSession(user.id);
		cookies.set(SESSION_COOKIE, token, sessionCookieOptions());

		throw redirect(303, user.role === 'admin' ? '/admin' : '/visitas');
	}
};
