import { error, json } from '@sveltejs/kit';
import { getBiStats } from '$lib/server/bi';

export async function GET({ locals, url }) {
	if (locals.user?.role !== 'admin') {
		throw error(403, 'No autorizado');
	}

	const stats = await getBiStats({
		desde: url.searchParams.get('desde') ?? undefined,
		hasta: url.searchParams.get('hasta') ?? undefined,
		barrio: url.searchParams.get('barrio') ?? undefined
	});

	return json(stats);
}
