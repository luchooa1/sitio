/* ============================================================
   reporteDiario.js - MÓDULO 5: REPORTE DIARIO (COT)
   VERSIÓN COMPLETA - CAMPOS VACÍOS Y OBLIGATORIOS
   ============================================================ */

const listMisiones = ['MOVIMIENTO AEREO', 'ASALTO AEREO', 'COMANDO Y CONTROL', 'ATAQUE', 'RECONOCIMIENTO', 'SEGURIDAD', 'CASEVAC', 'APOYO HUMANITARIO', 'ENTRENAMIENTO', 'MANTENIMIENTO'];
const listUnidades = ['BMMA1', 'BMMA2', 'BMMA3', 'BMMA4', 'BMMA5', 'BMMA6', 'BMMA7', 'BMMA8', 'BAOEA', 'BANOT'];
const listUnidadesApoyadas = ['DIV01', 'DIV02', 'DIV03', 'DIV04', 'DIV05', 'DIV06', 'DIV07', 'DIV08', 'DIVFE', 'CONAT', 'FUTCO', 'OTRAS FUERZAS'];
const listComplementos = ['(OCI) Operaciones de Carga Interna', '(C2) Comando y Control', '(RA) Reconocimiento de Área', '(RZ) Reconocimiento de Zona', '(P) Protección'];
const listCondiciones = ['DIURNO (D)', 'D-LVN', 'DIURNO', 'DIURNO (D) LVN (LVN)', 'INSTRUMENTOS (IFR)'];
const listConvenios = ['SI', 'NO', 'N/A'];
const listEstadosMision = ['CUMPLIO', 'NO CUMPLIO'];
const listDepartamentos = ['AMAZONAS', 'ANTIOQUIA', 'ARAUCA', 'ATLANTICO', 'BOGOTA D.C.', 'BOLIVAR', 'BOYACA', 'CALDAS', 'CAQUETA', 'CASANARE', 'CAUCA', 'CESAR', 'CHOCO', 'CORDOBA', 'CUNDINAMARCA', 'GUAINIA', 'GUAVIARE', 'HUILA', 'LA GUAJIRA', 'MAGDALENA', 'META', 'NARIÑO', 'NORTE DE SANTANDER', 'PUTUMAYO', 'QUINDIO', 'RISARALDA', 'SAN ANDRES', 'SANTANDER', 'SUCRE', 'TOLIMA', 'VALLE DEL CAUCA', 'VAUPES', 'VICHADA'];
const listTipoRequerimiento = ['ABASTECIMIENTOS', 'APOYO HUMANITARIO', 'CASEVAC', 'OPERACIONES ESPECIALES', 'TRASLADO', 'CICLO-ODE'];

// Variable para almacenar personal_operadores
let personalOperadores = [];

// Cargar personal_operadores desde la base de datos
async function cargarPersonalOperadores() {
    try {
        const res = await fetch('/api/personal-operadores', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
            personalOperadores = await res.json();
        }
    } catch (error) {
        console.error('Error cargando personal operadores:', error);
    }
}

// Obtener operadores filtrados por unidad (SIN DUPLICADOS)
function getOperadoresPorUnidad(unidad) {
    // Filtrar por unidad y activo
    const filtrados = personalOperadores.filter(op => op.unidad === unidad && op.activo === 1);
    // Eliminar duplicados por nombre_completo
    const unique = [];
    const nombres = new Set();
    for (const op of filtrados) {
        if (!nombres.has(op.nombre_completo)) {
            nombres.add(op.nombre_completo);
            unique.push(op);
        }
    }
    return unique;
}

// Autocompletar grado al seleccionar operador
function autocompletarGrado() {
    const operadorId = document.getElementById('operadorSelect').value;
    if (operadorId && personalOperadores.length) {
        const operador = personalOperadores.find(op => op.id == operadorId);
        if (operador) {
            document.getElementById('operadorGrado').value = operador.grado;
        }
    } else {
        document.getElementById('operadorGrado').value = '';
    }
}

// Unidad del usuario logueado (autocompletada)
function getUnidadUsuario() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const unidadesMap = {
        1: 'BMMA1', 2: 'BMMA2', 3: 'BMMA3', 4: 'BMMA4',
        5: 'BMMA5', 6: 'BMMA6', 7: 'BMMA7', 8: 'BMMA8',
        9: 'BAOEA', 10: 'BANOT'
    };
    return unidadesMap[user.unidad_id] || '';
}

