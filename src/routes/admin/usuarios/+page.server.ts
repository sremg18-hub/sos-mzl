import { desc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';

export async function load() {
	const list = await db
		.select({
			id: users.id,
			email: users.email,
			name: users.name,
			role: users.role,
			active: users.active,
			createdAt: users.createdAt
		})
		.from(users)
		.orderBy(desc(users.createdAt));

	return { users: list };
}
