'use strict';

const Repository = require('../../data/repository');

/**
 * Quiz de calidad / aprobaciones de encargado del kiosco PDA. Réplica de
 * src/Modules/Cdmuelles/CalidadRepository.php: enviarcheck, logsSondaManual,
 * PinJefeSonda y PinJefe (con sus dos observaciones: permitirdiscrepancia y
 * continuarquiznoaprobado).
 */
class CalidadRepository extends Repository {
  /**
   * Comprueba que el pin corresponde a un usuario con rol Encargado.
   * Réplica literal (sin hash, PIN en texto plano) de los bloques repetidos
   * en logsSondaManual/PinJefeSonda/PinJefe del original.
   */
  async nombreEncargadoPorPin(pin) {
    const sqlText = "SELECT DISTINCT NombreLargo FROM usuarios WHERE pin = ? AND rol = 'Encargado'";
    const fila = await this.fetchOne(sqlText, [pin]);
    return fila ? fila.NombreLargo ?? null : null;
  }

  async logsSondaManual(numSonda, pin, usuario, idplanigrid) {
    const sqlText = `
    UPDATE planigrid
    SET observacioncdmuellesquizcalidad = 'Se aprueba introducción manual de Sonda ' + ? + ' en Quiz Calidad por: ' +
        (SELECT DISTINCT NombreLargo FROM usuarios WHERE pin = ?) +
        ' Mientras cargaba el operario: ' +
        (SELECT DISTINCT nombrelargo FROM usuarios WHERE nombre = ?)
    WHERE id = ?;

    INSERT INTO logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
    VALUES (?, 'Se aprueba introducción manual de Sonda ' + ? + ' en quiz calidad, aprobado por: ' +
            (SELECT DISTINCT NombreLargo FROM usuarios WHERE pin = ?),
            'INSERT', 'idplanigrid', ?, SYSDATETIME());
    `;

    await this.execute(sqlText, [
      numSonda, pin, usuario, idplanigrid,
      usuario, numSonda, pin, idplanigrid,
    ]);
  }

  async aprobarSondaJefe(pin, usuario, idplanigrid) {
    const sqlText = `UPDATE planigrid
    SET observacioncdmuellesquizcalidad = 'Se aprueba introducción manual de Sonda en Quiz Calidad por: ' +
        (SELECT DISTINCT NombreLargo FROM usuarios WHERE pin = ?) +
        ' Mientras cargaba el operario: ' +
        (SELECT DISTINCT nombrelargo FROM usuarios WHERE nombre = ?)
    WHERE id = ?;

    INSERT logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
    VALUES (?, 'Se aprueba introducción manual de Sonda en quiz calidad, aprobado por: '+(SELECT DISTINCT NombreLargo FROM usuarios WHERE pin = ?), 'INSERT', 'idplanigrid', ?, SYSDATETIME());
    `;

    await this.execute(sqlText, [pin, usuario, idplanigrid, usuario, pin, idplanigrid]);
  }

  async permitirDiscrepancia(pin, usuario, idplanigrid) {
    const sqlText = `UPDATE planigrid
    SET observacioncdmuelles = 'Permitida discrepancia por ' +
        (SELECT DISTINCT NombreLargo FROM usuarios WHERE pin = ?) +
        ' Mientras cargaba el operario: ' +
        (SELECT DISTINCT nombrelargo FROM usuarios WHERE nombre = ?),
        estadocdmuelles = 6
    WHERE id = ?;

    INSERT logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
    VALUES (?, 'Se aprueba la carga con discrepancia, aprobado por: '+(SELECT DISTINCT NombreLargo FROM usuarios WHERE pin = ?), 'INSERT', 'idplanigrid', ?, SYSDATETIME());
    `;

    await this.execute(sqlText, [pin, usuario, idplanigrid, usuario, pin, idplanigrid]);
  }

  async observacionCdmuellesQuizCalidad(idplanigrid) {
    const fila = await this.fetchOne(
      'SELECT observacioncdmuellesquizcalidad FROM planigrid WHERE id = ?',
      [idplanigrid]
    );

    return fila ? fila.observacioncdmuellesquizcalidad ?? null : null;
  }

