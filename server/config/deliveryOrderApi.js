'use strict';

const fs = require('fs');
const path = require('path');
const env = require('./env');

/**
 * Cliente del API de contenedores (antes Whales "deliveryOrder", ahora un
 * sistema distinto en 192.168.2.145:8081) para verificar por escaneo los
 * contenedores de un albarán en CD Muelles.
 *
 * Flujo: login (usuario/contraseña -> token) y luego 3 llamadas encadenadas
 * por pedido: p_expedicionesAza (propietario+pedido -> cabecera, trae "id"),
 * p_expPedidoLineas (idParent = id de la cabecera -> líneas) y
 * p_expPedidoContenedores (mismo idParent -> contenedores). Todas las
 * llamadas de datos llevan cabecera "Almacen" con el almacén del pedido.
 */
const RAIZ_PROYECTO = path.resolve(__dirname, '..', '..');
const RUTA_ENV = path.join(RAIZ_PROYECTO, '.env');
const TIMEOUT_MS = 10000;

let tokenEnMemoria = null;
let loginEnCurso = null;

function actualizarTokenEnEnvFile(token) {
  const contenidoActual = fs.existsSync(RUTA_ENV) ? fs.readFileSync(RUTA_ENV, 'utf8') : '';
  const linea = `CONTAINER_API_TOKEN=${token}`;

  const contenidoNuevo = /^CONTAINER_API_TOKEN=.*$/m.test(contenidoActual)
    ? contenidoActual.replace(/^CONTAINER_API_TOKEN=.*$/m, linea)
    : contenidoActual.replace(/\n?$/, '\n') + `${linea}\n`;

  fs.writeFileSync(RUTA_ENV, contenidoNuevo, 'utf8');
}

function guardarToken(token) {
  tokenEnMemoria = token;
  process.env.CONTAINER_API_TOKEN = token;
  actualizarTokenEnEnvFile(token);
}

async function fetchConTimeout(url, opciones) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    return await fetch(url, { ...opciones, signal: controller.signal });
  } catch (err) {
    throw new Error(`Error de conexión con el API de contenedores (${url}): ${err.message}`);
  } finally {
    clearTimeout(timeout);
  }
}

async function login() {
  const url = env.required('CONTAINER_API_LOGIN_URL');
  const username = env.required('CONTAINER_API_USERNAME');
  const password = env.required('CONTAINER_API_PASSWORD');

  const respuesta = await fetchConTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (respuesta.status !== 200) {
    throw new Error(`El login del API de contenedores respondió ${respuesta.status}.`);
  }

  const datos = await respuesta.json();
  if (!datos || typeof datos.token !== 'string' || datos.token === '') {
    throw new Error('El login del API de contenedores no devolvió un token válido.');
  }

  guardarToken(datos.token);
  return datos.token;
}

async function obtenerToken() {
  if (tokenEnMemoria) {
    return tokenEnMemoria;
  }

  if (env.get('CONTAINER_API_TOKEN')) {
    tokenEnMemoria = env.get('CONTAINER_API_TOKEN');
    return tokenEnMemoria;
  }

  if (!loginEnCurso) {
    loginEnCurso = login().finally(() => {
      loginEnCurso = null;
    });
  }

  return loginEnCurso;
}

async function llamarProc(url, body, almacen, token) {
  const respuesta = await fetchConTimeout(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Almacen: almacen,
    },
    body: JSON.stringify(body),
  });

  return respuesta;
}

/**
 * Llama a un endpoint /proc/* con el token actual; si responde 401/403
 * (token caducado), fuerza un login nuevo y reintenta una sola vez.
 */
async function llamarProcConReintento(url, body, almacen) {
  let token = await obtenerToken();
  let respuesta = await llamarProc(url, body, almacen, token);

  if (respuesta.status === 401 || respuesta.status === 403) {
    tokenEnMemoria = null;
    token = await login();
    respuesta = await llamarProc(url, body, almacen, token);
  }

  if (respuesta.status !== 200) {
    throw new Error(`El API de contenedores respondió ${respuesta.status} en ${url}.`);
  }

  const texto = await respuesta.text();
  if (texto.trim() === '') {
    return [];
  }

  let datos;
  try {
    datos = JSON.parse(texto);
  } catch (err) {
    throw new Error(`El API de contenedores devolvió una respuesta no válida en ${url}.`);
  }

  return Array.isArray(datos) ? datos : [];
}

/**
 * Agrupa las líneas del pedido por bulto físico y calcula, para cada bulto,
 * todos los códigos válidos con los que se puede escanear. Misma prioridad
 * en todos los almacenes: "pallet" si tiene dato, si no "contenedor", si no
 * "hu" (Handling Unit).
 *
 * Un mismo palet puede llevar varios contenedores distintos (una línea por
 * contenedor, todas con el mismo "pallet"): son el MISMO bulto, así que se
 * agrupan bajo esa clave y se acumulan tanto el código de palet como el de
 * cada contenedor asociado — escanear cualquiera de ellos verifica el bulto
 * entero, y si ya está verificado, escanear otro alias del mismo grupo no
 * debe contar como uno nuevo. Si la línea no tiene "pallet", el propio
 * "contenedor" hace de clave; si tampoco tiene "contenedor", "hu" hace de
 * clave (bulto de un solo código en ambos casos).
 */
function agruparPorBulto(filas) {
  const grupos = new Map();

  for (const fila of filas) {
    let clave;
    let codigosFila;

    if (fila.pallet) {
      clave = fila.pallet;
      codigosFila = [fila.pallet, fila.contenedor].filter(Boolean);
    } else if (fila.contenedor) {
      clave = fila.contenedor;
      codigosFila = [fila.contenedor];
    } else if (fila.hu) {
      clave = fila.hu;
      codigosFila = [fila.hu];
    } else {
      continue;
    }

    if (!grupos.has(clave)) {
      grupos.set(clave, { container: clave, codigos: new Set() });
    }
    for (const codigo of codigosFila) {
      grupos.get(clave).codigos.add(codigo);
    }
  }

  return Array.from(grupos.values()).map((grupo) => ({
    container: grupo.container,
    codigos: Array.from(grupo.codigos),
  }));
}

/**
 * Consulta el pedido en el API de contenedores y devuelve la lista de
 * bultos esperados, uno por grupo de escaneo (ver agruparPorBulto). Cada
 * bulto expone "container" (código canónico, el que se guarda en BD y se
 * pinta en pantalla) y "codigos" (todos los alias válidos para marcarlo
 * como escaneado) — contrato consumido por CD Muelles
 * (cdmuelles-ordenes.js).
 */
async function contenedoresDelPedido(propietario, pedido, almacen) {
  if (!almacen) {
    throw new Error(`No se pudo determinar el almacén del pedido "${pedido}".`);
  }

  const urlExpediciones = env.required('CONTAINER_API_EXPEDICIONES_URL');
  const urlContenedores = env.required('CONTAINER_API_CONTENEDORES_URL');

  const cabeceras = await llamarProcConReintento(
    urlExpediciones,
    { accion: 'SELECT', propietario, pedido },
    almacen
  );
  const cabecera = cabeceras[0];

  if (!cabecera || !cabecera.id) {
    throw new Error(`No se encontró el pedido "${pedido}" del propietario "${propietario}" en el API de contenedores.`);
  }

  const idParent = cabecera.id;

  const contenedores = await llamarProcConReintento(
    urlContenedores,
    { accion: 'SELECT_INICIO', idParent },
    almacen
  );

  return agruparPorBulto(contenedores);
}

module.exports = { contenedoresDelPedido };
