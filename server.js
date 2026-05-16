// =====================================================
// SGHV - SERVER NODE.JS COMPLETO (CORREGIDO)
// =====================================================

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// =====================================================
// CONFIGURACIÓN DE SEGURIDAD
// =====================================================
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https:"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            scriptSrcAttr: ["'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'", "https:", "data:"],
        }
    },
    crossOriginEmbedderPolicy: false
}));

const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
    origin: function(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Origen no permitido por CORS'));
        }
    },
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// =====================================================
// CONFIGURACIÓN JWT
// =====================================================
const JWT_SECRET = process.env.JWT_SECRET || 'clave_por_defecto_cambiar_en_produccion_2024_sghv';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

// =====================================================
// RATE LIMITING
// =====================================================
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { success: false, message: 'Demasiados intentos de login. Intente más tarde.' }
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    skipSuccessfulRequests: true
});

// =====================================================
// BASE DE DATOS
// =====================================================
const db = new sqlite3.Database('./Control_Aviacion.db', (err) => {
    if (err) {
        console.error('Error al conectar con la base de datos:', err.message);
        process.exit(1);
    } else {
        console.log('SGHV SERVER ACTIVO - Conexión exitosa');
        inicializarTablas();
    }
});

function inicializarTablas() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS cat_unidades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT UNIQUE NOT NULL
        )`);

        const unidades = ['BMMA1','BMMA2','BMMA3','BMMA4','BMMA5','BMMA6','BMMA7','BMMA8','BAOEA','BANOT'];
        unidades.forEach(u => {
            db.run(`INSERT OR IGNORE INTO cat_unidades (nombre) VALUES (?)`, [u]);
        });

        db.run(`CREATE TABLE IF NOT EXISTS roles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT UNIQUE NOT NULL
        )`);

        db.run(`INSERT OR IGNORE INTO roles (id, nombre) VALUES (1, 'ADMIN'), (2, 'COMANDO'), (3, 'BRIAV33'), (4, 'OPERADOR')`);

        db.run(`CREATE TABLE IF NOT EXISTS usuarios (
            id_usuario TEXT PRIMARY KEY,
            password_hash TEXT NOT NULL,
            rol_id INTEGER NOT NULL,
            unidad_id INTEGER,
            activo INTEGER DEFAULT 1,
            intentos_fallidos INTEGER DEFAULT 0,
            bloqueado_hasta DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (rol_id) REFERENCES roles(id),
            FOREIGN KEY (unidad_id) REFERENCES cat_unidades(id)
        )`);

        db.run(`INSERT OR IGNORE INTO usuarios (id_usuario, password_hash, rol_id, activo)
                VALUES ('admin', '$2b$12$hF3lG/bwlaBSci7OTNC83ueJwp.54PckuNq6kCmaNFPAwYjzOGmWm', 1, 1)`);

        db.run(`INSERT OR IGNORE INTO usuarios (id_usuario, password_hash, rol_id, activo)
                VALUES ('COTBMMA01', '$2b$12$hF3lG/bwlaBSci7OTNC83ueJwp.54PckuNq6kCmaNFPAwYjzOGmWm', 4, 1)`);

        db.run(`CREATE TABLE IF NOT EXISTS aeronaves (
            matricula TEXT PRIMARY KEY,
            modelo TEXT NOT NULL,
            unidad_asignada TEXT,
            estado TEXT DEFAULT 'ACL',
            clase TEXT,
            horas_asignadas_hangar REAL DEFAULT 0,
            horas_restantes REAL DEFAULT 0,
            horas_totales_historico REAL DEFAULT 0
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS misiones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT UNIQUE NOT NULL
        )`);

        db.run(`INSERT OR IGNORE INTO misiones (nombre) VALUES 
            ('MOVIMIENTO AEREO'), ('ASALTO AEREO'), ('COMANDO Y CONTROL'), 
            ('ATAQUE'), ('RECONOCIMIENTO'), ('SEGURIDAD'), ('CASEVAC'), 
            ('APOYO HUMANITARIO'), ('ENTRENAMIENTO'), ('MANTENIMIENTO')`);

        db.run(`CREATE TABLE IF NOT EXISTS cat_estado_mision (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT UNIQUE NOT NULL
        )`);
        db.run(`INSERT OR IGNORE INTO cat_estado_mision (nombre) VALUES ('CUMPLIO'), ('NO CUMPLIO')`);

        db.run(`CREATE TABLE IF NOT EXISTS cat_convenios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT UNIQUE NOT NULL
        )`);
        db.run(`INSERT OR IGNORE INTO cat_convenios (nombre) VALUES ('SI'), ('NO'), ('N/A')`);

        db.run(`CREATE TABLE IF NOT EXISTS cat_condicion_vuelo (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT UNIQUE NOT NULL
        )`);
        db.run(`INSERT OR IGNORE INTO cat_condicion_vuelo (nombre) VALUES ('DIURNO'), ('NOCTURNO'), ('INSTRUMENTOS'), ('COMBATE')`);

        db.run(`CREATE TABLE IF NOT EXISTS cat_complementos_tarea (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT UNIQUE NOT NULL
        )`);
        db.run(`INSERT OR IGNORE INTO cat_complementos_tarea (nombre) VALUES 
            ('OCI - Operaciones de Carga Interna'),
            ('C2 - Comando y Control'),
            ('RA - Reconocimiento de Área'),
            ('RZ - Reconocimiento de Zona'),
            ('P - Patrullaje')`);

        db.run(`CREATE TABLE IF NOT EXISTS cat_unidades_apoyadas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT UNIQUE NOT NULL
        )`);
        db.run(`INSERT OR IGNORE INTO cat_unidades_apoyadas (id, nombre) VALUES 
            (1, 'DIV01'), (2, 'DIV02'), (3, 'DIV03'), (4, 'DIV04'),
            (5, 'DIV05'), (6, 'DIV06'), (7, 'DIV07'), (8, 'DIV08'),
            (9, 'DIVFE'), (10, 'CONAT'), (11, 'FUTCO'), (12, 'OTRAS FUERZAS')`);

        db.run(`CREATE TABLE IF NOT EXISTS cat_departamentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT UNIQUE NOT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS cat_municipios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            departamento_id INTEGER NOT NULL,
            FOREIGN KEY (departamento_id) REFERENCES cat_departamentos(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS bolsas_horas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            unidad_id INTEGER NOT NULL,
            tipo_aeronave TEXT NOT NULL,
            techo_horas REAL NOT NULL DEFAULT 0,
            horas_consumidas REAL NOT NULL DEFAULT 0,
            periodo TEXT NOT NULL,
            FOREIGN KEY (unidad_id) REFERENCES cat_unidades(id),
            UNIQUE(unidad_id, tipo_aeronave, periodo)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS reporte_diario (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_reporte TEXT UNIQUE,
            operador_nombre TEXT NOT NULL,
            operador_grado TEXT NOT NULL,
            fecha DATE NOT NULL,
            unidad_id TEXT NOT NULL,
            programado TEXT NOT NULL,
            rentado TEXT NOT NULL,
            matricula TEXT NOT NULL,
            modelo TEXT NOT NULL,
            tipo_aeronave TEXT,
            mision_id INTEGER NOT NULL,
            complemento_tarea_id INTEGER NOT NULL,
            condicion_vuelo_id INTEGER NOT NULL,
            unidad_apoyada_id INTEGER NOT NULL,
            convenio_id INTEGER NOT NULL,
            ruta TEXT,
            tiempo_maquina REAL NOT NULL,
            pax INTEGER DEFAULT 0,
            carga_lb REAL DEFAULT 0,
            departamento_id INTEGER NOT NULL,
            municipio_id INTEGER NOT NULL,
            estado_mision_id INTEGER NOT NULL,
            observaciones TEXT,
            bolsa_horas_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            numero_orden_vuelo INTEGER,
            tipo_requerimiento TEXT,
            fecha_hora_reporte DATETIME,
            brigada TEXT,
            batallon TEXT,
            operador_id INTEGER,
            horas_tripulacion REAL DEFAULT 0,
            combustible_galones REAL DEFAULT 0,
            carga_kg REAL DEFAULT 0,
            fecha_vuelo DATETIME
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS personal_operadores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            unidad TEXT NOT NULL,
            nombre_completo TEXT NOT NULL,
            grado TEXT NOT NULL,
            activo INTEGER DEFAULT 1
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS cat_brigadas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            division_id INTEGER NOT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS cat_batallones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            brigada_id INTEGER NOT NULL
        )`);

        db.run(`INSERT OR IGNORE INTO personal_operadores (unidad, nombre_completo, grado) VALUES
            ('BMMA1', 'LUIS CONTRERAS', 'CAPITAN'),
            ('BMMA1', 'CARLOS PEREZ', 'TENIENTE'),
            ('BMMA1', 'ANDRES GOMEZ', 'SUBTENIENTE'),
            ('BMMA2', 'JUAN MARTINEZ', 'CAPITAN'),
            ('BMMA2', 'JOSE LOPEZ', 'TENIENTE'),
            ('BMMA2', 'RICARDO SANCHEZ', 'SUBTENIENTE')`);

        console.log('✅ Base de datos inicializada');
    });
}

// =====================================================
// MIDDLEWARES
// =====================================================
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token requerido' });
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ success: false, message: 'Token inválido o expirado' });
        req.user = decoded;
        next();
    });
}

function authorize(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ success: false, message: 'No autenticado' });
        if (!allowedRoles.includes(req.user.rol)) {
            return res.status(403).json({ success: false, message: 'Permisos insuficientes' });
        }
        next();
    };
}

// =====================================================
// RUTAS PÚBLICAS
// =====================================================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/index.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/health', (req, res) => res.json({ success: true, timestamp: new Date().toISOString() }));

// =====================================================
// LOGIN
// =====================================================
app.post('/login', loginLimiter, async (req, res) => {
    const { id_usuario, password } = req.body;
    if (!id_usuario || !password) {
        return res.status(400).json({ success: false, message: 'Faltan credenciales' });
    }

    db.get(`SELECT u.id_usuario, u.password_hash, r.nombre as rol, u.unidad_id, u.activo
            FROM usuarios u
            JOIN roles r ON u.rol_id = r.id
            WHERE u.id_usuario = ?`, [id_usuario], async (err, row) => {
        if (err) return res.status(500).json({ success: false, message: 'Error interno' });
        if (!row || row.activo !== 1) {
            return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
        }
        const isValid = await bcrypt.compare(password, row.password_hash);
        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
        }
        const token = jwt.sign({ id_usuario: row.id_usuario, rol: row.rol, unidad_id: row.unidad_id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        res.json({ success: true, token, user: { id_usuario: row.id_usuario, rol: row.rol, unidad_id: row.unidad_id } });
    });
});

// =====================================================
// RUTAS PROTEGIDAS
// =====================================================
app.use('/api', apiLimiter);

// GET /aeronaves
app.get('/aeronaves', authenticateToken, (req, res) => {
    db.all(`SELECT matricula, modelo, unidad_asignada, estado, clase, horas_asignadas_hangar, horas_restantes, horas_totales_historico
            FROM aeronaves ORDER BY matricula`, [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json(rows || []);
    });
});

// GET /unidades
app.get('/unidades', authenticateToken, (req, res) => {
    db.all(`SELECT nombre FROM cat_unidades ORDER BY nombre`, [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json(rows || []);
    });
});

// GET /misiones
app.get('/misiones', authenticateToken, (req, res) => {
    db.all(`SELECT nombre FROM misiones ORDER BY nombre`, [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json(rows || []);
    });
});

// =====================================================
// ENDPOINTS ADICIONALES PARA REPORTE DIARIO
// =====================================================
app.get('/api/complementos-tarea', authenticateToken, (req, res) => {
    db.all(`SELECT id, nombre FROM cat_complementos_tarea ORDER BY nombre`, [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json(rows || []);
    });
});

app.get('/api/condiciones-vuelo', authenticateToken, (req, res) => {
    db.all(`SELECT id, nombre FROM cat_condicion_vuelo ORDER BY nombre`, [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json(rows || []);
    });
});

app.get('/api/convenios', authenticateToken, (req, res) => {
    db.all(`SELECT id, nombre FROM cat_convenios ORDER BY nombre`, [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json(rows || []);
    });
});

// =====================================================
// MÓDULO 2: ASIGNACIÓN DE HORAS OPERACIONALES
// =====================================================
app.get('/api/horas-operacionales', authenticateToken, (req, res) => {
    const periodo = req.query.periodo;
    
    if (!periodo) {
        const query = `
            SELECT 
                u.nombre as unidad,
                bh.tipo_aeronave,
                bh.techo_horas,
                bh.periodo
            FROM bolsas_horas bh
            JOIN cat_unidades u ON bh.unidad_id = u.id
            ORDER BY bh.periodo DESC, u.nombre
        `;
        db.all(query, [], (err, rows) => {
            if (err) {
                console.error('Error en GET /api/horas-operacionales (todos):', err);
                return res.status(500).json({ success: false, message: err.message });
            }
            res.json(rows || []);
        });
        return;
    }
    
    const query = `
        SELECT 
            u.nombre as unidad,
            bh.tipo_aeronave,
            bh.techo_horas
        FROM bolsas_horas bh
        JOIN cat_unidades u ON bh.unidad_id = u.id
        WHERE bh.periodo = ?
        ORDER BY u.nombre, bh.tipo_aeronave
    `;
    db.all(query, [periodo], (err, rows) => {
        if (err) {
            console.error('Error en GET /api/horas-operacionales (periodo):', err);
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json(rows || []);
    });
});

app.post('/api/horas-operacionales', authenticateToken, authorize('ADMIN', 'COMANDO', 'BRIAV33'), (req, res) => {
    const { asignaciones, periodo } = req.body;
    if (!asignaciones || !Array.isArray(asignaciones) || !periodo) {
        return res.status(400).json({ success: false, message: 'Datos inválidos' });
    }

    const nombresUnidades = [...new Set(asignaciones.map(a => a.unidad))];
    const placeholders = nombresUnidades.map(() => '?').join(',');
    const unidadQuery = `SELECT id, nombre FROM cat_unidades WHERE nombre IN (${placeholders})`;
    
    db.all(unidadQuery, nombresUnidades, (err, unidades) => {
        if (err) {
            console.error('Error obteniendo unidades:', err);
            return res.status(500).json({ success: false, message: err.message });
        }

        const unidadMap = {};
        unidades.forEach(u => { unidadMap[u.nombre] = u.id; });

        for (const asign of asignaciones) {
            if (!unidadMap[asign.unidad]) {
                return res.status(400).json({ success: false, message: `Unidad ${asign.unidad} no encontrada` });
            }
        }

        const stmt = db.prepare(`
            INSERT OR REPLACE INTO bolsas_horas (unidad_id, tipo_aeronave, techo_horas, periodo, horas_consumidas)
            VALUES (?, ?, ?, ?, COALESCE((SELECT horas_consumidas FROM bolsas_horas WHERE unidad_id = ? AND tipo_aeronave = ? AND periodo = ?), 0))
        `);
        let errores = [];

        asignaciones.forEach(asign => {
            const unidadId = unidadMap[asign.unidad];
            const tipo = asign.tipo_aeronave;
            const techo = asign.techo_horas;
            stmt.run(unidadId, tipo, techo, periodo, unidadId, tipo, periodo, (err) => {
                if (err) errores.push(err.message);
            });
        });

        stmt.finalize((err) => {
            if (err) {
                console.error('Error finalizando statement:', err);
                return res.status(500).json({ success: false, message: err.message });
            }
            if (errores.length > 0) {
                return res.status(500).json({ success: false, message: errores.join(', ') });
            }
            res.json({ success: true, message: 'Asignaciones guardadas correctamente' });
        });
    });
});

// =====================================================
// POST /actualizar-estado
// =====================================================
app.post('/actualizar-estado', authenticateToken, authorize('ADMIN', 'COMANDO', 'BRIAV33'), (req, res) => {
    const { matricula, estado, horas_asignadas_hangar, horas_totales_historico, unidad_asignada } = req.body;
    
    if (!matricula) {
        return res.status(400).json({ success: false, message: 'Matrícula requerida' });
    }

    let sql = 'UPDATE aeronaves SET ';
    const params = [];
    
    if (estado && ['ACL', 'AMP', 'AMI'].includes(estado)) {
        sql += 'estado = ?, ';
        params.push(estado);
    }
    
    if (horas_asignadas_hangar !== undefined && horas_asignadas_hangar !== null) {
        sql += 'horas_asignadas_hangar = ?, horas_restantes = ?, ';
        params.push(horas_asignadas_hangar, horas_asignadas_hangar);
    }
    
    if (horas_totales_historico !== undefined && horas_totales_historico !== null) {
        sql += 'horas_totales_historico = ?, ';
        params.push(horas_totales_historico);
    }
    
    if (unidad_asignada !== undefined && unidad_asignada !== null && unidad_asignada !== '') {
        sql += 'unidad_asignada = ?, ';
        params.push(unidad_asignada);
    }
    
    if (params.length === 0) {
        return res.status(400).json({ success: false, message: 'No hay campos para actualizar' });
    }
    
    sql = sql.slice(0, -2);
    sql += ' WHERE matricula = ?';
    params.push(matricula);
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('Error al actualizar aeronave:', err);
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, changes: this.changes });
    });
});

app.post('/reasignar-naves-lote', authenticateToken, authorize('ADMIN', 'COMANDO', 'BRIAV33'), (req, res) => {
    const { unidad, matriculas } = req.body;
    if (!unidad || !Array.isArray(matriculas) || matriculas.length === 0) {
        return res.status(400).json({ success: false, message: 'Datos inválidos' });
    }
    const placeholders = matriculas.map(() => '?').join(',');
    const sql = `UPDATE aeronaves SET unidad_asignada = ? WHERE matricula IN (${placeholders})`;
    db.run(sql, [unidad, ...matriculas], function(err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, changes: this.changes });
    });
});

// =====================================================
// ENDPOINTS PARA REPORTE DIARIO (COT)
// =====================================================
app.get('/api/personal-operadores', authenticateToken, (req, res) => {
    db.all(`SELECT id, unidad, nombre_completo, grado, activo FROM personal_operadores ORDER BY unidad, nombre_completo`, [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json(rows || []);
    });
});

app.get('/api/brigadas/:division', authenticateToken, (req, res) => {
    const { division } = req.params;
    db.all(`SELECT id, nombre FROM cat_brigadas WHERE division_id = (SELECT id FROM cat_unidades_apoyadas WHERE nombre = ?) ORDER BY nombre`, [division], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json(rows || []);
    });
});

app.get('/api/batallones/:brigada', authenticateToken, (req, res) => {
    const { brigada } = req.params;
    db.all(`SELECT id, nombre FROM cat_batallones WHERE brigada_id = ? ORDER BY nombre`, [brigada], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json(rows || []);
    });
});

app.get('/api/municipios/:departamento', authenticateToken, (req, res) => {
    const { departamento } = req.params;
    db.all(`SELECT nombre FROM cat_municipios WHERE departamento_id = (SELECT id FROM cat_departamentos WHERE nombre = ?) ORDER BY nombre`, [departamento], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json(rows || []);
    });
});

// =====================================================
// POST /api/reporte-diario - CON ID_REPORTE AUTOGENERADO
// =====================================================
app.post('/api/reporte-diario', authenticateToken, (req, res) => {
    const {
        numero_orden_vuelo, tipo_requerimiento, fecha_vuelo,
        operador_id, operador_nombre, operador_grado,
        unidad_id, programado, rentado, matricula, modelo, tipo_aeronave,
        mision_id, complemento_tarea_id, condicion_vuelo_id,
        unidad_apoyada_id, brigada, batallon, convenio_id, ruta,
        tiempo_maquina, horas_tripulacion, carga_kg, combustible_galones,
        pax, departamento_id, municipio_id, estado_mision_id, observaciones
    } = req.body;

    if (!numero_orden_vuelo || !tipo_requerimiento || !fecha_vuelo || !operador_id || !matricula || !tiempo_maquina) {
        return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
    }

    const ahora = new Date();
    const anioActual = ahora.getFullYear();
    const anioStr = String(anioActual);
    
    db.get(`SELECT id_reporte FROM reporte_diario WHERE id_reporte LIKE ? ORDER BY id_reporte DESC LIMIT 1`, [`${anioStr}-%`], (err, row) => {
        if (err) {
            console.error('Error al generar ID_REPORTE:', err);
            return res.status(500).json({ success: false, message: err.message });
        }
        
        let consecutivo = 1;
        if (row && row.id_reporte) {
            const partes = row.id_reporte.split('-');
            if (partes.length === 2) {
                consecutivo = parseInt(partes[1]) + 1;
            }
        }
        
        const consecutivoStr = String(consecutivo).padStart(6, '0');
        const id_reporte = `${anioStr}-${consecutivoStr}`;
        
        const sql = `INSERT INTO reporte_diario (
            id_reporte, numero_orden_vuelo, tipo_requerimiento, fecha_vuelo, fecha_hora_reporte,
            operador_id, operador_nombre, operador_grado,
            unidad_id, programado, rentado, matricula, modelo, tipo_aeronave,
            mision_id, complemento_tarea_id, condicion_vuelo_id,
            unidad_apoyada_id, brigada, batallon, convenio_id, ruta,
            tiempo_maquina, horas_tripulacion, carga_kg, combustible_galones,
            pax, departamento_id, municipio_id, estado_mision_id, observaciones
        ) VALUES (?, ?, ?, ?, datetime('now', '-5 hours'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const params = [
            id_reporte, numero_orden_vuelo, tipo_requerimiento, fecha_vuelo,
            operador_id, operador_nombre, operador_grado,
            unidad_id, programado, rentado, matricula, modelo, tipo_aeronave,
            mision_id, complemento_tarea_id, condicion_vuelo_id,
            unidad_apoyada_id, brigada || '', batallon || '', convenio_id, ruta || '',
            tiempo_maquina, horas_tripulacion || 0, carga_kg || 0, combustible_galones || 0,
            pax || 0, departamento_id, municipio_id, estado_mision_id, observaciones || ''
        ];

        db.run(sql, params, function(err) {
            if (err) {
                console.error('Error al guardar reporte:', err);
                return res.status(500).json({ success: false, message: err.message });
            }
            res.json({ success: true, id: this.lastID, id_reporte: id_reporte });
        });
    });
});

