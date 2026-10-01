# Auditoría de arquitectura — Planificador v3-node

Fecha: 2026-10-01

Alcance: todo el backend (`server/`) y su interacción con vistas (`views/`) y JS de cliente (`public/assets`), **excluyendo** los puntos ya resueltos antes de esta auditoría en la misma sesión de trabajo:

- PHP legacy eliminado del repo (127 ficheros).
- PM2 centralizado como único método de arranque (`ecosystem.config.js`).
- Foreign Keys no invasivas (`WITH NOCHECK`, `ON DELETE SET NULL`) entre `expediciones`/`preavisos` y `planigrid`.
- Middleware de autenticación (`auth.requireLoginApi`) centralizado en casi todas las rutas.
- `server/data/sqlFragments.js` para centralizar la lógica SQL duplicada de "bultos efectivos".
- Bug de columna ambigua en `cdmuellesPlanigrid/planigridRepository.js` (`mostrarAlbaranes`).
- Bug de JOIN (`r.propietario = pg.consignacion` → `pg.propietario`) en el mismo fichero.
- Integración de contenedores (`server/config/deliveryOrderApi.js`) migrada al API nuevo (login + token + agrupación por palet/contenedor/HU).
- Detección read-only de reruteos duplicados (`planificador/repository.js`, `posiblesReruteos`) y fusión manual con confirmación (`fusionarReruteo`).
- `informes/repository.js` (`peligrosidad`) calculado en vivo desde `expediciones`/`preavisos` en vez de leer un campo `planigrid.peligrosidad` obsoleto.
- Segunda vía de validación de firma ADR en `consignacion/repository.js`/`controller.js` (firma local o DECA vía `WhalesAza.expRutasDeca`).

---

## 1. Desglose de la arquitectura

**Arranque**: `server/server.js` → `server/app.js`. `app.js` monta, en orden alfabético de carpeta (`fs.readdirSync('server/modules')`), el `routes.js` de cada módulo que exista — descubrimiento automático, sin registro central ni detección de colisión de rutas (ver §2).

**Capas, por módulo** (`server/modules/<modulo>/{routes,controller,repository}.js`):

- `routes.js`: define rutas Express. La mayoría de módulos de "página" (GET `*.php`) usan rutas REST-ish normales; los módulos interactivos (Planificador, Consignación, Configuración, Calendario, Histórico, VisorAlmacén, Muelles) usan **un único endpoint `POST /api/<modulo>.php`** con un parámetro `funcion` y un `switch` que despacha a ~10-25 acciones distintas (ver `server/modules/consignacion/routes.js:91-259`, `server/modules/planificador/routes.js:31-68`). Es una réplica fiel del dispatcher PHP original (`$_POST['funcion']`).
- `controller.js`: clase exportada como instancia única (singleton), con `async repository() { return new XRepository(await database.connection()) }` en cada método relevante. Sin inyección de dependencias real: cada llamada reconecta "lógicamente" al pool compartido (el pool en sí es cacheado en `server/config/database.js:49-84`, así que no abre conexiones nuevas, pero sí crea un objeto `Repository` nuevo por llamada).
- `repository.js`: extiende `server/data/repository.js` (`fetchOne/fetchAll/execute/query`), que traduce `?` posicionales a `@pN` nombrados y antepone `SET DATEFORMAT dmy` a cada query (decisión de compatibilidad con el dialecto que usaba PDO/sqlsrv, bien documentada en comentarios).
- Vista: o bien `res.render('pages/x', {...})` (EJS) o `res.json(...)` desde el dispatcher `funcion=`.

**Convenciones observadas**: parametrización SQL consistente (no se encontró concatenación insegura — el único caso de nombre de tabla dinámico, `consignacion/repository.js:303`, usa un ternario interno fijo `'preavisos'|'expediciones'`, no entrada de usuario). Comentarios extensos explicando *por qué* de cada decisión (DATEFORMAT, useUTC, MemoryStore) — buena práctica ya instaurada, vale la pena mantenerla en cualquier refactor.

**Tests**: `tests/` solo contiene `.gitkeep` — **cero cobertura automatizada** en todo el proyecto. Dato relevante para cualquier refactor: sin red de seguridad, todo cambio de "solo calidad" se verifica a ojo.

---

## 2. Zonas críticas

### 2.1 Puppeteer: un navegador Chromium completo por cada PDF (`server/modules/informes/pdfService.js:28-45`)

