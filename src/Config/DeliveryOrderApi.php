<?php

namespace App\Config;

use RuntimeException;

/**
 * Cliente del API de pedidos/contenedores de Whales (deliveryOrder), usado
 * para verificar por escaneo los contenedores de un albarán de salida (ver
 * ExpedicionesController::contenedoresAlbaran()).
 *
 * El token es por propietario (cada cliente tiene el suyo) y vive fuera del
 * repositorio, en delivery-order-tokens.json (gitignored) en la raíz del
 * proyecto — igual que .env con las credenciales de BD.
 */
final class DeliveryOrderApi
{
    private const BASE_URL = 'http://192.168.2.21:8085/api/v3/deliveryOrder';

    /** @return array<string, string> */
    private static function tokens(): array
    {
        $path = dirname(__DIR__, 2) . '/delivery-order-tokens.json';

        if (!is_file($path)) {
            return [];
        }

        $tokens = json_decode((string) file_get_contents($path), true);

        return is_array($tokens) ? $tokens : [];
    }

    public static function tokenParaPropietario(string $propietario): ?string
    {
        return self::tokens()[$propietario] ?? null;
    }

    /**
     * Consulta el pedido en Whales y devuelve la lista de contenedores
     * esperados. Lanza RuntimeException si no hay token para ese
     * propietario o si la llamada falla.
     *
     * @return array<int, array{container: string, reference: string, quantity: string}>
     */
    public static function contenedoresDelPedido(string $propietario, string $albaran): array
    {
        $token = self::tokenParaPropietario($propietario);

        if ($token === null) {
            throw new RuntimeException("No hay token configurado para el propietario \"{$propietario}\".");
        }

        $ch = curl_init(self::BASE_URL . '?order=' . rawurlencode($albaran));
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token],
            CURLOPT_TIMEOUT => 10,
        ]);

        $respuesta = curl_exec($ch);
        $codigo = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);

        if ($respuesta === false) {
            throw new RuntimeException("Error de conexión con el API de pedidos: {$error}");
        }

        if ($codigo !== 200) {
            throw new RuntimeException("El API de pedidos respondió {$codigo} para el albarán \"{$albaran}\".");
        }

        $datos = json_decode($respuesta, true);

        return is_array($datos['containers'] ?? null) ? $datos['containers'] : [];
    }
}
