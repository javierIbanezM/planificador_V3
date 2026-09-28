'use strict';

const path = require('path');
const env = require('./env');

const RAIZ_PROYECTO = path.resolve(__dirname, '..', '..');

/**
 * Réplica de src/Config/AppConfig.php.
 */
function baseUrl() {
  const url = env.get('APP_BASE_URL', '/');
  return url.replace(/\/+$/, '') + '/';
}

function uploadsHost() {
  const host = env.get('UPLOADS_HOST_URL', '');
  return host !== '' ? host.replace(/\/+$/, '') : baseUrl().replace(/\/+$/, '');
}

function resolveUploadsPath(rutaConfigurada) {
  let ruta = rutaConfigurada.replace(/[/\\]+$/, '') + path.sep;

  // Ruta ya absoluta (Windows "C:\..." o "\\servidor\recurso", o Unix "/...").
  if (/^(?:[A-Za-z]:[\\/]|\\\\|\/)/.test(ruta)) {
    return ruta;
  }

  return path.join(RAIZ_PROYECTO, ruta.replace(/^\.[/\\]/, '')) + path.sep;
}

function uploadsFirmasPath() {
  return resolveUploadsPath(env.required('UPLOADS_FIRMAS_PATH'));
}

function uploadsFirmasAlias() {
  return env.required('UPLOADS_FIRMAS_ALIAS').replace(/\/+$/, '') + '/';
}

function uploadsCdmuellesPath() {
  return resolveUploadsPath(env.required('UPLOADS_CDMUELLES_PATH'));
}

function uploadsCdmuellesAlias() {
  return env.required('UPLOADS_CDMUELLES_ALIAS').replace(/\/+$/, '') + '/';
}

function entornos() {
  return ['Planificador', 'Configuración', 'cdmuelles'];
}

function informesImagesPath() {
  return path.join(RAIZ_PROYECTO, 'public', 'assets', 'informes') + path.sep;
}

module.exports = {
  baseUrl,
  uploadsHost,
  uploadsFirmasPath,
  uploadsFirmasAlias,
  uploadsCdmuellesPath,
  uploadsCdmuellesAlias,
  entornos,
  informesImagesPath,
};
