CREATE TABLE "inspections" (
	"id" serial PRIMARY KEY NOT NULL,
	"sync_id" text NOT NULL,
	"num_revision" text,
	"barrio" text NOT NULL,
	"direccion" text NOT NULL,
	"encuestado_doc" text,
	"encuestado_nombre" text NOT NULL,
	"encuestado_telefono" text,
	"encuestado_fecha_nacimiento" date,
	"rol_encuestado" text NOT NULL,
	"rol_otro" text,
	"propietario_doc" text,
	"propietario_nombre" text,
	"propietario_telefono" text,
	"evento_estado" text NOT NULL,
	"tipo_evento" text NOT NULL,
	"tipo_evento_otro" text,
	"deterioro" text NOT NULL,
	"nivel_afectacion" text NOT NULL,
	"infra_afectada" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"perdida_bienes" text,
	"requiere_visita" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"requiere_visita_otro" text,
	"evacuacion" boolean DEFAULT false NOT NULL,
	"fecha" date NOT NULL,
	"hora" text NOT NULL,
	"bombero_firma" text,
	"bombero_nombre" text,
	"bombero_cedula" text,
	"notificado_firma" text,
	"notificado_nombre" text,
	"notificado_cedula" text,
	"lat" double precision,
	"lng" double precision,
	"inspector_id" integer,
	"inspector_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inspections_sync_id_unique" UNIQUE("sync_id")
);
--> statement-breakpoint
CREATE TABLE "residents" (
	"id" serial PRIMARY KEY NOT NULL,
	"inspection_id" integer NOT NULL,
	"tipo_doc" text,
	"num_doc" text,
	"nombre" text NOT NULL,
	"parentesco" text,
	"fecha_nacimiento" date
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'inspector' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_inspector_id_users_id_fk" FOREIGN KEY ("inspector_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "residents" ADD CONSTRAINT "residents_inspection_id_inspections_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."inspections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_inspections_barrio" ON "inspections" USING btree ("barrio");--> statement-breakpoint
CREATE INDEX "idx_inspections_fecha" ON "inspections" USING btree ("fecha");--> statement-breakpoint
CREATE INDEX "idx_inspections_created_at" ON "inspections" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_inspections_lat_lng" ON "inspections" USING btree ("lat","lng");--> statement-breakpoint
CREATE INDEX "idx_residents_inspection" ON "residents" USING btree ("inspection_id");