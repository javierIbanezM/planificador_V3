/*
Migrado de Resources/JS/Configuración.js. Los endpoints ahora van contra
public/api/configuracion.php (con guard de sesión), y los fragmentos HTML
dinámicos se sirven desde public/configuracion/*.php (protegidos también con
el guard de sesión: en el original no comprobaban sesión en absoluto).
*/

const funcionesphp = baseUrl + 'api/configuracion.php';

document.addEventListener('DOMContentLoaded', function () {
	selectmenu('Inicio');
	ContenidoDinamico = document.getElementById('ContenidoDinamico');
});

var sleep = function (ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
};

edicionactiva = false;

async function selectmenu(menu) {
	ContenidoDinamico.innerHTML = '';

	switch (menu) {
		case 'Inicio':
			url = baseUrl + 'configuracion/inicio.php';
			loadDynamicContent(url);
			await sleep(500);
			fetchdatos(menu);
			break;

		case 'Almacenes':
			url = baseUrl + 'configuracion/almacenes.php';
			loadDynamicContent(url);
			await sleep(500);
			fetchdatos(menu);
			break;

		case 'Muelles':
			break;
		case 'Transporte':
			break;
		case 'CargaDescarga':
			break;
		case 'VariablesDelSistema':
			url = baseUrl + 'configuracion/variables.php';
			loadDynamicContent(url);
			await sleep(500);
			fetchdatos(menu);
			break;
		case 'Automatizaciones':
			url = baseUrl + 'configuracion/automatizaciones.php';
			loadDynamicContent(url);
			await sleep(500);
			fetchdatos(menu);
			break;
		default:
			console.log("¿Estamos buscando algo?");
			break;
	}
}


function loadDynamicContent(url) {
	ContenidoDinamico.innerHTML = '';

	fetch(url)
		.then(response => {
			if (!response.ok) {
				throw new Error('Network response was not ok');
			}
			return response.text();
		})
		.then(data => {
			ContenidoDinamico.innerHTML = data;
		})
		.catch(error => {
			console.error('Error al cargar el contenido:', error);
		});
}