Cada llamada a `htmlToPdf()` hace `puppeteer.launch()` y `browser.close()` en el propio request. En un almacén que imprime etiquetas genéricas por bulto/palet y hojas de carga/descarga de forma continua durante los picos de carga, **N peticiones concurrentes = N procesos Chromium concurrentes** (~100-300 MB RAM y varios cientos de ms de arranque cada uno), sin ningún límite de concurrencia. Es el cuello de botella de rendimiento más claro de todo el proyecto bajo carga real, y el único con riesgo de tumbar el proceso Node por memoria (`max_memory_restart: '500M'` en `ecosystem.config.js` — un par de PDFs simultáneos ya compite con ese límite).

### 2.2 Duplicación fuerte en `server/modules/informes/controller.js`

`datosHojaCarga1` (127-188), `datosHojaCarga2` (200-263) y `datosHojaDescarga1` (275-342) repiten **literalmente** el mismo bloque de 5 consultas secuenciales (`finalizada`, `fechaInforme`, `muelleAsignado`, `fechaLlegada`, `checksCalidad`, `observacionCalidad`, `usuariosYTiempo`, `galeria`, `peligrosidad`...) con `await` uno detrás de otro — 9-10 round-trips secuenciales a SQL Server por informe, cuando la mayoría no dependen entre sí y podrían lanzarse en paralelo con `Promise.all`. Combinado con el punto 2.1 (un Chromium por PDF), cada informe tarda la suma de ~10 latencias de red a BD *más* el arranque de Chromium, en vez de el máximo de las latencias de BD.

### 2.3 Posible condición de carrera en el conteo de bultos (`server/modules/cdmuellesCalidad/expedicionesRepository.js:45-91`)

`incrementarBulto` calcula el siguiente número de bulto con `(SELECT MAX(bulto)+1 ... WHERE idplanigrid=? AND pedidoalbaran=?)` dentro del propio `INSERT ... VALUES`, sin `UPDLOCK`/`HOLDLOCK` ni transacción serializable, y `decrementarBulto` hace lo simétrico con `MAX(bulto)` en un `DELETE`. Si dos operarios (dos PDAs/escáneres) escanean bultos del **mismo pedido** casi a la vez — escenario plausible en un muelle con varios operarios trabajando la misma carga — ambas conexiones pueden leer el mismo `MAX(bulto)` antes de que cualquiera confirme su `INSERT`, produciendo bultos duplicados o saltados. No se encontró en el repo ningún `.sql` con el esquema para confirmar si existe una restricción `UNIQUE(idplanigrid, pedidoalbaran, bulto)` que mitigue esto a nivel de BD — **recomendado verificarlo con un experto SQL** antes de asumir que es solo teórico, porque si no existe, el número de bultos verificados (un dato que después alimenta `EstadoCarga`, `peligrosidad` y los PDFs de descarga) puede quedar silenciosamente incorrecto.

### 2.4 Patrón dispatcher `funcion=` como único punto de entrada de 7+ módulos

`consignacion/routes.js`, `planificador/routes.js`, `configuracion/routes.js`, `calendario/routes.js`, `historico/routes.js`, `visorAlmacen/routes.js` concentran toda su superficie de API en un solo endpoint POST con un `switch` gigante (el de consignación tiene 20 `case`). Consecuencias concretas:

- No hay forma de aplicar middleware distinto por acción (p.ej. rate-limit solo a `up_img_ofi`, validación de esquema solo a `guardarcabeceramodal`) sin tocar el switch entero.
- Todo el parseo/validación de `req.body` es manual, repetido `String(req.body.x || '')` campo a campo, sin un validador declarativo — fácil olvidar un campo o un `parseInt` sin `Number.isInteger` (de hecho, el único módulo que sí valida así es `planificador/routes.js:49`, el resto confía en el controller/repository).
- No es documentable con OpenAPI/Swagger sin trabajo adicional, y cualquier herramienta de API testing solo ve "un POST" por módulo.

Esto es consciente (réplica fiel del PHP original) y **no se marca como "hay que arreglarlo ya"** — es coherente con la restricción de "no cambiar funcionalidad" tal cual está — pero si en algún momento se plantea modularizar, es el candidato principal a convertir en rutas REST reales (`POST /api/consignacion/galeria`, etc.), sin tocar la lógica interna de cada acción.

### 2.5 Duplicación de lógica de render de tabla en 3 archivos de cliente + XSS potencial

