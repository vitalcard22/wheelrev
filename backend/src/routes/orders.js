const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

function requireAdmin(req, res, next) {
  const token = req.header('x-admin-token');
  if (!process.env.ADMIN_TOKEN) {
    return res.status(503).json({ error: 'Admin access is disabled — ADMIN_TOKEN is not set on the server.' });
  }
  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Invalid or missing admin token.' });
  }
  next();
}

// POST /api/orders — submit a reservation request (the "buy" flow).
// No payment is collected here — this creates a lead for the dealer to follow up on.
router.post('/', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Orders require a database connection, which is not configured.' });

  const { items, name, email, phone, financing, message } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one car is required.' });
  }
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  try {
    const created = [];
    for (const item of items) {
      const result = await pool.query(
        `INSERT INTO orders (car_id, car_brand, car_model, car_price, customer_name, customer_email, customer_phone, financing_pref, message)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id`,
        [item.id, item.brand, item.model, item.price, name, email, phone || null, financing || null, message || null]
      );
      created.push(result.rows[0].id);
    }
    res.status(201).json({ ok: true, orderIds: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders — admin only, lists all reservation requests.
router.get('/', requireAdmin, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'No database connected.' });
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json({ count: result.rows.length, orders: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/orders/:id — admin only, update status (new/contacted/closed/cancelled).
router.put('/:id', requireAdmin, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'No database connected.' });
  const { status } = req.body;
  if (!['new', 'contacted', 'closed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }
  try {
    const result = await pool.query('UPDATE orders SET status=$1 WHERE id=$2', [status, req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Order not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
