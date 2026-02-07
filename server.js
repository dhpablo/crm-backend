const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Postgres pool (Railway: usa DATABASE_URL privada)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Si en algún momento te diera error de SSL, dímelo y lo ajustamos.
});

// ==================== DB INIT ====================

async function initDb() {
  await pool.query(`
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
      presupuesto_min DOUBLE PRECISION,
      presupuesto_max DOUBLE PRECISION,
      zonas TEXT,
      tipos TEXT,
      rentabilidad_min DOUBLE PRECISION,
      notas TEXT
    );

    CREATE TABLE IF NOT EXISTS properties (
      id TEXT PRIMARY KEY,
      direccion TEXT NOT NULL,
      ciudad TEXT NOT NULL,
      tipo TEXT NOT NULL,
      precio DOUBLE PRECISION NOT NULL,
      metros DOUBLE PRECISION NOT NULL,
      portal TEXT,
      enlace TEXT,
      agente_id TEXT REFERENCES agents(id),
      estado TEXT NOT NULL,
      inversor_id TEXT REFERENCES investors(id),
      notas TEXT,
      resumen_contactos TEXT,
      alquiler DOUBLE PRECISION,
      gastos DOUBLE PRECISION,
      rentabilidad_objetivo DOUBLE PRECISION,
      precio_max_negociar DOUBLE PRECISION,
      rentabilidad_actual DOUBLE PRECISION,
      fecha_creacion TEXT NOT NULL,
      fecha_cierre TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_properties_estado ON properties(estado);
    CREATE INDEX IF NOT EXISTS idx_properties_inversor ON properties(inversor_id);
    CREATE INDEX IF NOT EXISTS idx_properties_agente ON properties(agente_id);
  `);
}

// Helper: genera un id simple (como hacías con Date.now())
function genId() {
  return Date.now().toString();
}

// ==================== PROPERTIES API ====================

