/* ============================================================
   gestionAeronaves.js - MÓDULO 4: GESTIÓN DE AERONAVES
   CON OPCIÓN MANTENIMIENTO Y CAMBIO MASIVO DE UNIDAD
   ============================================================ */

const listaUnidades = ['BMMA1', 'BMMA2', 'BMMA3', 'BMMA4', 'BMMA5', 'BMMA6', 'BMMA7', 'BMMA8', 'BAOEA', 'BANOT', 'MANTENIMIENTO'];

function renderAeronaves() {
    const cont = document.getElementById('contenido');
    
    if (!datosGlobales.aeronaves.length) {
        cont.innerHTML = '<div class="mensaje-vacio">No hay aeronaves cargadas</div>';
        return;
    }
    
    cont.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h3 class="text-warning m-0">INVENTARIO TÉCNICO DE AERONAVES</h3>
            <span class="badge bg-secondary" id="countSel">0 seleccionados</span>
        </div>
        
        <div class="row g-2 mb-3">
            <div class="col-md-3">
                <input type="text" id="busAeronave" class="form-control" placeholder="🔍 Buscar por matrícula, modelo o unidad..." onkeyup="filtrarAeronaves()">
            </div>
            <div class="col-md-3">
                <select id="estadoM" class="form-select">
                    <option value="ACL">CAMBIAR A: ACL (LISTA)</option>
                    <option value="AMP">CAMBIAR A: AMP (MANTENIMIENTO PROGRAMADO)</option>
                    <option value="AMI">CAMBIAR A: AMI (MANTENIMIENTO IMPREVISTO)</option>
                </select>
            </div>
            <div class="col-md-3">
                <select id="unidadMasiva" class="form-select">
                    <option value="">--- CAMBIAR UNIDAD ---</option>
                    ${listaUnidades.map(u => `<option value="${u}">${u === 'MANTENIMIENTO' ? '🔧 MANTENIMIENTO' : u}</option>`).join('')}
                </select>
            </div>
            <div class="col-md-3">
                <button class="btn btn-warning fw-bold w-100" onclick="ejecutarMasivo()">APLICAR CAMBIOS</button>
            </div>
        </div>

        <div class="table-responsive">
            <table class="table table-dark table-hover table-striped align-middle">
                <thead class="table-secondary text-dark">
                    <tr>
                        <th style="width:40px"><input type="checkbox" id="checkMaster" onclick="seleccionarTodo(this)"></th>
                        <th>MATRÍCULA</th>
                        <th>MODELO</th>
                        <th>CLASE</th>
                        <th>UNIDAD</th>
                        <th>ESTADO</th>
                        <th class="text-center">H. FLUJO (BRIAV32)</th>
                        <th class="text-center">H. DISP</th>
                        <th class="text-center">HISTÓRICO</th>
                        <th style="width:80px" class="text-center">ACCIONES</th>
                    </tr>
                </thead>
                <tbody id="tablaPrincipal">
                    ${datosGlobales.aeronaves.map(a => {
                        const unidadDisplay = a.unidad_asignada === 'MANTENIMIENTO' ? '🔧 MANTENIMIENTO' : (a.unidad_asignada || 'SIN ASIGNAR');
                        return `
                        <tr>
                            <td><input type="checkbox" class="checkNave" value="${a.matricula}" onclick="actualizarContador()"></td>
                            <td class="text-warning fw-bold">${a.matricula || 'N/A'}</td>
                            <td>${a.modelo || 'N/A'}</td>
                            <td>${a.clase || 'N/A'}</td>
                            <td class="${a.unidad_asignada === 'MANTENIMIENTO' ? 'text-danger fw-bold' : ''}">${unidadDisplay}</td>
                            <td><span class="badge ${a.estado === 'ACL' ? 'badge-acl' : a.estado === 'AMP' ? 'badge-amp' : 'badge-ami'}">${a.estado || 'ACL'}</span></td>
                            <td class="text-center">${(a.horas_asignadas_hangar || 0).toFixed(1)}</td>
                            <td class="text-center fw-bold text-info">${(a.horas_restantes || 0).toFixed(1)}</td>
                            <td class="text-center">${(a.horas_totales_historico || 0).toFixed(1)}</td>
                            <td class="text-center"><button class="btn btn-sm btn-warning" onclick="abrirModalEdicion('${a.matricula}')">✏️</button></td>
                        `
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function filtrarAeronaves() {
    const filtro = document.getElementById('busAeronave').value.toLowerCase();
    const filas = document.querySelectorAll('#tablaPrincipal tr');
    filas.forEach(fila => {
        const texto = fila.textContent.toLowerCase();
        fila.style.display = texto.includes(filtro) ? '' : 'none';
    });
}

function seleccionarTodo(master) {
    document.querySelectorAll('.checkNave').forEach(chk => {
        if (chk.closest('tr').style.display !== 'none') chk.checked = master.checked;
    });
    actualizarContador();
}

function actualizarContador() {
    const countSel = document.getElementById('countSel');
    if (countSel) {
        countSel.innerText = `${document.querySelectorAll('.checkNave:checked').length} seleccionados`;
    }
}

async function ejecutarMasivo() {
    const nEstado = document.getElementById('estadoM').value;
    const nuevaUnidad = document.getElementById('unidadMasiva').value;
    const seleccionadas = Array.from(document.querySelectorAll('.checkNave:checked')).map(c => c.value);
    
    if (!seleccionadas.length) {
        alert("Seleccione al menos una aeronave.");
        return;
    }
    
    let mensaje = `¿Confirma cambios para ${seleccionadas.length} aeronaves?\n`;
    if (nEstado) mensaje += `- Estado: ${nEstado}\n`;
    if (nuevaUnidad) mensaje += `- Unidad: ${nuevaUnidad}\n`;
    
    if (!confirm(mensaje)) return;
    
    for (const m of seleccionadas) {
        const payload = { matricula: m };
        if (nEstado) payload.estado = nEstado;
        if (nuevaUnidad) payload.unidad_asignada = nuevaUnidad;
        
        await fetch('/actualizar-estado', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify(payload)
        });
    }
    await cargarDatos();
    renderAeronaves();
    document.getElementById('unidadMasiva').value = '';
    alert(`✅ Aplicado a ${seleccionadas.length} aeronaves`);
}

function abrirModalEdicion(matricula) {
    const aeronave = datosGlobales.aeronaves.find(a => a.matricula === matricula);
    if (!aeronave) return;
    aeronaveEditando = aeronave;
    const puedeEditarHistorico = (rolActual === 'ADMIN' || rolActual === 'COMANDO');
    const puedeEditarUnidad = (rolActual === 'ADMIN' || rolActual === 'COMANDO' || rolActual === 'BRIAV33');
    
    document.getElementById('editMatricula').value = aeronave.matricula;
    document.getElementById('editModelo').value = aeronave.modelo;
    document.getElementById('editClase').value = aeronave.clase || 'N/A';
    
    const unidadSelect = document.getElementById('editUnidad');
    if (puedeEditarUnidad) {
        let options = '<option value="">-- SELECCIONE UNIDAD --</option>';
        listaUnidades.forEach(u => {
            const selected = (aeronave.unidad_asignada === u) ? 'selected' : '';
            options += `<option value="${u}" ${selected}>${u === 'MANTENIMIENTO' ? '🔧 MANTENIMIENTO' : u}</option>`;
        });
        unidadSelect.innerHTML = options;
        unidadSelect.disabled = false;
        unidadSelect.classList.remove('campo-solo-lectura');
    } else {
        unidadSelect.innerHTML = `<option value="${aeronave.unidad_asignada || 'SIN ASIGNAR'}">${aeronave.unidad_asignada || 'SIN ASIGNAR'}</option>`;
        unidadSelect.disabled = true;
        unidadSelect.classList.add('campo-solo-lectura');
    }
    
    document.getElementById('editEstado').value = aeronave.estado || 'ACL';
    document.getElementById('editHorasHangar').value = aeronave.horas_asignadas_hangar || 0;
    document.getElementById('editHorasDisponibles').value = formatearNumeroColombiano(aeronave.horas_restantes);
    document.getElementById('editHorasHistorico').value = aeronave.horas_totales_historico || 0;
    
    const inputHistorico = document.getElementById('editHorasHistorico');
    const msgAdmin = document.getElementById('msgAdmin');
    
    if (puedeEditarHistorico) {
        inputHistorico.readOnly = false;
        inputHistorico.disabled = false;
        inputHistorico.classList.remove('campo-solo-lectura');
        if (msgAdmin) {
            msgAdmin.innerHTML = '✅ Solo ADMIN/COMANDO pueden modificar este campo.';
            msgAdmin.className = 'texto-info';
        }
    } else {
        inputHistorico.readOnly = true;
        inputHistorico.disabled = true;
        inputHistorico.classList.add('campo-solo-lectura');
        if (msgAdmin) {
            msgAdmin.innerHTML = '⚠️ Solo ADMIN/COMANDO pueden modificar este valor.';
            msgAdmin.className = 'texto-advertencia';
        }
    }
    
    const modalElement = document.getElementById('modalEditarAeronave');
    if (modalElement) {
        new bootstrap.Modal(modalElement).show();
    } else {
        console.error('Modal no encontrado');
        alert('Error: No se puede abrir el editor');
    }
}

async function guardarEdicionAeronave() {
    if (!aeronaveEditando) return;
    
    const nuevoEstado = document.getElementById('editEstado').value;
    const nuevasHorasHangar = parseFloat(document.getElementById('editHorasHangar').value) || 0;
    const nuevasHorasHistorico = parseFloat(document.getElementById('editHorasHistorico').value) || 0;
    const nuevaUnidad = document.getElementById('editUnidad').value;
    
    if (nuevasHorasHangar < 0 || nuevasHorasHistorico < 0) { alert('❌ Las horas no pueden ser negativas'); return; }
    
    const payload = { 
        matricula: aeronaveEditando.matricula, 
        estado: nuevoEstado, 
        horas_asignadas_hangar: nuevasHorasHangar, 
        horas_totales_historico: nuevasHorasHistorico
    };
    
    const puedeEditarUnidad = (rolActual === 'ADMIN' || rolActual === 'COMANDO' || rolActual === 'BRIAV33');
    if (puedeEditarUnidad && nuevaUnidad && nuevaUnidad !== '') {
        payload.unidad_asignada = nuevaUnidad;
    }
    
    try {
        const res = await fetch('/actualizar-estado', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (data && data.success !== false) {
            await cargarDatos();
            alert(`✅ Aeronave ${aeronaveEditando.matricula} actualizada.`);
            bootstrap.Modal.getInstance(document.getElementById('modalEditarAeronave')).hide();
            renderAeronaves();
        } else {
            alert('❌ Error al guardar');
        }
    } catch (error) { 
        alert('❌ Error al guardar: ' + error.message); 
    }
}