'use strict';

/**
 * Generación de PDF a partir de HTML con Puppeteer, sustituyendo a TCPDF.
 * Puppeteer (v25) es ESM-only: en este proyecto CommonJS ("type":"commonjs"
 * en package.json) NUNCA se puede usar require('puppeteer') (lanza
 * ERR_REQUIRE_ESM); se importa dinámicamente dentro de una función async y
 * se cachea la promesa para no repetir el import en cada PDF.
 */

let puppeteerPromise;
function getPuppeteer() {
  if (!puppeteerPromise) {
    puppeteerPromise = import('puppeteer').then((m) => m.default);
  }
  return puppeteerPromise;
}

/**
 * Chromium reutilizable: antes se lanzaba y cerraba un proceso Chromium
 * completo (~100-300ms + ~100-300MB RAM) en CADA PDF. En los picos de
 * impresión de CD Muelles (etiquetas por bulto, hojas de carga/descarga
 * seguidas) eso significa un proceso Chromium por petición concurrente, sin
 * límite, compitiendo por el mismo max_memory_restart del proceso PM2. Se
 * lanza un único Chromium de forma perezosa (al primer PDF) y se reutiliza
 * entre peticiones; cada PDF abre/cierra solo su propia pestaña (page), que
 * es barata. Si Chromium muere o se cierra solo, el siguiente htmlToPdf lo
 * vuelve a lanzar automáticamente (vía el listener 'disconnected').
 */
let browserPromise = null;
function getBrowser() {
  if (!browserPromise) {
    browserPromise = getPuppeteer().then((puppeteer) =>
      puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
    );
    browserPromise.then((browser) => {
      browser.on('disconnected', () => {
        browserPromise = null;
      });
    });
  }
  return browserPromise;
}

/**
 * Límite de páginas de Chromium generando PDF a la vez. Un único proceso
 * Chromium soporta varias pestañas, pero sin tope, un pico de impresiones
 * simultáneas (varios operarios imprimiendo a la vez) podría abrir
 * demasiadas páginas de golpe. 4 es generoso para el volumen real de esta
 * app (decenas de usuarios internos, no miles).
 */
const LIMITE_PDF_CONCURRENTES = 4;
let pdfEnCurso = 0;
const colaEsperaPdf = [];

async function reservarTurnoPdf() {
  if (pdfEnCurso < LIMITE_PDF_CONCURRENTES) {
    pdfEnCurso++;
    return;
  }
  await new Promise((resolve) => colaEsperaPdf.push(resolve));
  pdfEnCurso++;
}

function liberarTurnoPdf() {
  pdfEnCurso--;
  const siguiente = colaEsperaPdf.shift();
  if (siguiente) {
    siguiente();
  }
}

/**
 * Convierte un HTML ya resuelto (con imágenes embebidas en base64: Chromium
 * headless no debe depender de poder alcanzar una URL HTTP del propio
 * servidor) en los bytes de un PDF.
 *
 * @param {string} html
 * @param {import('puppeteer').PDFOptions} pdfOptions
 * @returns {Promise<Buffer>}
 */
async function htmlToPdf(html, pdfOptions = {}) {
  await reservarTurnoPdf();
  try {
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({ printBackground: true, ...pdfOptions });
      // page.pdf() devuelve un Uint8Array, NO un Buffer de Node — Buffer.isBuffer(pdf)
      // es false. Express res.send() solo reconoce Buffer/string como binario; con un
      // Uint8Array "normal" cae en la rama de res.json() y serializa cada byte como
      // {"0":37,"1":80,...} en vez de mandar los bytes del PDF, corrompiéndolo por
      // completo (el navegador ve un JSON gigante donde esperaba un PDF y falla al
      // abrirlo). Buffer.from() envuelve el mismo backing memory sin copiar los datos.
      return Buffer.from(pdf.buffer, pdf.byteOffset, pdf.byteLength);
    } finally {
      await page.close();
    }
  } finally {
    liberarTurnoPdf();
  }
}

module.exports = { htmlToPdf, getPuppeteer };