// =====================================================
// CONTROL DE FLOTA - ENDPOINT
// =====================================================
app.get('/api/control-flota', authenticateToken, (req, res) => {
    const usuario = req.user;
    
    let unidadesPermitidas = [];
    
    if (usuario.rol === 'ADMIN' || usuario.rol === 'COMANDO' || usuario.rol === 'BRIAV33') {
        unidadesPermitidas = ['BMMA1', 'BMMA2', 'BMMA3', 'BMMA4', 'BMMA5', 'BMMA6', 'BMMA7', 'BMMA8', 'BAOEA', 'BANOT'];
    } else if (usuario.rol === 'OPERADOR') {
        const match = usuario.id_usuario.match(/COT(BMMA\d+|BAOEA|BANOT)/);
        if (match) {
            unidadesPermitidas = [match[1]];
        } else {
            return res.json({ success: true, data: [] });
        }
    }
    
    if (unidadesPermitidas.length === 0) {
        return res.json({ success: true, data: [] });
    }
    
    const placeholders = unidadesPermitidas.map(() => '?').join(',');
    
    const query = `
        SELECT 
            a.matricula,
            a.modelo,
            a.clase,
            a.estado as estado_operacional,
            a.unidad_asignada as unidad,
            COALESCE(a.horas_asignadas_hangar, 0) as hf,
            COALESCE((
                SELECT SUM(rd.tiempo_maquina) 
                FROM reporte_diario rd 
                WHERE rd.matricula = a.matricula 
                AND strftime('%Y-%m', rd.fecha_vuelo) = strftime('%Y-%m', 'now')
            ), 0) as hv
        FROM aeronaves a
        WHERE a.unidad_asignada IN (${placeholders})
        AND a.estado = 'ACL'
        AND a.unidad_asignada != 'MANTENIMIENTO'
        ORDER BY a.unidad_asignada, a.matricula
    `;
    
    db.all(query, unidadesPermitidas, (err, aeronaves) => {
        if (err) {
            console.error('Error en /api/control-flota:', err);
            return res.status(500).json({ success: false, message: err.message });
        }
        
        const resultados = {};
        
        aeronaves.forEach(av => {
            const unidad = av.unidad;
            if (!resultados[unidad]) {
                resultados[unidad] = {
                    unidad: unidad,
                    aeronaves: []
                };
            }
            
            const hf = Math.round((parseFloat(av.hf) || 0) * 10) / 10;
            const hv = Math.round((parseFloat(av.hv) || 0) * 10) / 10;
            const hd = Math.max(0, hf - hv);
            
            resultados[unidad].aeronaves.push({
                matricula: av.matricula,
                modelo: av.modelo,
                clase: av.clase,
                estado: av.estado_operacional,
                hf: hf,
                hv: hv,
                hd: Math.round(hd * 10) / 10
            });
        });
        
        const ahora = new Date();
        const periodoActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
        
        const queryTechos = `
            SELECT u.nombre as unidad, SUM(bh.techo_horas) as horas_operacionales
            FROM bolsas_horas bh
            JOIN cat_unidades u ON bh.unidad_id = u.id
            WHERE bh.periodo = ? AND u.nombre IN (${placeholders})
            GROUP BY u.nombre
        `;
        
        db.all(queryTechos, [periodoActual, ...unidadesPermitidas], (err, techos) => {
            if (err) {
                console.error('Error obteniendo techos:', err);
                return res.status(500).json({ success: false, message: err.message });
            }
            
            const mapaTechos = {};
            techos.forEach(t => {
                mapaTechos[t.unidad] = t.horas_operacionales || 0;
            });
            
            const data = Object.values(resultados).map(unidad => ({
                ...unidad,
                horas_operacionales: mapaTechos[unidad.unidad] || 0
            }));
            
            res.json({ success: true, data: data });
        });
    });
});

