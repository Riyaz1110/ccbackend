const express = require('express');
const router = express.Router();
const pool = require('../models/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Google OAuth - verify token from frontend
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    
    // Decode Google JWT (verify with Google)
    const axios = require('axios');
    const googleResponse = await axios.get(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
    );
    
    const { email, name, picture, sub: googleId } = googleResponse.data;
    
    // Check if user exists
    let userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (userResult.rows.length === 0) {
      // Create new user
      userResult = await pool.query(
        'INSERT INTO users (name, email, google_id, avatar) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, email, googleId, picture]
      );
    } else {
      // Update existing user
      await pool.query(
        'UPDATE users SET name = $1, google_id = $2, avatar = $3 WHERE email = $4',
        [name, googleId, picture, email]
      );
      userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    }
    
    const user = userResult.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, isAdmin: false },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar } });
  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Admin login
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await pool.query('SELECT * FROM admin WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    
    const admin = result.rows[0];
    
    // Check password (plain text for initial setup or hashed)
    let validPassword = false;
    if (admin.password.startsWith('$2')) {
      validPassword = await bcrypt.compare(password, admin.password);
    } else {
      validPassword = password === admin.password;
    }
    
    if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });
    
    const token = jwt.sign(
      { id: admin.id, email: admin.email, isAdmin: true },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    res.json({ token, admin: { id: admin.id, email: admin.email } });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
