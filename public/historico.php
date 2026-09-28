<?php

/*
Módulo Histórico unificado a partir de las dos versiones del proyecto
original (Historico.php + Resources/PHP/Histórico.php e
Historico2.php + Resources/PHP/Histórico2.php). Decisión de unificación
(ver informe de migración para más detalle):
  - Consulta SQL: se usa la de Histórico2.php porque calcula la columna
    'consignacion' de forma más completa (contempla pg.agrupacion), algo que
    la consulta de Histórico.php no hacía.
  - HTML/JS: se usa la estructura de Historico.php (filtros por columna,
    selector de cantidad de registros, paginación, menú de
    Salidas/Entradas/Excel/manual/refrescar y el footer), porque
    Historico2.php había sustituido todo eso por dos filtros sueltos
    (Propietario/Transportista) y, además, nunca incluía el footer -- se
    corrige aquí incluyéndolo igual que en el resto de páginas.
*/

$page = 'Histórico';

require __DIR__ . '/../bootstrap.php';

use App\Config\Auth;
use App\Config\AppConfig;

Auth::requireLogin('Planificador', AppConfig::baseUrl() . 'login.php');

$baseUrl = AppConfig::baseUrl();
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <title>Histórico - Planificador</title>
    <?php require __DIR__ . '/../templates/headers/main.php'; ?>
</head>
<body>
<?php require __DIR__ . '/../templates/headers/muelles.php'; ?>
<div class="container-fluid">


<div class="container-fluid mb-5">
    <div class="row float-left">
        <select id="cantidadRegistros" class="form-control">
        <option value="12">12 registros</option>
        <option value="25">25 registros</option>
        <option value="100">100 registros</option>
        <option value="500">500 registros</option>
        <option value="1000000">Mostrar todas</option>
        </select>
    </div>
    <div class="row float-left" style="margin-left:30px;align-items:center;display:flex;">
        <div class="form-check">
            <input type="checkbox" class="form-check-input" id="mostrarTodoHistorico">
            <label class="form-check-label" for="mostrarTodoHistorico">Mostrar todo el histórico (sin límite de 90 días)</label>
        </div>
    </div>
        <div class="row float-right">
            <?php require __DIR__ . '/../templates/menu/grid-options.php'; ?>
        </div>
</div>



<table class="table table-light table-bordered dataTable" id="table-main">
		<thead>
			<tr role="row">
				<th style="width: 1%">T.Carga</th>
				<th style="width: 10%">Propietario</th>
				<th style="width: 20%">Consignación</th>
				<th style="width: 5%">Prevista</th>
				<th style="width: 1%">Muelle</th>
				<th style="width: 1%">Reserva</th>
				<th style="width: 18%">Observación</th>
				<th style="width: 5%">Transportista</th>
				<th style="width: 10%">OC / Pedido</th>
                <th style="width: 2%">Temp</th>
                <th style="width: 2%">Precinto</th>
				<th style="width: 2%">Progr.</th>
				<th style="width: 2%">Llegada</th>
				<th style="width: 1%">Reg. Muelle</th>
				<th style="width: 2%">En Muelle</th>
        		<th style="width: 2%">Hora Salida</th>
				<th style="width: 5%">Estado CD
				<span style="position:absolute;margin-left:3px;" tabindex="0" data-toggle="tooltip" data-html="true" data-placement="bottom" title="
                <div class='text-white p-3'>
                <div class='d-flex align-items-center' style='margin-bottom:5px'>
                    <div class='color-indicador bg-success me-2'></div>
                    <div style='width:20px;height:20px;background: limegreen;color:white;text-align:center;margin-right:5px'>1/1</div>
                    Finalizada Carga sin discrepancias
                </div>
                <div class='d-flex align-items-center' style='margin-bottom:5px'>
                    <div class='color-indicador bg-gray me-2'></div>
                    <div style='width:20px;height:20px;background: red;color:white;text-align:center;margin-right:5px'>1/2</div>
                    Finalizada Carga con Discrepancia
                </div>
				<div class='d-flex align-items-center' style='margin-bottom:5px'>
                    <div class='color-indicador bg-gray me-2'></div>
                    <div style='width:20px;height:20px;background: white;color:black;text-align:center;margin-right:5px'>1/1</div>
                    Carga/Descarga sin Finalizar
                </div>
				<div class='d-flex align-items-center' style='margin-bottom:5px'>
                    <div class='color-indicador bg-gray me-2'></div>
                    <div style='width:20px;height:20px;background: limegreen;color:white;text-align:center;margin-right:5px'>1</div>
                    Preaviso Finalizado
                </div>
                </div>
        ">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="black" class="bi bi-info-circle" viewBox="0 0 16 16">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
            </svg>
            </span></th>
			</tr>
            <tr role="row">
				<?php
					for ($i = 1; $i <= 17; $i++)
					{
						echo
						'
						<th>
						<input type="text" id="filtro-columna'.$i.'" style="width:100%; max-width:200px;" placeholder="" class="filtro-columna">
						</th>
						';
					}
				?>
            </tr>
		</thead>
    <tbody id="tabla-body" class="tabla-body">
	<tr id="spinner-row" style="display: none;">
        <td colspan="17" class="text-center">
            <div class="spinner-border" role="status">
                <span class="sr-only">Loading...</span>
            </div>
        </td>
    </tr>
<!-- Se escriben por script -->
		<thead>
			<tr role="row">
      <th style="width: 1%">T.Carga</th>
      <th style="width: 10%">Propietario</th>
      <th style="width: 20%">Consignación</th>
      <th style="width: 5%">Prevista</th>
      <th style="width: 1%">Muelle</th>
      <th style="width: 1%">Reserva</th>
      <th style="width: 18%">Observación</th>
      <th style="width: 5%">Transportista</th>
      <th style="width: 10%">OC / Pedido</th>
      <th style="width: 2%">Temp</th>
      <th style="width: 2%">Precinto</th>
      <th style="width: 2%">Progr.</th>
      <th style="width: 2%">Llegada</th>
      <th style="width: 1%">Reg. Muelle</th>
      <th style="width: 2%">en Muelle</th>
      <th style="width: 2%">Hora Salida</th>
	  <th style="width: 5%">Estado CD</th>
			</tr>
		</thead>
</table>

<div class="container-fluid" style="margin-top: 5px;">
	<div class="row float-right" id="paginacion">
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

<script src="<?php echo $baseUrl ?>assets/historico.js"></script>

<script>
$(function () {
  $('[data-toggle="tooltip"]').tooltip()
})
</script>

</body>
</html>
