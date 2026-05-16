// public/js/controlFlota.js

async function renderControlFlota() {
    const container = document.getElementById('contenido');
    if (!container) return;
    
    container.innerHTML = `
        <div class="d-flex flex-column align-items-center justify-content-center" style="min-height: 400px;">
            <div class="spinner-border text-warning mb-3" role="status" style="width: 3rem; height: 3rem;"></div>
            <h5 class="text-warning" style="letter-spacing: 2px;">ACTUALIZANDO DISPOSITIVO...</h5>
        </div>`;
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login.html';
            return;
        }
        
        const response = await fetch('/api/control-flota', {
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            }
        });
        
        if (response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login.html';
            return;
        }
        
        const result = await response.json();
        
        if (!result.success || !result.data || result.data.length === 0) {
            container.innerHTML = `
                <div class="text-center p-5">
                    <h4 class="text-muted">NO SE ENCONTRARON REGISTROS OPERACIONALES</h4>
                    <p class="text-secondary">Verifique que existan horas operacionales cargadas para el periodo actual.</p>
                </div>`;
            return;
        }
        
        let html = `
            <style>
                .sghv-grid { 
                    display: grid !important; 
                    grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)) !important; 
                    gap: 25px !important; 
                    padding: 10px !important;
                }
                .sghv-card { 
                    background: #151515 !important; 
                    border: 1px solid #333 !important; 
                    border-radius: 4px !important;
                    box-shadow: 0 10px 20px rgba(0,0,0,0.5) !important;
                    display: flex;
                    flex-direction: column;
                }
                .sghv-card-header { 
                    background: #1e1e1e !important; 
                    padding: 15px !important;
                    border-bottom: 2px solid #ffae00 !important;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .sghv-unit-title { color: #ffae00 !important; font-weight: 800 !important; margin: 0; font-size: 1.2rem; }
                .sghv-table { width: 100% !important; margin-bottom: 0 !important; }
                .sghv-table thead th { 
                    background: transparent !important;
                    color: #555 !important; 
                    font-size: 0.7rem !important; 
                    border-bottom: 1px solid #222 !important;
                    padding: 10px !important;
                    text-transform: uppercase;
                }
                .sghv-table td { 
                    padding: 12px 10px !important; 
                    border-bottom: 1px solid #222 !important;
                    vertical-align: middle !important;
                    background: transparent !important;
                }
                .sghv-mat { color: #ffae00 !important; font-weight: bold !important; font-family: monospace; font-size: 1rem; }
                .sghv-hours { color: #eee !important; font-size: 0.9rem; text-align: center; }
                .sghv-hd-col { color: #4caf50 !important; font-weight: 800 !important; text-align: right; font-size: 1rem; }
                .sghv-hd-bar { color: #4caf50 !important; margin-right: 10px; opacity: 0.5; }
                .sghv-footer { 
                    background: #0d0d0d !important; 
                    padding: 15px !important; 
                    border-top: 1px solid #333 !important;
                    margin-top: auto;
                }
                .sghv-footer-row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 0.85rem; }
                .sghv-footer-label { color: #888 !important; }
                .sghv-footer-val { color: #fff !important; font-weight: bold !important; }
                .sghv-total-hd { color: #4caf50 !important; font-size: 1.1rem !important; }
                .sghv-periodo { background: #333 !important; color: #aaa !important; padding: 4px 10px !important; border-radius: 4px !important; font-size: 0.75rem !important; }
            </style>

            <div class="d-flex justify-content-between align-items-center mb-4 px-2">
                <div>
                    <h2 class="text-white m-0 fw-bold" style="letter-spacing: -1px;">DISPOSITIVO <span class="text-warning">OPERACIONAL</span></h2>
                    <p class="text-muted small m-0">SISTEMA DE GESTIÓN DE HORAS DE VUELO - SGHV</p>
                </div>
                <div class="text-end">
                    <div class="sghv-periodo">${new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }).toUpperCase()}</div>
                </div>
            </div>

            <div class="sghv-grid">
        `;
        
        result.data.forEach(unidad => {
            let totalVoladas = 0;
            
            let rowsHtml = unidad.aeronaves.map(av => {
                totalVoladas += av.hv;
                return `
                    <tr>
                        <td class="sghv-mat">${av.matricula}</td>
                        <td class="sghv-hours">${av.hv.toFixed(1)} / ${av.hf.toFixed(1)}</td>
                        <td class="sghv-hd-col"><span class="sghv-hd-bar">|</span>${av.hd.toFixed(1)}</td>
                    </tr>
                `;
            }).join('');

            const horasOp = unidad.horas_operacionales || 0;
            const totalHD = Math.max(0, horasOp - totalVoladas);

            html += `
                <div class="sghv-card">
                    <div class="sghv-card-header">
                        <h5 class="sghv-unit-title">${unidad.unidad}</h5>
                        <small class="text-secondary">U.A.V.</small>
                    </div>
                    <div class="p-0">
                        <table class="table sghv-table">
                            <thead>
                                <tr>
                                    <th>Aeronave</th>
                                    <th class="text-center">HV / HF</th>
                                    <th class="text-end">HD</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                        </table>
                    </div>
                    <div class="sghv-footer">
                        <div class="sghv-footer-row">
                            <span class="sghv-footer-label">HORAS OPERACIONALES:</span>
                            <span class="sghv-footer-val">${horasOp.toFixed(1)}</span>
                        </div>
                        <div class="sghv-footer-row">
                            <span class="sghv-footer-label">TOTAL HORAS VOLADAS:</span>
                            <span class="sghv-footer-val">${totalVoladas.toFixed(1)}</span>
                        </div>
                        <div class="sghv-footer-row mt-2 pt-2" style="border-top: 1px dashed #222;">
                            <span class="sghv-footer-label">HORAS DISPONIBLES:</span>
                            <span class="sghv-footer-val sghv-total-hd">${totalHD.toFixed(1)}</span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error Crítico:', error);
        container.innerHTML = `
            <div class="alert alert-danger mx-2" style="background: #2c0b0b; color: #ff8e8e; border: 1px solid #5e1a1a;">
                <h5 class="alert-heading">⚠️ Error de Comunicación</h5>
                <p class="mb-0">No se pudo recuperar la información del servidor.</p>
            </div>`;
    }
}

window.renderControlFlota = renderControlFlota;