`actualizartablas(page)` está definida de forma independiente y casi idéntica en `public/assets/planificador.js:110-179`, `public/assets/historico.js` y `public/assets/visor-almacen.js:113+`, cada una construyendo filas de tabla por concatenación de strings e inyectándolas con `innerHTML`. Los campos interpolados (`item.propietario`, `item.consignacion`, `item.Observaciones`, etc.) vienen de la base de datos **sin escapar HTML** — si algún día un campo de texto libre (observación, nombre de propietario importado de Whales, etc.) contiene `<script>` o un atributo `onerror=`, se ejecuta en el navegador de cualquier usuario que vea esa tabla. Es el mismo patrón en `views/modals/consignacion.ejs` (script inline de 1016 líneas, línea 287-1300+: ver `mostraracciones()` línea 328-341, que hace lo mismo con `item.descripcion`). No es una regresión de esta migración — el PHP original probablemente tenía el mismo problema — pero al tratarse de **tres copias** del mismo patrón inseguro, cualquier arreglo (p.ej. una función `escapeHtml()` centralizada) tiene que aplicarse tres veces si no se centraliza primero.

### 2.6 Resiliencia de la integración con el API de contenedores (`server/config/deliveryOrderApi.js`)

`contenedoresDelPedido` (202-230) encadena 2 llamadas HTTP síncronas (login opcional + `expediciones` + `contenedores`), cada una con 10 s de timeout y **un solo reintento**, solo ante 401/403 (`llamarProcConReintento`, 116-143). Ante un 5xx, timeout de red o caída total del servicio externo (192.168.2.145:8081), no hay backoff ni circuit breaker: cada escaneo en CD Muelles vuelve a pagar hasta ~10-20 s de espera, indefinidamente, mientras el sistema externo esté caído — con varios operarios escaneando a la vez, es una degradación perceptible y repetida en vez de fallar rápido tras el primer intento fallido. `actualizarTokenEnEnvFile` (25-34) además escribe el `.env` del proyecto en disco de forma síncrona en cada login nuevo; con PM2 en modo *fork* (instancia única, ya documentado) no hay condición de carrera entre procesos, pero si algún día se sube a `cluster`, dos instancias escribiendo el mismo `.env` a la vez sí lo sería.

### 2.7 Controllers/repositories "God object"

`consignacion/controller.js` (682 líneas) + `consignacion/repository.js` (636), e `informes/repository.js` (723) concentran responsabilidades muy heterogéneas (cabecera, galería de fotos, logs/auditoría, sonda, datalogger, alertas por mail, agrupación...) en una sola clase cada uno. No es un bug, pero dificulta la navegabilidad y el testing aislado — cualquier cambio futuro en "galería de fotos" obliga a leer un archivo de 600+ líneas con 20 responsabilidades no relacionadas.

### 2.8 N+1 en bucles secuenciales

`cdmuellesCalidad/controller.js::enviarCheck` (97-142) itera `preguntasYRespuestas` haciendo `await repository.actualizarRespuesta(...)` una a una dentro de un `for`; `informes/controller.js::pdfEtiquetaGenerica` (413-452) hace lo mismo por cada `idplanigrid`/albarán (aquí ya documentado como intencional por el orden de páginas). El quiz de calidad tiene pocas preguntas (no es grave), pero es el mismo patrón que en 2.2 — vale la pena resolverlo con un criterio único en vez de parchear caso a caso.

### 2.9 Menor / higiene

- `multer()` sin `limits` en 10 de los 12 usos (`server/modules/*/routes.js`) — ninguna cota de tamaño de fichero subido; de cara a una app interna en LAN el riesgo es bajo, pero es gratis añadir un límite razonable.
- Montaje de rutas por `fs.readdirSync` sin detección de colisión: si dos módulos definieran accidentalmente la misma ruta, Express serviría silenciosamente la del módulo que alfabéticamente se monta antes, sin aviso en arranque.
- `database.js` fija `pool.max = 10` (línea 71) para toda la app (todos los módulos comparten el mismo pool) — razonable para la carga actual, pero sin métricas de saturación visibles; si se añaden más integraciones o crece el número de terminales, vale la pena revisar si 10 sigue siendo suficiente.

---

## 3. Estrategias de refactorización (priorizadas)