function fetchdatos(menu) {
	edicionactiva = false;
	switch (menu) {
		case 'Inicio':
			var formData = new FormData();
			formData.append('funcion', 'logsmaestro'),
				formData.append('maestro', 'Config%');
			var options = {
				method: 'POST',
				body: formData,
			};
			fetch(funcionesphp, options)
				.then(response => response.json())
				.then(data => {
					var html = '';
					data.forEach(item => {
						html += '<tr>';
						html += '<td class="tablaplaningedit"> ' + item.fecha + '</td>';
						html += '<td class="tablaplaningedit"> ' + item.descripcion + '</td>';
						html += '<td class="tablaplaningedit"> ' + item.usuario + '</td>';
						html += '</tr>';
					});
					document.getElementById("tabla-body-linicio").innerHTML = html;
				});
			break;

		case 'Almacenes':
			var formData = new FormData();
			formData.append('funcion', 'maestroalmacenes');

			var options = {
				method: 'POST',
				body: formData,
			};

			fetch(funcionesphp, options)
				.then(response => response.json())
				.then(data => {
					var html = '';
					data.forEach(item => {
						html += '<tr>';
						html += '<td style="padding:0;text-align:center"><img class="img-thumbnail" onclick="botonguardar()" src="' + baseUrl + 'assets/img/guardar.png" id="btnguardar" style="display:none;"><img class="img-thumbnail" onclick="botoneditar(this)" src="' + baseUrl + 'assets/img/edit.png" id="btnedit"><img class="img-thumbnail" onclick="botonnoeditar(this)" src="' + baseUrl + 'assets/img/cerrar.png" id="btncerrar" style="display:none;">' + ((item.eliminable === 'Eliminable') ? '<img class="img-thumbnail" onclick="botoneliminaralmacen(`' + item.almacen + '`)" src="' + baseUrl + 'assets/img/cerrar.png" id="btn-eliminar" style="display:inline;margin: 0px 5px;">' : '') + '</td>';
						html += '<td class="tablaplaningedit"> ' + item.almacen + '</td>';
						html += '<td class="tablaplaningedit"> ' + item.descripcion + '</td>';
						html += '<td class="tablaplaningedit"> ' + item.direccion + '</td>';
						html += '<td class="tablaplaningedit"> ' + item.cp + '</td>';
						html += '<td class="tablaplaningedit"> ' + item.poblacion + '</td>';
						html += '<td class="tablaplaningedit"> ' + item.pais + '</td>';
						html += '<td class="tablaplaningedit"> ' + item.direccioncarga + '</td>';
						html += '<td>';
						html += '<div class="custom-control custom-switch">';
						html += '<input type="checkbox" class="custom-control-input" id="switch_' + item.almacen + '" ' + (item.status ? 'checked' : '') + '>';
						html += '<label class="custom-control-label" for="switch_' + item.almacen + '"></label>';
						html += '</div>';
						html += '</td>';
						html += '</tr>';
					});
					document.getElementById("tabla-body-malmacenes").innerHTML = html;
				});

			var formData = new FormData();
			formData.append('funcion', 'logsmaestro'),
				formData.append('maestro', 'ConfigALM');
			var options = {
				method: 'POST',
				body: formData,
			};
			fetch(funcionesphp, options)
				.then(response => response.json())
				.then(data => {
					var html = '';
					data.forEach(item => {
						html += '<tr>';
						html += '<td class="tablaplaningedit"> ' + item.fecha + '</td>';
						html += '<td class="tablaplaningedit"> ' + item.descripcion + '</td>';
						html += '<td class="tablaplaningedit"> ' + item.usuario + '</td>';
						html += '</tr>';
					});
					document.getElementById("tabla-body-lalmacenes").innerHTML = html;
				});

			break;

		case 'Muelles':
			break;
		case 'Transporte':
			break;
		case 'CargaDescarga':
			break;
		case 'VariablesDelSistema':
			var formData = new FormData();
			formData.append('funcion', 'maestrovariablesdelsistema');

			var options = {
				method: 'POST',
				body: formData,
			};

			fetch(funcionesphp, options)
				.then(response => response.json())
				.then(data => {
					var html = '';
					data.forEach(item => {
						switch (item.Tipo) {
							case 'ActivoValor':
								html += '<tr tipo="' + item.Tipo + '">';
								html += '<td style="padding:0;text-align:center"><img class="img-thumbnail" onclick="botonguardar()" src="' + baseUrl + 'assets/img/guardar.png" id="btnguardar" style="display:none;"><img class="img-thumbnail" onclick="botoneditar(this)" src="' + baseUrl + 'assets/img/edit.png" id="btnedit"><img class="img-thumbnail" onclick="botonnoeditar(this)" src="' + baseUrl + 'assets/img/cerrar.png" id="btncerrar" style="display:none;"></td>';
								html += '<td class="tablaplaningedit" title="' + item.Nombre + '">' + item.Nombre + '</td>';
								html += '<td class="tablaplaningedit" title="' + item.Descripción + '">' + item.Descripción + '</td>';
								html += '<td class="tablaplaningedit">';
								html += '<div class="custom-control custom-switch">';
								html += '<input type="checkbox" class="custom-control-input" id="switch_' + item.Nombre + '" ' + (item.Activo ? 'checked' : '') + '>';
								html += '<label class="custom-control-label" for="switch_' + item.Nombre + '"></label>';
								html += '</div>';
								html += '</td>';
								html += '<td contenteditable="false" class="tablaplaningedit" title="' + item.Valor + '">' + item.Valor + '</td>';
								html += '</tr>';

								break;
							case 'Activo':
								html += '<tr tipo="' + item.Tipo + '">';
								html += '<td></td>';
								html += '<td class="tablaplaningedit" title="' + item.Nombre + '"> ' + item.Nombre + '</td>';
								html += '<td class="tablaplaningedit" title="' + item.Descripción + '"> ' + item.Descripción + '</td>';
								html += '<td class="tablaplaningedit">';
								html += '<div class="custom-control custom-switch">';
								html += '<input type="checkbox" class="custom-control-input" id="switch_' + item.Nombre + '" ' + (item.Activo ? 'checked' : '') + '>';
								html += '<label class="custom-control-label" for="switch_' + item.Nombre + '"></label>';
								html += '</div>';
								html += '</td>';
								html += '<td contenteditable="false" class="tablaplaningedit" style="background-color:#d8d8d8" title="' + item.Valor + '"> ' + item.Valor + '</td>';
								html += '</tr>';
								break;
							default:
								console.log("Configuraciones de tipo desconocido en DB");
								break;
						}

					});
					document.getElementById("tabla-body-configuraciones").innerHTML = html;
				});

			var formData = new FormData();
			formData.append('funcion', 'logsmaestro'),
				formData.append('maestro', 'ConfigALM');
			var options = {
				method: 'POST',
				body: formData,
			};
			fetch(funcionesphp, options)
				.then(response => response.json())
				.then(data => {
					var html = '';
					data.forEach(item => {
						html += '<tr>';
						html += '<td class="tablaplaningedit"> ' + item.fecha + '</td>';
						html += '<td class="tablaplaningedit"> ' + item.descripcion + '</td>';
						html += '<td class="tablaplaningedit"> ' + item.usuario + '</td>';
						html += '</tr>';
					});
					document.getElementById("tabla-body-lconfiguraciones").innerHTML = html;
				});

			break;
		case 'Automatizaciones':
			var formData = new FormData();
			formData.append('funcion', 'MaestroAutomatizaciones');

			var options = {
				method: 'POST',
				body: formData,
			};

			fetch(funcionesphp, options)
				.then(response => response.json())
				.then(data => {
					var html = '';
					data.forEach(item => {
						switch (item.Tipo) {
							case 'ActivoValor':
								html += '<tr tipo="' + item.Tipo + '">';
								html += '<td style="padding:0;text-align:center"><img class="img-thumbnail" onclick="botonguardar()" src="' + baseUrl + 'assets/img/guardar.png" id="btnguardar" style="display:none;"><img class="img-thumbnail" onclick="botoneditar(this)" src="' + baseUrl + 'assets/img/edit.png" id="btnedit"><img class="img-thumbnail" onclick="botonnoeditar(this)" src="' + baseUrl + 'assets/img/cerrar.png" id="btncerrar" style="display:none;"></td>';
								html += '<td class="tablaplaningedit" title="' + item.Nombre + '">' + item.Nombre + '</td>';
								html += '<td class="tablaplaningedit" title="' + item.Descripción + '">' + item.Descripción + '</td>';
								html += '<td class="tablaplaningedit">';
								html += '<div class="custom-control custom-switch">';
								html += '<input type="checkbox" class="custom-control-input" id="switch_' + item.Nombre + '" ' + (item.Activo ? 'checked' : '') + '>';
								html += '<label class="custom-control-label" for="switch_' + item.Nombre + '"></label>';
								html += '</div>';
								html += '</td>';
								html += '<td contenteditable="false" class="tablaplaningedit" title="' + item.Valor + '">' + item.Valor + '</td>';
								html += '</tr>';

								break;
							case 'Activo':
								html += '<tr tipo="' + item.Tipo + '">';
								html += '<td></td>';
								html += '<td class="tablaplaningedit" title="' + item.Nombre + '"> ' + item.Nombre + '</td>';
								html += '<td class="tablaplaningedit" title="' + item.Descripción + '"> ' + item.Descripción + '</td>';
								html += '<td class="tablaplaningedit">';
								html += '<div class="custom-control custom-switch">';
								html += '<input type="checkbox" class="custom-control-input" id="switch_' + item.Nombre + '" ' + (item.Activo ? 'checked' : '') + '>';
								html += '<label class="custom-control-label" for="switch_' + item.Nombre + '"></label>';
								html += '</div>';
								html += '</td>';
								html += '<td contenteditable="false" class="tablaplaningedit" style="background-color:#d8d8d8" title="' + item.Valor + '"> ' + item.Valor + '</td>';
								html += '</tr>';
								break;
							default:
								console.log("Configuraciones de tipo desconocido en DB");
								break;
						}

					});
					document.getElementById("tabla-body-automatizaciones").innerHTML = html;
				});

			var formData = new FormData();
			formData.append('funcion', 'logsmaestro'),
				formData.append('maestro', 'ConfigAutomatizaciones');
			var options = {
				method: 'POST',
				body: formData,
			};
			fetch(funcionesphp, options)
				.then(response => response.json())
				.then(data => {
					var html = '';
					data.forEach(item => {
						html += '<tr>';
						html += '<td class="tablaplaningedit"> ' + item.fecha + '</td>';
						html += '<td class="tablaplaningedit"> ' + item.descripcion + '</td>';
						html += '<td class="tablaplaningedit"> ' + item.usuario + '</td>';
						html += '</tr>';
					});
					document.getElementById("tabla-body-lautomatizaciones").innerHTML = html;
				});

			break;
		default:
			console.log("¿Estamos buscando algo?");
			break;
	}

}


