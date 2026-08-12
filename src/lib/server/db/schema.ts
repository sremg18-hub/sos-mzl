import {
	pgTable,
	serial,
	text,
	integer,
	timestamp,
	boolean,
	date,
	doublePrecision,
	jsonb,
	index,
	uniqueIndex
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
	id: serial('id').primaryKey(),
	email: text('email').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	name: text('name').notNull(),
	role: text('role', { enum: ['admin', 'inspector'] }).notNull().default('inspector'),
	active: boolean('active').notNull().default(true),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const sessions = pgTable('sessions', {
	id: text('id').primaryKey(),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const inspections = pgTable(
	'inspections',
	{
		id: serial('id').primaryKey(),
		syncId: text('sync_id').notNull().unique(),
		numRevision: text('num_revision'),
		barrio: text('barrio').notNull(),
		direccion: text('direccion').notNull(),
		encuestadoDoc: text('encuestado_doc'),
		encuestadoNombre: text('encuestado_nombre').notNull(),
		encuestadoTelefono: text('encuestado_telefono'),
		encuestadoFechaNacimiento: date('encuestado_fecha_nacimiento'),
		rolEncuestado: text('rol_encuestado', {
			enum: ['Propietario', 'Arrendatario', 'Sucesion', 'Otro']
		}).notNull(),
		rolOtro: text('rol_otro'),
		propietarioDoc: text('propietario_doc'),
		propietarioNombre: text('propietario_nombre'),
		propietarioTelefono: text('propietario_telefono'),
		eventoEstado: text('evento_estado', { enum: ['Inminente', 'Sucedido'] }).notNull(),
		tipoEvento: text('tipo_evento').notNull(),
		tipoEventoOtro: text('tipo_evento_otro'),
		deterioro: text('deterioro').notNull(),
		nivelAfectacion: text('nivel_afectacion', {
			enum: ['Total', 'Parcial', 'Ninguna']
		}).notNull(),
		infraAfectada: jsonb('infra_afectada')
			.$type<{ tipo: string; area: number | null }[]>()
			.notNull()
			.default([]),
		perdidaBienes: text('perdida_bienes'),
		requiereVisita: jsonb('requiere_visita').$type<string[]>().notNull().default([]),
		requiereVisitaOtro: text('requiere_visita_otro'),
		evacuacion: boolean('evacuacion').notNull().default(false),
		fecha: date('fecha').notNull(),
		hora: text('hora').notNull(),
		bomberoFirma: text('bombero_firma'),
		bomberoNombre: text('bombero_nombre'),
		bomberoCedula: text('bombero_cedula'),
		notificadoFirma: text('notificado_firma'),
		notificadoNombre: text('notificado_nombre'),
		notificadoCedula: text('notificado_cedula'),
		lat: doublePrecision('lat'),
		lng: doublePrecision('lng'),
		inspectorId: integer('inspector_id').references(() => users.id),
		inspectorName: text('inspector_name'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		index('idx_inspections_barrio').on(table.barrio),
		index('idx_inspections_fecha').on(table.fecha),
		index('idx_inspections_created_at').on(table.createdAt),
		index('idx_inspections_lat_lng').on(table.lat, table.lng)
	]
);

export const residents = pgTable(
	'residents',
	{
		id: serial('id').primaryKey(),
		inspectionId: integer('inspection_id')
			.notNull()
			.references(() => inspections.id, { onDelete: 'cascade' }),
		tipoDoc: text('tipo_doc'),
		numDoc: text('num_doc'),
		nombre: text('nombre').notNull(),
		parentesco: text('parentesco'),
		fechaNacimiento: date('fecha_nacimiento')
	},
	(table) => [index('idx_residents_inspection').on(table.inspectionId)]
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Inspection = typeof inspections.$inferSelect;
export type NewInspection = typeof inspections.$inferInsert;
export type Resident = typeof residents.$inferSelect;
export type NewResident = typeof residents.$inferInsert;
