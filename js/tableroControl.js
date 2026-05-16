// ============================================================
// tableroControl.js - MÓDULO 6: TABLERO CONTROL (COMPLETO CORREGIDO)
// ============================================================

let chartPrincipal = null;
let analisisActual = 'bmma';

// Variables para selectores en cascada (solo UNIDAD APOYADA)
let divSeleccionado = null;
let brigadaSeleccionada = null;
let batallonSeleccionado = null;

// Listas de opciones
const opcionesBMMA = ['BMMA1', 'BMMA2', 'BMMA3', 'BMMA4', 'BMMA5', 'BMMA6', 'BMMA7', 'BMMA8', 'BAOEA', 'BANOT'];
const opcionesUnidadApoyada = ['DIV01', 'DIV02', 'DIV03', 'DIV04', 'DIV05', 'DIV06', 'DIV07', 'DIV08', 'DIVFE', 'CONAT', 'FUTCO', 'OTRAS FUERZAS'];
const opcionesRequerimiento = ['ABASTECIMIENTOS', 'APOYO HUMANITARIO', 'CASEVAC', 'OPERACIONES ESPECIALES', 'TRASLADO', 'CICLO-ODE'];

async function renderTableroControl() {
    const container = document.getElementById('contenido');
    if (!container) return;
    
    const hoy = new Date();
    const hace30Dias = new Date();
    hace30Dias.setDate(hoy.getDate() - 30);
    
    const fechaDesdeDefault = hace30Dias.toISOString().split('T')[0];
    const fechaHastaDefault = hoy.toISOString().split('T')[0];
    
    container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h3 class="text-warning m-0">📊 TABLERO CONTROL</h3>
        </div>
        
        <div class="card bg-dark mb-4">
            <div class="card-header bg-secondary text-dark fw-bold fs-5">
                🔍 FILTROS DE BÚSQUEDA
            </div>
            <div class="card-body">
                <div class="row g-3 align-items-end">
                    <div class="col-md-3">
                        <label class="form-label text-muted small">📅 DESDE</label>
                        <input type="date" id="fechaDesde" class="form-control" value="${fechaDesdeDefault}">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label text-muted small">📅 HASTA</label>
                        <input type="date" id="fechaHasta" class="form-control" value="${fechaHastaDefault}">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label text-muted small">📋 SELECCIONAR</label>
                        <div id="selectorContainer" class="bg-dark p-2 rounded" style="border:1px solid #444;">
                            <!-- Selector dinámico -->
                        </div>
                    </div>
                    <div class="col-md-12 mt-3">
                        <button class="btn btn-warning fw-bold w-100" onclick="actualizarGrafico()">
                            📊 ACTUALIZAR GRÁFICO
                        </button>
                    </div>
                </div>
                <div class="row mt-3">
                    <div class="col-md-12">
                        <div class="btn-group w-100" role="group">
                            <button class="btn btn-outline-secondary btn-sm" onclick="setFechaRapida(7)">Últimos 7 días</button>
                            <button class="btn btn-outline-secondary btn-sm" onclick="setFechaRapida(15)">Últimos 15 días</button>
                            <button class="btn btn-outline-secondary btn-sm" onclick="setFechaRapida(30)">Últimos 30 días</button>
                            <button class="btn btn-outline-secondary btn-sm" onclick="setFechaRapida(90)">Últimos 90 días</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="btn-group w-100 mb-3" role="group">
            <button class="btn btn-outline-warning" onclick="cambiarAnalisis('bmma')" id="btnBmma">🏢 HORAS POR BMMA</button>
            <button class="btn btn-outline-warning" onclick="cambiarAnalisis('apoyada')" id="btnApoyada">🎯 UNIDAD APOYADA</button>
            <button class="btn btn-outline-warning" onclick="cambiarAnalisis('requerimiento')" id="btnRequerimiento">📋 TIPO REQUERIMIENTO</button>
        </div>
        
        <div class="card bg-dark">
            <div class="card-header bg-secondary text-dark fw-bold fs-5" id="tituloGrafico">
                📈 GRÁFICO DE HORAS VOLADAS
            </div>
            <div class="card-body">
                <div class="alert alert-info mb-3" id="infoPico" style="display:none;">
                    <i class="fas fa-chart-line me-2"></i>
                    <strong>PICO MÁXIMO:</strong> <span id="picoValor">0</span> horas
                </div>
                <canvas id="graficoPrincipal" width="400" height="200" style="max-height: 400px; width: 100%; background:#1a1a1a; border-radius:8px;"></canvas>
                <div id="sinDatosMsg" class="text-center text-muted p-5" style="display:none;">
                    <i class="fas fa-chart-line fa-3x mb-3"></i>
                    <h5>No hay datos en el rango seleccionado</h5>
                    <p>Intente con otras fechas o seleccione más elementos</p>
                </div>
            </div>
        </div>
    `;
    
    // Inicializar selector
    cambiarAnalisis('bmma');
}

function setFechaRapida(dias) {
    const hoy = new Date();
    const fechaHasta = hoy.toISOString().split('T')[0];
    const fechaDesde = new Date();
    fechaDesde.setDate(fechaDesde.getDate() - dias);
    const fechaDesdeStr = fechaDesde.toISOString().split('T')[0];
    document.getElementById('fechaDesde').value = fechaDesdeStr;
    document.getElementById('fechaHasta').value = fechaHasta;
    actualizarGrafico();
}

function cambiarAnalisis(tipo) {
    analisisActual = tipo;
    
    // Resetear selecciones de UNIDAD APOYADA
    divSeleccionado = null;
    brigadaSeleccionada = null;
    batallonSeleccionado = null;
    
    // Actualizar botones
    const btnBmma = document.getElementById('btnBmma');
    const btnApoyada = document.getElementById('btnApoyada');
    const btnRequerimiento = document.getElementById('btnRequerimiento');
    
    // Resetear todos los botones
    [btnBmma, btnApoyada, btnRequerimiento].forEach(btn => {
        if (btn) {
            btn.classList.remove('btn-warning');
            btn.classList.add('btn-outline-warning');
        }
    });
    
    if (tipo === 'bmma') {
        if (btnBmma) {
            btnBmma.classList.remove('btn-outline-warning');
            btnBmma.classList.add('btn-warning');
        }
        document.getElementById('tituloGrafico').innerHTML = '🏢 GRÁFICO DE HORAS VOLADAS POR BMMA';
        renderizarSelectorMultiple(opcionesBMMA, 'unidades');
    } else if (tipo === 'apoyada') {
        if (btnApoyada) {
            btnApoyada.classList.remove('btn-outline-warning');
            btnApoyada.classList.add('btn-warning');
        }
        document.getElementById('tituloGrafico').innerHTML = '🎯 GRÁFICO DE HORAS POR UNIDAD APOYADA';
        renderizarSelectorJerarquico();
    } else if (tipo === 'requerimiento') {
        if (btnRequerimiento) {
            btnRequerimiento.classList.remove('btn-outline-warning');
            btnRequerimiento.classList.add('btn-warning');
        }
        document.getElementById('tituloGrafico').innerHTML = '📋 GRÁFICO DE HORAS POR TIPO DE REQUERIMIENTO';
        renderizarSelectorMultiple(opcionesRequerimiento, 'tipos');
    }
    
    actualizarGrafico();
}

// =====================================================
// FUNCIONES PARA SELECTORES JERÁRQUICOS (SOLO UNIDAD APOYADA)
// =====================================================

async function renderizarSelectorJerarquico() {
    const container = document.getElementById('selectorContainer');
    if (!container) return;
    
    let html = `
        <div class="row g-2">
            <div class="col-md-4">
                <label class="form-label text-warning small fw-bold">📌 DIVISIÓN</label>
                <select id="selectDivision" class="form-select form-select-sm" onchange="cargarBrigadas()">
                    <option value="">-- SELECCIONE DIVISIÓN --</option>
                </select>
            </div>
            <div class="col-md-4">
                <label class="form-label text-warning small fw-bold">🎯 BRIGADA</label>
                <select id="selectBrigada" class="form-select form-select-sm" onchange="cargarBatallones()" disabled>
                    <option value="">-- PRIMERO SELECCIONE DIVISIÓN --</option>
                </select>
            </div>
            <div class="col-md-4">
                <label class="form-label text-warning small fw-bold">🏛️ BATALLÓN</label>
                <select id="selectBatallon" class="form-select form-select-sm" onchange="actualizarGrafico()" disabled>
                    <option value="">-- PRIMERO SELECCIONE BRIGADA --</option>
                </select>
            </div>
        </div>
        <div class="text-muted small mt-2">
            ℹ️ Seleccione una DIVISIÓN para ver sus brigadas, luego una BRIGADA para ver sus batallones.
        </div>
    `;
    
    container.innerHTML = html;
    
    await cargarDivisiones();
}

async function cargarDivisiones() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/divisiones', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        
        const selectDiv = document.getElementById('selectDivision');
        if (selectDiv && result.success && result.data) {
            result.data.forEach(div => {
                const option = document.createElement('option');
                option.value = div.nombre;
                option.textContent = div.nombre;
                selectDiv.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error cargando divisiones:', error);
    }
}

async function cargarBrigadas() {
    const selectDiv = document.getElementById('selectDivision');
    const selectBrig = document.getElementById('selectBrigada');
    const selectBat = document.getElementById('selectBatallon');
    
    divSeleccionado = selectDiv.value;
    brigadaSeleccionada = null;
    batallonSeleccionado = null;
    
    if (!divSeleccionado) {
        selectBrig.innerHTML = '<option value="">-- PRIMERO SELECCIONE DIVISIÓN --</option>';
        selectBrig.disabled = true;
        selectBat.innerHTML = '<option value="">-- PRIMERO SELECCIONE BRIGADA --</option>';
        selectBat.disabled = true;
        actualizarGrafico();
        return;
    }
    
    selectBat.innerHTML = '<option value="">-- PRIMERO SELECCIONE BRIGADA --</option>';
    selectBat.disabled = true;
    batallonSeleccionado = null;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/tablero-brigadas?divisionId=${encodeURIComponent(divSeleccionado)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        
        selectBrig.innerHTML = '<option value="">-- SELECCIONE BRIGADA --</option>';
        selectBrig.disabled = false;
        
        if (result.success && result.data && result.data.length > 0) {
            result.data.forEach(brig => {
                const option = document.createElement('option');
                option.value = brig.nombre;
                option.textContent = brig.nombre;
                selectBrig.appendChild(option);
            });
        } else {
            selectBrig.innerHTML = '<option value="">-- NO HAY BRIGADAS DISPONIBLES --</option>';
        }
        
        actualizarGrafico();
        
    } catch (error) {
        console.error('Error cargando brigadas:', error);
        selectBrig.innerHTML = '<option value="">-- ERROR AL CARGAR BRIGADAS --</option>';
    }
}

async function cargarBatallones() {
    const selectBrig = document.getElementById('selectBrigada');
    const selectBat = document.getElementById('selectBatallon');
    
    brigadaSeleccionada = selectBrig.value;
    batallonSeleccionado = null;
    
    if (!brigadaSeleccionada) {
        selectBat.innerHTML = '<option value="">-- PRIMERO SELECCIONE BRIGADA --</option>';
        selectBat.disabled = true;
        actualizarGrafico();
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/tablero-batallones?brigada=${encodeURIComponent(brigadaSeleccionada)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        
        selectBat.innerHTML = '<option value="">-- SELECCIONE BATALLÓN --</option>';
        selectBat.disabled = false;
        
        if (result.success && result.data && result.data.length > 0) {
            result.data.forEach(bat => {
                const option = document.createElement('option');
                option.value = bat.nombre;
                option.textContent = bat.nombre;
                selectBat.appendChild(option);
            });
            
            // Opción para ver TODOS los batallones de la brigada
            const optionAll = document.createElement('option');
            optionAll.value = 'TODOS';
            optionAll.textContent = '🏁 TODOS LOS BATALLONES';
            selectBat.appendChild(optionAll);
        } else {
            selectBat.innerHTML = '<option value="">-- NO HAY BATALLONES DISPONIBLES --</option>';
        }
        
        actualizarGrafico();
        
    } catch (error) {
        console.error('Error cargando batallones:', error);
        selectBat.innerHTML = '<option value="">-- ERROR AL CARGAR BATALLONES --</option>';
    }
}

function obtenerUnidadApoyadaSeleccionada() {
    const selectDiv = document.getElementById('selectDivision');
    const selectBrig = document.getElementById('selectBrigada');
    const selectBat = document.getElementById('selectBatallon');
    
    if (!selectDiv) return '';
    
    const division = selectDiv.value;
    const brigada = selectBrig ? selectBrig.value : '';
    const batallon = selectBat ? selectBat.value : '';
    
    if (batallon && batallon !== 'TODOS' && batallon !== '') {
        return batallon;
    } else if (brigada && brigada !== '') {
        return brigada;
    } else if (division && division !== '') {
        return division;
    }
    
    return '';
}

function obtenerTipoNivel() {
    const selectDiv = document.getElementById('selectDivision');
    const selectBrig = document.getElementById('selectBrigada');
    const selectBat = document.getElementById('selectBatallon');
    
    if (selectBat && selectBat.value && selectBat.value !== 'TODOS' && selectBat.value !== '') {
        return 'batallon';
    } else if (selectBrig && selectBrig.value && selectBrig.value !== '') {
        return 'brigada';
    } else if (selectDiv && selectDiv.value && selectDiv.value !== '') {
        return 'division';
    }
    return 'todas';
}

// =====================================================
// FUNCIONES ORIGINALES (HORAS POR BMMA y TIPO REQUERIMIENTO)
// =====================================================

function renderizarSelectorMultiple(opciones, nombre) {
    const container = document.getElementById('selectorContainer');
    if (!container) return;
    
    let html = `
        <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="text-warning small">SELECCIONE ${nombre.toUpperCase()}</span>
            <div>
                <button type="button" class="btn btn-sm btn-outline-secondary" onclick="seleccionarTodos()">TODOS</button>
                <button type="button" class="btn btn-sm btn-outline-secondary" onclick="deseleccionarTodos()">NINGUNO</button>
            </div>
        </div>
        <div class="row">
    `;
    
    opciones.forEach(op => {
        const idSanitized = `chk_${op.replace(/[^a-zA-Z0-9]/g, '_')}`;
        html += `
            <div class="col-md-3 col-sm-6">
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" value="${op}" id="${idSanitized}" checked>
                    <label class="form-check-label text-muted" for="${idSanitized}">${op}</label>
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    container.innerHTML = html;
}

