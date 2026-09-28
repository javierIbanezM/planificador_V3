<?php

require __DIR__ . '/../../bootstrap.php';

use App\Config\Auth;

if (!Auth::check()) {
    http_response_code(401);
    echo '<p>Sesión no iniciada.</p>';
    exit;
}
?>

<h1>Funciones automáticas</h1>
<p>Panel de configuración en construcción. - PRECAUCIÓN EN ESTE MENÚ</p>
<hr>
<div class="container-fluid" style="padding: 0px;">
	<div class="container-fluid" style="padding: 0px;">
		<div class="row">
			<div class="col">
				<h6>Maestro de Automatizaciones</h6>
				<table class="table table-light table-bordered dataTable" role="grid">
					<thead>
						<tr role="row">
							<th style="width: 1%;">Acciones</th>
							<th style="width: 5%;">Nombre</th>
							<th style="width: 10%;">Descripción</th>
							<th style="width: 1%;">Activo</th>
							<th style="width: 10%;">Valor</th>
						</tr>

					</thead>
				</table>
				<div class="dataTables_scrollBody"
					style="position: relative; overflow: auto; width: 100%; max-height:45vh">
					<table class="table table-light table-bordered dataTable" role="grid" id="tabladatos">
						<thead></thead>
						<tbody id="tabla-body-automatizaciones">
							<!-- Se escriben a través de script -->
							<tr></tr>
						</tbody>
						<thead>
							<tr role="row" style="visibility:collapse">
								<th style="width: 1%;">Acciones</th>
								<th style="width: 5%;">Nombre</th>
								<th style="width: 10%;">Descripción</th>
								<th style="width: 1%;">Activo</th>
								<th style="width: 10%;">Valor</th>
							</tr>
						</thead>
					</table>
				</div>
			</div>
			<div class="col-5">
				<h6>Log de acciones</h6>
				<table class="table table-light table-bordered dataTable" role="grid">
					<thead>
						<tr role="row">
							<th style="width: 1%;">Fecha</th>
							<th style="width: 20%;">Descripción</th>
							<th style="width: 1%;">Usuario</th>
						</tr>

					</thead>
				</table>
				<div class="dataTables_scrollBody"
					style="position: relative; overflow: auto; width: 100%; max-height:25vh">
					<table class="table table-light table-bordered dataTable" role="grid" id="tabladatos">
						<thead></thead>
						<tbody id="tabla-body-lautomatizaciones">
							<!-- Se escriben a través de script -->
							<tr></tr>
						</tbody>
						<thead>
							<tr role="row" style="visibility:collapse">
								<th style="width: 1%;">Fecha</th>
								<th style="width: 20%;">Descripción</th>
								<th style="width: 1%;">Usuario</th>
							</tr>
						</thead>
					</table>
				</div>
			</div>
		</div>
	</div>
</div>