// =====================================================
// MÓDULO 3: REPORTE DE MISIÓN
// =====================================================
app.get('/api/reporte-mision', authenticateToken, (req, res) => {
    const { desde, hasta, tipo, unidad } = req.query;
    
    if (!desde || !hasta) {
        return res.status(400).json({ success: false, message: 'Fechas requeridas' });
    }
    
    let unidadFilter = '';
    let unidadParams = [];
    if (unidad && unidad !== 'TODAS') {
        unidadFilter = 'AND rd.unidad_id = ?';
        unidadParams = [unidad];
    }
    
    if (tipo === 'detalle') {
        const query = `
            SELECT 
                rd.id_reporte,
                date(rd.fecha_vuelo) as fecha_vuelo,
                COALESCE(rd.unidad_id, 'SIN ASIGNAR') as unidad_nombre,
                rd.operador_nombre,
                rd.operador_grado,
                rd.matricula,
                rd.modelo,
                rd.tipo_aeronave,
                rd.programado,
                rd.rentado,
                COALESCE(m.nombre, 'SIN MISIÓN') as mision_nombre,
                COALESCE(ct.nombre, 'SIN COMPLEMENTO') as complemento_tarea_nombre,
                COALESCE(cv.nombre, 'SIN CONDICION') as condicion_vuelo_nombre,
                COALESCE(ua.nombre, 'SIN UNIDAD APOYADA') as unidad_apoyada_nombre,
                rd.brigada,
                rd.batallon,
                COALESCE(c.nombre, 'SIN CONVENIO') as convenio_nombre,
                rd.ruta,
                rd.tiempo_maquina,
                rd.horas_tripulacion,
                rd.carga_kg,
                rd.combustible_galones,
                rd.pax,
                COALESCE(d.nombre, 'SIN DEPARTAMENTO') as departamento_nombre,
                COALESCE(mun.nombre, 'SIN MUNICIPIO') as municipio_nombre,
                COALESCE(em.nombre, 'SIN ESTADO') as estado_mision_nombre,
                rd.numero_orden_vuelo,
                rd.tipo_requerimiento,
                rd.observaciones,
                rd.fecha_hora_reporte,
                rd.created_at
            FROM reporte_diario rd
            LEFT JOIN misiones m ON rd.mision_id = m.id
            LEFT JOIN cat_complementos_tarea ct ON rd.complemento_tarea_id = ct.id
            LEFT JOIN cat_condicion_vuelo cv ON rd.condicion_vuelo_id = cv.id
            LEFT JOIN cat_unidades_apoyadas ua ON rd.unidad_apoyada_id = ua.id
            LEFT JOIN cat_convenios c ON rd.convenio_id = c.id
            LEFT JOIN cat_departamentos d ON rd.departamento_id = d.id
            LEFT JOIN cat_municipios mun ON rd.municipio_id = mun.id
            LEFT JOIN cat_estado_mision em ON rd.estado_mision_id = em.id
            WHERE date(rd.fecha_vuelo) BETWEEN ? AND ?
            ${unidadFilter}
            ORDER BY rd.fecha_vuelo DESC
        `;
        const params = [desde, hasta, ...unidadParams];
        db.all(query, params, (err, rows) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true, data: rows });
        });
        
    } else if (tipo === 'unidad') {
        const query = `
            SELECT rd.unidad_id as unidad, SUM(rd.tiempo_maquina) as total_horas
            FROM reporte_diario rd
            WHERE date(rd.fecha_vuelo) BETWEEN ? AND ?
            ${unidadFilter}
            GROUP BY rd.unidad_id
            ORDER BY total_horas DESC
        `;
        const params = [desde, hasta, ...unidadParams];
        db.all(query, params, (err, rows) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true, data: rows });
        });
        
    } else if (tipo === 'aeronave') {
        const query = `
            SELECT rd.matricula, rd.modelo, rd.unidad_id as unidad, SUM(rd.tiempo_maquina) as total_horas
            FROM reporte_diario rd
            WHERE date(rd.fecha_vuelo) BETWEEN ? AND ?
            ${unidadFilter}
            GROUP BY rd.matricula
            ORDER BY total_horas DESC
        `;
        const params = [desde, hasta, ...unidadParams];
        db.all(query, params, (err, rows) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true, data: rows });
        });
        
    } else if (tipo === 'mision') {
        const query = `
            SELECT COALESCE(m.nombre, 'SIN MISIÓN') as mision, SUM(rd.tiempo_maquina) as total_horas
            FROM reporte_diario rd
            LEFT JOIN misiones m ON rd.mision_id = m.id
            WHERE date(rd.fecha_vuelo) BETWEEN ? AND ?
            ${unidadFilter}
            GROUP BY m.nombre
            ORDER BY total_horas DESC
        `;
        const params = [desde, hasta, ...unidadParams];
        db.all(query, params, (err, rows) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true, data: rows });
        });
        
    } else if (tipo === 'resumen') {
        const query = `
            SELECT 
                ? as fecha_desde,
                ? as fecha_hasta,
                COUNT(*) as total_vuelos,
                SUM(rd.tiempo_maquina) as total_horas,
                SUM(rd.pax) as total_pax,
                SUM(rd.carga_kg) as total_carga,
                SUM(rd.combustible_galones) as total_combustible,
                SUM(rd.horas_tripulacion) as total_horas_tripulacion,
                SUM(CASE WHEN rd.estado_mision_id = (SELECT id FROM cat_estado_mision WHERE nombre = 'CUMPLIO') THEN 1 ELSE 0 END) as misiones_cumplidas,
                SUM(CASE WHEN rd.estado_mision_id = (SELECT id FROM cat_estado_mision WHERE nombre = 'NO CUMPLIO') THEN 1 ELSE 0 END) as misiones_no_cumplidas
            FROM reporte_diario rd
            WHERE date(rd.fecha_vuelo) BETWEEN ? AND ?
            ${unidadFilter}
        `;
        const params = [desde, hasta, desde, hasta, ...unidadParams];
        db.all(query, params, (err, rows) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true, data: rows });
        });
    }
});