// Cargar brigadas según división seleccionada
async function cargarBrigadas() {
    const divisionId = document.getElementById('unidadApoyadaReporte').value;
    const brigadaSelect = document.getElementById('brigadaSelect');
    
    brigadaSelect.innerHTML = '<option value="">-- SELECCIONE BRIGADA --</option>';
    document.getElementById('batallonSelect').innerHTML = '<option value="">-- PRIMERO SELECCIONE BRIGADA --</option>';
    
    if (divisionId) {
        try {
            const res = await fetch(`/api/brigadas/${divisionId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const brigadas = await res.json();
                brigadas.forEach(b => {
                    brigadaSelect.innerHTML += `<option value="${b.id}">${b.nombre}</option>`;
                });
            }
        } catch (error) {
            console.error('Error cargando brigadas:', error);
        }
    }
}

// Cargar batallones según brigada seleccionada
async function cargarBatallones() {
    const brigadaId = document.getElementById('brigadaSelect').value;
    const batallonSelect = document.getElementById('batallonSelect');
    
    batallonSelect.innerHTML = '<option value="">-- SELECCIONE BATALLÓN --</option>';
    
    if (brigadaId) {
        try {
            const res = await fetch(`/api/batallones/${brigadaId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const batallones = await res.json();
                batallones.forEach(b => {
                    batallonSelect.innerHTML += `<option value="${b.id}">${b.nombre}</option>`;
                });
            }
        } catch (error) {
            console.error('Error cargando batallones:', error);
        }
    }
}

// Cargar municipios según departamento
async function cargarMunicipios() {
    const deptoSelect = document.getElementById('deptoSelect');
    const municipioSelect = document.getElementById('municipioSelect');
    const depto = deptoSelect.value;
    
    municipioSelect.innerHTML = '<option value="">-- SELECCIONE MUNICIPIO --</option>';
    
    if (depto) {
        try {
            const res = await fetch(`/api/municipios/${encodeURIComponent(depto)}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const municipios = await res.json();
                municipios.forEach(m => {
                    municipioSelect.innerHTML += `<option value="${m.nombre}">${m.nombre}</option>`;
                });
            }
        } catch (error) {
            console.error('Error cargando municipios:', error);
        }
    }
}

function renderReporteDiario() {
    const cont = document.getElementById('contenido');
    
    if (!mostrarFormularioReporte) {
        cont.innerHTML = `
            <h3 class="text-warning mb-4">REPORTE DIARIO (COT)</h3>
            <div class="text-center py-5">
                <button class="btn btn-warning btn-lg px-5 py-3" onclick="iniciarNuevoReporte()">📝 REGISTRAR VUELO</button>
            </div>
            <div class="table-responsive mt-4">
                <h5 class="text-warning">ÚLTIMOS REPORTES REGISTRADOS</h5>
                <table class="table table-dark table-hover table-striped">
                    <thead class="table-secondary text-dark">
                        <tr>
                            <th>UNIDAD</th>
                            <th>MATRÍCULA</th>
                            <th>HORAS MÁQUINA</th>
                            <th>HORAS TRIPULACIÓN</th>
                            <th>ESTADO REQUERIMIENTO</th>
                            <th>FECHA REPORTE</th>
                        </tr>
                    </thead>
                    <tbody id="tablaReportes">
                        ${reportesRegistrados.length === 0 ? 
                            `<tr><td colspan="6" class="text-center">No hay reportes registrados aún</td>` : 
                            reportesRegistrados.slice().reverse().map(r => `
                                <tr>
                                    <td class="align-middle">${r.unidad || 'N/A'}</td>
                                    <td class="text-warning fw-bold align-middle">${r.matricula}</td>
                                    <td class="align-middle">${r.horas || 0} h</td>
                                    <td class="align-middle">${r.horas_tripulacion || 0} h</td>
                                    <td class="align-middle"><span class="badge ${r.estado_mision === 'CUMPLIO' ? 'bg-success' : 'bg-danger'}">${r.estado_mision || 'N/A'}</span></td>
                                    <td class="align-middle">${r.fecha_hora_reporte || 'N/A'}</td>
                                </tr>
                            `).join('')
                        }
                    </tbody>
                </table>
            </div>
        `;
    } else {
        if (personalOperadores.length === 0) {
            cargarPersonalOperadores().then(() => {
                renderReporteDiario();
            });
            return;
        }
        
        const unidadUsuario = getUnidadUsuario();
        const operadoresDisponibles = getOperadoresPorUnidad(unidadUsuario);
        
        // Solo mostrar aeronaves asignadas a la unidad del usuario
        let aeronavesHtml = '<option value="">-- SELECCIONE AERONAVE --</option>';
        datosGlobales.aeronaves.filter(a => a.estado === 'ACL' && a.unidad_asignada === unidadUsuario).forEach(a => { 
            aeronavesHtml += `<option value="${a.matricula}" data-modelo="${a.modelo}" data-clase="${a.clase}">${a.matricula} - ${a.modelo}</option>`; 
        });
        
        let operadoresHtml = '<option value="">-- SELECCIONE OPERADOR --</option>';
        operadoresDisponibles.forEach(op => {
            operadoresHtml += `<option value="${op.id}">${op.nombre_completo}</option>`;
        });
        
        cont.innerHTML = `
            <h3 class="text-warning mb-4">REGISTRAR NUEVO VUELO</h3>
            <form id="formReporte">
                <div class="card-form"><h5>DATOS DEL OPERADOR <span class="badge-obligatorio">OBLIGATORIO</span></h5>
                    <div class="row">
                        <div class="col-md-6 mb-2">
                            <label>UNIDAD QUE REPORTA</label>
                            <input type="text" class="form-control" value="${unidadUsuario}" readonly disabled>
                            <input type="hidden" id="unidadReporte" value="${unidadUsuario}">
                        </div>
                        <div class="col-md-6 mb-2">
                            <label>FECHA ELABORACIÓN</label>
                            <input type="text" id="fechaElaboracion" class="form-control" readonly>
                        </div>
                        <div class="col-md-4 mb-2">
                            <label>OPERADOR (PERSONAL DE LA UNIDAD)</label>
                            <select id="operadorSelect" class="form-select" onchange="autocompletarGrado()" required>
                                ${operadoresHtml}
                            </select>
                        </div>
                        <div class="col-md-4 mb-2">
                            <label>GRADO</label>
                            <input type="text" id="operadorGrado" class="form-control" readonly>
                        </div>
                        <div class="col-md-4 mb-2">
                            <label>NÚMERO ORDEN DE VUELO</label>
                            <input type="number" id="numeroOrdenVuelo" class="form-control" step="1" min="1" required>
                        </div>
                        <div class="col-md-6 mb-2">
                            <label>FECHA Y HORA DEL VUELO</label>
                            <input type="datetime-local" id="fechaVuelo" class="form-control" required>
                        </div>
                        <div class="col-md-6 mb-2">
                            <label>TIPO DE REQUERIMIENTO</label>
                            <select id="tipoRequerimiento" class="form-select" required>
                                <option value="">-- SELECCIONE --</option>
                                ${listTipoRequerimiento.map(t => `<option value="${t}">${t}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                </div>
                <div class="card-form"><h5>DATOS DE LA AERONAVE</h5>
                    <div class="row">
                        <div class="col-md-6 mb-2"><label>MATRÍCULA</label><select id="matriculaReporte" class="form-select" onchange="actualizarDatosAero()" required>${aeronavesHtml}</select></div>
                        <div class="col-md-3 mb-2"><label>MODELO</label><input type="text" id="modeloReporte" class="form-control" readonly></div>
                        <div class="col-md-3 mb-2"><label>TIPO</label><input type="text" id="tipoReporte" class="form-control" readonly></div>
                    </div>
                </div>
                <div class="card-form"><h5>DATOS OPERATIVOS</h5>
                    <div class="row">
                        <div class="col-md-6 mb-2"><label>PROGRAMADO</label><select id="programado" class="form-select" required><option value="">--</option><option>SI</option><option>NO</option></select></div>
                        <div class="col-md-6 mb-2"><label>RENTADO</label><select id="rentado" class="form-select" required><option value="">--</option><option>SI</option><option>NO</option></select></div>
                        <div class="col-12 mb-2"><label>TAREAS DE AVIACIÓN</label><select id="misionReporte" class="form-select" required><option value="">-- SELECCIONE --</option>${listMisiones.map(m=>`<option>${m}</option>`).join('')}</select></div>
                        <div class="col-md-6 mb-2"><label>COMPLEMENTO DE LA TAREA</label><select id="complementoReporte" class="form-select" required><option value="">-- SELECCIONE --</option>${listComplementos.map(c=>`<option>${c}</option>`).join('')}</select></div>
                        <div class="col-md-6 mb-2"><label>CONDICIÓN DE VUELO</label><select id="condicionReporte" class="form-select" required><option value="">-- SELECCIONE --</option>${listCondiciones.map(c=>`<option>${c}</option>`).join('')}</select></div>
                        <div class="col-md-4 mb-2"><label>UNIDAD APOYADA</label><select id="unidadApoyadaReporte" class="form-select" onchange="cargarBrigadas()" required><option value="">-- SELECCIONE --</option>${listUnidadesApoyadas.map(u=>`<option value="${u}">${u}</option>`).join('')}</select></div>
                        <div class="col-md-4 mb-2"><label>BRIGADA</label><select id="brigadaSelect" class="form-select" onchange="cargarBatallones()" required><option value="">-- PRIMERO SELECCIONE UNIDAD APOYADA --</option></select></div>
                        <div class="col-md-4 mb-2"><label>BATALLÓN</label><select id="batallonSelect" class="form-select" required><option value="">-- PRIMERO SELECCIONE BRIGADA --</option></select></div>
                        <div class="col-md-6 mb-2"><label>CONVENIOS</label><select id="convenioReporte" class="form-select" required><option value="">-- SELECCIONE --</option>${listConvenios.map(c=>`<option>${c}</option>`).join('')}</select></div>
                        <div class="col-12 mb-2"><label>RUTA</label><input type="text" id="rutaReporte" class="form-control" placeholder="Ej: BM SAN LUCAS - GUARAPERIA - MINA VIEJA"></div>
                    </div>
                </div>
                <div class="card-form"><h5>HORAS Y CARGAS</h5>
                    <div class="row">
                        <div class="col-md-3 mb-2"><label>TIEMPO MÁQUINA (h)</label><input type="number" id="horasVuelo" class="form-control" step="0.1" min="0" max="20" required></div>
                        <div class="col-md-3 mb-2"><label>HORAS TRIPULACIÓN (h)</label><input type="number" id="horasTripulacion" class="form-control" step="0.1" min="0" max="20" required></div>
                        <div class="col-md-3 mb-2"><label>CARGA (kg)</label><input type="number" id="cargaKg" class="form-control" step="0.1" min="0" value="0"></div>
                        <div class="col-md-3 mb-2"><label>COMBUSTIBLE (gal)</label><input type="number" id="combustibleGalones" class="form-control" step="0.1" min="0" value="0"></div>
                        <div class="col-md-3 mb-2"><label>PAX</label><input type="number" id="paxReporte" class="form-control" step="1" min="0" value="0"></div>
                    </div>
                </div>
                <div class="card-form"><h5>UBICACIÓN</h5>
                    <div class="row">
                        <div class="col-md-6 mb-2"><label>DEPARTAMENTO</label><select id="deptoSelect" class="form-select" onchange="cargarMunicipios()" required><option value="">-- SELECCIONE --</option>${listDepartamentos.map(d=>`<option>${d}</option>`).join('')}</select></div>
                        <div class="col-md-6 mb-2"><label>MUNICIPIO</label><select id="municipioSelect" class="form-select" required><option value="">-- PRIMERO SELECCIONE DEPARTAMENTO --</option></select></div>
                    </div>
                </div>
                <div class="card-form"><h5>ESTADO Y OBSERVACIONES</h5>
                    <div class="row">
                        <div class="col-md-6 mb-2"><label>ESTADO DE LA MISIÓN</label><select id="estadoMisionReporte" class="form-select" required><option value="">-- SELECCIONE --</option>${listEstadosMision.map(e=>`<option>${e}</option>`).join('')}</select></div>
                        <div class="col-12 mb-2"><label>OBSERVACIONES</label><textarea id="obsReporte" class="form-control" rows="2"></textarea></div>
                    </div>
                </div>
                <div class="text-center mt-3">
                    <button type="button" class="btn btn-secondary me-3" onclick="cancelarReporte()">CANCELAR</button>
                    <button type="submit" class="btn btn-warning fw-bold px-5">✈️ GUARDAR VUELO</button>
                </div>
            </form>
        `;
        
        const now = new Date();
        const colombiaOffset = -5 * 60;
        const localOffset = now.getTimezoneOffset();
        const diff = colombiaOffset - localOffset;
        const colombiaTime = new Date(now.getTime() + diff * 60 * 1000);
        document.getElementById('fechaElaboracion').value = colombiaTime.toLocaleString('es-CO');
        
        document.getElementById('fechaVuelo').value = '';
        document.getElementById('numeroOrdenVuelo').value = '';
        document.getElementById('tipoRequerimiento').value = '';
        document.getElementById('operadorSelect').value = '';
        document.getElementById('horasVuelo').value = '';
        document.getElementById('horasTripulacion').value = '';
        document.getElementById('rutaReporte').value = '';
        document.getElementById('obsReporte').value = '';
        
        document.getElementById('formReporte').addEventListener('submit', (e) => { e.preventDefault(); confirmarGuardado(); });
    }
}

function confirmarGuardado() {
    const confirmacion = confirm(
        "⚠️ ¿Está seguro de guardar este reporte?\n\n" +
        "Una vez guardado, solo COMANDO podrá autorizar cambios.\n\n" +
        "Aceptar = Guardar\n" +
        "Cancelar = Seguir modificando"
    );
    
    if (confirmacion) {
        guardarReporte();
    }
}

function iniciarNuevoReporte() { mostrarFormularioReporte = true; renderReporteDiario(); }
function cancelarReporte() { mostrarFormularioReporte = false; renderReporteDiario(); }

function actualizarDatosAero() {
    const sel = document.getElementById('matriculaReporte');
    const opt = sel.options[sel.selectedIndex];
    if (opt && opt.value) {
        document.getElementById('modeloReporte').value = opt.getAttribute('data-modelo') || '';
        document.getElementById('tipoReporte').value = opt.getAttribute('data-clase') || '';
    }
}

function guardarReporte() {
    const matricula = document.getElementById('matriculaReporte').value;
    if (!matricula) { alert('Seleccione una aeronave'); return; }
    
    const numeroOrden = document.getElementById('numeroOrdenVuelo').value;
    if (!numeroOrden) { alert('Ingrese el número de orden de vuelo'); return; }
    
    const tipoRequerimiento = document.getElementById('tipoRequerimiento').value;
    if (!tipoRequerimiento) { alert('Seleccione el tipo de requerimiento'); return; }
    
    const fechaVuelo = document.getElementById('fechaVuelo').value;
    if (!fechaVuelo) { alert('Ingrese la fecha y hora del vuelo'); return; }
    
    const fechaSeleccionada = new Date(fechaVuelo);
    const ahora = new Date();
    if (fechaSeleccionada > ahora) {
        alert('❌ No se puede registrar un vuelo con fecha futura');
        return;
    }
    
    const operadorId = document.getElementById('operadorSelect').value;
    if (!operadorId) { alert('Seleccione el operador de la unidad'); return; }
    
    const horas = parseFloat(document.getElementById('horasVuelo').value);
    if (isNaN(horas) || horas <= 0) { alert('Ingrese horas máquina válidas'); return; }
    
    const horasTripulacion = parseFloat(document.getElementById('horasTripulacion').value);
    if (isNaN(horasTripulacion) || horasTripulacion < 0) { alert('Ingrese horas tripulación válidas'); return; }
    
    const programado = document.getElementById('programado').value;
    if (!programado) { alert('Seleccione si es programado'); return; }
    
    const rentado = document.getElementById('rentado').value;
    if (!rentado) { alert('Seleccione si es rentado'); return; }
    
    const unidadApoyada = document.getElementById('unidadApoyadaReporte').value;
    if (!unidadApoyada) { alert('Seleccione la unidad apoyada'); return; }
    
    const brigadaId = document.getElementById('brigadaSelect').value;
    if (!brigadaId) { alert('Seleccione una brigada'); return; }
    
    const batallonId = document.getElementById('batallonSelect').value;
    if (!batallonId) { alert('Seleccione un batallón'); return; }
    
    const convenio = document.getElementById('convenioReporte').value;
    if (!convenio) { alert('Seleccione el convenio'); return; }
    
    const estadoMision = document.getElementById('estadoMisionReporte').value;
    if (!estadoMision) { alert('Seleccione el estado de la misión'); return; }
    
    const departamento = document.getElementById('deptoSelect').value;
    if (!departamento) { alert('Seleccione el departamento'); return; }
    
    const municipio = document.getElementById('municipioSelect').value;
    if (!municipio) { alert('Seleccione el municipio'); return; }
    
    const unidad = document.getElementById('unidadReporte').value;
    const operador = personalOperadores.find(op => op.id == operadorId);
    
    const brigadaText = document.getElementById('brigadaSelect').options[document.getElementById('brigadaSelect').selectedIndex]?.text || '';
    const batallonText = document.getElementById('batallonSelect').options[document.getElementById('batallonSelect').selectedIndex]?.text || '';
    
    const misionId = document.getElementById('misionReporte').selectedIndex + 1;
    const complementoTareaId = document.getElementById('complementoReporte').selectedIndex + 1;
    const condicionVueloId = document.getElementById('condicionReporte').selectedIndex + 1;
    const convenioId = document.getElementById('convenioReporte').selectedIndex + 1;
    const estadoMisionId = document.getElementById('estadoMisionReporte').selectedIndex + 1;
    
    const payload = {
        numero_orden_vuelo: parseInt(numeroOrden),
        tipo_requerimiento: tipoRequerimiento,
        fecha_vuelo: fechaVuelo,
        operador_id: parseInt(operadorId),
        operador_nombre: operador ? operador.nombre_completo : '',
        operador_grado: operador ? operador.grado : '',
        unidad_id: unidad,
        programado: programado,
        rentado: rentado,
        matricula: matricula,
        modelo: document.getElementById('modeloReporte').value,
        tipo_aeronave: document.getElementById('tipoReporte').value,
        mision_id: misionId,
        complemento_tarea_id: complementoTareaId,
        condicion_vuelo_id: condicionVueloId,
        unidad_apoyada_id: unidadApoyada,
        brigada: brigadaText,
        batallon: batallonText,
        convenio_id: convenioId,
        ruta: document.getElementById('rutaReporte').value,
        tiempo_maquina: horas,
        horas_tripulacion: horasTripulacion,
        carga_kg: parseFloat(document.getElementById('cargaKg').value) || 0,
        combustible_galones: parseFloat(document.getElementById('combustibleGalones').value) || 0,
        pax: parseInt(document.getElementById('paxReporte').value) || 0,
        departamento_id: departamento,
        municipio_id: municipio,
        estado_mision_id: estadoMisionId,
        observaciones: document.getElementById('obsReporte').value
    };
    
    fetch('/api/reporte-diario', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            reportesRegistrados.push({
                id: data.id,
                unidad: unidad,
                matricula: matricula,
                horas: horas,
                horas_tripulacion: horasTripulacion,
                estado_mision: estadoMision,
                fecha_hora_reporte: new Date().toLocaleString('es-CO')
            });
            
            alert(`✅ Vuelo registrado exitosamente.\n📄 ID REPORTE: ${data.id_reporte}\n\n⚠️ ADVERTENCIA: Este reporte solo podrá ser modificado por COMANDO.`);
            
            mostrarFormularioReporte = false;
            renderReporteDiario();
        } else {
            alert('❌ Error al guardar: ' + (data.message || 'Error desconocido'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('❌ Error al conectar con el servidor');
    });
}

cargarPersonalOperadores();

window.renderReporteDiario = renderReporteDiario;
window.iniciarNuevoReporte = iniciarNuevoReporte;
window.cancelarReporte = cancelarReporte;
window.actualizarDatosAero = actualizarDatosAero;
window.autocompletarGrado = autocompletarGrado;
window.cargarBrigadas = cargarBrigadas;
window.cargarBatallones = cargarBatallones;
window.cargarMunicipios = cargarMunicipios;
window.guardarReporte = guardarReporte;
window.confirmarGuardado = confirmarGuardado;