function createSwitch(id) {
	var switchInput = document.createElement('input');
	switchInput.type = 'checkbox';
	switchInput.classList.add('custom-control-input');
	switchInput.id = id;

	return switchInput;
}

function botonguardar() {

}

function botoneditar(button) {
	if (edicionactiva) {
		Notificacion('Error', 'Error', 'Tienes una fila en edición, termina la edición para empezar otra.')
		return;
	}

	edicionactiva = true;

	var row = button.closest('tr');

	valoresOriginales = [];

	habilitarEdicion(row);
	actualizarBotones(row, 'abrir');
}

function habilitarEdicion(row) {
	var cells = row.querySelectorAll('td.tablaplaningedit');

	for (var i = 0; i < cells.length; i++) {
		valoresOriginales.push(cells[i].textContent);
	}

	cells.forEach(cell => {
		cell.contentEditable = true;
	});
	cells[0].focus();
}

function botonnoeditar(button) {
	var row = button.closest('tr');
	actualizarBotones(row, 'cerrar');
	var cells = row.querySelectorAll('td.tablaplaningedit');
	if (hayCambios(cells)) {
		var confirmacion = confirm("¿Estás seguro de que deseas salir sin guardar los cambios?");
		if (confirmacion) {
			restaurarValoresOriginales(cells);
			edicionactiva = false;
			return;
		}
	}


	edicionactiva = false;
	cells.forEach(cell => {
		cell.contentEditable = false;
	});
}


