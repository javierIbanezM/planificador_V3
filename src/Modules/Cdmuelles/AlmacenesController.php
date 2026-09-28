<?php

namespace App\Modules\Cdmuelles;

use App\Config\Database;

final class AlmacenesController
{
    private AlmacenesRepository $repository;

    public function __construct()
    {
        $this->repository = new AlmacenesRepository(Database::connection());
    }

    /**
     * @return array{status:string, almacenes:string[]}
     */
    public function cargarAlmacenes(): array
    {
        return [
            'status' => 'success',
            'almacenes' => $this->repository->activos(),
        ];
    }
}
