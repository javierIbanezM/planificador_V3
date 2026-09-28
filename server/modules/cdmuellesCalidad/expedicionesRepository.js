'use strict';

const Repository = require('../../data/repository');

/**
 * Bultos/expediciones del kiosco PDA. Réplica de
 * src/Modules/Cdmuelles/ExpedicionesRepository.php: incrementarBultos,
 * decrementarBultos, quitarContenedor, selectubicaciones y enviadatoscdpq.
 */
class ExpedicionesRepository extends Repository {
  async fechaFinCd(idplanigrid) {
    const fila = await this.fetchOne('SELECT fechafincd FROM planigrid WHERE id = ?', [idplanigrid]);
    return Boolean(fila && fila.fechafincd);
  }

  /**
   * Propietario del albarán concreto (no de todo el pedido): cuando varios
   * pedidos se agrupan en uno solo (planigrid.agrupacion), su propietario
   * queda como la concatenación literal de los propietarios originales
   * (p.ej. "00180107 head"), que no coincide con ninguna clave real de
   * delivery-order-tokens.json — por eso fallaba la verificación de
   * contenedores en pedidos agrupados. Cada fila de expediciones sí conserva
   * el propietario correcto de su propio albarán, agrupado o no.
   */
  async propietario(idplanigrid, albaran) {
    const fila = await this.fetchOne(
      'SELECT propietario FROM expediciones WHERE idplanigrid = ? AND pedido = ?',
      [idplanigrid, albaran]
    );
    return fila ? fila.propietario ?? null : null;
  }

  /**
   * Contenedores ya verificados (escaneados/confirmados) de un albarán,
   * compartido entre dispositivos: cada bulto sumado desde la verificación
   * por escáner guarda su número de contenedor aquí mismo.
   */
  async contenedoresVerificados(idplanigrid, albaran) {
    return this.fetchAll(
      'SELECT DISTINCT contenedor FROM planigrid_cdmuelles WHERE idplanigrid = ? AND pedidoalbaran = ? AND contenedor IS NOT NULL',
      [idplanigrid, albaran]
    );
  }

  async incrementarBulto(idplanigrid, albaran, usuario, playa, reabrirCarga, contenedor = null) {
    let sqlText = `INSERT INTO planigrid_cdmuelles (idplanigrid, pedidoalbaran, bulto, operarios, ubicacion, contenedor)
            VALUES
            (?,
            ?,
            (SELECT CASE WHEN (max(bulto)+1) is null THEN 1 ELSE max(bulto)+1 END as maxbulto FROM planigrid_cdmuelles  WHERE idplanigrid = ? AND pedidoalbaran = ?) ,
            ?,
            ?,
            ?)`;
    const parametros = [idplanigrid, albaran, idplanigrid, albaran, usuario, playa, contenedor];

    if (reabrirCarga) {
      sqlText += `

            INSERT INTO logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
            VALUES (?, 'Eliminada Finalización de C/D por cambio en lo bultos.', 'DELETE', 'idplanigrid', ?, SYSDATETIME())
            UPDATE planigrid
            SET fechafinCD = NULL, observacioncdmuelles = NULL, estadocdmuelles = 3
            WHERE id = ?`;
      parametros.push(usuario, idplanigrid, idplanigrid);
    }

    if (playa) {
      sqlText += `; INSERT INTO logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
                VALUES (?, 'Se añade bulto al albarán ' + ? + ' en: ' + ?, 'INSERT', 'idplanigrid', ?, SYSDATETIME())`;
      parametros.push(usuario, albaran, playa, idplanigrid);
    } else {
      sqlText += `; INSERT INTO logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
                VALUES (?, 'Se añade bulto al albarán ' + ?, 'INSERT', 'idplanigrid', ?, SYSDATETIME())`;
      parametros.push(usuario, albaran, idplanigrid);
    }

    await this.execute(sqlText, parametros);
  }

  async decrementarBulto(idplanigrid, albaran, usuario, reabrirCarga) {
    let sqlText = `DELETE planigrid_cdmuelles WHERE idplanigrid = ? and pedidoalbaran = ? and bulto =
    (SELECT max(bulto) from planigrid_cdmuelles WHERE idplanigrid = ? and pedidoalbaran = ?)`;
    const parametros = [idplanigrid, albaran, idplanigrid, albaran];

    if (reabrirCarga) {
      sqlText += `

    UPDATE planigrid set fechafinCD = NULL, observacioncdmuelles = NULL, estadocdmuelles = 3 WHERE id = ?

    INSERT INTO logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
    VALUES (?, 'Eliminada Finalización de C/D por cambio en lo bultos.', 'DELETE', 'idplanigrid', ?, SYSDATETIME())`;
      parametros.push(idplanigrid, usuario, idplanigrid);
    }

    sqlText += `
    INSERT logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
    VALUES (?, 'Se quita bulto al albarán '+?, 'DELETE', 'idplanigrid', ?, SYSDATETIME())`;
    parametros.push(usuario, albaran, idplanigrid);

    await this.execute(sqlText, parametros);
  }

