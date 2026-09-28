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
 * Convierte un HTML ya resuelto (con imágenes embebidas en base64: Chromium
 * headless no debe depender de poder alcanzar una URL HTTP del propio
 * servidor) en los bytes de un PDF.
 *
 * @param {string} html
 * @param {import('puppeteer').PDFOptions} pdfOptions
 * @returns {Promise<Buffer>}
 */
async function htmlToPdf(html, pdfOptions = {}) {
  const puppeteer = await getPuppeteer();
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
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
    await browser.close();
  }
}

module.exports = { htmlToPdf, getPuppeteer };
