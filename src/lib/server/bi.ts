import { db } from '$lib/server/db';
import { inspections } from '$lib/server/db/schema';
import { and, count, desc, eq, gte, isNotNull, lt, lte } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export interface BiFilters {
	desde?: string;
	hasta?: string;
	barrio?: string;
}

export interface BiPunto {
	id: number;
	lat: number;
	lng: number;
	nivelAfectacion: string;
	evacuacion: boolean;
	barrio: string;
	direccion: string;
	fecha: string;
	numRevision: string | null;
}

export interface BiStats {
	totales: {
		total: number;
		hoy: number;
		conGeo: number;
		evacuaciones: number;
		afectacionTotal: number;
		afectacionParcial: number;
		afectacionNinguna: number;
	};
	porBarrio: { barrio: string; total: number }[];
	porNivel: { nivel: string; total: number }[];
	porEvento: { tipo: string; total: number }[];
	evacuacionesPorDia: { dia: string; total: number }[];
	visitasPorDia: { dia: string; total: number }[];
	puntos: BiPunto[];
	barrios: string[];
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function normalizeFilters(filters: BiFilters): BiFilters {
	return {
		desde: filters.desde && DATE_RE.test(filters.desde) ? filters.desde : undefined,
		hasta: filters.hasta && DATE_RE.test(filters.hasta) ? filters.hasta : undefined,
		barrio: filters.barrio?.trim() ? filters.barrio.trim() : undefined
	};
}

function whereFor(filters: BiFilters, extra: SQL[] = []): SQL | undefined {
	const conds: SQL[] = [];
	if (filters.desde) conds.push(gte(inspections.fecha, filters.desde));
	if (filters.hasta) conds.push(lte(inspections.fecha, filters.hasta));
	if (filters.barrio) conds.push(eq(inspections.barrio, filters.barrio));
	conds.push(...extra);
	return conds.length > 0 ? and(...conds) : undefined;
}

function formatDate(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

export function lastNDays(n: number): string[] {
	const now = new Date();
	const days: string[] = [];
	for (let i = n - 1; i >= 0; i--) {
		days.push(formatDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)));
	}
	return days;
}

async function countWhere(where: SQL | undefined): Promise<number> {
	const rows = await db.select({ value: count() }).from(inspections).where(where);
	return rows[0]?.value ?? 0;
}

export async function getBiStats(input: BiFilters = {}): Promise<BiStats> {
	const filters = normalizeFilters(input);
	const where = whereFor(filters);

	const now = new Date();
	const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

	const [
		total,
		hoy,
		conGeo,
		evacuaciones,
		afectacionTotal,
		afectacionParcial,
		afectacionNinguna
	] = await Promise.all([
		countWhere(where),
		countWhere(
			whereFor(filters, [
				gte(inspections.createdAt, todayStart),
				lt(inspections.createdAt, tomorrowStart)
			])
		),
		countWhere(whereFor(filters, [isNotNull(inspections.lat), isNotNull(inspections.lng)])),
		countWhere(whereFor(filters, [eq(inspections.evacuacion, true)])),
		countWhere(whereFor(filters, [eq(inspections.nivelAfectacion, 'Total')])),
		countWhere(whereFor(filters, [eq(inspections.nivelAfectacion, 'Parcial')])),
		countWhere(whereFor(filters, [eq(inspections.nivelAfectacion, 'Ninguna')]))
	]);

	const [
		porBarrio,
		porNivel,
		porEvento,
		visitasDiaRows,
		evacDiaRows,
		puntosRows,
		barriosRows
	] = await Promise.all([
		db
			.select({ barrio: inspections.barrio, total: count() })
			.from(inspections)
			.where(where)
			.groupBy(inspections.barrio)
			.orderBy(desc(count()))
			.limit(15),
		db
			.select({ nivel: inspections.nivelAfectacion, total: count() })
			.from(inspections)
			.where(where)
			.groupBy(inspections.nivelAfectacion),
		db
			.select({ tipo: inspections.tipoEvento, total: count() })
			.from(inspections)
			.where(where)
			.groupBy(inspections.tipoEvento)
			.orderBy(desc(count()))
			.limit(10),
		db
			.select({ dia: inspections.fecha, total: count() })
			.from(inspections)
			.where(where)
			.groupBy(inspections.fecha),
		db
			.select({ dia: inspections.fecha, total: count() })
			.from(inspections)
			.where(whereFor(filters, [eq(inspections.evacuacion, true)]))
			.groupBy(inspections.fecha),
		db
			.select({
				id: inspections.id,
				lat: inspections.lat,
				lng: inspections.lng,
				nivelAfectacion: inspections.nivelAfectacion,
				evacuacion: inspections.evacuacion,
				barrio: inspections.barrio,
				direccion: inspections.direccion,
				fecha: inspections.fecha,
				numRevision: inspections.numRevision
			})
			.from(inspections)
			.where(whereFor(filters, [isNotNull(inspections.lat), isNotNull(inspections.lng)]))
			.orderBy(desc(inspections.id))
			.limit(3000),
		db
			.select({ barrio: inspections.barrio })
			.from(inspections)
			.groupBy(inspections.barrio)
			.orderBy(inspections.barrio)
	]);

	const days = lastNDays(14);
	const visitasMap = new Map(visitasDiaRows.map((r) => [r.dia, r.total]));
	const evacMap = new Map(evacDiaRows.map((r) => [r.dia, r.total]));

	const puntos: BiPunto[] = [];
	for (const p of puntosRows) {
		if (p.lat !== null && p.lng !== null) {
			puntos.push({
				id: p.id,
				lat: p.lat,
				lng: p.lng,
				nivelAfectacion: p.nivelAfectacion,
				evacuacion: p.evacuacion,
				barrio: p.barrio,
				direccion: p.direccion,
				fecha: p.fecha,
				numRevision: p.numRevision
			});
		}
	}

	return {
		totales: {
			total,
			hoy,
			conGeo,
			evacuaciones,
			afectacionTotal,
			afectacionParcial,
			afectacionNinguna
		},
		porBarrio: porBarrio.map((r) => ({ barrio: r.barrio, total: r.total })),
		porNivel: porNivel.map((r) => ({ nivel: r.nivel, total: r.total })),
		porEvento: porEvento.map((r) => ({ tipo: r.tipo, total: r.total })),
		visitasPorDia: days.map((dia) => ({ dia, total: visitasMap.get(dia) ?? 0 })),
		evacuacionesPorDia: days.map((dia) => ({ dia, total: evacMap.get(dia) ?? 0 })),
		puntos,
		barrios: barriosRows.map((r) => r.barrio)
	};
}
