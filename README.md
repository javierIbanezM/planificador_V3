# Planificador v2

Reescritura del sistema de planificación de cargas/descargas de muelle. Ver el plan completo
en `C:\Users\jibañez\.claude\plans\deep-waddling-oasis.md`.

## Stack actual: Node.js

El proyecto se ejecuta ahora sobre **Node.js + Express + EJS + mssql + express-session +
Puppeteer**, en `server/` (backend MVC) y `views/` (plantillas EJS). El PHP original
(`src/`, `public/`, `templates/`, `bin/*.php`, `bootstrap.php`, `router.php`,
`composer.*`) se conserva intacto como referencia hasta terminar la validación (ver
"Pendiente" más abajo) — no se ha borrado nada, solo se ha añadido la versión Node en
paralelo.

### Arquitectura Node (MVC)

- `server/config/`: `env.js` (parser de `.env`, réplica de `Env.php`), `database.js` (pool
  `mssql` a SQL Server), `auth.js` (sesión/login sobre `express-session`, réplica de
  `Auth.php`), `appConfig.js` (URLs base, rutas de subida), `deliveryOrderApi.js` (cliente
  del API externo Whales).
- `server/data/repository.js`: clase base Modelo — `fetchOne`/`fetchAll`/`execute`/`query`
  con marcadores posicionales `?` (igual que PDO), nunca interpolación de variables en SQL.
- `server/modules/<módulo>/`: `repository.js` (Modelo), `controller.js` (Controlador),
  `routes.js` (rutas Express — mismas URLs que el PHP original, incluida la extensión
  `.php`, para que el JS de cliente en `public/assets/` siga funcionando sin cambios).
  `server/app.js` descubre y monta automáticamente cada `routes.js`.
- `views/`: plantillas EJS — `partials/` (cabeceras/pies compartidos), `modals/` (los 5
  modales reutilizados por varias páginas), `pages/` (una vista por página), `informes/`
  (plantillas HTML de los PDF).
- `bin/informes/*.js`: scripts batch equivalentes a los `_Automate` de PHP.

### Cómo ejecutar (Node)

```
npm install
node server/server.js
```

Por defecto escucha en el puerto `8010` (o `PORT` si se define). Usa el mismo `.env` que la
versión PHP (mismas variables `DB_*`, `APP_BASE_URL`, `UPLOADS_*`).

**Pendiente de revisar en `.env`**: falta `UPLOADS_CDMUELLES_ALIAS` (solo está
`UPLOADS_CDMUELLES_PATH`) — sin ella, el alias público de subidas de cdmuelles no se monta
al arrancar (el resto de la app funciona igual, solo afecta a servir esas imágenes). Añadir
la línea que ya documenta `.env.example`.

## Estado

Todos los módulos (Planificador, Histórico, Calendario, Visor de almacén, Muelles,
Configuración, Consignación, cdmuelles, celectronica e Informes) están migrados a Node.
Los informes PDF (antes TCPDF) ahora se generan con Puppeteer a partir de plantillas
EJS/HTML en `views/informes/`.

**Ya validado contra la base de datos real** (`192.168.2.138:1433`, sí es alcanzable desde
esta máquina): los ~86 métodos de lectura de todos los módulos se probaron contra datos
reales, y los 5 informes PDF se generaron de extremo a extremo (datos reales → Puppeteer →
PDF) sin errores. En el proceso se encontró y corrigió un bug real de la migración: el
driver `mssql`/`tedious` abre cada conexión con `LANGUAGE us_english` (`DATEFORMAT mdy`) en
vez de heredar el `Español`/`dmy` que usaba PDO/sqlsrv, lo que rompía la conversión de
fechas en formato día-mes-año (`calendarioProgramado`, `visorAlmacen.preavisosSinRecepcionar`
y previsiblemente otras) — corregido de forma centralizada en
`server/data/repository.js` (`SET DATEFORMAT dmy` en cada consulta) y
`server/config/database.js` (`options.language = 'Español'`). No se han probado las rutas
de escritura (INSERT/UPDATE/DELETE) contra la BD real para no tocar datos de producción.

Pendiente antes de dar por buena la migración a Node:
- **Probar las rutas de escritura** (cambios de estado, subida de fotos, firma ADR,
  configuración, etc.) contra un entorno de pruebas — solo se validó lectura contra la BD
  real.
- **QA visual de los 5 informes PDF**: Puppeteer sustituye a TCPDF (HTML real de Chromium en
  vez del motor HTML limitado de TCPDF con coordenadas absolutas) — los PDF se generan sin
  errores con datos reales (ver arriba), pero falta comparar cada uno contra el PDF impreso
  real (anchos de columna, saltos de página con datos largos, aspecto de la marca de agua).
