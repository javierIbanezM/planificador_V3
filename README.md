# Planificador v3-node

Sistema de planificación de cargas/descargas de muelle. Reescritura completa sobre
Node.js — la versión PHP original ha sido retirada del repositorio (ver "Historial de la
migración" más abajo).

## Cómo arrancar

La app se gestiona con **PM2** (`ecosystem.config.js` en la raíz) — es el único método
soportado; evita el lío de tener varios `node server.js` sueltos compitiendo por el
puerto 8011.

```powershell
npm install
pm2 start ecosystem.config.js   # primera vez
pm2 restart planificador        # tras cualquier cambio de código
pm2 logs planificador           # ver logs en vivo
pm2 stop planificador           # parar
pm2 save                        # persistir la lista de procesos actual
```

Usa el `.env` de la raíz (mismas variables `DB_*`, `APP_BASE_URL`, `UPLOADS_*` de
siempre). Por defecto escucha en el puerto `8011` (fijado en `ecosystem.config.js`; puede
sobrescribirse con `PORT`).

**Antes de arrancar, comprueba que no hay ya un proceso PM2 con ese nombre apuntando a
otro sitio** (`pm2 describe planificador` → mirar `exec cwd`) — ya nos pasó tener un
`planificador` registrado apuntando a una copia de backup en otra unidad, sirviendo
código desactualizado sin que nadie se diera cuenta.

## Arquitectura

Node.js + Express + EJS + mssql + express-session + Puppeteer.

- `server/config/`: `env.js` (parser de `.env`), `database.js` (pool `mssql` a SQL
  Server — un único pool a nivel de módulo, cacheado; si cambias `DB_HOST` en `.env` hace
  falta reiniciar el proceso, no basta con guardar el archivo), `auth.js`
  (sesión/login sobre `express-session`), `appConfig.js` (URLs base, rutas de subida),
  `deliveryOrderApi.js` (cliente del API externo Whales).
- `server/data/repository.js`: clase base Modelo — `fetchOne`/`fetchAll`/`execute`/`query`
  con marcadores posicionales `?`, nunca interpolación de variables en SQL.
- `server/data/sqlFragments.js`: fragmentos SQL compartidos entre repositorios (p.ej.
  `bultosEfectivos()` — prioriza `palets` sobre `bultos`), para no repetir la misma regla
  de negocio en varios sitios con el riesgo de que se desincronicen.
- `server/modules/<módulo>/`: `repository.js` (Modelo), `controller.js` (Controlador),
  `routes.js` (rutas Express). `server/app.js` descubre y monta automáticamente cada
  `routes.js`. Las rutas de escritura (`POST /api/...`) usan `auth.requireLoginApi()`
  como middleware — no reimplementar la comprobación de sesión a mano en el handler.
- `views/`: plantillas EJS — `partials/`, `modals/`, `pages/`, `informes/` (PDF vía
  Puppeteer).
- `bin/informes/*.js`: scripts batch de generación de informes (Programador de tareas de
  Windows, sin sesión de navegador).

## Decisiones de seguridad deliberadas (no tocar sin confirmar con el usuario)

- **Login por PIN en texto plano** (`server/modules/auth/repository.js`): sin hash, sin
  límite de intentos. Decisión confirmada expresamente — no modificar.
- **`celectronica` sin comprobación de sesión**: la firma del transportista en tablet
  queda fuera del guard de sesión a propósito; solo usa `?almacen=` en la URL. Decisión
  confirmada, no un descuido.

## Base de datos — integridad referencial

`expediciones.idplanigrid` y `preavisos.idplanigrid` tienen `FOREIGN KEY` hacia
`planigrid.id` con `ON DELETE SET NULL` (añadidas `WITH NOCHECK`, sin validar el
histórico previo — solo protegen contra nuevas incoherencias desde que se crearon). Si
`planigrid` no tiene ya esa fila, cualquier intento de `DELETE` que la afecte pone
`idplanigrid = NULL` en vez de dejar un puntero colgante.

## Pendiente

- Probar las rutas de escritura (cambios de estado, subida de fotos, firma ADR,
  configuración, agrupar/desagrupar, asignar/quitar muelle) de extremo a extremo.
- QA visual de los 5 informes PDF generados con Puppeteer contra el aspecto esperado
  (anchos de columna, saltos de página con datos largos, marca de agua).

## Historial de la migración

El proyecto nació como reescritura en paralelo de una versión PHP (MVC en capas,
Composer, TCPDF). Una vez la versión Node quedó funcionalmente equivalente y validada
contra la base de datos real, el código PHP (`src/`, `public/*.php`, `templates/`,
`vendor/`, `composer.*`, `bootstrap.php`, `router.php`) se eliminó del repositorio —
sigue disponible en el historial de git si hace falta consultarlo.
