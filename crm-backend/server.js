const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Database setup
const db = new Database(process.env.DB_PATH || 'crm.db');

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS properties (
    id TEXT PRIMARY KEY,
    direccion TEXT NOT NULL,
    ciudad TEXT NOT NULL,
    tipo TEXT NOT NULL,
    precio REAL NOT NULL,
    metros REAL NOT NULL,
    portal TEXT,
    enlace TEXT,
    agente_id TEXT,
    estado TEXT NOT NULL,
    inversor_id TEXT,
    notas TEXT,
    resumen_contactos TEXT,
    alquiler REAL,
    gastos REAL,
    rentabilidad_objetivo REAL,
    precio_max_negociar REAL,
    rentabilidad_actual REAL,
    fecha_creacion TEXT NOT NULL,
    fecha_cierre TEXT,
    FOREIGN KEY (agente_id) REFERENCES agents(id),
    FOREIGN KEY (inversor_id) REFERENCES investors(id)
  );

  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    inmobiliaria TEXT,
    telefono TEXT,
    email TEXT,
    whatsapp TEXT,
    ultimo_contacto TEXT,
    notas TEXT
  );

  CREATE TABLE IF NOT EXISTS investors (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    telefono TEXT,
    email TEXT,
    presupuesto_min REAL,
    presupuesto_max REAL,
    zonas TEXT,
    tipos TEXT,
    rentabilidad_min REAL,
    notas TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_properties_estado ON properties(estado);
  CREATE INDEX IF NOT EXISTS idx_properties_inversor ON properties(inversor_id);
  CREATE INDEX IF NOT EXISTS idx_properties_agente ON properties(agente_id);
`);

// ==================== PROPERTIES ENDPOINTS ====================

// Get all properties with optional filters
app.get('/api/properties', (req, res) => {
  try {
    const { estado, inversor_id, search } = req.query;
    
    let query = 'SELECT * FROM properties';
    const params = [];
    const conditions = [];

    if (estado) {
      conditions.push('estado = ?');
      params.push(estado);
    }

    if (inversor_id) {
      conditions.push('inversor_id = ?');
      params.push(inversor_id);
    }

    if (search) {
      conditions.push('(direccion LIKE ? OR ciudad LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY fecha_creacion DESC';

    const stmt = db.prepare(query);
    const properties = stmt.all(...params);
    
    res.json({ success: true, data: properties });
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single property
app.get('/api/properties/:id', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM properties WHERE id = ?');
    const property = stmt.get(req.params.id);
    
    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }
    
    res.json({ success: true, data: property });
  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new property
app.post('/api/properties', (req, res) => {
  try {
    const {
      direccion,
      ciudad,
      tipo,
      precio,
      metros,
      portal,
      enlace,
      agente_id,
      estado,
      inversor_id,
      notas,
      resumen_contactos,
      alquiler,
      gastos,
      rentabilidad_objetivo,
      precio_max_negociar,
      rentabilidad_actual
    } = req.body;

    // Validations
    if (!direccion || !ciudad || !tipo || !precio || !metros || !estado) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: direccion, ciudad, tipo, precio, metros, estado' 
      });
    }

    const id = Date.now().toString();
    const fecha_creacion = new Date().toISOString();
    const fecha_cierre = estado === 'cerrada' ? new Date().toISOString() : null;

    const stmt = db.prepare(`
      INSERT INTO properties (
        id, direccion, ciudad, tipo, precio, metros, portal, enlace,
        agente_id, estado, inversor_id, notas, resumen_contactos,
        alquiler, gastos, rentabilidad_objetivo, precio_max_negociar,
        rentabilidad_actual, fecha_creacion, fecha_cierre
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id, direccion, ciudad, tipo, precio, metros, portal || null, enlace || null,
      agente_id || null, estado, inversor_id || null, notas || null, 
      resumen_contactos || null, alquiler || null, gastos || null,
      rentabilidad_objetivo || null, precio_max_negociar || null,
      rentabilidad_actual || null, fecha_creacion, fecha_cierre
    );

    res.status(201).json({ 
      success: true, 
      data: { id, ...req.body, fecha_creacion, fecha_cierre },
      message: 'Property created successfully' 
    });
  } catch (error) {
    console.error('Error creating property:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update property
app.put('/api/properties/:id', (req, res) => {
  try {
    const { id } = req.params;
    const {
      direccion,
      ciudad,
      tipo,
      precio,
      metros,
      portal,
      enlace,
      agente_id,
      estado,
      inversor_id,
      notas,
      resumen_contactos,
      alquiler,
      gastos,
      rentabilidad_objetivo,
      precio_max_negociar,
      rentabilidad_actual
    } = req.body;

    // Check if property exists
    const checkStmt = db.prepare('SELECT id FROM properties WHERE id = ?');
    if (!checkStmt.get(id)) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    const fecha_cierre = estado === 'cerrada' ? new Date().toISOString() : null;

    const stmt = db.prepare(`
      UPDATE properties SET
        direccion = ?, ciudad = ?, tipo = ?, precio = ?, metros = ?,
        portal = ?, enlace = ?, agente_id = ?, estado = ?, inversor_id = ?,
        notas = ?, resumen_contactos = ?, alquiler = ?, gastos = ?,
        rentabilidad_objetivo = ?, precio_max_negociar = ?, rentabilidad_actual = ?,
        fecha_cierre = ?
      WHERE id = ?
    `);

    stmt.run(
      direccion, ciudad, tipo, precio, metros, portal || null, enlace || null,
      agente_id || null, estado, inversor_id || null, notas || null,
      resumen_contactos || null, alquiler || null, gastos || null,
      rentabilidad_objetivo || null, precio_max_negociar || null,
      rentabilidad_actual || null, fecha_cierre, id
    );

    res.json({ success: true, message: 'Property updated successfully' });
  } catch (error) {
    console.error('Error updating property:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete property
app.delete('/api/properties/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM properties WHERE id = ?');
    const result = stmt.run(req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }
    
    res.json({ success: true, message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Error deleting property:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== AGENTS ENDPOINTS ====================

// Get all agents
app.get('/api/agents', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM agents ORDER BY nombre ASC');
    const agents = stmt.all();
    res.json({ success: true, data: agents });
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single agent
app.get('/api/agents/:id', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM agents WHERE id = ?');
    const agent = stmt.get(req.params.id);
    
    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }
    
    res.json({ success: true, data: agent });
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create agent
app.post('/api/agents', (req, res) => {
  try {
    const { nombre, inmobiliaria, telefono, email, whatsapp, ultimo_contacto, notas } = req.body;

    if (!nombre) {
      return res.status(400).json({ success: false, error: 'Missing required field: nombre' });
    }

    const id = Date.now().toString();

    const stmt = db.prepare(`
      INSERT INTO agents (id, nombre, inmobiliaria, telefono, email, whatsapp, ultimo_contacto, notas)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id, nombre, inmobiliaria || null, telefono || null, email || null,
      whatsapp || null, ultimo_contacto || null, notas || null
    );

    res.status(201).json({ 
      success: true, 
      data: { id, ...req.body },
      message: 'Agent created successfully' 
    });
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update agent
app.put('/api/agents/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, inmobiliaria, telefono, email, whatsapp, ultimo_contacto, notas } = req.body;

    const checkStmt = db.prepare('SELECT id FROM agents WHERE id = ?');
    if (!checkStmt.get(id)) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    const stmt = db.prepare(`
      UPDATE agents SET
        nombre = ?, inmobiliaria = ?, telefono = ?, email = ?,
        whatsapp = ?, ultimo_contacto = ?, notas = ?
      WHERE id = ?
    `);

    stmt.run(
      nombre, inmobiliaria || null, telefono || null, email || null,
      whatsapp || null, ultimo_contacto || null, notas || null, id
    );

    res.json({ success: true, message: 'Agent updated successfully' });
  } catch (error) {
    console.error('Error updating agent:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete agent
app.delete('/api/agents/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM agents WHERE id = ?');
    const result = stmt.run(req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }
    
    res.json({ success: true, message: 'Agent deleted successfully' });
  } catch (error) {
    console.error('Error deleting agent:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== INVESTORS ENDPOINTS ====================

// Get all investors
app.get('/api/investors', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM investors ORDER BY nombre ASC');
    const investors = stmt.all();
    res.json({ success: true, data: investors });
  } catch (error) {
    console.error('Error fetching investors:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single investor
app.get('/api/investors/:id', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM investors WHERE id = ?');
    const investor = stmt.get(req.params.id);
    
    if (!investor) {
      return res.status(404).json({ success: false, error: 'Investor not found' });
    }
    
    res.json({ success: true, data: investor });
  } catch (error) {
    console.error('Error fetching investor:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create investor
app.post('/api/investors', (req, res) => {
  try {
    const {
      nombre,
      telefono,
      email,
      presupuesto_min,
      presupuesto_max,
      zonas,
      tipos,
      rentabilidad_min,
      notas
    } = req.body;

    if (!nombre) {
      return res.status(400).json({ success: false, error: 'Missing required field: nombre' });
    }

    const id = Date.now().toString();

    const stmt = db.prepare(`
      INSERT INTO investors (
        id, nombre, telefono, email, presupuesto_min, presupuesto_max,
        zonas, tipos, rentabilidad_min, notas
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id, nombre, telefono || null, email || null,
      presupuesto_min || null, presupuesto_max || null,
      zonas || null, tipos || null, rentabilidad_min || null, notas || null
    );

    res.status(201).json({ 
      success: true, 
      data: { id, ...req.body },
      message: 'Investor created successfully' 
    });
  } catch (error) {
    console.error('Error creating investor:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update investor
app.put('/api/investors/:id', (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      telefono,
      email,
      presupuesto_min,
      presupuesto_max,
      zonas,
      tipos,
      rentabilidad_min,
      notas
    } = req.body;

    const checkStmt = db.prepare('SELECT id FROM investors WHERE id = ?');
    if (!checkStmt.get(id)) {
      return res.status(404).json({ success: false, error: 'Investor not found' });
    }

    const stmt = db.prepare(`
      UPDATE investors SET
        nombre = ?, telefono = ?, email = ?, presupuesto_min = ?,
        presupuesto_max = ?, zonas = ?, tipos = ?, rentabilidad_min = ?, notas = ?
      WHERE id = ?
    `);

    stmt.run(
      nombre, telefono || null, email || null,
      presupuesto_min || null, presupuesto_max || null,
      zonas || null, tipos || null, rentabilidad_min || null, notas || null, id
    );

    res.json({ success: true, message: 'Investor updated successfully' });
  } catch (error) {
    console.error('Error updating investor:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete investor
app.delete('/api/investors/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM investors WHERE id = ?');
    const result = stmt.run(req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Investor not found' });
    }
    
    res.json({ success: true, message: 'Investor deleted successfully' });
  } catch (error) {
    console.error('Error deleting investor:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== STATS ENDPOINT ====================

app.get('/api/stats', (req, res) => {
  try {
    const stats = {};
    
    // Total properties
    stats.total = db.prepare('SELECT COUNT(*) as count FROM properties').get().count;
    
    // By status
    stats.pendientes = db.prepare("SELECT COUNT(*) as count FROM properties WHERE estado = 'pendiente'").get().count;
    stats.negociacion = db.prepare("SELECT COUNT(*) as count FROM properties WHERE estado = 'negociacion'").get().count;
    
    // Closed this month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    
    stats.cerradas_mes = db.prepare(`
      SELECT COUNT(*) as count FROM properties 
      WHERE estado = 'cerrada' 
      AND fecha_cierre >= ? 
      AND fecha_cierre <= ?
    `).get(firstDayOfMonth, lastDayOfMonth).count;
    
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== HEALTH CHECK ====================

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`🚀 CRM Backend running on port ${PORT}`);
  console.log(`📊 Database: ${process.env.DB_PATH || 'crm.db'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing database...');
  db.close();
  process.exit(0);
});
