require('dotenv').config();

// ================= IMPORTS =================
const express = require('express');
const morgan = require('morgan');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const client = require('prom-client');
const authMiddleware = require('./middleware/authMiddleware');

// ================= APP INIT =================
const app = express();

// ================= MIDDLEWARE =================
app.use(morgan((tokens, req, res) => {
  return JSON.stringify({
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: Number(tokens.status(req, res)),
    response_time: Number(tokens['response-time'](req, res)),
    timestamp: new Date().toISOString()
  });
}));

app.use(express.json());

// ================= DATABASE =================
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

// ================= METRICS =================
const register = new client.Registry();

client.collectDefaultMetrics({ register });

const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of requests',
  labelNames: ['method', 'route', 'status'],
});

register.registerMetric(httpRequestCounter);

// Metrics middleware
app.use((req, res, next) => {
  res.on('finish', () => {
    httpRequestCounter.inc({
      method: req.method,
      route: req.path,
      status: res.statusCode,
    });
  });
  next();
});

// ================= ROUTES =================

// Health
app.get('/health', (req, res) => {
  res.send('Auth Service is running');
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Register API
app.post('/register', async (req, res) => {
  const { email, password, role } = req.body;

  try {
    // 🔐 hash password automatically
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      'INSERT INTO users (email, password, role) VALUES ($1, $2, $3)',
      [email, hashedPassword, role]
    );

    res.json({ message: 'User registered successfully' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error registering user' });
  }
});

// Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ message: 'Login successful', token });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Protected
app.get('/profile', authMiddleware, (req, res) => {
  res.json({ message: 'Protected data', user: req.user });
});

// ================= START =================
app.listen(process.env.PORT, () => {
  console.log(`Auth service running on port ${process.env.PORT}`);
});
