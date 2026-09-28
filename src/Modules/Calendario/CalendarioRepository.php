<?php

namespace App\Modules\Calendario;

use App\Data\Repository;

/**
 * Migrado de Resources/PHP/Calendario.php (funciones CalendarioReal y
 * CalendarioProgramado). Ambas delegan en procedimientos almacenados; el SQL
 * ya usaba parámetros ligados en el original.
 *
 * Nota: el original también duplicaba dblclick_cab/dblclick_datos/
 * selecttemprango/logsdblclickconsignacion (variantes ligeramente distintas
 * de las de Modal_Consignacion.php), pero el modal de consignación
 * (comunes.js -> modal()) siempre llama a Modal_consignacion.php sin
 * importar la página desde la que se invoque, así que esas copias en
 * Calendario.php eran código muerto (nunca se llegaban a invocar) y no se
 * han migrado -- Calendario reutiliza el módulo Consignacion compartido.
 */
final class CalendarioRepository extends Repository
{
    public function calendarioReal(string $almacen, string $fechaConsultada): array
    {
        $sql = "DECLARE @return_value int

        EXEC @return_value = [dbo].[spSelectCalendarioReal]
                @_Screenalmacenactivo = ?,
                @fechaconsultada = ?

        SELECT 'Return Value' = @return_value";

        return $this->fetchAll($sql, [$almacen, $fechaConsultada]);
    }

    public function calendarioProgramado(string $almacen, string $fechaConsultada): array
    {
        $sql = "DECLARE @return_value int
                EXEC @return_value = [dbo].[spSelectCalendarioProgramado]
                    @_Screenalmacenactivo = ?,
                    @fechaconsultada = ?
                SELECT 'Return Value' = @return_value";

        return $this->fetchAll($sql, [$almacen, $fechaConsultada]);
    }
}
