import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { inspections, residents } from '$lib/server/db/schema';

export async function load(event) {
	const user = event.locals.user;
	if (!user) throw error(401, { message: 'No autenticado' });

	const id = Number(event.params.id);
	if (!Number.isInteger(id) || id <= 0) throw error(400, { message: 'ID inválido' });

	const inspection = await db.query.inspections.findFirst({ where: eq(inspections.id, id) });
	if (!inspection) throw error(404, { message: 'Inspección no encontrada' });
	if (user.role !== 'admin' && inspection.inspectorId !== user.id) {
		throw error(403, { message: 'Sin permiso para ver esta inspección' });
	}

	const residentRows = await db.select().from(residents).where(eq(residents.inspectionId, id));

	return {
		inspection,
		residents: residentRows,
		isAdmin: user.role === 'admin'
	};
}