function hayCambios(celdas) {
	for (var i = 0; i < celdas.length; i++) {
		if (celdas[i].textContent !== valoresOriginales[i]) {
			return true;
		}
	}
	return false;
}

function restaurarValoresOriginales(celdas) {
	for (var i = 0; i < celdas.length; i++) {
		celdas[i].textContent = valoresOriginales[i];
	}
}

function actualizarBotones(row, funcion) {

	if (funcion == 'abrir') {
		var btnEditar = row.querySelector('#btnedit');
		var btnNoEditar = row.querySelector('#btncerrar');
		var btnGuardar = row.querySelector('#btnguardar');

		if (btnEditar) btnEditar.style.display = 'none';
		if (btnNoEditar) btnNoEditar.style.display = 'inline';
		if (btnGuardar) btnGuardar.style.display = 'inline';
	} else {
		var btnEditar = row.querySelector('#btnedit');
		var btnNoEditar = row.querySelector('#btncerrar');
		var btnGuardar = row.querySelector('#btnguardar');

		if (btnEditar) btnEditar.style.display = 'inline';
		if (btnNoEditar) btnNoEditar.style.display = 'none';
		if (btnGuardar) btnGuardar.style.display = 'none';
	}

}


function AñadirRegistroAlmacen() {
	tablaBody = document.getElementById("tabla-body-malmacenes");
	if (!edicionactiva) {
		edicionactiva = true;
		const nuevaFila = document.createElement("tr");
		nuevaFila.id = "nuevafila";
		const columna1 = document.createElement("td");
		columna1.style.padding = "0";
		columna1.style.textAlign = "center";
		columna1.id = 'Acciones';
		columna1.innerHTML = '<img class="img-thumbnail" onclick = "botoncrearalmacen()" src="' + baseUrl + 'assets/img/guardar.png" id="btnguardar" style="visibility:true;"><img class="img-thumbnail" onclick = "botoneditar(this)" src="' + baseUrl + 'assets/img/edit.png" id="btnedit" style="visibility:hidden"><img class="img-thumbnail" onclick = "botonnocrear()" src="' + baseUrl + 'assets/img/cerrar.png" id="btncerrar" style="visibility:true;">'

		const columna2 = document.createElement("td");
		columna2.id = 'almacen';
		columna2.className = "tablaplaningedit";
		columna2.setAttribute("contenteditable", "true");

		const columna3 = document.createElement("td");
		columna3.id = 'descripcion'
		columna3.className = "tablaplaningedit";
		columna3.setAttribute("contenteditable", "true");

		const columna4 = document.createElement("td");
		columna4.id = 'direccion';
		columna4.className = "tablaplaningedit";
		columna4.setAttribute("contenteditable", "true");

		const columna5 = document.createElement("td");
		columna5.id = 'cp';
		columna5.className = "tablaplaningedit";
		columna5.setAttribute("contenteditable", "true");

		const columna6 = document.createElement("td");
		columna6.id = 'poblacion';
		columna6.className = "tablaplaningedit";
		columna6.setAttribute("contenteditable", "true");

		const columna7 = document.createElement("td");
		columna7.id = 'pais';
		columna7.className = "tablaplaningedit";
		columna7.setAttribute("contenteditable", "true");

		const columna8 = document.createElement("td");
		columna8.id = 'direccioncarga';
		columna8.className = "tablaplaningedit";
		columna8.setAttribute("contenteditable", "true");

		const columna9 = document.createElement("td");
		columna9.id = 'status';
		columna9.className = "tablaplaningedit";
		columna9.setAttribute("contenteditable", "false");

		nuevaFila.appendChild(columna1);
		nuevaFila.appendChild(columna2);
		nuevaFila.appendChild(columna3);
		nuevaFila.appendChild(columna4);
		nuevaFila.appendChild(columna5);
		nuevaFila.appendChild(columna6);
		nuevaFila.appendChild(columna7);
		nuevaFila.appendChild(columna8);
		nuevaFila.appendChild(columna9);
		tablaBody.appendChild(nuevaFila);

		columna2.focus();
	} else {
		Notificacion("error", "Hay una fila en edición", "Terminar la edición de la fila y luego añada");
	}
}

