'use strict';

/**
 * Proceso batch de la Hoja de Descarga (plantilla 1 / ED:05). Migrado de
 * Informes/Hoja_Descarga_1_Automate.php. Pensado para ejecutarse desde el
 * Programador de tareas de Windows:
 *
 *   node bin/informes/hoja-descarga-1-automate.js
 *
 * No depende de sesión de navegador: cada noche recorre todas las descargas
 * (`pg.[in-out] = 'IN'`) cuya fechafinCD fue "ayer", agrupadas por pg.id
 * (una descarga puede tener varios albaranes de preaviso), genera un PDF por
 * grupo REUTILIZANDO la misma función/plantilla que el entry point manual
 * (server/modules/informes/controller.js#pdfHojaDescarga1 — misma que
 * GET /informes/hoja-descarga-1.php), lo guarda en la ruta de red del
 * propietario y registra la ubicación del fichero en
 * PartnerWeb_v2.dbo.docsPreavisos (UPDATE si ya existía una fila para ese
 * preaviso/propietario, INSERT si no). Es una consulta cross-database con
 * nombre de 3 partes (PartnerWeb_v2.dbo.docsPreavisos) dentro del mismo SQL:
 * no hace falta un segundo pool (ver comentario en server/config/database.js).
 */

const path = require('path');
const fs = require('fs');

const env = require(path.join(__dirname, '..', '..', 'server', 'config', 'env'));
// Réplica de server/app.js: fuera del arranque de Express, este script
// standalone también necesita cargar el .env antes de tocar la BD.
env.load(path.join(__dirname, '..', '..', '.env'));

const database = require(path.join(__dirname, '..', '..', 'server', 'config', 'database'));
const InformesRepository = require(path.join(__dirname, '..', '..', 'server', 'modules', 'informes', 'repository'));
const controller = require(path.join(__dirname, '..', '..', 'server', 'modules', 'informes', 'controller'));

async function main() {
  const pool = await database.connection();
  const repo = new InformesRepository(pool);

  const filas = await repo.descargasParaAutomatizar();

  const datosAgrupados = new Map();
  for (const fila of filas) {
    const id = fila.id;
    if (!datosAgrupados.has(id)) {
      datosAgrupados.set(id, {
        id,
        propietario: fila.propietario,
        ruta: fila.ruta,
        nombrefichero: fila.nombrefichero,
        albaranes: [],
      });
    }
    datosAgrupados.get(id).albaranes.push(fila.albaran);
  }

  for (const data of datosAgrupados.values()) {
    // eslint-disable-next-line no-await-in-loop
    const buffer = await controller.pdfHojaDescarga1(Number(data.id));

    if (!fs.existsSync(data.ruta)) {
      fs.mkdirSync(data.ruta, { recursive: true });
    }

    const filename = path.join(data.ruta, data.nombrefichero);
    fs.writeFileSync(filename, buffer);

    const rutaDescarga = `\\\\AZA-SRV-FTPNEW.zar.local\\TRAZAL_documentacion\\${data.propietario}\\preavisos\\descarga\\${data.nombrefichero}`;

    for (const albaran of data.albaranes) {
      // eslint-disable-next-line no-await-in-loop
      const existe = await repo.existeDocPreaviso(albaran, data.propietario);
      if (existe) {
        // eslint-disable-next-line no-await-in-loop
        await repo.actualizarDocPreavisoDescarga(albaran, data.propietario, rutaDescarga);
      } else {
        // eslint-disable-next-line no-await-in-loop
        await repo.insertarDocPreavisoDescarga(albaran, data.propietario, rutaDescarga);
      }
    }
  }

  console.log(`${datosAgrupados.size} hoja(s) de descarga procesadas.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error en hoja-descarga-1-automate:', err);
    process.exit(1);
  });
