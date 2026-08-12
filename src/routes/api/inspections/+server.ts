import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { sql, eq, desc, and, or, ilike, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { inspections, residents, type NewInspection, type Resident } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

function todayLocal(): string {
	const d = new Date();
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	return `${d.getFullYear()}-${mm}-${dd}`;
}

function currentTime(): string {
	const d = new Date();
	return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

async function nextNumRevision(): Promise<string> {
	const [row] = await db
		.select({ m: sql<number>`COALESCE(MAX(num_revision::int), 0)` })
		.from(inspections);
	return String((row?.m ?? 0) + 1);
}

function newSyncId(): string {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
	return `srv-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const textOrNull = z
	.union([z.string().trim(), z.null()])
	.transform((v) => (v ? v : null))
	.optional();

const numRevisionSchema = z
	.union([z.string().trim(), z.number(), z.null()])
	.transform((v) => (v === null || v === '' ? null : String(v)))
	.optional();

const dateOrNull = z
	.union([z.string(), z.null()])
	.transform((v) => {
		if (typeof v !== 'string' || !v.trim()) return null;
		return v.trim();
	})
	.optional();

const rolSchema = z
	.enum(['Propietario', 'Arrendatario', 'Sucesion', 'Sucesión', 'Otro'])
	.transform((v) => (v === 'Sucesión' ? 'Sucesion' : v));

const coordOrNull = z
	.union([z.number(), z.string(), z.null()])
	.transform((v) => {
		if (v === null || v === '') return null;
		const n = typeof v === 'number' ? v : Number(v);
		return Number.isFinite(n) ? n : null;
	})
	.optional();

const residentSchema = z.object({
	tipoDoc: textOrNull,
	numDoc: textOrNull,
	nombre: z.string().trim().min(1, 'El nombre del residente es obligatorio'),
	parentesco: textOrNull,
	fechaNacimiento: dateOrNull
});

const inspectionSchema = z.object({
	syncId: z.string().trim().min(1).optional(),
	numRevision: numRevisionSchema,
	barrio: z.string().trim().min(1, 'El barrio es obligatorio'),
	direccion: z.string().trim().min(1, 'La dirección es obligatoria'),
	encuestadoDoc: textOrNull,
	encuestadoNombre: z.string().trim().min(1, 'El nombre del encuestado es obligatorio'),
	encuestadoTelefono: textOrNull,
	encuestadoFechaNacimiento: dateOrNull,
	rolEncuestado: rolSchema,
	rolOtro: textOrNull,
	propietarioDoc: textOrNull,
	propietarioNombre: textOrNull,
	propietarioTelefono: textOrNull,
	eventoEstado: z.enum(['Inminente', 'Sucedido']),
	tipoEvento: z.string().trim().min(1, 'El tipo de evento es obligatorio'),
	tipoEventoOtro: textOrNull,
	deterioro: z.string().trim().min(1, 'La causa de deterioro es obligatoria'),
	nivelAfectacion: z.enum(['Total', 'Parcial', 'Ninguna']),
	infraAfectada: z
		.array(z.object({ tipo: z.string(), area: z.number().nullable() }))
		.optional()
		.default([]),
	perdidaBienes: textOrNull,
	requiereVisita: z.array(z.string()).optional().default([]),
	requiereVisitaOtro: textOrNull,
	evacuacion: z
		.union([z.boolean(), z.literal('true'), z.literal('false')])
		.transform((v) => v === true || v === 'true')
		.optional(),
	fecha: z
		.union([z.string(), z.null()])
		.transform((v) => (typeof v === 'string' && v.trim() ? v.trim() : todayLocal()))
		.optional(),
	hora: z
		.union([z.string(), z.null()])
		.transform((v) => (typeof v === 'string' && v.trim() ? v.trim() : currentTime()))
		.optional(),
	bomberoFirma: textOrNull,
	bomberoNombre: textOrNull,
	bomberoCedula: textOrNull,
	notificadoFirma: textOrNull,
	notificadoNombre: textOrNull,
	notificadoCedula: textOrNull,
	lat: coordOrNull,
	lng: coordOrNull,
	inspectorName: textOrNull,
	photos: z
		.array(
			z
				.string()
				.startsWith('data:image/', 'La foto debe ser una imagen')
				.refine((s) => s.length <= 4_000_000, 'Cada foto no puede superar ~3MB')
		)
		.max(3, 'Máximo 3 fotos por visita')
		.optional()
		.default([]),
	residents: z.array(residentSchema).optional().default([])
});

export const GET: RequestHandler = async (event) => {
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

	const ids = list.map((i) => i.id);
	const residentRows = ids.length
		? await db.select().from(residents).where(inArray(residents.inspectionId, ids))
		: [];
	const byInspection = new Map<number, Resident[]>();
	for (const r of residentRows) {
		const arr = byInspection.get(r.inspectionId);
		if (arr) arr.push(r);
		else byInspection.set(r.inspectionId, [r]);
	}

	return json({
		inspections: list.map((i) => ({ ...i, residents: byInspection.get(i.id) ?? [] }))
	});
};

export const POST: RequestHandler = async (event) => {
	const user = event.locals.user;
	if (!user) throw error(401, { message: 'No autenticado' });

	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		throw error(400, { message: 'JSON inválido' });
	}

	const parsed = inspectionSchema.safeParse(body);
	if (!parsed.success) {
		const first = parsed.error.issues[0];
		throw error(400, {
			message: first
				? `${first.path.join('.') || 'body'}: ${first.message}`
				: 'Datos inválidos'
		});
	}
	const data = parsed.data;

	const syncId = data.syncId ?? newSyncId();

	const existing = await db.query.inspections.findFirst({
		where: eq(inspections.syncId, syncId)
	});
	if (existing) {
		return json({
			ok: true,
			id: existing.id,
			syncId: existing.syncId,
			numRevision: existing.numRevision
		});
	}

	const numRevision = data.numRevision ?? (await nextNumRevision());

	const insertValues: NewInspection = {
		syncId,
		numRevision,
		barrio: data.barrio,
		direccion: data.direccion,
		encuestadoDoc: data.encuestadoDoc,
		encuestadoNombre: data.encuestadoNombre,
		encuestadoTelefono: data.encuestadoTelefono,
		encuestadoFechaNacimiento: data.encuestadoFechaNacimiento,
		rolEncuestado: data.rolEncuestado,
		rolOtro: data.rolOtro,
		propietarioDoc: data.propietarioDoc,
		propietarioNombre: data.propietarioNombre,
		propietarioTelefono: data.propietarioTelefono,
		eventoEstado: data.eventoEstado,
		tipoEvento: data.tipoEvento,
		tipoEventoOtro: data.tipoEventoOtro,
		deterioro: data.deterioro,
		nivelAfectacion: data.nivelAfectacion,
		infraAfectada: data.infraAfectada,
		perdidaBienes: data.perdidaBienes,
		requiereVisita: data.requiereVisita,
		requiereVisitaOtro: data.requiereVisitaOtro,
		evacuacion: data.evacuacion ?? false,
		fecha: data.fecha ?? todayLocal(),
		hora: data.hora ?? currentTime(),
		bomberoFirma: data.bomberoFirma,
		bomberoNombre: data.bomberoNombre,
		bomberoCedula: data.bomberoCedula,
		notificadoFirma: data.notificadoFirma,
		notificadoNombre: data.notificadoNombre,
		notificadoCedula: data.notificadoCedula,
		lat: data.lat,
		lng: data.lng,
		photos: data.photos,
		inspectorId: user.id,
		inspectorName: data.inspectorName ?? user.name
	};

	try {
		const created = await db.transaction(async (tx) => {
			const [ins] = await tx
				.insert(inspections)
				.values(insertValues)
				.returning({
					id: inspections.id,
					syncId: inspections.syncId,
					numRevision: inspections.numRevision
				});
			if (data.residents.length > 0) {
				await tx
					.insert(residents)
					.values(data.residents.map((r) => ({ ...r, inspectionId: ins.id })));
			}
			return ins;
		});
		return json({
			ok: true,
			id: created.id,
			syncId: created.syncId,
			numRevision: created.numRevision
		});
	} catch (err) {
		const dup = await db.query.inspections.findFirst({
			where: eq(inspections.syncId, syncId)
		});
		if (dup) {
			return json({
				ok: true,
				id: dup.id,
				syncId: dup.syncId,
				numRevision: dup.numRevision
			});
		}
		throw err;
	}
};
