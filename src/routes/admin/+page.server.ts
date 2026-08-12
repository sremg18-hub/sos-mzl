import { redirect } from '@sveltejs/kit';
import { getBiStats } from '$lib/server/bi';

export async function load({ locals, url }) {
	if (locals.user?.role !== 'admin') {
		throw redirect(303, '/');
	}

	const stats = await getBiStats({
		desde: url.searchParams.get('desde') ?? undefined,
		hasta: url.searchParams.get('hasta') ?? undefined,
		barrio: url.searchParams.get('barrio') ?? undefined
	});

	return { stats };
}
