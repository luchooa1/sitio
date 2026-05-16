// public/js/controlFlota.js

async function renderControlFlota() {
    const container = document.getElementById('contenido');
    if (!container) return;
    
    // Mantenemos tu estado de carga original
    container.innerHTML = '<div class="loading"><div class="spinner"></div><h5 class="text-warning">Cargando flota...</h5></div>';
    
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
        
        const data = await response.json();
        
        if (!data.success || !data.data || data.data.length === 0) {
            container.innerHTML = '<div class="mensaje-vacio">No hay datos disponibles</div>';
            return;
        }
        
        // Estilos integrados para replicar la imagen image_3a51c0.jpg
        let html = `
            <style>
                .dashboard-grid { 
                    display: grid; 
                    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); 
                    gap: 20px; 
                    padding: 10px; 
                }
                .unit-card { 
                    background: #1a1a1a; 
                    border-radius: 8px; 
                    border: 1px solid #333; 
                    overflow: hidden; 
                }
                .unit-header { 
                    background: #222; 
                    padding: 12px 15px; 
                    color: #ffae00; 
                    font-weight: bold; 
                    font-size: 1.1rem;
                    border-bottom: 1px solid #333; 
                }
                .unit-body { padding: 15px; }
                .fleet-table { width: 100%; border-collapse: collapse; color: #ccc; }
                .fleet-table th { 
                    text-align: left; 
                    color: #666; 
                    font-size: 0.75rem; 
                    padding-bottom: 10px; 
                    text-transform: uppercase; 
                }
                .fleet-table td { padding: 10px 0; border-bottom: 1px solid #2a2a2a; font-size: 0.9rem; }
                .text-mat { color: #ffae00; font-weight: bold; }
                .text-hd { color: #4caf50; font-weight: bold; text-align: right; }
                .hd-separator { color: #4caf50; margin-right: 8px; font-weight: normal; }
                
                .summary-section { 
                    background: #111; 
                    padding: 15px; 
                    font-size: 0.85rem; 
                    border-top: 1px solid #333; 
                    color: #999;
                }
                .summary-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
                .summary-val { font-weight: bold; color: #fff; }
                .summary-total { color: #4caf50; font-size: 1rem; }
            </style>

            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2 class="text-warning m-0 fw-bold">CONTROL DE FLOTA</h2>
            </div>
            <div class="dashboard-grid">
        `;
        
        data.data.forEach(unidad => {
            let totalOperacionales = 0;
            let totalVoladas = 0;
            
            // Generar filas de la tabla manteniendo tu lógica de cálculo y redondeo
            let rowsHtml = unidad.aeronaves.map(av => {
                totalOperacionales += av.hf;
                totalVoladas += av.hv;
                const hd = Math.max(0, av.hf - av.hv);
                
                // Formateo exacto de tu código original
                const hvFormateado = Math.round(av.hv * 10) / 10;
                const hfFormateado = Math.round(av.hf * 10) / 10;
                const hdFormateado = Math.round(hd * 10) / 10;
                
                return `
                    <tr>
                        <td class="text-mat">${av.matricula}</td>
                        <td class="text-center">${hvFormateado.toFixed(1)} / ${hfFormateado.toFixed(1)}</td>
                        <td class="text-hd"><span class="hd-separator">|</span>${hdFormateado.toFixed(1)}</td>
                    </tr>
                `;
            }).join('');

            const totalHD = Math.max(0, totalOperacionales - totalVoladas);

            html += `
                <div class="unit-card shadow-sm">
                    <div class="unit-header">
                        <span style="font-size: 1.2rem;">🚁</span> ${unidad.unidad}
                    </div>
                    <div class="unit-body">
                        <table class="fleet-table">
                            <thead>
                                <tr>
                                    <th>AERONAVE</th>
                                    <th class="text-center">HV / HF</th>
                                    <th style="text-align: right;">HD</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                        </table>
                    </div>
                    <div class="summary-section">
                        <div class="summary-row">
                            <span>HORAS OPERACIONALES:</span>
                            <span class="summary-val">${totalOperacionales.toFixed(1)}</span>
                        </div>
                        <div class="summary-row">
                            <span>HORAS VOLADAS:</span>
                            <span class="summary-val">${totalVoladas.toFixed(1)}</span>
                        </div>
                        <div class="summary-row">
                            <span>HORAS DISPONIBLES:</span>
                            <span class="summary-val summary-total">${totalHD.toFixed(1)}</span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = '<div class="alert alert-danger">Error al cargar los datos</div>';
    }
}

window.renderControlFlota = renderControlFlota;