import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { verifyPassword, createSession, sessionCookieOptions } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { SESSION_COOKIE } from '$lib/constants';
import { checkRateLimit, recordFailure, clearFailures } from '$lib/server/rateLimit';

export const actions: Actions = {
	login: async ({ request, cookies, getClientAddress }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim().toLowerCase();
		const password = String(data.get('password') ?? '');

		const ip = getClientAddress();
		const limit = checkRateLimit(`login:${ip}`);
		if (!limit.allowed) {
			return fail(429, {
				error: `Demasiados intentos fallidos. Espere ${limit.retryAfterSeconds} segundos.`,
				email
			});
		}

		if (!email || !password) {
			return fail(400, { error: 'Ingrese correo y contraseña', email });
		}

		const user = await db.query.users.findFirst({ where: eq(users.email, email) });
		if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) {
			recordFailure(`login:${ip}`);
			return fail(401, { error: 'Credenciales inválidas o usuario inactivo', email });
		}

		clearFailures(`login:${ip}`);
		const token = await createSession(user.id);
		cookies.set(SESSION_COOKIE, token, sessionCookieOptions());

		throw redirect(303, user.role === 'admin' ? '/admin' : '/visitas');
	}
};
