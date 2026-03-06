const express = require('express');
const router = express.Router();
const pool = require('../models/db');
const { adminMiddleware } = require('../middleware/auth');

// GET dashboard stats
router.get('/stats', adminMiddleware, async (req, res) => {
  try {
    const products = await pool.query('SELECT COUNT(*) FROM products');
    const orders = await pool.query('SELECT COUNT(*) FROM orders');
    const pendingOrders = await pool.query("SELECT COUNT(*) FROM orders WHERE status = 'Pending'");
    const lowStock = await pool.query('SELECT COUNT(*) FROM products WHERE stock < 5');
    const totalRevenue = await pool.query('SELECT SUM(total_amount) FROM orders');
    
    res.json({
      totalProducts: parseInt(products.rows[0].count),
      totalOrders: parseInt(orders.rows[0].count),
      pendingOrders: parseInt(pendingOrders.rows[0].count),
      lowStockProducts: parseInt(lowStock.rows[0].count),
      totalRevenue: parseFloat(totalRevenue.rows[0].sum) || 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
