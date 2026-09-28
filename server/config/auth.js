'use strict';

const crypto = require('crypto');

/**
 * Guard de sesión/login. Réplica de src/Config/Auth.php, adaptado a
 * express-session: donde el PHP leía/escribía $_SESSION directamente, aquí
 * se recibe `req` y se opera sobre `req.session`.
 */

function check(req) {
  return Boolean(req.session && req.session.usuario);
}

/** Middleware para páginas: redirige a login?entorno=... si no hay sesión. */
function requireLogin(entorno, loginUrl = '/login.php') {
  return (req, res, next) => {
    if (!check(req)) {
      res.redirect(`${loginUrl}?entorno=${encodeURIComponent(entorno)}`);
      return;
    }
    next();
  };
}

/** Middleware para endpoints AJAX: responde 401 JSON si no hay sesión. */
function requireLoginApi() {
  return (req, res, next) => {
    if (!check(req)) {
      res.status(401).json({ status: 'error', mensaje: 'Sesión no iniciada.' });
      return;
    }
    next();
  };
}

function login(req, usuario, extra = {}) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) {
        reject(err);
        return;
      }
      req.session.usuario = usuario;
      Object.assign(req.session, extra);
      req.session.save((errSave) => (errSave ? reject(errSave) : resolve()));
    });
  });
}

function logout(req) {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => (err ? reject(err) : resolve()));
  });
}

function csrfToken(req) {
  if (!req.session.csrf_token) {
    req.session.csrf_token = crypto.randomBytes(32).toString('hex');
  }
  return req.session.csrf_token;
}

function verifyCsrfToken(req, token) {
  if (typeof token !== 'string' || !req.session.csrf_token) {
    return false;
  }
  const esperado = Buffer.from(req.session.csrf_token);
  const recibido = Buffer.from(token);
  return esperado.length === recibido.length && crypto.timingSafeEqual(esperado, recibido);
}

module.exports = {
  check,
  requireLogin,
  requireLoginApi,
  login,
  logout,
  csrfToken,
  verifyCsrfToken,
};