// =====================================================
// GESTIÓN DE USUARIOS - ENDPOINTS
// =====================================================

// GET /api/usuarios - Listar todos los usuarios
app.get('/api/usuarios', authenticateToken, (req, res) => {
    const usuario = req.user;
    
    if (usuario.rol !== 'ADMIN' && usuario.rol !== 'COMANDO' && usuario.rol !== 'BRIAV33') {
        return res.status(403).json({ success: false, message: 'No autorizado' });
    }
    
    const query = `
        SELECT u.id_usuario, r.nombre as rol_nombre, u.activo
        FROM usuarios u
        JOIN roles r ON u.rol_id = r.id
        ORDER BY u.id_usuario
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error al obtener usuarios:', err);
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json(rows || []);
    });
});

// POST /api/reset-password - Restablecer contraseña de un usuario
app.post('/api/reset-password', authenticateToken, async (req, res) => {
    const usuario = req.user;
    const { id_usuario, nueva_password } = req.body;
    
    if (!id_usuario || !nueva_password) {
        return res.status(400).json({ success: false, message: 'ID de usuario y nueva contraseña requeridos' });
    }
    
    if (nueva_password.length < 8) {
        return res.status(400).json({ success: false, message: 'La nueva contraseña debe tener al menos 8 caracteres' });
    }
    
    if (!/[A-Z]/.test(nueva_password)) {
        return res.status(400).json({ success: false, message: 'La nueva contraseña debe contener al menos una letra mayúscula' });
    }
    
    if (!/[0-9]/.test(nueva_password)) {
        return res.status(400).json({ success: false, message: 'La nueva contraseña debe contener al menos un número' });
    }
    
    if (usuario.rol !== 'ADMIN' && usuario.rol !== 'COMANDO' && usuario.rol !== 'BRIAV33') {
        return res.status(403).json({ success: false, message: 'No autorizado' });
    }
    
    const saltRounds = 12;
    const newHash = await bcrypt.hash(nueva_password, saltRounds);
    
    db.run(`UPDATE usuarios SET password_hash = ? WHERE id_usuario = ?`, [newHash, id_usuario], function(err) {
        if (err) {
            console.error('Error en UPDATE:', err);
            return res.status(500).json({ success: false, message: err.message });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }
        
        res.json({ success: true, message: `Contraseña de ${id_usuario} restablecida correctamente` });
    });
});

// POST /api/cambiar-password - Cambiar mi propia contraseña
app.post('/api/cambiar-password', authenticateToken, async (req, res) => {
    const { password_actual, password_nueva } = req.body;
    const id_usuario = req.user.id_usuario;
    
    if (!password_actual || !password_nueva) {
        return res.status(400).json({ success: false, message: 'Contraseña actual y nueva requeridas' });
    }
    
    if (password_nueva.length < 8) {
        return res.status(400).json({ success: false, message: 'La nueva contraseña debe tener al menos 8 caracteres' });
    }
    
    if (!/[A-Z]/.test(password_nueva)) {
        return res.status(400).json({ success: false, message: 'La nueva contraseña debe contener al menos una letra mayúscula' });
    }
    
    if (!/[0-9]/.test(password_nueva)) {
        return res.status(400).json({ success: false, message: 'La nueva contraseña debe contener al menos un número' });
    }
    
    db.get(`SELECT password_hash FROM usuarios WHERE id_usuario = ?`, [id_usuario], async (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        if (!row) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }
        
        const isValid = await bcrypt.compare(password_actual, row.password_hash);
        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Contraseña actual incorrecta' });
        }
        
        if (password_actual === password_nueva) {
            return res.status(400).json({ success: false, message: 'La nueva contraseña debe ser diferente a la actual' });
        }
        
        const saltRounds = 12;
        const newHash = await bcrypt.hash(password_nueva, saltRounds);
        
        db.run(`UPDATE usuarios SET password_hash = ? WHERE id_usuario = ?`, [newHash, id_usuario], function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }
            res.json({ success: true, message: 'Contraseña actualizada correctamente' });
        });
    });
});

// =====================================================
// TABLERO CONTROL - PICO DE HORAS (GRÁFICO DE LÍNEAS)
// =====================================================

app.get('/api/tablero-pico-horas', authenticateToken, (req, res) => {
    const usuario = req.user;
    const { desde, hasta, unidad } = req.query;
    
    console.log('=== TABLERO PICO HORAS ===');
    console.log('Usuario:', usuario.id_usuario, 'Rol:', usuario.rol);
    console.log('Parámetros:', { desde, hasta, unidad });
    
    let unidadFiltro = unidad;
    
    if (usuario.rol === 'OPERADOR') {
        const match = usuario.id_usuario.match(/COT(BMMA\d+|BAOEA|BANOT)/);
        if (match) {
            unidadFiltro = match[1];
        } else {
            return res.json({ success: true, data: [] });
        }
    }
    
    if (!unidadFiltro) {
        return res.status(400).json({ success: false, message: 'Unidad requerida' });
    }
    
    let fechaFilter = '';
    let params = [unidadFiltro];
    
    if (desde && hasta) {
        fechaFilter = 'AND date(rd.fecha_vuelo) BETWEEN ? AND ?';
        params.push(desde, hasta);
    }
    
    const query = `
        SELECT 
            date(rd.fecha_vuelo) as fecha,
            SUM(rd.tiempo_maquina) as total_horas
        FROM reporte_diario rd
        WHERE rd.unidad_id = ? ${fechaFilter}
        GROUP BY date(rd.fecha_vuelo)
        ORDER BY fecha ASC
    `;
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error SQL:', err.message);
            return res.status(500).json({ success: false, message: err.message });
        }
        
        console.log('Filas encontradas:', rows.length);
        
        let pico = 0;
        let fechaPico = null;
        rows.forEach(row => {
            if (row.total_horas > pico) {
                pico = row.total_horas;
                fechaPico = row.fecha;
            }
        });
        
        res.json({ 
            success: true, 
            data: rows,
            pico: { valor: pico, fecha: fechaPico }
        });
    });
});

// =====================================================
// TABLERO CONTROL - TODAS LAS UNIDADES
// =====================================================

app.get('/api/tablero-pico-horas-todas', authenticateToken, (req, res) => {
    const { desde, hasta } = req.query;
    
    let fechaFilter = '';
    let params = [];
    
    if (desde && hasta) {
        fechaFilter = 'WHERE date(rd.fecha_vuelo) BETWEEN ? AND ?';
        params = [desde, hasta];
    }
    
    const query = `
        SELECT 
            date(rd.fecha_vuelo) as fecha,
            rd.unidad_id as unidad,
            SUM(rd.tiempo_maquina) as total_horas
        FROM reporte_diario rd
        ${fechaFilter}
        GROUP BY date(rd.fecha_vuelo), rd.unidad_id
        ORDER BY fecha ASC, rd.unidad_id
    `;
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ success: false, message: err.message });
        }
        
        const unidades = ['BMMA1', 'BMMA2', 'BMMA3', 'BMMA4', 'BMMA5', 'BMMA6', 'BMMA7', 'BMMA8', 'BAOEA', 'BANOT'];
        const fechas = [...new Set(rows.map(r => r.fecha))].sort();
        
        const colores = ['#f39c12', '#e74c3c', '#2ecc71', '#3498db', '#9b59b6', '#1abc9c', '#e67e22', '#e84393', '#00cec9', '#fd79a8'];
        
        const datasets = unidades.map((unidad, idx) => {
            const datosUnidad = fechas.map(fecha => {
                const row = rows.find(r => r.fecha === fecha && r.unidad === unidad);
                return row ? row.total_horas : 0;
            });
            
            return {
                label: unidad,
                data: datosUnidad,
                borderColor: colores[idx % colores.length],
                backgroundColor: 'transparent',
                borderWidth: 2,
                pointRadius: 3,
                pointBackgroundColor: colores[idx % colores.length],
                tension: 0.3,
                fill: false
            };
        });
        
        res.json({ success: true, fechas: fechas, datasets: datasets });
    });
});

// =====================================================
// TABLERO CONTROL - HORAS POR UNIDAD APOYADA
// =====================================================

// GET /api/tablero-horas-apoyada - Datos jerárquicos
app.get('/api/tablero-horas-apoyada', authenticateToken, (req, res) => {
    const { desde, hasta, nivel, filtroId } = req.query;
    
    let fechaFilter = '';
    let params = [];
    if (desde && hasta) {
        fechaFilter = 'AND date(rd.fecha_vuelo) BETWEEN ? AND ?';
        params = [desde, hasta];
    }
    
    let query = '';
    if (nivel === 'division' || !nivel) {
        query = `
            SELECT 
                rd.unidad_apoyada_id as id,
                ua.nombre as nombre,
                SUM(rd.tiempo_maquina) as total_horas
            FROM reporte_diario rd
            JOIN cat_unidades_apoyadas ua ON rd.unidad_apoyada_id = ua.id
            WHERE 1=1 ${fechaFilter}
            GROUP BY rd.unidad_apoyada_id
            ORDER BY total_horas DESC
        `;
    } else if (nivel === 'brigada') {
        query = `
            SELECT 
                rd.brigada as id,
                rd.brigada as nombre,
                SUM(rd.tiempo_maquina) as total_horas
            FROM reporte_diario rd
            WHERE rd.unidad_apoyada_id = ? ${fechaFilter}
            AND rd.brigada IS NOT NULL AND rd.brigada != ''
            GROUP BY rd.brigada
            ORDER BY total_horas DESC
        `;
        params = [filtroId, ...params];
    } else if (nivel === 'batallon') {
        query = `
            SELECT 
                rd.batallon as id,
                rd.batallon as nombre,
                SUM(rd.tiempo_maquina) as total_horas
            FROM reporte_diario rd
            WHERE rd.brigada = ? ${fechaFilter}
            AND rd.batallon IS NOT NULL AND rd.batallon != ''
            GROUP BY rd.batallon
            ORDER BY total_horas DESC
        `;
        params = [filtroId, ...params];
    }
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, data: rows });
    });
});

// =====================================================
// ENDPOINTS CORREGIDOS PARA BRIGADAS Y BATALLONES (DESDE CATÁLOGOS)
// =====================================================

// GET /api/tablero-brigadas - Listar brigadas por división DESDE cat_brigadas
app.get('/api/tablero-brigadas', authenticateToken, (req, res) => {
    const { divisionId } = req.query;
    
    if (!divisionId) {
        return res.status(400).json({ success: false, message: 'divisionId requerido' });
    }
    
    const query = `
        SELECT b.id, b.nombre 
        FROM cat_brigadas b
        JOIN cat_unidades_apoyadas d ON b.division_id = d.id
        WHERE d.nombre = ?
        ORDER BY b.nombre
    `;
    
    db.all(query, [divisionId], (err, rows) => {
        if (err) {
            console.error('Error en /api/tablero-brigadas:', err);
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, data: rows || [] });
    });
});

// GET /api/tablero-batallones - Listar batallones por brigada DESDE cat_batallones
app.get('/api/tablero-batallones', authenticateToken, (req, res) => {
    const { brigada } = req.query;
    
    if (!brigada) {
        return res.status(400).json({ success: false, message: 'brigada requerido' });
    }
    
    const query = `
        SELECT bt.id, bt.nombre 
        FROM cat_batallones bt
        JOIN cat_brigadas b ON bt.brigada_id = b.id
        WHERE b.nombre = ?
        ORDER BY bt.nombre
    `;
    
    db.all(query, [brigada], (err, rows) => {
        if (err) {
            console.error('Error en /api/tablero-batallones:', err);
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, data: rows || [] });
    });
});

// =====================================================
// DIVISIONES - LISTAR UNIDADES APOYADAS
// =====================================================
app.get('/api/divisiones', authenticateToken, (req, res) => {
    const query = `SELECT id, nombre FROM cat_unidades_apoyadas ORDER BY nombre`;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error en /api/divisiones:', err);
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, data: rows || [] });
    });
});

// =====================================================
// NUEVO ENDPOINT JERÁRQUICO PARA UNIDAD APOYADA (DIV → BRIGADA → BATALLÓN)
// =====================================================

app.get('/api/tablero-horas-unidad-apoyada-jerarquia', authenticateToken, (req, res) => {
    const { desde, hasta, unidad, tipoNivel } = req.query;
    
    console.log('📊 /api/tablero-horas-unidad-apoyada-jerarquia');
    console.log('Parámetros:', { desde, hasta, unidad, tipoNivel });
    
    let params = [];
    let unidadFilter = '';
    
    // Filtro de fechas
    let fechaFilter = '';
    if (desde && hasta) {
        fechaFilter = `AND date(rd.fecha_vuelo) BETWEEN ? AND ?`;
        params.push(desde, hasta);
    }
    
    // Filtro según el nivel seleccionado
    if (unidad && unidad !== 'TODAS' && unidad !== '') {
        if (tipoNivel === 'division') {
            unidadFilter = `AND ua.nombre = ?`;
            params.push(unidad);
        } else if (tipoNivel === 'brigada') {
            unidadFilter = `AND rd.brigada = ?`;
            params.push(unidad);
        } else if (tipoNivel === 'batallon') {
            unidadFilter = `AND rd.batallon = ?`;
            params.push(unidad);
        }
    }
    
    const query = `
        SELECT 
            date(rd.fecha_vuelo) as fecha,
            CASE 
                WHEN ? = 'division' THEN ua.nombre
                WHEN ? = 'brigada' THEN rd.brigada
                WHEN ? = 'batallon' THEN rd.batallon
                ELSE ua.nombre
            END as serie,
            SUM(rd.tiempo_maquina) as total_horas
        FROM reporte_diario rd
        JOIN cat_unidades_apoyadas ua ON rd.unidad_apoyada_id = ua.id
        WHERE 1=1 ${fechaFilter} ${unidadFilter}
        GROUP BY date(rd.fecha_vuelo), serie
        ORDER BY fecha ASC, serie
    `;
    
    const queryParams = [tipoNivel, tipoNivel, tipoNivel, ...params];
    
    db.all(query, queryParams, (err, rows) => {
        if (err) {
            console.error('Error en /api/tablero-horas-unidad-apoyada-jerarquia:', err.message);
            return res.status(500).json({ success: false, message: err.message });
        }
        
        if (rows.length === 0) {
            return res.json({ success: true, fechas: [], datasets: [] });
        }
        
        // Si hay una unidad específica, mostrar una sola serie
        if (unidad && unidad !== 'TODAS' && unidad !== '') {
            const fechas = rows.map(r => r.fecha);
            const datos = rows.map(r => Math.round(r.total_horas * 10) / 10);
            const colores = ['#f39c12', '#e74c3c', '#2ecc71', '#3498db', '#9b59b6'];
            
            const datasets = [{
                label: unidad,
                data: datos,
                borderColor: colores[0],
                backgroundColor: 'transparent',
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: colores[0],
                tension: 0.3,
                fill: false
            }];
            
            return res.json({ success: true, fechas: fechas, datasets: datasets });
        }
        
        // Si no hay unidad específica, mostrar todas las series
        const series = [...new Set(rows.map(r => r.serie))].sort();
        const fechas = [...new Set(rows.map(r => r.fecha))].sort();
        
        const colores = ['#f39c12', '#e74c3c', '#2ecc71', '#3498db', '#9b59b6', '#1abc9c', '#e67e22', '#e84393', '#00cec9', '#fd79a8', '#55efc4', '#81ecec'];
        
        const datasets = series.map((serie, idx) => {
            const datos = fechas.map(fecha => {
                const row = rows.find(r => r.fecha === fecha && r.serie === serie);
                return row ? Math.round(row.total_horas * 10) / 10 : 0;
            });
            
            return {
                label: serie,
                data: datos,
                borderColor: colores[idx % colores.length],
                backgroundColor: 'transparent',
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: colores[idx % colores.length],
                tension: 0.3,
                fill: false
            };
        });
        
        res.json({ success: true, fechas: fechas, datasets: datasets });
    });
});

// =====================================================
// TABLERO CONTROL - ENDPOINTS PARA LOS 3 ANÁLISIS
// =====================================================

// 1. ANÁLISIS HORAS POR BMMA
app.get('/api/tablero-horas-bmma', authenticateToken, (req, res) => {
    const { desde, hasta, unidades } = req.query;
    
    let unidadFilter = '';
    let params = [];
    
    if (unidades && unidades !== 'TODAS') {
        const listaUnidades = unidades.split(',');
        unidadFilter = `AND rd.unidad_id IN (${listaUnidades.map(() => '?').join(',')})`;
        params = listaUnidades;
    }
    
    let fechaFilter = '';
    if (desde && hasta) {
        fechaFilter = `AND date(rd.fecha_vuelo) BETWEEN ? AND ?`;
        params.push(desde, hasta);
    }
    
    const query = `
        SELECT 
            date(rd.fecha_vuelo) as fecha,
            rd.unidad_id as serie,
            SUM(rd.tiempo_maquina) as total_horas
        FROM reporte_diario rd
        WHERE 1=1 ${unidadFilter} ${fechaFilter}
        GROUP BY date(rd.fecha_vuelo), rd.unidad_id
        ORDER BY fecha ASC, rd.unidad_id
    `;
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ success: false, message: err.message });
        }
        
        const series = [...new Set(rows.map(r => r.serie))].sort();
        const fechas = [...new Set(rows.map(r => r.fecha))].sort();
        
        const datasets = series.map((serie, idx) => {
            const colores = ['#f39c12', '#e74c3c', '#2ecc71', '#3498db', '#9b59b6', '#1abc9c', '#e67e22', '#e84393', '#00cec9', '#fd79a8'];
            const datos = fechas.map(fecha => {
                const row = rows.find(r => r.fecha === fecha && r.serie === serie);
                return row ? row.total_horas : 0;
            });
            
            return {
                label: serie,
                data: datos,
                borderColor: colores[idx % colores.length],
                backgroundColor: 'transparent',
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: colores[idx % colores.length],
                tension: 0.3,
                fill: false
            };
        });
        
        res.json({ success: true, fechas: fechas, datasets: datasets, series: series });
    });
});

// 2. ANÁLISIS UNIDAD APOYADA
app.get('/api/tablero-horas-unidad-apoyada', authenticateToken, (req, res) => {
    const { desde, hasta, unidades } = req.query;
    
    let unidadFilter = '';
    let params = [];
    
    if (unidades && unidades !== 'TODAS') {
        const listaUnidades = unidades.split(',');
        unidadFilter = `AND ua.nombre IN (${listaUnidades.map(() => '?').join(',')})`;
        params = listaUnidades;
    }
    
    let fechaFilter = '';
    if (desde && hasta) {
        fechaFilter = `AND date(rd.fecha_vuelo) BETWEEN ? AND ?`;
        params.push(desde, hasta);
    }
    
    const query = `
        SELECT 
            date(rd.fecha_vuelo) as fecha,
            ua.nombre as serie,
            SUM(rd.tiempo_maquina) as total_horas
        FROM reporte_diario rd
        JOIN cat_unidades_apoyadas ua ON rd.unidad_apoyada_id = ua.id
        WHERE 1=1 ${unidadFilter} ${fechaFilter}
        GROUP BY date(rd.fecha_vuelo), ua.nombre
        ORDER BY fecha ASC, ua.nombre
    `;
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ success: false, message: err.message });
        }
        
        const series = [...new Set(rows.map(r => r.serie))].sort();
        const fechas = [...new Set(rows.map(r => r.fecha))].sort();
        
        const colores = ['#f39c12', '#e74c3c', '#2ecc71', '#3498db', '#9b59b6', '#1abc9c', '#e67e22', '#e84393', '#00cec9', '#fd79a8', '#55efc4', '#81ecec'];
        
        const datasets = series.map((serie, idx) => {
            const datos = fechas.map(fecha => {
                const row = rows.find(r => r.fecha === fecha && r.serie === serie);
                return row ? row.total_horas : 0;
            });
            
            return {
                label: serie,
                data: datos,
                borderColor: colores[idx % colores.length],
                backgroundColor: 'transparent',
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: colores[idx % colores.length],
                tension: 0.3,
                fill: false
            };
        });
        
        res.json({ success: true, fechas: fechas, datasets: datasets, series: series });
    });
});

// 3. ANÁLISIS POR TIPO DE REQUERIMIENTO
app.get('/api/tablero-horas-requerimiento', authenticateToken, (req, res) => {
    const { desde, hasta, tipos } = req.query;
    
    let tipoFilter = '';
    let params = [];
    
    if (tipos && tipos !== 'TODOS') {
        const listaTipos = tipos.split(',');
        tipoFilter = `AND rd.tipo_requerimiento IN (${listaTipos.map(() => '?').join(',')})`;
        params = listaTipos;
    }
    
    let fechaFilter = '';
    if (desde && hasta) {
        fechaFilter = `AND date(rd.fecha_vuelo) BETWEEN ? AND ?`;
        params.push(desde, hasta);
    }
    
    const query = `
        SELECT 
            date(rd.fecha_vuelo) as fecha,
            rd.tipo_requerimiento as serie,
            SUM(rd.tiempo_maquina) as total_horas
        FROM reporte_diario rd
        WHERE rd.tipo_requerimiento IS NOT NULL AND rd.tipo_requerimiento != '' ${tipoFilter} ${fechaFilter}
        GROUP BY date(rd.fecha_vuelo), rd.tipo_requerimiento
        ORDER BY fecha ASC, rd.tipo_requerimiento
    `;
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ success: false, message: err.message });
        }
        
        const series = [...new Set(rows.map(r => r.serie))].sort();
        const fechas = [...new Set(rows.map(r => r.fecha))].sort();
        
        const colores = ['#f39c12', '#e74c3c', '#2ecc71', '#3498db', '#9b59b6', '#1abc9c'];
        
        const datasets = series.map((serie, idx) => {
            const datos = fechas.map(fecha => {
                const row = rows.find(r => r.fecha === fecha && r.serie === serie);
                return row ? row.total_horas : 0;
            });
            
            return {
                label: serie,
                data: datos,
                borderColor: colores[idx % colores.length],
                backgroundColor: 'transparent',
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: colores[idx % colores.length],
                tension: 0.3,
                fill: false
            };
        });
        
        res.json({ success: true, fechas: fechas, datasets: datasets, series: series });
    });
});

// =====================================================
// INICIO DEL SERVIDOR
// =====================================================
app.listen(port, () => {
    console.log(`Servidor SGHV corriendo en http://localhost:${port}`);
    console.log(`Modo: ${process.env.NODE_ENV || 'development'}`);
});

process.on('SIGINT', () => {
    console.log('\nCerrando conexión...');
    db.close((err) => {
        if (err) console.error(err.message);
        else console.log('Base de datos cerrada.');
        process.exit(0);
    });
});