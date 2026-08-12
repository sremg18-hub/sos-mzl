# SOS Manizales — Sistema de Revisión a Predios (presentación PMU)

**URL de acceso:** https://sos.emg.pw

---

## 1. ¿Qué es?

Plataforma web de emergencia, creada para la Alcaldía de Manizales, que digitaliza el
formulario oficial **GUE-RPD-FR-02 "Revisión a Predio"** (Versión 4) utilizado por los
bomberos en la revisión de viviendas tras el sismo del 10 de agosto de 2026.
Reemplaza el diligenciamiento en papel por un proceso 100% digital, con
georreferenciación y análisis en tiempo real para la toma de decisiones en el PMU.

## 2. Capacidades

### 2.1 Diligenciamiento de visitas (inspector / bombero)
- **Formulario completo GUE-RPD-FR-02**: dirección y barrio, datos del encuestado con
  rol (propietario / arrendatario / sucesión / otro) y bloque condicional del
  propietario si es arrendatario, tabla dinámica de residentes, evento (inminente /
  sucedido, tipo: deslizamiento, avalancha, incendio, inundación, vendaval, otro),
  posible causa de deterioro estructural, nivel de afectación (total / parcial /
  ninguna), infraestructura afectada con áreas en m² (vivienda, vial, educativa,
  comunitaria), pérdida de bienes, entidades que requieren visita (UGR, Corpocaldas,
  Aguas de Manizales, Obras Públicas, Invías, Chec, Invama, Planeación, Sec.
  Infraestructura Depto., Inspección de Policía), recomendación de evacuación con el
  texto oficial de la Cruz Roja, fecha/hora y **firmas digitales** del bombero y del
  notificado.
- **Georreferenciación**: cada visita captura la ubicación GPS del predio (celular)
  con pin ajustable en el mapa. Así el PMU ve EXACTAMENTE dónde están los predios
  revisados, los afectados y los evacuados.
- **Numeración automática** de revisiones y registro del inspector responsable en
  cada formulario.
- **Impresión del formato oficial** en A4: el mismo documento que se firmaba en
  papel, listo para archivo físico o entrega al ciudadano.

### 2.2 Funcionamiento sin señal (PWA offline)
- Los inspectores pueden diligenciar formularios **sin conexión a internet**
  (zonas rurales, interrupciones de red).
- Los formularios se guardan en el dispositivo y **se sincronizan automáticamente**
  al recuperar la señal, sin pérdida de datos ni duplicados (idempotencia por
  identificador único).

### 2.3 Panel de análisis para el PMU (administrador)
- **Mapa de la ciudad** con todos los predios revisados, coloreados por nivel de
  afectación (rojo = total, amarillo = parcial, verde = ninguna) e identificando los
  predios con evacuación recomendada.
- **KPIs en tiempo real**: total de visitas, visitas del día, evacuaciones
  recomendadas, predios georreferenciados.
- **Gráficos**: visitas por día (últimos 14 días), inspecciones por barrio
  (top 10), distribución del nivel de afectación, evacuaciones por día.
- **Filtros** por rango de fechas y barrio.
- **Búsqueda** de cualquier visita por barrio, dirección o nombre del encuestado.

### 2.4 Gestión de usuarios (administrador)
- Creación de inspectores (bomberos) y administradores con credenciales propias.
- Activación / desactivación de usuarios, cambio de rol y restablecimiento de
  contraseña.
- **Roles y permisos**: el inspector solo ve y crea sus propias visitas; el panel de
  análisis y la gestión de usuarios son exclusivos del administrador.

### 2.5 Operación y seguridad
- Servidor propio en Colombia/cloud con **certificado SSL** (https).
- Base de datos PostgreSQL con respaldo configurable.
- Contraseñas cifradas (bcrypt) y sesiones seguras por cookie.
- El sistema despliega actualizaciones sin interrumpir el servicio (los inspectores
  ven un aviso "Nueva versión disponible" y la aplican con un clic).

## 3. Usuarios de acceso (primer ingreso)

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador (PMU) | admin@manizales.gov.co | pXU8Dnzy3MhEBCgq |
| Inspector (bombero) | inspector@manizales.gov.co | FPs6WL2CKrtMmBou |

> Se recomienda cambiar estas contraseñas desde el módulo "Usuarios" después de la
> presentación. Los usuarios adicionales (uno por inspector) se crean desde
> https://sos.emg.pw/admin/usuarios.

## 4. Flujo operativo sugerido

1. Cada bombero/inspector ingresa con su usuario desde su celular (agregar a la
   pantalla de inicio como aplicación — "Instalar app").
2. Diligencia el formulario en el predio: datos, residentes, afectación, firmas y
   ubicación GPS.
3. Si no hay señal, el formulario queda guardado y se envía solo al recuperar
   conexión.
4. En el PMU, el panel muestra en el mapa y en los gráficos el estado de la ciudad
   minuto a minuto para priorizar evacuaciones, visitas de las entidades (UGR,
   Corpocaldas, etc.) y atención a los barrios más afectados.

## 5. Cómo instalar en el celular (PWA)

- Abrir https://sos.emg.pw desde Chrome/Edge/Safari del celular.
- Menú del navegador → "Agregar a pantalla de inicio" / "Instalar aplicación".
- Aparecerá como una app normal, con icono propio, que funciona sin señal.

---

### Capturas de pantalla (carpeta `capturas-pmu/`)

1. `01-login.png` — pantalla de ingreso
2. `02-home.png` — menú principal
3. `03-visitas.png` — listado de visitas con buscador y estado de afectación
4. `04-formulario.png` — formulario GUE-RPD-FR-02 digital (firma, mapa, residentes)
5. `05-bi-panel.png` — panel PMU: KPIs, gráficos y mapa georreferenciado
6. `06-usuarios.png` — gestión de usuarios (inspectores y administradores)