  /**
   * NOTA DE SEGURIDAD: el original interpolaba $_POST['causas'] (aquí
   * causasTexto) directamente en el texto del SQL en vez de ligarlo como
   * parámetro — una inyección SQL real vía el campo "causas" del quiz de
   * calidad. Se corrige aquí ligando causasTexto con "?" igual que el resto
   * de parámetros — NUNCA interpolación de strings en el SQL.
   */
  async continuarQuizNoAprobado(pin, usuario, idplanigrid, causasTexto) {
    const sqlText = `UPDATE planigrid
    SET observacioncdmuellesquizcalidad = 'Se aprueba ' + ? + ' por: ' +
        (SELECT DISTINCT NombreLargo FROM usuarios WHERE pin = ?) +
        ' Mientras cargaba el operario: ' +
        (SELECT DISTINCT nombrelargo FROM usuarios WHERE nombre = ?)
    WHERE id = ?;

    INSERT logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
    VALUES (?, 'Se aprueba ' + ? + ' en quiz calidad, aprobado por: '+(SELECT DISTINCT NombreLargo FROM usuarios WHERE pin = ?), 'INSERT', 'idplanigrid', ?, SYSDATETIME());
    `;

    await this.execute(sqlText, [
      causasTexto, pin, usuario, idplanigrid,
      usuario, causasTexto, pin, idplanigrid,
    ]);
  }

  async contarRespuestasExistentes(idplanigrid) {
    const fila = await this.fetchOne(
      'SELECT COUNT(*) AS count FROM planigrid_inf_data WHERE idplanigrid = ?',
      [idplanigrid]
    );

    return fila ? Number(fila.count) || 0 : 0;
  }

  async actualizarRespuesta(idplanigrid, pregunta, respuesta) {
    await this.execute(
      'UPDATE planigrid_inf_data SET value = ? WHERE idplanigrid = ? AND idinfobjects = ?',
      [respuesta, idplanigrid, pregunta]
    );
  }

  async incidenciaCheckCalidad(idplanigrid) {
    const fila = await this.fetchOne(
      'SELECT IncidenciaCheckCalidad FROM planigrid where id = ?',
      [idplanigrid]
    );

    return fila && fila.IncidenciaCheckCalidad !== null && fila.IncidenciaCheckCalidad !== undefined
      ? Number(fila.IncidenciaCheckCalidad)
      : null;
  }

  async enviarMailRespuestaNo(idplanigrid, usuario) {
    const sqlText = `EXEC spEnviaMail @idplanigrid = ?, @usuario = ?, @tipo = 'RespuestaNO'
            UPDATE planigrid set IncidenciaCheckCalidad = 1 WHERE id = ?`;

    await this.execute(sqlText, [idplanigrid, usuario, idplanigrid]);
  }

  async limpiarObservacionQuizCalidad(idplanigrid) {
    await this.execute(
      'UPDATE planigrid set observacioncdmuellesquizcalidad = NULL where id = ?',
      [idplanigrid]
    );
  }

  async logActualizaCheckCalidad(usuario, idplanigrid) {
    const sqlText = `INSERT INTO logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
    VALUES (?, 'Se actualiza check de Calidad', 'UPDATE', 'idplanigrid', ?, SYSDATETIME())
    UPDATE planigrid SET fechainforme = SYSDATETIME() WHERE id = ?`;

    await this.execute(sqlText, [usuario, idplanigrid, idplanigrid]);
  }

  async insertarRespuesta(idplanigrid, pregunta, respuesta) {
    await this.execute(
      'INSERT INTO planigrid_inf_data (idplanigrid, idinfobjects, value) VALUES (?, ?, ?)',
      [idplanigrid, pregunta, respuesta]
    );
  }

  async logInsertaCheckCalidadYActualizaEstado(usuario, idplanigrid) {
    const sqlText = `IF (SELECT estadocdmuelles FROM planigrid WHERE id = ?) = 1
    INSERT INTO logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
    VALUES (?, 'Se realiza check de Calidad', 'INSERT', 'idplanigrid', ?, SYSDATETIME());

    UPDATE planigrid
    SET estadocdmuelles =
        CASE
            -- Se llama también al actualizar respuestas de un check ya
            -- enviado (rama de respuestas ya existentes de enviarCheck); si
            -- el pedido ya avanzo mas alla del Quiz, no tocar el estado -
            -- solo se avanza la primera vez.
            WHEN estadocdmuelles <> 1 THEN estadocdmuelles
            WHEN sonda = 1 THEN 8
            -- Salida: datalogger y precinto se piden al final, tras la foto
            -- final (ver módulo de Uploads/Almacenes, casos 'FINAL',
            -- 'DATALOGGER' y 'PRECINTO'), nunca aquí.
            WHEN [in-out] = 'OUT' THEN 2
            -- Entrada: si había precinto, ya se pidió número y foto dentro
            -- de este mismo Quiz de Calidad — no hace falta un paso
            -- Fotografía Precinto aparte, iría directo a datalogger (si
            -- aplica) o a 'Fotografia Inicial'.
            WHEN datalogger = 1 THEN 10
            ELSE 2
        END,
        fechainforme = CASE WHEN estadocdmuelles = 1 THEN SYSDATETIME() ELSE fechainforme END
    WHERE id = ?`;

    await this.execute(sqlText, [idplanigrid, usuario, idplanigrid, idplanigrid]);
  }
}

module.exports = CalidadRepository;
