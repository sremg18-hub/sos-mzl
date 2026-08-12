import { error } from '@sveltejs/kit';
import { desc, eq, and, or, ilike } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { inspections } from '$lib/server/db/schema';

export async function load(event) {
	const user = event.locals.user;
	if (!user) throw error(401, { message: 'No autenticado' });

	const q = event.url.searchParams.get('q')?.trim() ?? '';
	const search = q
		? or(
				ilike(inspections.barrio, `%${q}%`),
				ilike(inspections.direccion, `%${q}%`),
				ilike(inspections.encuestadoNombre, `%${q}%`)
			)
		: undefined;
	const where =
		user.role === 'admin' ? search : and(eq(inspections.inspectorId, user.id), search);

	const list = await db.select().from(inspections).where(where).orderBy(desc(inspections.createdAt));

	return {
		inspections: list,
		q,
		isAdmin: user.role === 'admin',
		saved: event.url.searchParams.get('saved') === '1'
	};
}
