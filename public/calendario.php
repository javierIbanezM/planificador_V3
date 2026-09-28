<?php

$page = 'Calendario';

require __DIR__ . '/../bootstrap.php';

use App\Config\Auth;
use App\Config\AppConfig;

Auth::requireLogin('Planificador', AppConfig::baseUrl() . 'login.php');

$baseUrl = AppConfig::baseUrl();
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <title>Calendario - Planificador</title>
    <?php require __DIR__ . '/../templates/headers/main.php'; ?>
</head>
<body>
<?php require __DIR__ . '/../templates/headers/muelles.php'; ?>

<div class="container-fluid" style="padding: 0% 3% 0% 3%;">

<div class="d-flex justify-content-between align-items-center">
    <div class="d-flex align-items-center">
        <span style="margin-right: 10px;" tabindex="0" data-toggle="tooltip" data-html="true" data-placement="bottom" title="
            <div class='text-white p-3'>
                <div class='d-flex align-items-center' style='margin-bottom:5px'>
                    <div class='color-indicador bg-success me-2'></div>
                    <div style='width:20px;height:20px;background: #85C1E9;color:black;text-align:center;margin-right:5px'>S</div>
                    Salidas
                </div>
                <div class='d-flex align-items-center' style='margin-bottom:5px'>
                    <div class='color-indicador bg-gray me-2'></div>
                    <div style='width:20px;height:20px;background: #FCF2CE;color:black;text-align:center;margin-right:5px'>E</div>
                    Entradas
                </div>
                <div class='d-flex align-items-center' style='margin-bottom:5px'>
                    I = Entradas (IN)<br>
                    O = Salidas (OUT)<br>
                    T = Total
                </div>
            </div>">
            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="White" class="bi bi-info-circle" viewBox="0 0 16 16">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
            </svg>
        </span>
        <span class="input-group-text bg-white border rounded">
            <button class="btn btn-success" onclick="CalendarioReal()" id="btncalreal" style="margin-right: 10px;"> Calendario Real </button>
            <button class="btn btn-info" onclick="CalendarioProgramado()" id="btncalprogramado" style="margin-right: 10px;"> Calendario Programado </button>
            <a id="calendarioseleccionado" style="color:black;text-align:center;"><strong>Calendario Seleccionado: <strong></a>
        </span>
    </div>

    <div class="input-group" style="max-width: 320px;">
    <span class="input-group-text bg-white border rounded">
        Semana consultada:
        <input style="margin-left:5px;margin-right:5px" type="date" id="fechaconsultar" class="form-control">
    </span>

    </div>

</div>

    <div style="background-color: white;padding: 2px 5px;border-radius: 5px;margin-top: 5px;">
        <div style="max-height: 72vh; overflow-y: auto; position: relative;margin-top:5px;margin-bottom: 5px;">
            <table class="table table-light table-bordered dataTable" id="table-main" >
                <thead style="position: sticky; top: -1; background-color: #fff; z-index: 1;">
                    <tr role="row">
                        <th style="width: 10%">Tramos Horarios</th>
                        <th style="width: 12%" id="Lunes">Lunes</th>
                        <th style="width: 12%" id="Martes">Martes</th>
                        <th style="width: 12%" id="Miércoles">Miércoles</th>
                        <th style="width: 12%" id="Jueves">Jueves</th>
                        <th style="width: 12%" id="Viernes">Viernes</th>
                        <th style="width: 12%" id="Sábado">Sábado</th>
                        <th style="width: 12%" id="Domingo">Domingo</th>
                    </tr>
                </thead>
                <tbody id="tabla-body" class="tabla-body">
                    <!-- Se escriben por Script -->
                </tbody>
            </table>
        </div>
    </div>
</div>

<?php
require __DIR__ . '/../templates/modals/consignacion.php';
require __DIR__ . '/../templates/modals/muelles.php';
require __DIR__ . '/../templates/modals/muelles-cdsinmuelles.php';
require __DIR__ . '/../templates/modals/muelles-empezados.php';
require __DIR__ . '/../templates/modals/muelles-operario.php';
require __DIR__ . '/../templates/footers/footer.php';
?>

<script src="<?php echo $baseUrl ?>assets/calendario.js"></script>

<script>
$(function () {
  $('[data-toggle="tooltip"]').tooltip()
})
</script>

</body>
</html>
