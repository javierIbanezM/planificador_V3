<?php

namespace App\Modules\Auth;

use App\Config\Auth;
use App\Config\Database;

final class AuthController
{
    private AuthRepository $repository;

    public function __construct()
    {
        $this->repository = new AuthRepository(Database::connection());
    }

    /**
     * @return array{status:string, acceso?:string, rol?:string, mensaje?:string}
     */
    public function loginDesktop(string $pin, string $nombre, string $entorno): array
    {
        $resultado = $this->repository->loginDesktop($pin, $nombre, 'Login' . $entorno);
        return $this->resolver($resultado);
    }

    public function loginPda(string $pin, string $entorno): array
    {
        $resultado = $this->repository->loginPda($pin, 'Login' . $entorno);
        return $this->resolver($resultado);
    }

    private function resolver(?array $resultado): array
    {
        if ($resultado === null) {
            return ['status' => 'failure', 'mensaje' => 'Usuario no existe'];
        }

        if ($resultado['Acceso'] !== 'SI') {
            return ['status' => 'failure', 'mensaje' => 'No tiene acceso a este entorno'];
        }

        Auth::login($resultado['nombre'], ['rol' => $resultado['rol_usuario']]);

        return [
            'status' => 'success',
            'usuario' => $resultado['nombre'],
            'rol' => $resultado['rol_usuario'],
        ];
    }
}
