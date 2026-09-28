<?php

/*
Fragmento HTML cargado dinámicamente por public/assets/configuracion.js
dentro de #ContenidoDinamico. Migrado de configuracion_inicio.php: en el
original no comprobaba sesión en absoluto (dependía únicamente de que
configuracion.php hubiese cargado antes); aquí sí se exige sesión activa.
*/

require __DIR__ . '/../../bootstrap.php';

use App\Config\Auth;

if (!Auth::check()) {
    http_response_code(401);
    echo '<p>Sesión no iniciada.</p>';
    exit;
}
?>

<h1>Inicio - <?php echo htmlspecialchars(($_SESSION['usuario'] ?? '') . ' (' . ($_SESSION['rol'] ?? '') . ')', ENT_QUOTES) ?></h1>
<p>Panel de configuración en construcción.</p>
<hr>
<div class="container-fluid" style="padding: 0px;">
	<div class="container-fluid" style="padding: 0px;">
		<div class="row">
			<div class="col">
				¿Nos hemos tomado ya el café?
			</div>
			<div class="col">
			<h6>Log de acciones (Todos los Menús)</h6>
				<table class="table table-light table-bordered dataTable" role="grid">
					<thead>
						<tr role="row">
							<th style="width: 2%;">Fecha</th>
							<th style="width: 20%;">Descripción</th>
							<th style="width: 1%;">Usuario</th>
						</tr>

					</thead>
				</table>
				<div class="dataTables_scrollBody"
					style="position: relative; overflow: auto; width: 100%; max-height:45vh">
					<table class="table table-light table-bordered dataTable" role="grid" id="tabladatos">
						<thead></thead>
						<tbody id="tabla-body-linicio">
							<!-- Se escriben a través de script -->
							<tr></tr>
						</tbody>
						<thead>
							<tr role="row" style="visibility:collapse">
								<th style="width: 2%;">Fecha</th>
								<th style="width: 20%;">Descripción</th>
								<th style="width: 1%;">Usuario</th>
							</tr>
						</thead>
					</table>
			</div>
		</div>
	</div>
</div>
