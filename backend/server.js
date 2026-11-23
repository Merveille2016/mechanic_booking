// server.js - The brain of your application
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();

// CORS: FRONTEND_URL can hold one or more comma-separated origins
// (e.g. https://my-app.vercel.app). If it is not set, every origin is allowed.
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);
app.use(cors(allowedOrigins.length ? { origin: allowedOrigins } : {}));
app.use(express.json()); // Allows reading JSON data from React

// Connect to Prisma Postgres (SRS Section 6.6)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// TEST CONNECTION
pool.connect((err, client, release) => {
  if (err) return console.error('DB Connection Error:', err.stack);
  console.log('✅ Connected to PostgreSQL!');
  release();
});

// Never send the password hash back to the browser
const publicUser = ({ password_hash, ...user }) => user;

// Health check (Render uses this to know the service is up)
app.get('/', (req, res) => res.json({ status: 'ok' }));

// ==========================================
// 1. REGISTER ROUTE (SRS Section 7.1 & NFR-03)
// ==========================================
app.post('/api/register', async (req, res) => {
  const { full_name, email, phone, password } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO customers (full_name, email, phone, password_hash) VALUES ($1, $2, $3, $4) RETURNING *',
      [full_name, email, phone, hashedPassword]
    );
    res.status(201).json({ message: 'Registration successful!', user: publicUser(result.rows[0]) });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ message: 'Email already exists.' });
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// ==========================================
// 2. LOGIN ROUTE
// ==========================================
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const user = await pool.query('SELECT * FROM customers WHERE email = $1', [email]);
    if (user.rows.length === 0) return res.status(401).json({ message: 'Invalid credentials' });
    
    const validPass = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!validPass) return res.status(401).json({ message: 'Invalid credentials' });
    
    res.json({ message: 'Login successful!', user: publicUser(user.rows[0]) });
  } catch (err) {
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// LOGOUT (sessions are kept in the browser, so nothing to clear server-side)
app.post('/api/logout', (req, res) => {
  res.json({ message: 'Logged out.' });
});

// ==========================================
// 3. FR 1: ADD VEHICLE ROUTE
// ==========================================
app.post('/api/vehicles', async (req, res) => {
  const { customer_id, make, model, plate_number, year } = req.body;
  
  try {
    const result = await pool.query(
      'INSERT INTO vehicles (customer_id, make, model, plate_number, year) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [customer_id, make, model, plate_number, year]
    );
    res.status(201).json({ message: 'Vehicle added successfully!', vehicle: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ message: 'Plate number already exists.' });
    res.status(500).json({ message: 'Server error adding vehicle.' });
  }
});

// ==========================================
// 4. FR 2: VIEW BOOKINGS ROUTE
// ==========================================
app.get('/api/bookings/:customerId', async (req, res) => {
  const { customerId } = req.params;
  
  try {
    const customerCheck = await pool.query('SELECT customer_id FROM customers WHERE customer_id = $1', [customerId]);
    if (customerCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    const result = await pool.query(
      `SELECT booking_id, problem_description, location, status, created_at 
       FROM bookings 
       WHERE customer_id = $1 
       ORDER BY created_at DESC`, 
      [customerId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Database error:', err.message);
    res.status(500).json({ message: 'Server error fetching bookings', error: err.message });
  }
});

// ==========================================
// 5. START SERVER (MUST BE AT THE VERY BOTTOM)
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});