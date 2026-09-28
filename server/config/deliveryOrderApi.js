'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Réplica de src/Config/DeliveryOrderApi.php: cliente del API "Whales"
 * (deliveryOrder) para verificar por escaneo los contenedores de un
 * albarán. El token es por propietario y vive fuera del repo, en
 * delivery-order-tokens.json (gitignored) en la raíz del proyecto.
 */
const BASE_URL = 'http://192.168.2.21:8085/api/v3/deliveryOrder';
const RAIZ_PROYECTO = path.resolve(__dirname, '..', '..');

function tokens() {
  const rutaTokens = path.join(RAIZ_PROYECTO, 'delivery-order-tokens.json');

  if (!fs.existsSync(rutaTokens)) {
    return {};
  }

  try {
    const contenido = JSON.parse(fs.readFileSync(rutaTokens, 'utf8'));
    return contenido && typeof contenido === 'object' ? contenido : {};
  } catch (err) {
    return {};
  }
}

function tokenParaPropietario(propietario) {
  return tokens()[propietario] ?? null;
}

/**
 * Consulta el pedido en Whales y devuelve la lista de contenedores
 * esperados. Lanza Error si no hay token para ese propietario o si la
 * llamada falla.
 */
async function contenedoresDelPedido(propietario, albaran) {
  const token = tokenParaPropietario(propietario);

  if (token === null) {
    throw new Error(`No hay token configurado para el propietario "${propietario}".`);
  }

  const url = `${BASE_URL}?order=${encodeURIComponent(albaran)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  let respuesta;
  try {
    respuesta = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
  } catch (err) {
    throw new Error(`Error de conexión con el API de pedidos: ${err.message}`);
  } finally {
    clearTimeout(timeout);
  }

  if (respuesta.status !== 200) {
    throw new Error(`El API de pedidos respondió ${respuesta.status} para el albarán "${albaran}".`);
  }

  const texto = await respuesta.text();
  if (texto.trim() === '') {
    throw new Error(`El API de pedidos devolvió una respuesta vacía para el albarán "${albaran}".`);
  }

  let datos;
  try {
    datos = JSON.parse(texto);
  } catch (err) {
    throw new Error(`El API de pedidos devolvió una respuesta no válida para el albarán "${albaran}".`);
  }

  return Array.isArray(datos?.containers) ? datos.containers : [];
}

module.exports = { tokenParaPropietario, contenedoresDelPedido };
