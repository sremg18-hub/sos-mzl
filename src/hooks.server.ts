import type { Handle, HandleServerError } from '@sveltejs/kit';
import { getUserFromToken } from '$lib/server/auth';
import { SESSION_COOKIE } from '$lib/constants';

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);
	event.locals.user = await getUserFromToken(token);

	const path = event.url.pathname;
	if (path === '/login' || path === '/offline') {
		return resolve(event);
	}

	if (!event.locals.user) {
		return new Response(null, {
			status: 307,
			headers: { Location: '/login' }
		});
	}

	if (path.startsWith('/admin') && event.locals.user.role !== 'admin') {
		return new Response(null, {
			status: 303,
			headers: { Location: '/' }
		});
	}

	return resolve(event);
};

export const handleError: HandleServerError = async ({ error }) => {
	console.error(error);
	return {
		message: 'Error interno del servidor'
	};
};
