'use strict';

/**
 * Base para todos los repositorios de módulo. Réplica de
 * src/Data/Repository.php: mismo patrón fetchOne/fetchAll/execute con
 * parámetros posicionales "?" (nunca interpolación de variables en SQL).
 *
 * mssql (tedious) no soporta "?" nativamente como PDO: aquí se traduce cada
 * "?" a un parámetro nombrado (@p0, @p1, ...) en el orden en que aparece, y
 * se enlaza value-a-value desde el array `params` — igual que
 * PDOStatement::execute($params) con marcadores posicionales.
 */
class Repository {
  /** @param {import('mssql').ConnectionPool} pool */
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * @param {{timeout?: number}} [opciones] timeout en ms para ESTA petición
   * (sobrescribe el timeout por defecto de la conexión, 15000ms). Se usa en
   * consultas que de forma legítima tardan más, en vez de subir el timeout
   * global de todo el pool.
   */
  async query(sqlText, params = [], opciones = {}) {
    const request = this.pool.request();
    if (opciones.timeout) {
      request.timeout = opciones.timeout;
    }
    let indice = 0;
    const sqlConvertido = sqlText.replace(/\?/g, () => `@p${indice++}`);

    params.forEach((valor, idx) => {
      request.input(`p${idx}`, valor === undefined ? null : valor);
    });

    // SET DATEFORMAT dmy: varias consultas del proyecto construyen o
    // convierten literales de fecha en formato día-mes-año (p.ej.
    // `FORMAT(fecha,'dd-MM-yy')` + `CONVERT(date, ...)`, o SPs con un
    // parámetro `date` alimentado como 'dd-mm-yyyy'). PDO/sqlsrv (driver de
    // la versión PHP) heredaba DATEFORMAT dmy del idioma del login de SQL
    // Server; tedious abre cada conexión del pool en mdy por defecto y NO
    // hereda el idioma del login vía `options.language` de forma completa
    // (confirmado: fija @@LANGUAGE pero no el DATEFORMAT asociado). Como el
    // pool rota entre varias conexiones físicas, el SET no se puede lanzar
    // una sola vez al arrancar — se antepone en el mismo batch de cada
    // consulta, que es el único punto por el que pasan todos los
    // repositorios.
    return request.query(`SET DATEFORMAT dmy;\n${sqlConvertido}`);
  }

  async fetchOne(sqlText, params = [], opciones = {}) {
    const resultado = await this.query(sqlText, params, opciones);
    return resultado.recordset && resultado.recordset.length > 0 ? resultado.recordset[0] : null;
  }

  async fetchAll(sqlText, params = [], opciones = {}) {
    const resultado = await this.query(sqlText, params, opciones);
    return resultado.recordset || [];
  }

  async execute(sqlText, params = []) {
    const resultado = await this.query(sqlText, params);
    return Array.isArray(resultado.rowsAffected) ? resultado.rowsAffected[0] : 0;
  }

  /**
   * Formatea un valor de fecha (Date de mssql, o string por si la columna
   * viene ya convertida en el SQL) con tokens estilo PHP date() (d, j, m, n,
   * Y, y, H, G, i, s). Cubre los formatos usados en el resto de la app
   * (p.ej. 'd-m-Y', 'Y-m-d', 'd/m/Y H:i').
   */
  formatearFecha(valor, formato = 'd-m-Y') {
    if (valor === null || valor === undefined || valor === '') {
      return null;
    }

    const fecha = valor instanceof Date ? valor : new Date(valor);
    if (Number.isNaN(fecha.getTime())) {
      return null;
    }

    const dosDigitos = (n) => String(n).padStart(2, '0');

    const tokens = {
      d: dosDigitos(fecha.getDate()),
      j: String(fecha.getDate()),
      m: dosDigitos(fecha.getMonth() + 1),
      n: String(fecha.getMonth() + 1),
      Y: String(fecha.getFullYear()),
      y: String(fecha.getFullYear()).slice(-2),
      H: dosDigitos(fecha.getHours()),
      G: String(fecha.getHours()),
      i: dosDigitos(fecha.getMinutes()),
      s: dosDigitos(fecha.getSeconds()),
    };

    return formato.replace(/[djmnYyHGis]/g, (token) => tokens[token]);
  }
}

module.exports = Repository;
