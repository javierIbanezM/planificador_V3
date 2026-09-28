'use strict';

const fs = require('fs');

/**
 * Parser de .env casero, réplica de src/Config/Env.php: ignora comentarios
 * (#) y líneas vacías, separa por el primer "=", y NO sobreescribe una
 * variable que ya exista en process.env (mismo comportamiento que el
 * getenv()!==false del original). A diferencia del paquete npm "dotenv", si
 * una misma clave aparece dos veces en el fichero, gana la PRIMERA
 * ocurrencia, no la última.
 */
function load(path) {
  if (!fs.existsSync(path)) {
    return;
  }

  const contenido = fs.readFileSync(path, 'utf8');

  for (const lineaCruda of contenido.split(/\r?\n/)) {
    const linea = lineaCruda.trim();

    if (linea === '' || linea.startsWith('#')) {
      continue;
    }

    const idx = linea.indexOf('=');
    if (idx === -1) {
      continue;
    }

    const clave = linea.slice(0, idx).trim();
    let valor = linea.slice(idx + 1).trim();

    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }

    if (Object.prototype.hasOwnProperty.call(process.env, clave)) {
      continue;
    }

    process.env[clave] = valor;
  }
}

function get(clave, porDefecto = null) {
  const valor = process.env[clave];
  return valor === undefined || valor === '' ? porDefecto : valor;
}

function required(clave) {
  const valor = process.env[clave];
  if (valor === undefined || valor === '') {
    throw new Error(`Falta la variable de entorno requerida: ${clave}`);
  }
  return valor;
}

module.exports = { load, get, required };
