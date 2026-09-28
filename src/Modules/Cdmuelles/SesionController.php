<?php

namespace App\Modules\Cdmuelles;

use App\Config\Auth;

/**
 * Sesión del kiosco PDA. Migrado de cdmuelles/functions.php: cerrarsesion y
 * AsigVariablesession.
 *
 * AsigVariablesession original aceptaba CUALQUIER nombre de variable de
 * sesión desde el cliente ($_SESSION[$_POST['opcion']] = $_POST['valor']).
 * Se restringe aquí a una lista blanca. Único uso real localizado en todo
 * el repositorio original (cdmuelles/cargadescarga.php:505):
 * `variablesesion('id', idplanigrid)`, que traducido a esta función
 * equivale a `$_SESSION[<idplanigrid numérico>] = 'id'` — una clave de
 * sesión dinámica que ningún otro punto del código llegaba a leer nunca
 * (confirmado por búsqueda en todo el repo): es replay/cruft muerto, no una
 * variable de negocio real. La única clave de sesión de negocio que existe
 * de verdad en el flujo de cdmuelles es 'almacen' (fijada hoy vía
 * `?almacen=` al entrar en cargadescarga.php), así que es la única
 * permitida aquí; cualquier otra clave se ignora sin error.
 */
final class SesionController
{
    private const CLAVES_PERMITIDAS = ['almacen'];

    /** @return array{almacen: mixed} */
    public function cerrarSesion(): array
    {
        $almacen = $_SESSION['almacen'] ?? null;
        Auth::logout();

        return ['almacen' => $almacen];
    }

    /** @return array{status:string} */
    public function asignarVariableSesion(string $opcion, string $valor): array
    {
        if (!in_array($opcion, self::CLAVES_PERMITIDAS, true)) {
            return ['status' => 'ignorado'];
        }

        $_SESSION[$opcion] = $valor;

        return ['status' => 'success'];
    }
}
