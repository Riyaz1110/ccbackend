const express = require('express');
const router = express.Router();
const pool = require('../models/db');
const upload = require('../middleware/upload');
const { adminMiddleware } = require('../middleware/auth');

// GET all products (with optional category filter)
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT id, name, description, category, price, stock, available, created_at';
    
    // Return image as base64
    query = 'SELECT id, name, description, category, price, stock, available, created_at, encode(image, \'base64\') as image FROM products WHERE available = true';
    const params = [];
    
    if (category) {
      query += ' AND LOWER(category) = LOWER($1)';
      params.push(category);
    }
    
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET single product
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, description, category, price, stock, available, created_at, encode(image, 'base64') as image FROM products WHERE id = $1",
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST create product (admin only)
router.post('/', adminMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { name, description, category, price, stock, available } = req.body;
    const imageBuffer = req.file ? req.file.buffer : null;
    
    const result = await pool.query(
      'INSERT INTO products (name, description, category, price, stock, available, image) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, description, category, parseFloat(price), parseInt(stock), available === 'true', imageBuffer]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT update product (admin only)
router.put('/:id', adminMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { name, description, category, price, stock, available } = req.body;
    const imageBuffer = req.file ? req.file.buffer : null;
    
    let query, params;
    if (imageBuffer) {
      query = 'UPDATE products SET name=$1, description=$2, category=$3, price=$4, stock=$5, available=$6, image=$7 WHERE id=$8 RETURNING *';
      params = [name, description, category, parseFloat(price), parseInt(stock), available === 'true', imageBuffer, req.params.id];
    } else {
      query = 'UPDATE products SET name=$1, description=$2, category=$3, price=$4, stock=$5, available=$6 WHERE id=$7 RETURNING *';
      params = [name, description, category, parseFloat(price), parseInt(stock), available === 'true', req.params.id];
    }
    
    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE product (admin only)
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// GET all products for admin (including unavailable)
router.get('/admin/all', adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, description, category, price, stock, available, created_at, encode(image, 'base64') as image FROM products ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

module.exports = router;