// Get all properties with optional filters
app.get('/api/properties', async (req, res) => {
  try {
    const { estado, inversor_id, search } = req.query;

    let query = 'SELECT * FROM properties';
    const params = [];
    const conditions = [];

    if (estado) {
      params.push(estado);
      conditions.push(`estado = $${params.length}`);
    }

    if (inversor_id) {
      params.push(inversor_id);
      conditions.push(`inversor_id = $${params.length}`);
    }

    if (search) {
      // ILIKE = case-insensitive en Postgres
      params.push(`%${search}%`);
      params.push(`%${search}%`);
      conditions.push(`(direccion ILIKE $${params.length - 1} OR ciudad ILIKE $${params.length})`);
    }

    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY fecha_creacion DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single property
app.get('/api/properties/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM properties WHERE id = $1', [req.params.id]);
    const property = result.rows[0];

    if (!property) return res.status(404).json({ success: false, error: 'Property not found' });

    res.json({ success: true, data: property });
  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create property
app.post('/api/properties', async (req, res) => {
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

    if (!direccion || !ciudad || !tipo || !precio || !metros || !estado) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: direccion, ciudad, tipo, precio, metros, estado'
      });
    }

    const id = genId();
    const fecha_creacion = new Date().toISOString();
    const fecha_cierre = estado === 'cerrada' ? new Date().toISOString() : null;

    await pool.query(
      `INSERT INTO properties (
        id, direccion, ciudad, tipo, precio, metros, portal, enlace,
        agente_id, estado, inversor_id, notas, resumen_contactos,
        alquiler, gastos, rentabilidad_objetivo, precio_max_negociar, rentabilidad_actual,
        fecha_creacion, fecha_cierre
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,
        $9,$10,$11,$12,$13,
        $14,$15,$16,$17,$18,
        $19,$20
      )`,
      [
        id, direccion, ciudad, tipo, precio, metros, portal || null, enlace || null,
        agente_id || null, estado, inversor_id || null, notas || null, resumen_contactos || null,
        alquiler || null, gastos || null, rentabilidad_objetivo || null, precio_max_negociar || null, rentabilidad_actual || null,
        fecha_creacion, fecha_cierre
      ]
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
app.put('/api/properties/:id', async (req, res) => {
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
    const check = await pool.query('SELECT id FROM properties WHERE id = $1', [id]);
    if (check.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    const fecha_cierre = estado === 'cerrada' ? new Date().toISOString() : null;

    await pool.query(
      `UPDATE properties SET
        direccion = $1,
        ciudad = $2,
        tipo = $3,
        precio = $4,
        metros = $5,
        portal = $6,
        enlace = $7,
        agente_id = $8,
        estado = $9,
        inversor_id = $10,
        notas = $11,
        resumen_contactos = $12,
        alquiler = $13,
        gastos = $14,
        rentabilidad_objetivo = $15,
        precio_max_negociar = $16,
        rentabilidad_actual = $17,
        fecha_cierre = $18
      WHERE id = $19`,
      [
        direccion,
        ciudad,
        tipo,
        precio,
        metros,
        portal || null,
        enlace || null,
        agente_id || null,
        estado,
        inversor_id || null,
        notas || null,
        resumen_contactos || null,
        alquiler || null,
        gastos || null,
        rentabilidad_objetivo || null,
        precio_max_negociar || null,
        rentabilidad_actual || null,
        fecha_cierre,
        id
      ]
    );

    res.json({ success: true, message: 'Property updated successfully' });
  } catch (error) {
    console.error('Error updating property:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete property
app.delete('/api/properties/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM properties WHERE id = $1', [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    res.json({ success: true, message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Error deleting property:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== AGENTS API ====================

// Get all agents
app.get('/api/agents', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM agents ORDER BY nombre ASC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single agent
app.get('/api/agents/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM agents WHERE id = $1', [req.params.id]);
    const agent = result.rows[0];

    if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });

    res.json({ success: true, data: agent });
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create agent
app.post('/api/agents', async (req, res) => {
  try {
    const { nombre, inmobiliaria, telefono, email, whatsapp, ultimo_contacto, notas } = req.body;

    if (!nombre) {
      return res.status(400).json({ success: false, error: 'Missing required field: nombre' });
    }

    const id = genId();

    await pool.query(
      `INSERT INTO agents (id, nombre, inmobiliaria, telefono, email, whatsapp, ultimo_contacto, notas)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        id,
        nombre,
        inmobiliaria || null,
        telefono || null,
        email || null,
        whatsapp || null,
        ultimo_contacto || null,
        notas || null
      ]
    );

    res.status(201).json({ success: true, data: { id, ...req.body }, message: 'Agent created successfully' });
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update agent
app.put('/api/agents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, inmobiliaria, telefono, email, whatsapp, ultimo_contacto, notas } = req.body;

    const check = await pool.query('SELECT id FROM agents WHERE id = $1', [id]);
    if (check.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    await pool.query(
      `UPDATE agents SET
        nombre = $1,
        inmobiliaria = $2,
        telefono = $3,
        email = $4,
        whatsapp = $5,
        ultimo_contacto = $6,
        notas = $7
       WHERE id = $8`,
      [
        nombre,
        inmobiliaria || null,
        telefono || null,
        email || null,
        whatsapp || null,
        ultimo_contacto || null,
        notas || null,
        id
      ]
    );

    res.json({ success: true, message: 'Agent updated successfully' });
  } catch (error) {
    console.error('Error updating agent:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete agent
app.delete('/api/agents/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM agents WHERE id = $1', [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    res.json({ success: true, message: 'Agent deleted successfully' });
  } catch (error) {
    console.error('Error deleting agent:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== INVESTORS API ====================

// Get all investors
app.get('/api/investors', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM investors ORDER BY nombre ASC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching investors:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single investor
app.get('/api/investors/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM investors WHERE id = $1', [req.params.id]);
    const investor = result.rows[0];

    if (!investor) return res.status(404).json({ success: false, error: 'Investor not found' });

    res.json({ success: true, data: investor });
  } catch (error) {
    console.error('Error fetching investor:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create investor
app.post('/api/investors', async (req, res) => {
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

    const id = genId();

    await pool.query(
      `INSERT INTO investors (
        id, nombre, telefono, email, presupuesto_min, presupuesto_max, zonas, tipos, rentabilidad_min, notas
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10
      )`,
      [
        id,
        nombre,
        telefono || null,
        email || null,
        presupuesto_min || null,
        presupuesto_max || null,
        zonas || null,
        tipos || null,
        rentabilidad_min || null,
        notas || null
      ]
    );

    res.status(201).json({ success: true, data: { id, ...req.body }, message: 'Investor created successfully' });
  } catch (error) {
    console.error('Error creating investor:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update investor
app.put('/api/investors/:id', async (req, res) => {
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

    const check = await pool.query('SELECT id FROM investors WHERE id = $1', [id]);
    if (check.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Investor not found' });
    }

    await pool.query(
      `UPDATE investors SET
        nombre = $1,
        telefono = $2,
        email = $3,
        presupuesto_min = $4,
        presupuesto_max = $5,
        zonas = $6,
        tipos = $7,
        rentabilidad_min = $8,
        notas = $9
       WHERE id = $10`,
      [
        nombre,
        telefono || null,
        email || null,
        presupuesto_min || null,
        presupuesto_max || null,
        zonas || null,
        tipos || null,
        rentabilidad_min || null,
        notas || null,
        id
      ]
    );

    res.json({ success: true, message: 'Investor updated successfully' });
  } catch (error) {
    console.error('Error updating investor:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete investor
app.delete('/api/investors/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM investors WHERE id = $1', [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Investor not found' });
    }

    res.json({ success: true, message: 'Investor deleted successfully' });
  } catch (error) {
    console.error('Error deleting investor:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== STATS ====================

app.get('/api/stats', async (req, res) => {
  try {
    const stats = {};

    const total = await pool.query('SELECT COUNT(*)::int as count FROM properties');
    stats.total = total.rows[0].count;

    const pendientes = await pool.query("SELECT COUNT(*)::int as count FROM properties WHERE estado = 'pendiente'");
    stats.pendientes = pendientes.rows[0].count;

    const negociacion = await pool.query("SELECT COUNT(*)::int as count FROM properties WHERE estado = 'negociacion'");
    stats.negociacion = negociacion.rows[0].count;

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    const cerradasMes = await pool.query(
      `SELECT COUNT(*)::int as count
       FROM properties
       WHERE estado = 'cerrada'
       AND fecha_cierre >= $1
       AND fecha_cierre <= $2`,
      [firstDayOfMonth, lastDayOfMonth]
    );
    stats.cerradas_mes = cerradasMes.rows[0].count;

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== HEALTH CHECK ====================

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1 as ok');
    res.json({ status: 'ok', db: 'ok' });
  } catch (e) {
    res.status(500).json({ status: 'error', db: 'error', message: e.message });
  }
});

// ==================== START SERVER ====================

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 CRM Backend running on port ${PORT}`);
      console.log(`🗄️ Postgres connected`);
    });
  })
  .catch((err) => {
    console.error('❌ Error inicializando la BD:', err);
    process.exit(1);
  });
