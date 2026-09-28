'use strict';

const Repository = require('../../data/repository');

/**
 * Fotos y fichas subidas desde el kiosco PDA. Réplica de
 * src/Modules/Cdmuelles/UploadsRepository.php (migrado de
 * cdmuelles/functions.php: up_img, mostrarimagenesorden y eliminarFoto).
 */
class UploadsRepository extends Repository {
  async registrarImagen(idplanigrid, rutaLectura, fichero, usuario, extension, descripcion, rutaEscritura) {
    const sql = `INSERT INTO planigrid_cdmuelles_uploads (idplanigrid, ruta, fichero, usuario, extension, tipo, descripcion, rutafisica)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         INSERT logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
         VALUES (?, 'Subida de imagen '+?+'', 'INSERT', 'idplanigrid', ?, SYSDATETIME())
         `;

    await this.execute(sql, [
      idplanigrid, rutaLectura, fichero, usuario, extension, 'IMG', descripcion, rutaEscritura,
      usuario, descripcion, idplanigrid,
    ]);
  }

  /**
   * Migrado literal del switch de cdmuelles/functions.php (funcion=up_img)
   * que avanza el estado de planigrid según el tipo de foto subida. Ver
   * comentarios completos de cada caso en el PHP original
   * (UploadsRepository::avanzarEstadoTrasFoto).
   */
  async avanzarEstadoTrasFoto(idplanigrid, descripcion) {
    const sqlPorDescripcion = {
      SONDA: `UPDATE planigrid
                        set estadocdmuelles = CASE
                            WHEN [in-out] = 'OUT' THEN 2
                            WHEN datalogger = 1 THEN 10
                            ELSE 2
                        END
                        WHERE id = ?`,
      DATALOGGER: `UPDATE planigrid
                        SET estadocdmuelles = CASE
                            WHEN [in-out] = 'OUT' THEN
                                CASE WHEN precinto IS NOT NULL THEN 9 ELSE 7 END
                            ELSE 2
                        END,
                            fechafinCD = CASE WHEN [in-out] = 'OUT' AND precinto IS NULL THEN SYSDATETIME() ELSE fechafinCD END
                        WHERE id = ?`,
      PRECINTO: `UPDATE planigrid
                        SET estadocdmuelles = CASE WHEN [in-out] = 'OUT' THEN 7 ELSE 2 END,
                            fechafinCD = CASE WHEN [in-out] = 'OUT' THEN SYSDATETIME() ELSE fechafinCD END
                        WHERE id = ?`,
      INICIAL: 'UPDATE planigrid SET estadocdmuelles = 3 WHERE id = ?',
      TRANSCURSO: 'UPDATE planigrid set estadocdmuelles = 3 WHERE id = ?',
      FINAL: `UPDATE PLANIGRID
                        SET estadocdmuelles = CASE
                            WHEN [in-out] = 'OUT' AND datalogger = 1 THEN 10
                            WHEN [in-out] = 'OUT' AND precinto IS NOT NULL THEN 9
                            ELSE 7
                        END,
                            fechafinCD = CASE
                                WHEN [in-out] = 'OUT' AND (datalogger = 1 OR precinto IS NOT NULL) THEN fechafinCD
                                ELSE SYSDATETIME()
                            END
                        WHERE id = ?`,
    };

    const sql = sqlPorDescripcion[descripcion];
    if (sql !== undefined) {
      await this.execute(sql, [idplanigrid]);
    }
  }

  async imagenesDeOrden(idplanigrid) {
    const sql = `SELECT id, concat(ruta, fichero) as rutafichero, extension, descripcion
                FROM planigrid_cdmuelles_uploads
                WHERE idplanigrid = ? and tipo = 'IMG'
                ORDER BY fecha ASC`;

    return this.fetchAll(sql, [idplanigrid]);
  }

  /**
   * Migrado de funcion=eliminarFoto: borra el registro y devuelve la ruta
   * física del fichero para que el llamante lo elimine del disco.
   */
  async eliminarFoto(idfoto, usuario, idplanigrid) {
    const sql = `SELECT CONCAT(rutafisica, fichero) as rutafichero FROM planigrid_cdmuelles_uploads WHERE id = ?
        DELETE planigrid_cdmuelles_uploads where id = ?

        INSERT INTO logs (fecha, usuario, descripcion, instruccion, tiporeferencia, referencia)
        VALUES (SYSDATETIME(), ?, 'Eliminada foto id: '+CONVERT(varchar(10), ?), 'DELETE', 'idplanigrid', ?)`;

    const fila = await this.fetchOne(sql, [idfoto, idfoto, usuario, idfoto, idplanigrid]);
    return fila ? fila.rutafichero : null;
  }
}

module.exports = UploadsRepository;
