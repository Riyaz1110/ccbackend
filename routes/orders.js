const express = require('express');
const router = express.Router();
const pool = require('../models/db');
const upload = require('../middleware/upload');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// POST create order with screenshot
router.post('/', authMiddleware, upload.single('payment_screenshot'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { items, total_amount, transaction_id, shipping_address } = req.body;
    const userId = req.user.id;
    const screenshotBuffer = req.file ? req.file.buffer : null;
    const screenshotMimetype = req.file ? req.file.mimetype : null;

    if (!screenshotBuffer) {
      return res.status(400).json({ error: 'Payment screenshot is required' });
    }

    await client.query('BEGIN');

    const orderResult = await client.query(
      `INSERT INTO orders 
        (user_id, total_amount, transaction_id, shipping_address, status, payment_screenshot, screenshot_mimetype) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [userId, total_amount, transaction_id, shipping_address, 'Pending', screenshotBuffer, screenshotMimetype]
    );

    const orderId = orderResult.rows[0].id;

    const parsedItems = JSON.parse(items);
    for (const item of parsedItems) {
      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
        [orderId, item.product_id, item.quantity, item.price]
      );
      await client.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(orderResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to create order' });
  } finally {
    client.release();
  }
});

// GET all orders (admin)
router.get('/', adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.id, o.total_amount, o.transaction_id, o.shipping_address,
             o.status, o.created_at, o.screenshot_mimetype,
             encode(o.payment_screenshot, 'base64') as payment_screenshot,
             u.name as user_name, u.email as user_email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `);

    for (const order of result.rows) {
      const items = await pool.query(`
        SELECT oi.*, p.name as product_name, p.category
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = $1
      `, [order.id]);
      order.items = items.rows;
    }

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// PUT update order status (admin)
router.put('/:id/status', adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Pending', 'Confirmed', 'Shipped', 'Delivered'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const result = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

module.exports = router;