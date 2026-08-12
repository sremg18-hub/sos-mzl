import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { inspections } from '$lib/server/db/schema';

export async function load() {
	const [row] = await db
		.select({ m: sql<number>`COALESCE(MAX(num_revision::int), 0)` })
		.from(inspections);

	const barrios = await db
		.selectDistinct({ barrio: inspections.barrio })
		.from(inspections)
		.orderBy(inspections.barrio);

	return {
		nextNumRevision: String((row?.m ?? 0) + 1),
		barrios: barrios.map((b) => b.barrio)
	};
}
