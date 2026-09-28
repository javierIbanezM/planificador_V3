<?php

namespace App\Config;

/**
 * Sesión y guard de login. Sustituye a la comprobación de Config/Core.php
 * (`if(!$_SESSION['usuario'])`, que lanzaba warning si la clave no existía)
 * y, a diferencia del original, este guard se aplica también a los
 * endpoints AJAX de cada módulo, no solo a la carga inicial de la página.
 */
final class Auth
{
    public static function start(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }

        ini_set('session.cookie_lifetime', '0');
        ini_set('session.gc_maxlifetime', '28800');
        ini_set('session.cookie_httponly', '1');

        session_start();
    }

    public static function check(): bool
    {
        return isset($_SESSION['usuario']);
    }

    public static function requireLogin(string $entorno, string $loginUrl): void
    {
        if (!self::check()) {
            header('Location: ' . $loginUrl . '?entorno=' . urlencode($entorno));
            exit;
        }
    }

    public static function login(string $usuario, array $extra = []): void
    {
        session_regenerate_id(true);
        $_SESSION['usuario'] = $usuario;
        foreach ($extra as $key => $value) {
            $_SESSION[$key] = $value;
        }
    }

    public static function logout(): void
    {
        $_SESSION = [];
        session_destroy();
    }

    public static function csrfToken(): string
    {
        if (empty($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['csrf_token'];
    }

    public static function verifyCsrfToken(?string $token): bool
    {
        return is_string($token) && !empty($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
    }
}
