import type { Actions } from './$types';
import { deleteSession } from '$lib/server/auth';
import { SESSION_COOKIE } from '$lib/constants';
import { redirect } from '@sveltejs/kit';

export const actions: Actions = {
	logout: async ({ cookies, locals }) => {
		const token = cookies.get(SESSION_COOKIE);
		if (token) {
			try {
				await deleteSession(token);
			} catch {
				// sesión ya expirada o inválida
			}
		}
		cookies.delete(SESSION_COOKIE, { path: '/' });
		locals.user = null;
		throw redirect(303, '/login');
	}
};
