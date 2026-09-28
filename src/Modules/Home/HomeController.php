<?php

namespace App\Modules\Home;

use App\Config\Database;

final class HomeController
{
    private HomeRepository $repository;

    public function __construct()
    {
        $this->repository = new HomeRepository(Database::connection());
    }

    public function almacenes(): array
    {
        return $this->repository->almacenes();
    }

    /**
     * Corrige el hallazgo de seguridad del original: valida que el almacén
     * exista (y esté activo) antes de aceptar guardarlo en sesión.
     */
    public function seleccionarAlmacen(string $almacen): bool
    {
        if ($almacen === '') {
            return false;
        }

        return $this->repository->existeAlmacenActivo($almacen);
    }
}
