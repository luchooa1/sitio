/**
 * VISTA PRINCIPAL: RESUMEN DE TECHOS
 */
async function renderAsignacionHoras() {
    const container = document.getElementById('contenido');
    if (!container) return;

    container.innerHTML = `
        <div class="animate__animated animate__fadeIn p-4">
            <h3 class="text-warning fw-bold mb-5 text-uppercase">Asignación de Horas Operacionales</h3>
            <div class="d-flex justify-content-center my-5 py-2">
                <button class="btn btn-warning fw-bold px-5 py-3 shadow-lg fs-5" onclick="abrirFormularioAsignacion()">
                    <i class="fas fa-plus-circle me-2"></i> NUEVA ASIGNACIÓN
                </button>
            </div>
            <div class="mt-5">
                <h6 class="text-warning fw-bold mb-3 text-uppercase text-start">Resumen de Techos por Periodo</h6>
                <div class="table-responsive rounded shadow-sm border border-secondary">
                    <table class="table table-dark table-hover mb-0 align-middle text-center">
                        <thead class="bg-secondary bg-opacity-25">
                            <tr class="text-muted small">
                                <th>MES / PERIODO</th>
                                <th>TOTAL ALA ROTATORIA</th>
                                <th>TOTAL ALA FIJA</th>
                                <th class="text-warning">TOTAL GENERAL</th>
                                <th>ACCIONES</th>
                            </tr>
                        </thead>
                        <tbody id="cuerpoHistorial">
                            <tr><td colspan="5" class="p-4 text-muted small text-uppercase">Cargando base de datos local...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>`;

    await cargarDatosDesdeBD();
}

/**
 * CARGA DE DATOS: RESUMEN POR PERIODO
 */
async function cargarDatosDesdeBD() {
    const tbody = document.getElementById('cuerpoHistorial');
    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/horas-operacionales', { 
            headers: { 'Authorization': `Bearer ${token}` } 
        });
        
        if (!res.ok) throw new Error("Error en servidor");
        const datos = await res.json();

        if (!datos || datos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="p-5 text-muted small text-uppercase">No hay registros en bolsas_horas</td></tr>';
            return;
        }

        // Agrupación por periodo para el resumen
        const resumen = {};
        datos.forEach(reg => {
            if (!resumen[reg.periodo]) resumen[reg.periodo] = { periodo: reg.periodo, rot: 0, fija: 0 };
            const horas = parseFloat(reg.techo_horas) || 0;
            if (reg.tipo_aeronave === 'ALA ROTATORIA') resumen[reg.periodo].rot += horas;
            else resumen[reg.periodo].fija += horas;
        });

        // Obtener mes actual para validar edición
        const hoy = new Date();
        const añoActual = hoy.getFullYear();
        const mesActual = hoy.getMonth() + 1;

        tbody.innerHTML = Object.values(resumen).map(r => {
            // Verificar si el periodo es anterior al mes actual
            const [periodoAño, periodoMes] = r.periodo.split('-').map(Number);
            let esEditable = true;
            if (periodoAño < añoActual) esEditable = false;
            else if (periodoAño === añoActual && periodoMes < mesActual) esEditable = false;

            const botonEditar = esEditable 
                ? `<button class="btn btn-sm text-warning border-0" onclick="abrirFormularioAsignacion('${r.periodo}')" title="Editar">
                        <i class="fas fa-pencil-alt"></i>
                   </button>`
                : `<button class="btn btn-sm text-secondary border-0" disabled title="Periodo no editable (mes pasado)">
                        <i class="fas fa-lock"></i>
                   </button>`;

            return `
                <tr class="border-bottom border-secondary border-opacity-25">
                    <td class="fw-bold text-info">${r.periodo}</td>
                    <td>${r.rot.toFixed(1)}</td>
                    <td>${r.fija.toFixed(1)}</td>
                    <td class="fw-bold text-warning fs-5">${(r.rot + r.fija).toFixed(1)}</td>
                    <td>${botonEditar}</td>
                 </tr>`;
        }).join('');
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-danger text-uppercase small">Error de conexión local</td></tr>';
    }
}

/**
 * CARGAR VALORES EXISTENTES PARA UN PERIODO
 */
async function cargarValoresExistentes(periodo) {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/horas-operacionales?periodo=${periodo}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return {};
        const datos = await res.json();
        
        const mapa = {};
        datos.forEach(item => {
            const key = `${item.unidad}|${item.tipo_aeronave}`;
            mapa[key] = item.techo_horas;
        });
        return mapa;
    } catch (error) {
        console.error('Error cargando valores existentes:', error);
        return {};
    }
}

/**
 * VERIFICAR SI EL PERIODO ES EDITABLE
 */
function isPeriodoEditable(periodo) {
    const hoy = new Date();
    const añoActual = hoy.getFullYear();
    const mesActual = hoy.getMonth() + 1;
    const [periodoAño, periodoMes] = periodo.split('-').map(Number);
    
    if (periodoAño < añoActual) return false;
    if (periodoAño === añoActual && periodoMes < mesActual) return false;
    return true;
}

/**
 * FORMULARIO DE CARGA: CON VALORES EXISTENTES Y VALIDACIÓN DE EDICIÓN
 */
