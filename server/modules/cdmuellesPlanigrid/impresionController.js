'use strict';

const { execFile } = require('child_process');
const util = require('util');
const database = require('../../config/database');
const ImpresionRepository = require('./impresionRepository');

const execFileAsync = util.promisify(execFile);

const URL_BASE_INFORMES = 'http://192.168.2.20/Planificador/Informes';
const NODE_PRINT_ENGINE = 'C:\\node_projects\\pdfPrintEngine\\app.js';
const IMPRESORA_POR_DEFECTO = 'WP08';

/**
 * Impresión de etiquetas del kiosco PDA. Réplica literal de
 * src/Modules/Cdmuelles/ImpresionController.php.
 *
 * Este flujo depende de infraestructura de planta muy específica del
 * original: una URL de generación de PDF fija (192.168.2.20) y un motor de
 * impresión local vía Node (C:\node_projects\pdfPrintEngine\app.js, carpeta
 * C:\impresion\<almacen>\...). Se traslada literal porque no es
 * responsabilidad de esta migración rediseñar la infraestructura de
 * impresión; queda documentado como riesgo (rutas/host hardcodeados, sin
 * timeout en la llamada HTTP, sin manejo de errores del motor de impresión).
 */
class ImpresionController {
  async repository() {
    return new ImpresionRepository(await database.connection());
  }

  async selectImpresoras(almacen) {
    const repository = await this.repository();
    return repository.impresorasActivas(almacen);
  }

  /**
   * El original solo maneja informe=EtiGen (el switch no tiene default);
   * cualquier otro valor de `informe` no hace nada, igual que aquí.
   */
  async imprimirInformes(informe, impresora, almacen, usuario, idplanigrid) {
    if (informe !== 'EtiGen') {
      return;
    }

    const impresoraFinal = impresora !== null && impresora !== '' ? impresora : IMPRESORA_POR_DEFECTO;
    const repository = await this.repository();
    const valor = await repository.valorEtiquetaRotulada(idplanigrid);

    await this.ejecutarCurl(
      `${URL_BASE_INFORMES}/Etiqueta_Generica_info.php?salida=F&idplanigrid=${idplanigrid}&almacen=${almacen}`
    );

    if (valor === 'NO') {
      await this.ejecutarCurl(
        `${URL_BASE_INFORMES}/Etiqueta_RotIN.php?salida=F&idplanigrid=${idplanigrid}&almacen=${almacen}`
      );
    }

    await this.enviarAImpresora(almacen, impresoraFinal);
    await repository.logImpresion(usuario, informe, impresoraFinal, idplanigrid);
  }

  /**
   * Réplica de curl_exec + CURLOPT_RETURNTRANSFER: sin timeout, se
   * descarta la respuesta (el original tampoco la usaba salvo para
   * detectar fallo). Si la petición falla a nivel de red (igual que
   * curl_exec devolviendo false), se lanza el mismo mensaje de error.
   */
  async ejecutarCurl(url) {
    let response;
    try {
      response = await fetch(url);
    } catch (err) {
      throw new Error(`Error al generar el PDF: ${err.message}`);
    }

    return response.text();
  }

  /**
   * Réplica de shell_exec('node ... app.js carpeta impresora'): el
   * original no comprueba el resultado ni maneja errores del proceso, así
   * que aquí tampoco se propagan (mismo comportamiento observable: nunca
   * lanza). Se usa la variante asíncrona (execFile, no execSync) para no
   * bloquear el event loop de Node completo mientras el motor de impresión
   * corre — con shell_exec cada petición PHP es un proceso propio, así que
   * bloquear solo afecta a esa petición; con execSync en Node bloquearía
   * TODAS las peticiones concurrentes del servidor, lo cual sí sería un
   * cambio de comportamiento observable (y mucho peor). execFile asíncrono
   * conserva el mismo "se espera a que termine antes de loguear" pero sin
   * ese efecto colateral.
   */
  async enviarAImpresora(almacen, impresora) {
    const carpeta = `C:\\impresion\\${almacen}\\etiquetas\\Planificador`;

    try {
      await execFileAsync('node', [NODE_PRINT_ENGINE, carpeta, impresora]);
    } catch (err) {
      // Igual que shell_exec original: el resultado/errores del proceso se
      // ignoran, es un riesgo conocido y documentado, no se cambia.
    }
  }
}

module.exports = new ImpresionController();