- Pruebas de humo página a página comparando con el sistema PHP actual, y congelar el
  proyecto PHP una vez validado.

## Versión PHP (referencia, hasta terminar la validación)

Fases 0-5 del plan completas: Planificador, Histórico, Calendario, Visor de almacén,
Configuración, cdmuelles, celectronica e Informes (TCPDF) están migrados sobre la
arquitectura en capas PHP. Todo el PHP pasa `php -l` sin errores.

## Arquitectura (PHP, legacy)

- `bootstrap.php`: punto de arranque único, incluido por cada página de `public/`. Carga
  `vendor/autoload.php` (Composer), `.env` y arranca la sesión.
- `src/Config/`: `Env.php` (carga `.env`), `Database.php` (conexión PDO única a SQL Server vía
  `pdo_sqlsrv`), `Auth.php` (guard de sesión/login — `Auth::check()`/`requireLogin()`/`login()`/
  `logout()`, CSRF), `AppConfig.php` (URLs base, rutas de subida).
- `src/Data/Repository.php`: base para todos los repositorios — solo sentencias preparadas PDO,
  nunca interpolación de variables en SQL (el patrón `sqlsrv_query($conn, "...'$_SESSION[xxx]'")`
  del proyecto original, ya corregido en todo lo migrado).
- `src/Modules/<Modulo>/{Controller,Repository}.php`: un módulo por área funcional
  (Planificador, Historico, Calendario, VisorAlmacen, Configuracion, Consignacion, Muelles,
  Cdmuelles, Celectronica, Informes, Home, Auth, Shared).
- `public/`: páginas (`public/<pagina>.php`) y endpoints AJAX (`public/api/**/*.php`), todos
  protegidos con `Auth::check()` salvo login y `celectronica` (ver más abajo).
- `templates/`: headers, footers, menú y modales compartidos.
- `bin/informes/`: scripts batch para los informes con variante `_Automate` (pensados para el
  Programador de tareas de Windows, sin depender de sesión de navegador).

## Cómo ejecutar (PHP, legacy)

```
composer install
copy .env.example .env   # rellenar credenciales reales
php -S localhost:8000 -t public router.php
```

`router.php` solo hace falta en local: emula, para el servidor embebido de PHP, el alias
`/uploads/...` que en producción expone IIS directamente contra `storage/uploads/` (fuera
del document root de la app). Sin él, las fotos subidas desde cdmuelles/celectronica se
guardan bien pero no se pueden ver en el navegador.

## Decisiones de seguridad deliberadas (no tocar sin confirmar con el usuario)

Aplican igual a las dos versiones (PHP y Node):

- **Login por PIN en texto plano** (`src/Modules/Auth/AuthRepository.php` /
  `server/modules/auth/repository.js`): sin hash, sin límite de intentos. Se mantiene
  idéntico al original a petición expresa — no modificar.
- **`celectronica` sin comprobación de sesión**: el original excluye este módulo (firma del
  transportista en tablet) del guard de sesión a propósito; solo usa `?almacen=` en la URL.
  Se mantiene igual, decisión confirmada. (Al portar a Node se confirmó leyendo el PHP real
  que los 4 endpoints de celectronica carecen de `Auth::check()`, no solo 2 como decía una
  nota antigua del catálogo interno de la migración — el código Node replica exactamente lo
  que hace el PHP.)

## Informes (TCPDF, versión PHP legacy)

TCPDF se gestiona vía Composer (`composer require tecnickcom/tcpdf`, ya en `composer.json`).

Dos informes (`Hoja_Carga_2` y `Hoja_Descarga_1`) tenían en el original una variante `_Automate`
además de la manual: misma plantilla de renderizado, distinto punto de entrada (sesión de
navegador con un `idplanigrid` vs. proceso batch sin sesión, agrupado por `pg.id`, que guarda
cada PDF en una ruta de red y registra la ubicación en `PartnerWeb_v2.dbo.docsPedidos`/
`docsPreavisos`). La plantilla compartida se extrajo a una clase `Renderer` por informe, con dos
entry points finos:
- `public/informes/hoja-carga-2.php` (manual, con sesión, protegido con `Auth::check()`).
- `bin/informes/hoja-carga-2-automate.php` (batch: `php bin/informes/hoja-carga-2-automate.php`).

Y lo mismo para `hoja-descarga-1`/`hoja-descarga-1-automate`. Los demás informes
(`etiqueta-generica`, `etiqueta-rotin`, `hoja-carga-1`) no tenían variante `_Automate` en el
original, así que solo tienen el punto de entrada manual.

## Siguiente paso

Ver "Pendiente" en la sección Node más arriba: validar contra BD real, QA visual de los
informes PDF, pruebas de humo, y congelar el proyecto PHP una vez validado.