async function abrirFormularioAsignacion(periodoExistente = null) {
    const container = document.getElementById('contenido');
    const ahora = new Date();
    let opcionesMes = '';
    
    // Verificar si el periodo existente es editable
    let esEditable = true;
    if (periodoExistente) {
        esEditable = isPeriodoEditable(periodoExistente);
    }
    
    for (let i = -1; i <= 3; i++) {
        const f = new Date(ahora.getFullYear(), ahora.getMonth() + i, 1);
        const val = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`;
        const texto = f.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();
        opcionesMes += `<option value="${val}" ${periodoExistente === val ? 'selected' : ''}>${texto}</option>`;
    }

    container.innerHTML = `
        <div class="animate__animated animate__fadeIn p-4">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <button class="btn btn-sm btn-outline-secondary" onclick="renderAsignacionHoras()">← VOLVER</button>
                <h4 class="text-warning fw-bold m-0 text-uppercase small">Carga de Techos Operativos</h4>
            </div>
            <div class="bg-dark p-4 rounded border border-warning border-opacity-25 shadow-lg">
                ${!esEditable && periodoExistente ? `
                    <div class="alert alert-warning mb-4 text-center">
                        <i class="fas fa-lock me-2"></i> 
                        <strong>PERIODO NO EDITABLE</strong> - ${periodoExistente} es un mes anterior al actual.
                        Solo puede consultar los valores.
                    </div>
                ` : ''}
                <div class="row mb-4"><div class="col-md-4">
                    <label class="form-label text-muted small text-uppercase">Periodo:</label>
                    <select id="periodoSelect" class="form-select bg-black text-white border-secondary" ${!esEditable ? 'disabled' : ''}>
                        ${opcionesMes}
                    </select>
                </div></div>
                <div class="table-responsive rounded border border-secondary border-opacity-50">
                    <table class="table table-dark table-sm align-middle mb-0 text-center">
                        <thead class="bg-black text-muted small">
                            <tr>
                                <th class="text-start ps-3 py-3">UNIDAD</th>
                                <th>ALA ROTATORIA (HRS)</th>
                                <th>ALA FIJA (HRS)</th>
                            </tr>
                        </thead>
                        <tbody id="tablaUnidades"></tbody>
                    </table>
                </div>
                <div class="mt-4 text-end">
                    ${esEditable ? 
                        `<button class="btn btn-warning fw-bold px-5 py-2 shadow" onclick="guardarCambiosBD()">
                            <i class="fas fa-save me-2"></i> ACTUALIZAR BASE DE DATOS
                        </button>` : 
                        `<button class="btn btn-secondary fw-bold px-5 py-2 shadow" disabled>
                            <i class="fas fa-lock me-2"></i> PERIODO NO EDITABLE
                        </button>`
                    }
                </div>
            </div>
        </div>`;
    
    // Lista de unidades
    const unidades = [
        { nombre: 'BMMA1' }, { nombre: 'BMMA2' }, { nombre: 'BMMA3' },
        { nombre: 'BMMA4' }, { nombre: 'BMMA5' }, { nombre: 'BMMA6' },
        { nombre: 'BMMA7' }, { nombre: 'BMMA8' }, { nombre: 'BAOEA' }, { nombre: 'BANOT' }
    ];

    // Cargar valores existentes si se editó un periodo
    let valoresExistentes = {};
    if (periodoExistente) {
        valoresExistentes = await cargarValoresExistentes(periodoExistente);
    }

    // Si no es editable, los inputs se muestran como solo lectura
    const inputReadonly = !esEditable ? 'readonly' : '';

    document.getElementById('tablaUnidades').innerHTML = unidades.map(u => {
        const rotKey = `${u.nombre}|ALA ROTATORIA`;
        const fijaKey = `${u.nombre}|ALA FIJA`;
        const rotVal = valoresExistentes[rotKey] || 0;
        const fijaVal = valoresExistentes[fijaKey] || 0;
        
        return `
            <tr class="border-bottom border-secondary border-opacity-10">
                <td class="fw-bold ps-3 text-start text-info text-opacity-75">${u.nombre}</td>
                <td><input type="number" step="0.1" class="form-control form-control-sm text-center bg-black text-warning border-secondary input-db" data-unidad="${u.nombre}" data-tipo="ALA ROTATORIA" value="${rotVal}" ${inputReadonly}></td>
                <td><input type="number" step="0.1" class="form-control form-control-sm text-center bg-black text-info border-secondary input-db" data-unidad="${u.nombre}" data-tipo="ALA FIJA" value="${fijaVal}" ${inputReadonly}></td>
              </tr>`;
    }).join('');
}

/**
 * GUARDADO: ENVÍA NOMBRE DE UNIDAD
 */
async function guardarCambiosBD() {
    const periodo = document.getElementById('periodoSelect').value;
    
    // Verificar nuevamente si el periodo es editable
    if (!isPeriodoEditable(periodo)) {
        alert("❌ No se puede modificar un periodo anterior al mes actual.");
        renderAsignacionHoras();
        return;
    }
    
    const inputs = document.querySelectorAll('.input-db');
    
    const asignaciones = Array.from(inputs).map(i => ({
        unidad: i.dataset.unidad,
        tipo_aeronave: i.dataset.tipo,
        techo_horas: parseFloat(i.value) || 0,
        periodo: periodo
    }));

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/horas-operacionales', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ asignaciones, periodo })
        });
        
        const resJSON = await response.json();

        if (resJSON.success) {
            alert("✅ DATOS GUARDADOS\nPeriodo " + periodo + " actualizado con éxito.");
            renderAsignacionHoras(); 
        } else {
            alert("❌ Error del servidor: " + (resJSON.message || "Fallo en la carga"));
        }
    } catch (e) {
        alert("❌ ERROR CRÍTICO: No se pudo conectar con el servidor local.");
    }
}

window.renderAsignacionHoras = renderAsignacionHoras;
window.abrirFormularioAsignacion = abrirFormularioAsignacion;
window.guardarCambiosBD = guardarCambiosBD;
window.cargarDatosDesdeBD = cargarDatosDesdeBD;
window.cargarValoresExistentes = cargarValoresExistentes;
window.isPeriodoEditable = isPeriodoEditable;