function seleccionarTodos() {
    document.querySelectorAll('#selectorContainer input[type="checkbox"]').forEach(chk => {
        chk.checked = true;
    });
    actualizarGrafico();
}

function deseleccionarTodos() {
    document.querySelectorAll('#selectorContainer input[type="checkbox"]').forEach(chk => {
        chk.checked = false;
    });
    actualizarGrafico();
}

async function actualizarGrafico() {
    const desde = document.getElementById('fechaDesde').value;
    const hasta = document.getElementById('fechaHasta').value;
    
    if (!desde || !hasta) {
        alert('❌ Debe seleccionar un rango de fechas');
        return;
    }
    
    const canvas = document.getElementById('graficoPrincipal');
    const sinDatosMsg = document.getElementById('sinDatosMsg');
    const infoPico = document.getElementById('infoPico');
    
    canvas.style.display = 'block';
    sinDatosMsg.style.display = 'none';
    infoPico.style.display = 'none';
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No hay sesión activa');
        }
        
        let url = '';
        let params = new URLSearchParams({ desde: desde, hasta: hasta });
        
        if (analisisActual === 'bmma') {
            // HORAS POR BMMA - original sin cambios
            const seleccionados = Array.from(document.querySelectorAll('#selectorContainer input[type="checkbox"]:checked'))
                .map(chk => chk.value);
            if (seleccionados.length === 0) {
                alert('❌ Debe seleccionar al menos un elemento');
                return;
            }
            url = '/api/tablero-horas-bmma';
            params.append('unidades', seleccionados.join(','));
            
        } else if (analisisActual === 'apoyada') {
            // UNIDAD APOYADA - con jerarquía
            const unidadSeleccionada = obtenerUnidadApoyadaSeleccionada();
            const tipoNivel = obtenerTipoNivel();
            
            if (!unidadSeleccionada) {
                url = '/api/tablero-horas-unidad-apoyada';
                params.append('unidades', 'TODAS');
            } else {
                url = '/api/tablero-horas-unidad-apoyada-jerarquia';
                params.append('unidad', unidadSeleccionada);
                params.append('tipoNivel', tipoNivel);
            }
            
        } else if (analisisActual === 'requerimiento') {
            // TIPO REQUERIMIENTO - original sin cambios
            const seleccionados = Array.from(document.querySelectorAll('#selectorContainer input[type="checkbox"]:checked'))
                .map(chk => chk.value);
            if (seleccionados.length === 0) {
                alert('❌ Debe seleccionar al menos un elemento');
                return;
            }
            url = '/api/tablero-horas-requerimiento';
            params.append('tipos', seleccionados.join(','));
        }
        
        const response = await fetch(`${url}?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (!result.success || !result.datasets || result.datasets.length === 0 || !result.fechas || result.fechas.length === 0) {
            canvas.style.display = 'none';
            sinDatosMsg.style.display = 'block';
            if (chartPrincipal) chartPrincipal.destroy();
            return;
        }
        
        canvas.style.display = 'block';
        
        // Calcular pico máximo global
        let maxGlobal = 0;
        result.datasets.forEach(ds => {
            const maxDs = Math.max(...ds.data);
            if (maxDs > maxGlobal) maxGlobal = maxDs;
        });
        
        if (maxGlobal > 0) {
            infoPico.style.display = 'block';
            document.getElementById('picoValor').innerText = maxGlobal.toFixed(1);
        }
        
        // Formatear fechas para el eje X
        const fechasFormateadas = result.fechas.map(f => {
            const fecha = new Date(f);
            return `${fecha.getDate()}/${fecha.getMonth() + 1}`;
        });
        
        const ctx = canvas.getContext('2d');
        if (chartPrincipal) chartPrincipal.destroy();
        
        chartPrincipal = new Chart(ctx, {
            type: 'line',
            data: {
                labels: fechasFormateadas,
                datasets: result.datasets.map(ds => ({
                    ...ds,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.3,
                    fill: false
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { 
                        labels: { color: '#fff' },
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ${ctx.raw.toFixed(1)} horas`
                        }
                    }
                },
                scales: {
                    y: { 
                        title: { display: true, text: 'Horas Voladas', color: '#fff' },
                        ticks: { color: '#fff', callback: (value) => value.toFixed(1) + ' h' },
                        grid: { color: '#333' },
                        beginAtZero: true
                    },
                    x: { 
                        title: { display: true, text: 'Fecha', color: '#fff' },
                        ticks: { color: '#fff', rotation: 45, maxRotation: 45, minRotation: 45 },
                        grid: { color: '#333' }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Error:', error);
        canvas.style.display = 'none';
        sinDatosMsg.style.display = 'block';
        sinDatosMsg.innerHTML = '<div class="alert alert-danger">❌ Error al cargar los datos</div>';
    }
}

// Funciones globales expuestas
window.cargarBrigadas = cargarBrigadas;
window.cargarBatallones = cargarBatallones;
window.renderTableroControl = renderTableroControl;
window.setFechaRapida = setFechaRapida;
window.cambiarAnalisis = cambiarAnalisis;
window.actualizarGrafico = actualizarGrafico;
window.seleccionarTodos = seleccionarTodos;
window.deseleccionarTodos = deseleccionarTodos;