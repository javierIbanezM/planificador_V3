'use strict';

/**
 * Proceso batch de la Hoja de Carga (plantilla 2 / ED:05). Migrado de
 * Informes/Hoja_Carga_2_Automate.php. Pensado para ejecutarse desde el
 * Programador de tareas de Windows:
 *
 *   node bin/informes/hoja-carga-2-automate.js
 *
 * No depende de sesión de navegador: cada noche recorre todas las cargas
 * (`pg.[in-out] = 'OUT'`) cuya fechafinCD fue "ayer", agrupadas por pg.id
 * (una carga puede tener varios pedidos), genera un PDF por grupo
 * REUTILIZANDO la misma función/plantilla que el entry point manual
 * (server/modules/informes/controller.js#pdfHojaCarga2 — misma que
 * GET /informes/hoja-carga-2.php), lo guarda en la ruta de red del
 * propietario y registra la ubicación del fichero en
 * PartnerWeb_v2.dbo.docsPedidos (UPDATE si ya existía una fila para ese
 * pedido/propietario, INSERT si no). Es una consulta cross-database con
 * nombre de 3 partes (PartnerWeb_v2.dbo.docsPedidos) dentro del mismo SQL:
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

  const filas = await repo.cargasParaAutomatizar();

  const datosAgrupados = new Map();
  for (const fila of filas) {
    const id = fila.id;
    if (!datosAgrupados.has(id)) {
      datosAgrupados.set(id, {
        id,
        propietario: fila.propietario,
        ruta: fila.ruta,
        nombrefichero: fila.nombrefichero,
        pedidos: [],
      });
    }
    datosAgrupados.get(id).pedidos.push(fila.pedido);
  }

  for (const data of datosAgrupados.values()) {
    // eslint-disable-next-line no-await-in-loop
    const buffer = await controller.pdfHojaCarga2(Number(data.id));

    if (!fs.existsSync(data.ruta)) {
      fs.mkdirSync(data.ruta, { recursive: true });
    }

    const filename = path.join(data.ruta, data.nombrefichero);
    fs.writeFileSync(filename, buffer);

    const rutaCarga = `\\\\192.168.2.2\\TRAZAL_documentacion\\${data.propietario}\\pedidos\\carga\\${data.nombrefichero}`;

    for (const pedido of data.pedidos) {
      // eslint-disable-next-line no-await-in-loop
      const existe = await repo.existeDocPedido(pedido, data.propietario);
      if (existe) {
        // eslint-disable-next-line no-await-in-loop
        await repo.actualizarDocPedidoCarga(pedido, data.propietario, rutaCarga);
      } else {
        // eslint-disable-next-line no-await-in-loop
        await repo.insertarDocPedidoCarga(pedido, data.propietario, rutaCarga);
      }
    }
  }

  console.log(`${datosAgrupados.size} hoja(s) de carga procesadas.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error en hoja-carga-2-automate:', err);
    process.exit(1);
  });
