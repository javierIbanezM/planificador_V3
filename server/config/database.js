'use strict';

const sql = require('mssql');
const env = require('./env');

/**
 * Pool de conexión mssql a SQL Server. Réplica de src/Config/Database.php:
 * una única conexión (aquí, un único pool) para toda la app. El mismo
 * servidor aloja tanto "Planificador" como "PartnerWeb_v2"; las consultas
 * que necesitan la segunda BD la referencian con el nombre completo
 * (PartnerWeb_v2.dbo.tabla) dentro del propio SQL, igual que en el PHP
 * original — no hace falta un segundo pool.
 *
 * Nota (igual que en el PHP): no se fuerza ningún tipo de fecha especial.
 * mssql/tedious devuelve columnas DATETIME/DATE como objetos Date de JS por
 * defecto (a diferencia de PDO, que las devolvía como string). El resto de
 * módulos formatea fechas explícitamente con server/data/repository.js
 * (formatearFecha), que acepta tanto Date como string.
 *
 * IMPORTANTE — idioma de sesión: el driver `tedious` abre cada conexión con
 * LANGUAGE 'us_english' (DATEFORMAT mdy) por defecto, sin importar el
 * idioma configurado en el login de SQL Server. PDO/sqlsrv (el driver que
 * usaba la versión PHP) sí respeta el idioma por defecto del login, que en
 * este servidor es Español (DATEFORMAT dmy) — confirmado con
 * `SELECT dateformat FROM sys.syslanguages WHERE alias='Spanish'`. Varias
 * consultas del proyecto construyen literales de fecha en formato
 * día-mes-año (p.ej. `FORMAT(fecha, 'dd-MM-yy hh:mm')`) y luego los
 * reconvierten con `CONVERT(date, ...)`: con DATEFORMAT mdy esas
 * conversiones fallan en cuanto el día es > 12 ("Conversion failed when
 * converting date and/or time from character string"). Se fuerza aquí
 * `options.language = 'Español'` para que cada conexión del pool abra con
 * el mismo DATEFORMAT dmy que tenía la versión PHP, en vez de parchear cada
 * consulta una a una.
 *
 * `options.useUTC = false`: por defecto tedious asume que los valores
 * DATETIME/DATETIME2 que devuelve SQL Server están en UTC y construye el
 * objeto Date de JS a partir de eso. Pero SQL Server no guarda zona
 * horaria en esas columnas — SYSDATETIME()/GETDATE() devuelven la hora
 * LOCAL del reloj del servidor (Madrid), no UTC. Con el valor por defecto
 * (`useUTC: true`), tedious trataba esa hora local como si fuera UTC, y al
 * mostrarla (.getHours(), FORMAT en el propio SQL usando el valor ya
 * convertido, etc.) JS volvía a aplicarle el offset de zona horaria de
 * Madrid, sumando 2h de más en horario de verano (1h en invierno).
 * Confirmado en vivo: SYSDATETIME() devolvía "10:15" y la app lo mostraba
 * como "12:15". Con `useUTC: false`, tedious interpreta esos valores
 * directamente como hora local, sin reconversión — igual que hacía
 * PDO/sqlsrv en la versión PHP.
 */
let pool = null;

async function connection() {
  if (pool && pool.connected) {
    return pool;
  }

  const config = {
    // .trim(): DB_HOST en .env trae espacios al principio ("  SRVWhalesUAT...");
    // sin quitarlos, getaddrinfo falla en seco (probado: falla con el
    // espacio, resuelve bien sin él) en cualquier conexión nueva del pool.
    server: env.required('DB_HOST').trim(),
    database: env.required('DB_NAME'),
    user: env.required('DB_USER'),
    password: env.required('DB_PASSWORD'),
    options: {
      trustServerCertificate: true,
      enableArithAbort: true,
      language: 'Español',
      useUTC: false,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };

  pool = await new sql.ConnectionPool(config).connect();

  pool.on('error', (err) => {
    console.error('Error en el pool de SQL Server:', err);
  });

  return pool;
}

module.exports = { connection, sql };