function botonnocrear() {
	if (edicionactiva) {
		const filas = tablaBody.getElementsByTagName("tr");
		if (filas.length > 0) {
			tablaBody.removeChild(filas[filas.length - 1]);
		}
		edicionactiva = false;
	} else {
		Notificacion('Error', 'Error', 'No hay fila que eliminar en creación.');
	}

}

function botoncrearalmacen() {
	const almacen = document.getElementById('almacen').innerText;
	const descripcion = document.getElementById('descripcion').innerText;
	const direccion = document.getElementById('direccion').innerText;
	const cp = document.getElementById('cp').innerText;
	const poblacion = document.getElementById('poblacion').innerText;
	const pais = document.getElementById('pais').innerText;
	const direccioncarga = document.getElementById('direccioncarga').innerText;

	let formData = new FormData();
	formData.append('funcion', 'crearalmacen');
	formData.append('almacen', almacen);
	formData.append('descripcion', descripcion);
	formData.append('direccion', direccion);
	formData.append('cp', cp);
	formData.append('poblacion', poblacion);
	formData.append('pais', pais);
	formData.append('direccioncarga', direccioncarga);
	const options = {
		method: 'POST',
		body: formData
	};
	fetch(funcionesphp, options)
		.then(response => {
			if (!response.ok) {
				throw new Error("Network response was not ok");
			}
			return response.json();
		})
		.then(data => {
			if (data.status === 'success') {
				Notificacion('correcto', 'Operación exitosa', 'Se añadió correctamente el almacén');
				fetchdatos('Almacenes');
				edicionactiva = false;
			} else {
				Notificacion('error', 'Errror', 'No se recibió confirmación del servidor sobre la creación del almacén.');
			}
		})
}
function botoneliminaralmacen(almacen) {
	let formData = new FormData();
	formData.append('funcion', 'eliminaralmacen');
	formData.append('almacen', almacen);
	const options = {
		method: 'POST',
		body: formData
	}
	fetch(funcionesphp, options)
		.then(response => {
			if (!response.ok) {
				throw new Error("Network response was not ok");
			}
			return response.json();
		})
		.then(data => {
			if (data.status === 'success') {
				Notificacion('correcto', 'Operación exitosa', 'Se eliminó correctamente el almacén');
				fetchdatos('Almacenes');
			} else {
				Notificacion('error', 'Error', 'No se recibió confirmación del servidor');
			}
		})
}
