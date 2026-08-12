# SOS Manizales — Revisión a Predio

Plataforma web de emergencia para la Alcaldía de Manizales: diligenciamiento digital del
formulario oficial **GUE-RPD-FR-02 "Revisión a Predio"** tras el terremoto del 10 de agosto de 2026.

**Stack:** SvelteKit 5 (runes) + TypeScript + Tailwind 4 + Drizzle ORM + PostgreSQL + Leaflet + Chart.js + PWA offline

## Funcionalidades

- **Formulario completo** GUE-RPD-FR-02 (7 secciones): dirección, encuestado (con bloque condicional de arrendatario/propietario), tabla de residentes dinámica, evento, afectación con áreas m², entidades de visita, evacuación, fecha/hora y **firmas digitales** (canvas).
- **Georreferenciación**: GPS del celular + pin arrastrable en mapa Leaflet por visita.
- **PWA offline**: los formularios se guardan en el dispositivo (IndexedDB) sin señal y se sincronizan automáticamente al recuperar conexión (botón de sincronización en la barra superior).
- **Impresión**: vista del formato oficial A4 lista para firmar físicamente.
- **Roles**: `admin` (gestión de usuarios, panel BI) e `inspector` (visitas).
- **Panel BI**: KPIs, gráficos (visitas/día, por barrio, distribución de afectación) y **mapa** de la ciudad con markers por nivel de afectación y filtros por fechas/barrio.

## Desarrollo local

```sh
npm install
cp .env.example .env        # ajusta DATABASE_URL
docker run -d --name sosmzl-pg -e POSTGRES_PASSWORD=sosmzl_dev -e POSTGRES_USER=sosmzl -e POSTGRES_DB=sosmzl -p 5433:5432 postgres:16-alpine
npm run db:push             # crea las tablas
SEED_DEMO=1 npm run db:seed # crea admin + inspector + 40 inspecciones demo
npm run dev
```

Usuarios demo: `admin@manizales.gov.co / admin123` · `inspector@manizales.gov.co / inspector123`
**Cambia las contraseñas antes de producción.**

Comandos útiles:

```sh
npm run check        # typecheck + lint de svelte
npm run build        # build de producción (adapter-node)
npm run db:generate  # genera migración SQL desde el schema
npm run db:migrate   # aplica migraciones
npm run db:seed      # siembra usuarios (y demo con SEED_DEMO=1)
```

## Despliegue en Coolify

### Opción A — Dockerfile + Postgres separado (recomendada)

1. Empuja el repo a GitHub/GitLab.
2. En Coolify: **+ Nuevo recurso → Dockerfile** con el repositorio.
3. Crea un recurso **PostgreSQL** (Coolify Database) y copia su URL interna
   (`postgres://user:pass@postgres:5432/db`).
4. En la aplicación, agrega las variables de entorno:
   - `DATABASE_URL` (URL interna del Postgres de Coolify)
   - `PORT=3000`
   - `PROTOCOL_HEADER=x-forwarded-proto` y `HOST_HEADER=x-forwarded-host`
     (necesarias para que el CSRF y los enlaces SSR funcionen detrás del proxy de Coolify)
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD` (credenciales iniciales del admin)
   - `INSPECTOR_EMAIL`, `INSPECTOR_PASSWORD`
5. **Healthcheck** incluido en el Dockerfile (`/login`).
6. Despliega. El contenedor ejecuta **las migraciones automáticamente** al arrancar
   (`drizzle-kit migrate`). Las migraciones están versionadas en `drizzle/`.
7. **Primer arranque**: en la terminal del contenedor en Coolify ejecuta una vez:

   ```sh
   npx tsx src/lib/server/db/seed.ts
   ```

   para crear los usuarios iniciales (admin/inspector). Cambia las contraseñas después.

### Opción B — docker-compose (app + Postgres juntos)

En Coolify: **+ Nuevo recurso → Docker Compose** apuntando al `docker-compose.yml` del repo.
Define `POSTGRES_PASSWORD` en las variables del recurso compose.

## Estructura

```
src/
├── lib/
│   ├── constants.ts            # opciones del formulario oficial
│   ├── components/SyncStatus.svelte
│   ├── offline/                # IndexedDB + cola de sincronización PWA
│   └── server/
│       ├── auth.ts             # sesiones por cookie + bcrypt
│       ├── bi.ts               # agregaciones del panel
│       └── db/                 # schema Drizzle + cliente + seed
└── routes/
    ├── login/                  # inicio de sesión
    ├── visita/                 # formulario GUE-RPD-FR-02 + detalle/impresión
    ├── visitas/                # mis visitas + buscador
    ├── admin/                  # panel BI (mapa + estadísticas)
    ├── admin/usuarios/         # gestión de usuarios
    └── api/                    # inspections, admin/users, bi/stats
```

## Seguridad

- Sesiones con cookie `httpOnly` + `secure` en producción (7 días).
- Contraseñas con bcrypt (10 rounds).
- Guards por rol en el hook de servidor y en cada API.
- El `Dockerfile` corre como `node` (sin root) y expone solo `PORT`.