| # | Acción | Impacto | Riesgo de tocarlo | Quién |
|---|--------|---------|--------------------|-------|
| 1 | Reutilizar un único `browser` Puppeteer (o un pool de páginas) en vez de lanzar/cerrar Chromium por PDF | Alto (rendimiento + estabilidad de memoria bajo picos de impresión) | Bajo — cambio contenido en `pdfService.js`, misma firma pública | node-backend |
| 2 | Extraer el bloque de 7 queries comunes de `datosHojaCarga1/2/Descarga1` a un único método (`datosComunesInforme(id)`) y paralelizar con `Promise.all` lo que no dependa entre sí | Alto (latencia de cada informe, y menos superficie para bugs divergentes entre las 3 copias) | Bajo-medio — hay que verificar que ningún campo dependa del orden de ejecución | node-backend, con code-reviewer validando el diff |
| 3 | Confirmar si existe `UNIQUE(idplanigrid, pedidoalbaran, bulto)` en `planigrid_cdmuelles`; si no, añadirla (no invasiva, con manejo de la violación en Node) o envolver `incrementarBulto`/`decrementarBulto` en una transacción con `UPDLOCK, HOLDLOCK` | Alto (integridad de datos operativos reales) | Medio — toca código que escribe en caliente durante la operación de muelle; probar bien en staging | sql-server-expert (diseño), node-backend (ajuste del repository) |
| 4 | Centralizar `actualizartablas()`/render de tabla y una función `escapeHtml()` compartida en `comunes.js`, reutilizada desde `planificador.js`, `historico.js`, `visor-almacen.js` y el script inline de `consignacion.ejs` | Medio-alto (cierra 3-4 copias de una vez, reduce superficie XSS) | Bajo — es front-end puro, sin tocar contratos de API | front owner |
| 5 | Añadir `limits` a los `multer()` sin configurar | Bajo | Muy bajo | node-backend |
| 6 | Añadir backoff/circuit breaker simple (p.ej. abrir circuito tras N fallos consecutivos durante X segundos) en `deliveryOrderApi.js` | Medio (experiencia del operario cuando el sistema externo está caído) | Bajo | node-backend |
| 7 | Evaluar partir `consignacion`/`informes` repository/controller en sub-módulos por responsabilidad (galería, cabecera, logs...) manteniendo el mismo `routes.js` dispatcher por fuera | Medio (mantenibilidad a largo plazo) | Medio — es el que más superficie toca, dejarlo para el final y con tests de regresión manuales exhaustivos dado que `tests/` está vacío | node-backend |
| 8 | (No urgente, dejar constancia) Si algún día se escala a PM2 `cluster`, sustituir `express-session` MemoryStore por un store compartido — ya está documentado en el propio código, no hace falta re-decidirlo ahora | — | — | — |

No se incluye "migrar el dispatcher `funcion=` a REST" como acción recomendada a corto plazo: es un cambio de superficie de API grande, de alto riesgo para una restricción explícita de "no cambiar funcionalidad", y el patrón actual, aunque poco idiomático, es consistente y está bien entendido por el equipo — queda anotado en §2.4 como observación, no como tarea.

---

## 4. Código mejorado (ejemplos, sin aplicar)

### 4.1 Puppeteer: navegador reutilizable en vez de uno por PDF

```js
// server/modules/informes/pdfService.js — antes
async function htmlToPdf(html, pdfOptions = {}) {
  const puppeteer = await getPuppeteer();
  const browser = await puppeteer.launch({ headless: true, args: [...] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ printBackground: true, ...pdfOptions });
    return Buffer.from(pdf.buffer, pdf.byteOffset, pdf.byteLength);
  } finally {
    await browser.close();
  }
}
```

```js
// propuesta: un browser compartido (lazy, con relanzamiento si se cae) + una página por PDF
let browserPromise = null;

async function getBrowser() {
  if (!browserPromise) {
    const puppeteer = await getPuppeteer();
    browserPromise = puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    browserPromise.then((b) => {
      b.on('disconnected', () => { browserPromise = null; }); // si Chromium muere, se relanza en el siguiente PDF
    });
  }
  return browserPromise;
}

async function htmlToPdf(html, pdfOptions = {}) {
  const browser = await getBrowser();
  const page = await browser.newPage(); // cada PDF usa su propia página, el proceso Chromium se reutiliza
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ printBackground: true, ...pdfOptions });
    return Buffer.from(pdf.buffer, pdf.byteOffset, pdf.byteLength);
  } finally {
    await page.close();
  }
}
```

Nota para quien lo implemente: conviene limitar la concurrencia de `page.pdf()` (p.ej. una cola sencilla tipo semáforo de 3-4 páginas simultáneas) para no saturar un único proceso Chromium bajo picos de impresión de etiquetas.

### 4.2 Deduplicar las 3 variantes de `datos*` en `informes/controller.js`