  /**
   * Quita un contenedor concreto ya verificado (a diferencia de
   * decrementarBulto, que solo sabe quitar el último bulto sumado, esto
   * borra la fila exacta del contenedor indicado, sea cual sea el orden en
   * que se escaneó).
   */
  async quitarContenedor(idplanigrid, albaran, usuario, contenedor, reabrirCarga) {
    let sqlText = 'DELETE planigrid_cdmuelles WHERE idplanigrid = ? AND pedidoalbaran = ? AND contenedor = ?';
    const parametros = [idplanigrid, albaran, contenedor];

    if (reabrirCarga) {
      sqlText += `

    UPDATE planigrid set fechafinCD = NULL, observacioncdmuelles = NULL, estadocdmuelles = 3 WHERE id = ?

    INSERT INTO logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
    VALUES (?, 'Eliminada Finalización de C/D por cambio en lo bultos.', 'DELETE', 'idplanigrid', ?, SYSDATETIME())`;
      parametros.push(idplanigrid, usuario, idplanigrid);
    }

    sqlText += `
    INSERT logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
    VALUES (?, 'Se quita el contenedor '+?+' del albarán '+?, 'DELETE', 'idplanigrid', ?, SYSDATETIME())`;
    parametros.push(usuario, contenedor, albaran, idplanigrid);

    await this.execute(sqlText, parametros);
  }

  /**
   * Réplica de selectubicaciones. El original PHP descartaba la primera fila
   * del resultado (llamaba sqlsrv_fetch_array una vez antes del while sin
   * usar el valor); aquí se devuelven todas las ubicaciones, igual que ya
   * corrige el PHP portado (ExpedicionesRepository::ubicaciones).
   */
  async ubicaciones(idplanigrid, almacen) {
    const sqlText = `SELECT DISTINCT
    u.ubicacion
    FROM ubicaciones as u
    LEFT JOIN planigrid_cdmuelles as pcd ON pcd.ubicacion = u.ubicacion and pcd.idplanigrid = ?
    WHERE u.almacen = ?`;

    return this.fetchAll(sqlText, [idplanigrid, almacen]);
  }

  async contarExpedicionesSinBultos(idplanigrid) {
    const sqlText = 'SELECT COUNT(*) AS count FROM expediciones WHERE idplanigrid = ? AND bultos IS NULL and estado <> -3 AND estado <> 9';
    const fila = await this.fetchOne(sqlText, [idplanigrid]);
    return fila ? Number(fila.count) || 0 : 0;
  }

  async totalBultosExpediciones(idplanigrid) {
    const fila = await this.fetchOne('SELECT SUM(bultos) AS totalBultos FROM expediciones WHERE idplanigrid = ?', [idplanigrid]);
    return fila && fila.totalBultos !== null && fila.totalBultos !== undefined ? Number(fila.totalBultos) : null;
  }

  async eliminarBultosPq(idplanigrid, usuario) {
    const sqlText = `DELETE FROM planigrid_cdmuelles WHERE idplanigrid = ?
            INSERT INTO logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
            VALUES (?, 'Eliminados los bultos añadidos anteriormente para procesar PQ', 'DELETE', 'idplanigrid', ?, SYSDATETIME())`;

    await this.execute(sqlText, [idplanigrid, usuario, idplanigrid]);
  }

  async pedidosDistintos(idplanigrid) {
    const filas = await this.fetchAll('SELECT DISTINCT pedido FROM expediciones WHERE idplanigrid = ?', [idplanigrid]);
    return filas.map((fila) => String(fila.pedido));
  }

  async bultosDelPedido(idplanigrid, pedido) {
    const fila = await this.fetchOne(
      'SELECT bultos FROM expediciones WHERE idplanigrid = ? AND pedido = ?',
      [idplanigrid, pedido]
    );

    return fila ? Number(fila.bultos) || 0 : 0;
  }

  async insertarBultoPq(idplanigrid, pedido, bulto, usuario) {
    const sqlText = 'INSERT INTO planigrid_cdmuelles (idplanigrid, pedidoalbaran, bulto, operarios) VALUES (?, ?, ?, ?)';
    await this.execute(sqlText, [idplanigrid, pedido, bulto, usuario]);
  }

  async finalizarPorPq(idplanigrid, usuario) {
    const sqlText = `UPDATE planigrid SET estadocdmuelles = 6 WHERE id = ?
               INSERT INTO logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
               VALUES (?, 'Finalizada Carga a través de PQ', 'INSERT', 'idplanigrid', ?, SYSDATETIME())`;

    await this.execute(sqlText, [idplanigrid, usuario, idplanigrid]);
  }

  async logDiscrepanciaPq(usuario, bultos, idplanigrid) {
    const sqlText = `INSERT INTO logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
            VALUES (?, ?, 'INSERT', 'idplanigrid', ?, SYSDATETIME())`;

    await this.execute(sqlText, [usuario, `Se intentó validar: ${bultos} bultos en PQ`, idplanigrid]);
  }
}

module.exports = ExpedicionesRepository;
