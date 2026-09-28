<?php

namespace App\Data;

use PDO;
use PDOStatement;

/**
 * Base para los repositorios de cada módulo. Toda consulta pasa por
 * sentencias preparadas: es la sustitución directa del patrón
 * `sqlsrv_query($conn, "... '$_SESSION[xxx]' ...")` encontrado repetido en
 * el proyecto original (SQL con variables interpoladas directamente).
 */
abstract class Repository
{
    public function __construct(protected readonly PDO $db)
    {
    }

    protected function query(string $sql, array $params = []): PDOStatement
    {
        $statement = $this->db->prepare($sql);
        $statement->execute($params);
        return $statement;
    }

    protected function fetchOne(string $sql, array $params = []): ?array
    {
        $row = $this->query($sql, $params)->fetch();
        return $row === false ? null : $row;
    }

    protected function fetchAll(string $sql, array $params = []): array
    {
        return $this->query($sql, $params)->fetchAll();
    }

    protected function execute(string $sql, array $params = []): int
    {
        return $this->query($sql, $params)->rowCount();
    }

    /**
     * Formatea una columna de fecha/hora devuelta por PDO, que en esta
     * conexión llega como string (ver Database::connection()), pero se
     * acepta también DateTimeInterface por robustez ante cambios futuros.
     */
    protected function formatearFecha(mixed $valor, string $formato): string
    {
        if ($valor === null || $valor === '') {
            return '';
        }

        if ($valor instanceof \DateTimeInterface) {
            return $valor->format($formato);
        }

        $timestamp = is_string($valor) ? strtotime($valor) : false;

        return $timestamp !== false ? date($formato, $timestamp) : '';
    }
}