```js
// propuesta: extraer lo común y paralelizar lecturas independientes
async datosComunesInforme(repo, id) {
  const [finalizada, fechaRows, muelleRows, fechaLlegadaRows, checks, observacion, usuariosTiempo, galeria, peligrosidad] =
    await Promise.all([
      repo.finalizada(id),
      repo.fechaInforme(id),
      repo.muelleAsignado(id),
      repo.fechaLlegada(id),
      repo.checksCalidad(id),
      repo.observacionCalidad(id),
      repo.usuariosYTiempo(id),
      this.construirGaleria(repo, id),
      repo.peligrosidad(id),
    ]);

  return {
    finalizada,
    fecha: fechaRows.map((f) => repo.formatearFecha(f.fecha, 'd-m-Y') || '').join(''),
    muelle: muelleRows.map((m) => m.muelleasign ?? '').join(''),
    fechaCarga: fechaLlegadaRows.map((f) => repo.formatearFecha(f.fechallegada, 'd-m-Y H:i') || '').join(''),
    checks, observacion, usuariosTiempo, galeria, peligrosidad,
  };
}

async datosHojaCarga1(id) {
  const repo = await this.repository();
  const comunes = await this.datosComunesInforme(repo, id);
  const [cabecera, temp, pedidos] = await Promise.all([
    repo.cabeceraCarga1(id), repo.temperaturaCarga1(id), repo.pedidosCargados(id),
  ]);
  const adrLq = await this.construirBloqueAdrLq(repo, id, comunes.peligrosidad, (i, p, s) => repo.filasSeccionCarga(i, p, s), true);

  return { imagenes: this.imagenesEstaticas(), ...comunes, /* campos específicos de cabecera/temp/pedidos */ adrLq };
}
```

`datosHojaCarga2` y `datosHojaDescarga1` quedan igual de cortos, reutilizando `datosComunesInforme`. Esto reduce ~60 líneas duplicadas a ~20 compartidas y convierte 7 round-trips secuenciales en 1 tanda paralela.

### 4.3 Cerrar la carrera en el conteo de bultos (a validar con un experto SQL antes de aplicar)

```js
// server/modules/cdmuellesCalidad/expedicionesRepository.js — incrementarBulto, versión con lock explícito
async incrementarBulto(idplanigrid, albaran, usuario, playa, reabrirCarga, contenedor = null) {
  // Transacción serializable con UPDLOCK+HOLDLOCK en el SELECT del máximo:
  // obliga a una segunda conexión concurrente a esperar a que esta termine
  // antes de leer su propio MAX(bulto), en vez de leer el mismo valor en paralelo.
  const sqlText = `
    BEGIN TRANSACTION;
    DECLARE @siguienteBulto INT;
    SELECT @siguienteBulto = ISNULL(MAX(bulto), 0) + 1
    FROM planigrid_cdmuelles WITH (UPDLOCK, HOLDLOCK)
    WHERE idplanigrid = ? AND pedidoalbaran = ?;

    INSERT INTO planigrid_cdmuelles (idplanigrid, pedidoalbaran, bulto, operarios, ubicacion, contenedor)
    VALUES (?, ?, @siguienteBulto, ?, ?, ?);
    COMMIT TRANSACTION;`;
  // ... resto de parámetros y los INSERT INTO logs condicionales igual que ahora
}
```

Esto es solo el núcleo del cambio de locking — la implementación final (incluyendo el `decrementarBulto` simétrico y el manejo de los `INSERT INTO logs` condicionales que ya existen) queda para cuando se decida aplicarlo, una vez confirmado si además conviene una restricción `UNIQUE` a nivel de tabla como segunda línea de defensa.

---

## Próximos pasos sugeridos

1. Confirmar/añadir restricción de unicidad en `planigrid_cdmuelles(idplanigrid, pedidoalbaran, bulto)` y validar el patrón de locking del punto 4.3 (requiere experto SQL Server).
2. Implementar 4.1 (browser Puppeteer reutilizable) y 4.2 (deduplicación de informes) — son los de mayor impacto/menor riesgo, buenos candidatos para ir primero.
3. Revisar el diff de 4.2 específicamente para confirmar que el reordenamiento a `Promise.all` no cambia ningún valor observable (algunos campos dependen de lecturas de `planigrid` que podrían mutar entre llamadas si hay escritura concurrente — improbable pero conviene revisarlo antes de mandar a producción).
4. Aplicar el punto 4 (centralizar `actualizartablas`/`escapeHtml`) cuando haya ventana para tocar los 3 archivos de cliente a la vez.

Archivos clave citados: `server/app.js`, `server/config/database.js`, `server/data/repository.js`, `server/modules/informes/pdfService.js`, `server/modules/informes/controller.js`, `server/modules/informes/repository.js`, `server/modules/cdmuellesCalidad/expedicionesRepository.js`, `server/modules/consignacion/routes.js`, `server/modules/consignacion/repository.js`, `server/config/deliveryOrderApi.js`, `public/assets/planificador.js`, `public/assets/historico.js`, `public/assets/visor-almacen.js`, `views/modals/consignacion.ejs`, `tests/` (vacío).
