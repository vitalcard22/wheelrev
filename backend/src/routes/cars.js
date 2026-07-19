const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const jsonCars = require('../data/cars.json');

// Simple shared-secret protection for write operations. This is NOT a full
// authentication system (no accounts, no sessions, no hashing) — it's a basic
// barrier to stop random visitors from editing the inventory. Before this goes
// live publicly, replace it with real auth (the same pattern used on the
// Oakstone admin login is a good model).
function requireAdmin(req, res, next) {
  const token = req.header('x-admin-token');
  if (!process.env.ADMIN_TOKEN) {
    return res.status(503).json({ error: 'Admin write access is disabled — ADMIN_TOKEN is not set on the server.' });
  }
  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Invalid or missing admin token.' });
  }
  next();
}

// Converts a database row (snake_case, range_miles) back into the shape
// the frontend expects (camelCase-ish, `range`) — keeps the API response
// identical whether the data came from Postgres or the JSON fallback.
function rowToCar(row) {
  return {
    id: row.id,
    brand: row.brand,
    model: row.model,
    year: row.year,
    type: row.type,
    tier: row.tier,
    price: row.price,
    origin: row.origin,
    hp: row.hp,
    range: row.range_miles,
    drivetrain: row.drivetrain,
    seats: row.seats,
    tagline: row.tagline,
    img: row.img,
    gallery: row.gallery || [],
  };
}

// GET /api/cars
router.get('/', async (req, res) => {
  const { brand, type, tier, minPrice, maxPrice } = req.query;

  if (pool) {
    try {
      const conditions = [];
      const values = [];
      if (brand) { values.push(brand); conditions.push(`LOWER(brand) = LOWER($${values.length})`); }
      if (type) { values.push(type); conditions.push(`LOWER(type) = LOWER($${values.length})`); }
      if (tier) { values.push(tier); conditions.push(`tier = $${values.length}`); }
      if (minPrice) { values.push(Number(minPrice)); conditions.push(`price >= $${values.length}`); }
      if (maxPrice) { values.push(Number(maxPrice)); conditions.push(`price <= $${values.length}`); }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const result = await pool.query(`SELECT * FROM cars ${where} ORDER BY brand, model`, values);
      return res.json({ count: result.rows.length, source: 'database', cars: result.rows.map(rowToCar) });
    } catch (err) {
      console.error('Database query failed, falling back to JSON:', err.message);
      // fall through to JSON below
    }
  }

  // Fallback: filter the bundled JSON file the same way
  let results = jsonCars;
  if (brand) results = results.filter(c => c.brand.toLowerCase() === String(brand).toLowerCase());
  if (type) results = results.filter(c => c.type.toLowerCase() === String(type).toLowerCase());
  if (tier) results = results.filter(c => c.tier === tier);
  if (minPrice) results = results.filter(c => c.price >= Number(minPrice));
  if (maxPrice) results = results.filter(c => c.price <= Number(maxPrice));
  res.json({ count: results.length, source: 'json-fallback', cars: results });
});

// GET /api/cars/:id
router.get('/:id', async (req, res) => {
  if (pool) {
    try {
      const result = await pool.query('SELECT * FROM cars WHERE id = $1', [req.params.id]);
      if (result.rows.length) return res.json(rowToCar(result.rows[0]));
      return res.status(404).json({ error: 'Car not found' });
    } catch (err) {
      console.error('Database query failed, falling back to JSON:', err.message);
    }
  }
  const car = jsonCars.find(c => c.id === req.params.id);
  if (!car) return res.status(404).json({ error: 'Car not found' });
  res.json(car);
});

// POST /api/cars — add a new car (requires database)
router.post('/', requireAdmin, async (req, res) => {
  if (!pool) return res.status(501).json({ error: 'No database connected — cannot create cars yet.' });
  const c = req.body;
  if (!c.id || !c.brand || !c.model || !c.price) {
    return res.status(400).json({ error: 'id, brand, model, and price are required' });
  }
  try {
    await pool.query(
      `INSERT INTO cars (id, brand, model, year, type, tier, price, origin, hp, range_miles, drivetrain, seats, tagline, img, gallery)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [c.id, c.brand, c.model, c.year || null, c.type || null, c.tier || 'daily', c.price,
       c.origin || null, c.hp || null, c.range || null, c.drivetrain || null, c.seats || null,
       c.tagline || null, c.img || null, c.gallery || []]
    );
    res.status(201).json({ ok: true, id: c.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/cars/:id — update a car (requires database)
router.put('/:id', requireAdmin, async (req, res) => {
  if (!pool) return res.status(501).json({ error: 'No database connected — cannot update cars yet.' });
  const c = req.body;
  try {
    const result = await pool.query(
      `UPDATE cars SET brand=$1, model=$2, year=$3, type=$4, tier=$5, price=$6, origin=$7, hp=$8,
       range_miles=$9, drivetrain=$10, seats=$11, tagline=$12, img=$13, gallery=$14, updated_at=now()
       WHERE id=$15`,
      [c.brand, c.model, c.year, c.type, c.tier, c.price, c.origin, c.hp,
       c.range, c.drivetrain, c.seats, c.tagline, c.img, c.gallery || [], req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Car not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/cars/:id — remove a car (requires database)
router.delete('/:id', requireAdmin, async (req, res) => {
  if (!pool) return res.status(501).json({ error: 'No database connected — cannot delete cars yet.' });
  try {
    const result = await pool.query('DELETE FROM cars WHERE id=$1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Car not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
