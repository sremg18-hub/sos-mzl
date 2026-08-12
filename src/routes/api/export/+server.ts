import { error } from '@sveltejs/kit';
import { and, gte, lte, eq, inArray, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { inspections, residents } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

function csvCell(v: unknown): string {
	if (v === null || v === undefined) return '';
	const s = String(v);
	return `"${s.replace(/"/g, '""')}"`;
}

export const GET: RequestHandler = async (event) => {
	const user = event.locals.user;
	if (!user) throw error(401, { message: 'No autenticado' });
	if (user.role !== 'admin') throw error(403, { message: 'Solo administradores' });

	const desde = event.url.searchParams.get('desde')?.trim();
	const hasta = event.url.searchParams.get('hasta')?.trim();
	const barrio = event.url.searchParams.get('barrio')?.trim();

	const conds = [];
	if (desde) conds.push(gte(inspections.fecha, desde));
	if (hasta) conds.push(lte(inspections.fecha, hasta));
	if (barrio) conds.push(eq(inspections.barrio, barrio));

	const list = await db
		.select()
		.from(inspections)
		.where(conds.length ? and(...conds) : undefined)
		.orderBy(inspections.createdAt);

	const ids = list.map((i) => i.id);
	const counts = ids.length
		? await db
				.select({ inspectionId: residents.inspectionId, n: sql<number>`count(*)` })
				.from(residents)
				.where(inArray(residents.inspectionId, ids))
				.groupBy(residents.inspectionId)
		: [];
	const residentCount = new Map(counts.map((c) => [c.inspectionId, Number(c.n)]));

	const header = [
		'Revisión',
		'Fecha',
		'Hora',
		'Barrio',
		'Dirección',
		'Doc. Encuestado',
		'Encuestado',
		'Teléfono',
		'Rol',
		'Evento',
		'Tipo Evento',
		'Deterioro',
		'Nivel Afectación',
		'Infraestructura (m2)',
		'Pérdida Bienes',
		'Requiere Visita',
		'Evacuación',
		'Latitud',
		'Longitud',
		'Bombero',
		'Notificado',
		'Inspector',
		'# Residentes',
		'# Fotos',
		'Registrado'
	];

	const rows = list.map((i) => [
		i.numRevision,
		i.fecha,
		i.hora,
		i.barrio,
		i.direccion,
		i.encuestadoDoc,
		i.encuestadoNombre,
		i.encuestadoTelefono,
		i.rolEncuestado,
		i.eventoEstado,
		i.tipoEvento,
		i.deterioro,
		i.nivelAfectacion,
		i.infraAfectada.map((x) => `${x.tipo} ${x.area ?? ''}`.trim()).join(' / '),
		i.perdidaBienes,
		i.requiereVisita.join(' / '),
		i.evacuacion ? 'SI' : 'NO',
		i.lat,
		i.lng,
		i.bomberoNombre,
		i.notificadoNombre,
		i.inspectorName,
		residentCount.get(i.id) ?? 0,
		i.photos.length,
		i.createdAt.toISOString()
	]);

	const csvRows = [header, ...rows].map((r) => r.map(csvCell).join(';'));
	const csv = '\uFEFF' + csvRows.join('\r\n');

	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="revisiones-sos-mzl-${new Date().toISOString().slice(0, 10)}.csv"`
		}
	});
};
