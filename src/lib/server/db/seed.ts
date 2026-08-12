import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import * as schema from './schema';
import { users, inspections, residents } from './schema';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? 'admin@manizales.gov.co').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin123';
const INSPECTOR_EMAIL = (process.env.INSPECTOR_EMAIL ?? 'inspector@manizales.gov.co').toLowerCase();
const INSPECTOR_PASSWORD = process.env.INSPECTOR_PASSWORD ?? 'inspector123';

async function upsertUser(email: string, password: string, name: string, role: 'admin' | 'inspector') {
	const existing = await db.query.users.findFirst({
		where: (u, { eq }) => eq(u.email, email)
	});
	if (existing) {
		console.log(`✓ Usuario ${email} ya existe`);
		return existing.id;
	}
	const [user] = await db
		.insert(users)
		.values({ email, passwordHash: await bcrypt.hash(password, 10), name, role })
		.returning();
	console.log(`✓ Creado ${role}: ${email} / ${password}`);
	return user.id;
}

async function seedDemo(adminId: number, inspectorId: number) {
	const existing = await db.select({ id: inspections.id }).from(inspections).limit(1);
	if (existing.length > 0) {
		console.log('⚠ Datos demo omitidos: ya existen inspecciones');
		return;
	}

	const barrios = ['Los Agustinos', 'Palermo', 'La Francia', 'Villapilar', 'Chipre', 'La Enea', 'Malhabar', 'El Bosque'];
	const tipos = ['Deslizamiento', 'Avalancha', 'Inundación', 'Vendaval', 'Deterioro Estructural'];
	const niveles = ['Total', 'Parcial', 'Ninguna'] as const;
	const deterioros = ['Falta de Mantenimiento', 'Intervención Antrópica', 'Evento Natural'] as const;
	const base = { lat: 5.0703, lng: -75.5138 };

	for (let i = 0; i < 40; i++) {
		const lat = base.lat + (Math.random() - 0.5) * 0.04;
		const lng = base.lng + (Math.random() - 0.5) * 0.04;
		const evac = Math.random() < 0.35;
		const created = new Date(Date.now() - Math.floor(Math.random() * 5 * 86400000));
		const fecha = created.toISOString().slice(0, 10);
		const [ins] = await db
			.insert(inspections)
			.values({
				syncId: crypto.randomUUID(),
				numRevision: String(13000 + i),
				barrio: barrios[i % barrios.length],
				direccion: `Calle ${10 + (i % 40)} # ${5 + (i % 30)}-${i % 9}`,
				encuestadoNombre: `Residente ${i + 1}`,
				encuestadoTelefono: `300${String(1000000 + i * 97).slice(0, 7)}`,
				rolEncuestado: 'Propietario',
				eventoEstado: 'Sucedido',
				tipoEvento: tipos[i % tipos.length],
				deterioro: deterioros[i % 3],
				nivelAfectacion: niveles[i % 3],
				infraAfectada: [{ tipo: 'Vivienda', area: 20 + (i % 80) }],
				requiereVisita: ['UGR', 'Corpocaldas', 'Aguas de Manizales', 'Obras Públicas Municipales'][i % 4]
					? ['UGR']
					: [],
				evacuacion: evac,
				fecha,
				hora: `${8 + (i % 10)}:${String((i * 7) % 60).padStart(2, '0')}`,
				lat,
				lng,
				inspectorId: i % 3 === 0 ? adminId : inspectorId,
				inspectorName: i % 3 === 0 ? 'Admin Demo' : 'Inspector Demo',
				createdAt: created,
				updatedAt: created
			})
			.returning();
		await db.insert(residents).values({
			inspectionId: ins.id,
			tipoDoc: 'CC',
			numDoc: String(1000000000 + i * 7919),
			nombre: `Residente ${i + 1}`,
			parentesco: 'Titular',
			fechaNacimiento: '1980-01-01'
		});
	}
	console.log('✓ 40 inspecciones demo creadas');
}

async function main() {
	const adminId = await upsertUser(ADMIN_EMAIL, ADMIN_PASSWORD, 'Administrador', 'admin');
	const inspectorId = await upsertUser(INSPECTOR_EMAIL, INSPECTOR_PASSWORD, 'Inspector Demo', 'inspector');
	if (process.env.SEED_DEMO === '1') {
		await seedDemo(adminId, inspectorId);
	}
	console.log('Seed completado');
	await client.end();
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
