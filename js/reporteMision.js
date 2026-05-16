// ============================================================
// reporteMision.js - MÓDULO 3: REPORTE DE EXTRACCIÓN DE DATOS
// DISEÑO MEJORADO Y ESTILOS UNIFORMES
// ============================================================

let reporteData = [];
let reporteTipo = '';
let calendarioAbierto = null;
let mesActualCalendarioNum = new Date().getMonth();
let añoActualCalendario = new Date().getFullYear();

async function renderReporteMision() {
    const container = document.getElementById('contenido');
    if (!container) return;

    const unidades = ['BMMA1', 'BMMA2', 'BMMA3', 'BMMA4', 'BMMA5', 'BMMA6', 'BMMA7', 'BMMA8', 'BAOEA', 'BANOT'];
    
    const hoy = new Date();
    const hace30Dias = new Date();
    hace30Dias.setDate(hoy.getDate() - 30);
    
    const fechaDesdeStr = formatFechaDDMMYYYY(hace30Dias);
    const fechaHoyStr = formatFechaDDMMYYYY(hoy);
    
    container.innerHTML = `
        <style>
            /* --- Estilos de Formulario y UI --- */
            .custom-card {
                border: 1px solid #343a40;
                border-top: 3px solid #f39c12;
                box-shadow: 0 6px 12px rgba(0,0,0,0.3);
            }
            .form-section-title {
                font-size: 0.9rem;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: #f39c12;
                margin-bottom: 15px;
                border-bottom: 1px solid #333;
                padding-bottom: 5px;
            }
            .form-control, .form-select {
                background-color: #0f0f0f !important;
                border: 1px solid #444 !important;
                color: #e0e0e0 !important;
                padding: 10px 12px;
            }
            .form-control:focus, .form-select:focus {
                border-color: #f39c12 !important;
                box-shadow: 0 0 0 0.25rem rgba(243, 156, 18, 0.25);
            }
            .btn-action {
                transition: all 0.3s ease;
                padding: 10px 25px;
                text-transform: uppercase;
                font-size: 0.85rem;
                letter-spacing: 1px;
            }
            .btn-action:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.4);
            }

            /* --- Estilos del Calendario --- */
            .calendario-popup {
                position: absolute;
                background: #1a1a1a;
                border: 1px solid #f39c12;
                border-radius: 8px;
                padding: 12px;
                z-index: 1050;
                box-shadow: 0 10px 25px rgba(0,0,0,0.6);
                min-width: 280px;
            }
            .calendario-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            .calendario-dia {
                padding: 8px 5px;
                cursor: pointer;
                border-radius: 4px;
                font-size: 13px;
                color: #ccc;
            }
            .calendario-dia:hover {
                background: #f39c12;
                color: #000;
                font-weight: bold;
            }
            .calendario-dias-semana div { color: #f39c12; font-weight: bold; }
            
            .fecha-input-group {
                display: flex;
                align-items: center;
                background: #0f0f0f;
                border: 1px solid #444;
                border-radius: 5px;
                padding-right: 10px;
            }
            .fecha-input-group input {
                border: none !important;
                background: transparent !important;
            }
            .btn-cal-icon {
                background: none;
                border: none;
                color: #f39c12;
                font-size: 1.2rem;
            }
        </style>
        
        <div class="mb-4">
            <h3 class="text-warning fw-bold"><i class="bi bi- database-fill-down me-2"></i>EXTRACCIÓN Y REPORTES OPERACIONALES</h3>
            <p class="text-muted small">Generación de archivos consolidados y análisis de horas de vuelo.</p>
        </div>
        
        <div class="card bg-dark custom-card mb-4">
            <div class="card-body p-4">
                <div class="row g-4">
                    <div class="col-md-4">
                        <div class="form-section-title"><i class="bi bi-calendar3 me-2"></i>Rango Temporal</div>
                        
                        <label class="small text-muted mb-1">Fecha Inicial (Desde)</label>
                        <div class="fecha-input-group mb-3">
                            <input type="text" id="fechaDesde" class="form-control" value="${fechaDesdeStr}" readonly>
                            <button class="btn-cal-icon" onclick="mostrarCalendario('desde')">📅</button>
                        </div>

                        <label class="small text-muted mb-1">Fecha Final (Hasta)</label>
                        <div class="fecha-input-group mb-3">
                            <input type="text" id="fechaHasta" class="form-control" value="${fechaHoyStr}" readonly>
                            <button class="btn-cal-icon" onclick="mostrarCalendario('hasta')">📅</button>
                        </div>

                        <div class="btn-group w-100 mt-1">
                            <button class="btn btn-outline-secondary btn-sm" onclick="setFechaRapida(0)">Hoy</button>
                            <button class="btn btn-outline-secondary btn-sm" onclick="setFechaRapida(7)">7D</button>
                            <button class="btn btn-outline-secondary btn-sm" onclick="setFechaRapida(30)">30D</button>
                        </div>
                    </div>
                    
                    <div class="col-md-4">
                        <div class="form-section-title"><i class="bi bi-filter-square me-2"></i>Configuración del Reporte</div>
                        
                        <div class="mb-3">
                            <label class="small text-muted mb-1">Nivel de Detalle / Agrupación</label>
                            <select id="tipoReporte" class="form-select">
                                <option value="detalle">📋 Detalle Individual (Todos los campos)</option>
                                <option value="unidad">🏢 Consolidado por Unidad</option>
                                <option value="aeronave">✈️ Consolidado por Matrícula</option>
                                <option value="mision">🎯 Consolidado por Misión</option>
                                <option value="resumen">📊 Resumen Estadístico</option>
                            </select>
                        </div>
                        
                        <div class="mb-3">
                            <label class="small text-muted mb-1">Filtrar por Unidad Específica</label>
                            <select id="unidadReporte" class="form-select">
                                <option value="TODAS">-- TODAS LAS UNIDADES --</option>
                                ${unidades.map(u => `<option value="${u}">${u}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    
                    <div class="col-md-4 d-flex flex-column justify-content-end">
                        <div class="form-section-title"><i class="bi bi-lightning-fill me-2"></i>Ejecución</div>
                        <button class="btn btn-warning fw-bold btn-action mb-3" onclick="consultarReporte()">
                            <i class="bi bi-search me-2"></i>Generar Vista Previa
                        </button>
                        <button class="btn btn-success fw-bold btn-action" onclick="exportarXLSX()" id="btnExportar" style="display:none;">
                            <i class="bi bi-file-earmark-excel me-2"></i>Descargar Excel (.xlsx)
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <div id="reporteResultado" class="card bg-dark border-secondary">
            <div class="card-header bg-dark border-secondary d-flex justify-content-between align-items-center">
                <span class="text-secondary fw-bold small"><i class="bi bi-table me-2"></i>PANEL DE RESULTADOS</span>
                <span id="contadorRegistros" class="badge bg-secondary">0 registros</span>
            </div>
            <div class="card-body p-0">
                <div class="text-center p-5 text-muted">
                    <h5>Defina los filtros para visualizar los datos</h5>
                </div>
            </div>
        </div>
    `;
}

// --- Lógica de Negocio y Renderizado ---

function renderResultado(data, tipo) {
    const resultDiv = document.getElementById('reporteResultado');
    document.getElementById('contadorRegistros').innerText = `${data.length} registros encontrados`;

    let html = '<div class="table-responsive table-scroll"><table class="table table-dark table-hover table-sm mb-0">';
    html += '<thead class="table-active"><tr>';
    
    if (tipo === 'detalle') {
        const headers = ['ID', 'FECHA', 'UNIDAD', 'OPERADOR', 'MATRÍCULA', 'MODELO', 'MISIÓN', 'RUTA', 'HRS MÁQ', 'HRS TRIP', 'CARGA', 'GAL', 'PAX', 'ESTADO'];
        html += headers.map(h => `<th class="py-2 small">${h}</th>`).join('');
        html += '</tr></thead><tbody>';
        
        data.forEach(row => {
            html += `
                <tr class="align-middle" style="font-size: 0.85rem;">
                    <td class="text-muted">${row.id_reporte || ''}</td>
                    <td>${row.fecha_vuelo || ''}</td>
                    <td>${row.unidad_nombre || ''}</td>
                    <td>${row.operador_nombre || ''}</td>
                    <td>${row.matricula || ''}</td> <td>${row.modelo || ''}</td>
                    <td><span class="badge bg-outline-secondary">${row.mision_nombre || ''}</span></td>
                    <td class="small">${row.ruta || ''}</td>
                    <td class="text-center fw-bold">${(row.tiempo_maquina || 0).toFixed(1)}</td>
                    <td class="text-center">${(row.horas_tripulacion || 0).toFixed(1)}</td>
                    <td class="text-center">${(row.carga_kg || 0).toFixed(0)}</td>
                    <td class="text-center">${(row.combustible_galones || 0).toFixed(0)}</td>
                    <td class="text-center">${row.pax || 0}</td>
                    <td class="small">${row.estado_mision_nombre || ''}</td>
                </tr>`;
        });
        
        let totalH = data.reduce((sum, r) => sum + (parseFloat(r.tiempo_maquina) || 0), 0);
        html += `<tr class="table-active"><td colspan="8" class="text-end fw-bold text-warning">TOTAL HORAS PERÍODO:</td><td class="text-center fw-bold text-warning">${totalH.toFixed(1)}</td><td colspan="5"></td></tr>`;
        
    } else if (tipo === 'unidad' || tipo === 'mision') {
        const label = tipo === 'unidad' ? 'UNIDAD' : 'MISIÓN';
        html += `<th>${label}</th><th class="text-center">TOTAL HORAS</th><th class="text-center">% PARTICIPACIÓN</th></tr></thead><tbody>`;
        let totalGeneral = data.reduce((sum, r) => sum + (parseFloat(r.total_horas) || 0), 0);
        data.forEach(row => {
            let porc = totalGeneral > 0 ? ((row.total_horas / totalGeneral) * 100).toFixed(1) : 0;
            html += `<tr><td class="fw-bold">${row.unidad || row.mision}</td><td class="text-center fw-bold text-info">${(row.total_horas || 0).toFixed(1)}</td><td class="text-center text-muted">${porc}%</td></tr>`;
        });
    } else if (tipo === 'aeronave') {
        html += `<th>MATRÍCULA</th><th>MODELO</th><th>UNIDAD</th><th class="text-center">HORAS</th></tr></thead><tbody>`;
        data.forEach(row => {
            html += `<tr><td>${row.matricula}</td><td>${row.modelo || '-'}</td><td>${row.unidad || '-'}</td><td class="text-center fw-bold text-info">${(row.total_horas || 0).toFixed(1)}</td></tr>`;
        });
    } else if (tipo === 'resumen') {
        const r = data[0] || {};
        html += `</thead><tbody>
            <tr class="table-active"><th colspan="2" class="text-center text-warning py-3">MÉTRICAS CONSOLIDADAS</th></tr>
            <tr><td class="p-3">🚁 Vuelos Realizados</td><td class="p-3 fw-bold">${r.total_vuelos || 0}</td></tr>
            <tr><td class="p-3">⏱️ Horas Máquina</td><td class="p-3 fw-bold text-info">${(r.total_horas || 0).toFixed(1)}</td></tr>
            <tr><td class="p-3">⛽ Consumo Combustible (Gal)</td><td class="p-3 fw-bold">${(r.total_combustible || 0).toFixed(0)}</td></tr>
            <tr><td class="p-3">👥 Personal Transportado (PAX)</td><td class="p-3 fw-bold">${r.total_pax || 0}</td></tr>
            <tr><td class="p-3">📦 Carga Movilizada (Kg)</td><td class="p-3 fw-bold">${(r.total_carga || 0).toFixed(0)}</td></tr>
        `;
    }

    html += '</tbody></table></div>';
    resultDiv.querySelector('.card-body').innerHTML = html;
}

// --- Funciones de Utilidad (Fechas, Calendario, Export) ---

function formatFechaDDMMYYYY(fecha) {
    const d = String(fecha.getDate()).padStart(2, '0');
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const a = fecha.getFullYear();
    return `${d}/${m}/${a}`;
}

function convertirFechaParaAPI(fechaStr) {
    const p = fechaStr.split('/');
    return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : null;
}

function mostrarCalendario(tipo) {
    if (calendarioAbierto) {
        const ex = document.getElementById('calendarioPopup');
        if (ex) ex.remove();
    }
    calendarioAbierto = tipo;
    const input = document.getElementById(tipo === 'desde' ? 'fechaDesde' : 'fechaHasta');
    const rect = input.getBoundingClientRect();
    
    const popup = document.createElement('div');
    popup.id = 'calendarioPopup';
    popup.className = 'calendario-popup';
    popup.style.top = `${rect.bottom + window.scrollY + 5}px`;
    popup.style.left = `${rect.left + window.scrollX}px`;
    
    renderizarCalendario(popup, tipo);
    document.body.appendChild(popup);
    
    setTimeout(() => {
        const closeHandler = (e) => {
            if (!popup.contains(e.target) && !e.target.closest('.btn-cal-icon')) {
                popup.remove();
                document.removeEventListener('click', closeHandler);
                calendarioAbierto = null;
            }
        };
        document.addEventListener('click', closeHandler);
    }, 100);
}

function renderizarCalendario(container, tipo) {
    const d1 = new Date(añoActualCalendario, mesActualCalendarioNum, 1);
    const dLast = new Date(añoActualCalendario, mesActualCalendarioNum + 1, 0);
    const startDay = d1.getDay();
    const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    
    let h = `<div class="calendario-header"><button class="btn btn-sm btn-dark text-warning" onclick="cambiarMes(-1,'${tipo}')">◀</button>
             <span class="fw-bold">${meses[mesActualCalendarioNum]} ${añoActualCalendario}</span>
             <button class="btn btn-sm btn-dark text-warning" onclick="cambiarMes(1,'${tipo}')">▶</button></div>
             <div class="calendario-dias-semana d-grid" style="grid-template-columns: repeat(7, 1fr); text-align:center; font-size:10px;">
             <div>DO</div><div>LU</div><div>MA</div><div>MI</div><div>JU</div><div>VI</div><div>SA</div></div>
             <div class="calendario-dias d-grid" style="grid-template-columns: repeat(7, 1fr); text-align:center;">`;
    
    for(let i=0; i<startDay; i++) h += `<div></div>`;
    for(let d=1; d<=dLast.getDate(); d++) {
        h += `<div class="calendario-dia" onclick="seleccionarFecha('${tipo}',${d},${mesActualCalendarioNum},${añoActualCalendario})">${d}</div>`;
    }
    container.innerHTML = h + `</div>`;
}

function cambiarMes(delta, tipo) {
    mesActualCalendarioNum += delta;
    if (mesActualCalendarioNum > 11) { mesActualCalendarioNum = 0; añoActualCalendario++; }
    if (mesActualCalendarioNum < 0) { mesActualCalendarioNum = 11; añoActualCalendario--; }
    renderizarCalendario(document.getElementById('calendarioPopup'), tipo);
}

function seleccionarFecha(tipo, d, m, a) {
    document.getElementById(tipo === 'desde' ? 'fechaDesde' : 'fechaHasta').value = `${String(d).padStart(2,'0')}/${String(m+1).padStart(2,'0')}/${a}`;
    document.getElementById('calendarioPopup').remove();
    calendarioAbierto = null;
}

function setFechaRapida(dias) {
    const h = new Date();
    document.getElementById('fechaHasta').value = formatFechaDDMMYYYY(h);
    if (dias > 0) h.setDate(h.getDate() - dias);
    document.getElementById('fechaDesde').value = formatFechaDDMMYYYY(h);
}

async function consultarReporte() {
    const fD = document.getElementById('fechaDesde').value;
    const fH = document.getElementById('fechaHasta').value;
    const tR = document.getElementById('tipoReporte').value;
    const uR = document.getElementById('unidadReporte').value;
    
    const resDiv = document.getElementById('reporteResultado').querySelector('.card-body');
    resDiv.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-warning"></div><p class="mt-2 text-muted">Procesando base de datos...</p></div>';
    
    try {
        const token = localStorage.getItem('token');
        const query = new URLSearchParams({ desde: convertirFechaParaAPI(fD), hasta: convertirFechaParaAPI(fH), tipo: tR, unidad: uR });
        const resp = await fetch(`/api/reporte-mision?${query}`, { headers: { 'Authorization': `Bearer ${token}` } });
        const json = await resp.json();
        
        reporteData = json.data || [];
        reporteTipo = tR;
        
        if (reporteData.length === 0) {
            resDiv.innerHTML = '<div class="text-center p-5 text-warning">No se encontraron registros para los criterios seleccionados.</div>';
            document.getElementById('btnExportar').style.display = 'none';
        } else {
            renderResultado(reporteData, tR);
            document.getElementById('btnExportar').style.display = 'inline-block';
        }
    } catch (e) {
        resDiv.innerHTML = '<div class="text-center p-5 text-danger">Error de conexión con el servidor.</div>';
    }
}

function exportarXLSX() {
    // Lógica de exportación similar a la anterior pero adaptada a reporteData
    const ws = XLSX.utils.json_to_sheet(reporteData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    XLSX.writeFile(wb, `Reporte_Extraccion_${new Date().getTime()}.xlsx`);
}

// Globales
window.renderReporteMision = renderReporteMision;
window.consultarReporte = consultarReporte;
window.exportarXLSX = exportarXLSX;
window.mostrarCalendario = mostrarCalendario;
window.seleccionarFecha = seleccionarFecha;
window.cambiarMes = cambiarMes;
window.setFechaRapida = setFechaRapida;