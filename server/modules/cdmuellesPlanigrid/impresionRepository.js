'use strict';

const Repository = require('../../data/repository');

/**
 * Impresoras e impresión de etiquetas del kiosco PDA. Réplica literal de
 * src/Modules/Cdmuelles/ImpresionRepository.php (migrado de
 * cdmuelles/functions.php: SelectImpresoras e imprimirinformes).
 */
class ImpresionRepository extends Repository {
  async impresorasActivas(almacen) {
    const sqlText = `SELECT impresora, descripcion
                FROM impresoras
                WHERE almacen = ? and activa = 1`;

    return this.fetchAll(sqlText, [almacen]);
  }

  async valorEtiquetaRotulada(idplanigrid) {
    const sqlText = `SELECT
        pid.value
        FROM planigrid_inf_data AS pid
        INNER JOIN informes_objects as ino ON ino.id = idinfobjects
        WHERE idplanigrid = ? and ino.idvariableaccion = 1`;

    const fila = await this.fetchOne(sqlText, [idplanigrid]);
    // Réplica de "return $fila['value'] ?? null;": si no hay fila, o el
    // valor es null, se devuelve null igual que en PHP (donde acceder a un
    // offset de un array null con ?? no lanza excepción).
    return fila ? fila.value ?? null : null;
  }

  async logImpresion(usuario, informe, impresora, idplanigrid) {
    const sqlText = `INSERT logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
                VALUES (?, 'Enviado Informe: '+?+' a la impresora: '+?, 'INSERT', 'idplanigrid', ?, SYSDATETIME())`;

    await this.execute(sqlText, [usuario, informe, impresora, idplanigrid]);
  }
}

module.exports = ImpresionRepository;
