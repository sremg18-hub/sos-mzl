import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

type DrizzleDb = PostgresJsDatabase<typeof schema>;

let _db: DrizzleDb | null = null;

function getDb(): DrizzleDb {
	if (!_db) {
		const url = env.DATABASE_URL;
		if (!url) throw new Error('DATABASE_URL is not set');
		_db = drizzle(postgres(url, { max: 10 }), { schema });
	}
	return _db;
}

export const db = new Proxy({} as DrizzleDb, {
	get(_target, prop: string | symbol) {
		return Reflect.get(getDb(), prop);
	}
});
