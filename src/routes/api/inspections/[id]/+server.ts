import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { inspections, residents } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

function parseId(raw: string): number {
	const id = Number(raw);
	if (!Number.isInteger(id) || id <= 0) throw error(400, { message: 'ID inválido' });
	return id;
}

export const GET: RequestHandler = async (event) => {
	const user = event.locals.user;
	if (!user) throw error(401, { message: 'No autenticado' });

	const id = parseId(event.params.id);
	const inspection = await db.query.inspections.findFirst({ where: eq(inspections.id, id) });
	if (!inspection) throw error(404, { message: 'Inspección no encontrada' });
	if (user.role !== 'admin' && inspection.inspectorId !== user.id) {
		throw error(403, { message: 'Sin permiso para ver esta inspección' });
	}

	const residentRows = await db.select().from(residents).where(eq(residents.inspectionId, id));
	return json({ inspection, residents: residentRows });
};

export const DELETE: RequestHandler = async (event) => {
	const user = event.locals.user;
	if (!user) throw error(401, { message: 'No autenticado' });
	if (user.role !== 'admin') {
		throw error(403, { message: 'Solo los administradores pueden eliminar inspecciones' });
	}

	const id = parseId(event.params.id);
	const existing = await db.query.inspections.findFirst({ where: eq(inspections.id, id) });
	if (!existing) throw error(404, { message: 'Inspección no encontrada' });

	await db.delete(inspections).where(eq(inspections.id, id));
	return json({ ok: true });
};
