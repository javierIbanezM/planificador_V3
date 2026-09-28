'use strict';

const fs = require('fs');
const path = require('path');
const appConfig = require('../../config/appConfig');

/**
 * Embebe en base64 los logos/sellos estáticos usados por los informes
 * (public/assets/informes/*.png), para no depender de que Chromium headless
 * pueda alcanzar una URL HTTP del propio servidor al renderizar el HTML.
 * Se cachean en memoria: son ficheros estáticos que no cambian en caliente.
 */
const cache = new Map();

function dataUriPng(nombreFichero) {
  if (cache.has(nombreFichero)) {
    return cache.get(nombreFichero);
  }

  const rutaCompleta = path.join(appConfig.informesImagesPath(), nombreFichero);
  let dataUri = '';
  try {
    const buffer = fs.readFileSync(rutaCompleta);
    dataUri = `data:image/png;base64,${buffer.toString('base64')}`;
  } catch (err) {
    console.warn(`No se pudo leer la imagen estática de informes "${nombreFichero}": ${err.message}`);
  }

  cache.set(nombreFichero, dataUri);
  return dataUri;
}

/**
 * Lee un fichero arbitrario del disco (foto subida, firma) y lo convierte a
 * data URI. Devuelve null si el fichero no existe (igual que el
 * is_file()/comprobación del PHP original, que se saltaba la imagen).
 */
function dataUriDesdeDisco(rutaCompleta, extensionOMime) {
  if (!rutaCompleta || !fs.existsSync(rutaCompleta) || !fs.statSync(rutaCompleta).isFile()) {
    return null;
  }

  try {
    const buffer = fs.readFileSync(rutaCompleta);
    const mime = mimeDesdeExtension(extensionOMime);
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch (err) {
    console.warn(`No se pudo leer el fichero "${rutaCompleta}": ${err.message}`);
    return null;
  }
}

function mimeDesdeExtension(extension) {
  const ext = String(extension || '').replace(/^\./, '').toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'png':
    default:
      return 'image/png';
  }
}

module.exports = { dataUriPng, dataUriDesdeDisco };
