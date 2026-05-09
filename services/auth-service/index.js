require('dotenv').config();

// ================= IMPORTS =================
const express = require('express');
const morgan = require('morgan');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const client = require('prom-client');
const authMiddleware = require('./middleware/authMiddleware');
const { validateRegister, validateLogin, validateRefresh, validateLogout } = require('./middleware/validationMiddleware');
const { handleError } = require('./utils/errorHandler');

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
app.post('/register', validateRegister, async (req, res) => {
  const { email, password, role } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      'INSERT INTO users (email, password, role) VALUES ($1, $2, $3)',
      [email, hashedPassword, role]
    );

    res.status(201).json({ message: 'User registered successfully' });

  } catch (err) {
    handleError(res, err, 'Error registering user');
  }
});

// =========== Login API =========
app.post('/login', validateLogin, async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'Invalid email or password'
      });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'Invalid email or password'
      });
    }

    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    await pool.query(
      'DELETE FROM refresh_tokens WHERE user_id = $1',
      [user.id]
    );

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token) VALUES ($1, $2)',
      [user.id, refreshToken]
    );

    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken
    });

  } catch (err) {
    handleError(res, err, 'Error during login');
  }
});
// ================= Logout =================
app.post('/logout', validateLogout, async (req, res) => {
  const { refreshToken } = req.body;

  try {
    await pool.query(
      'DELETE FROM refresh_tokens WHERE token = $1',
      [refreshToken]
    );

    res.json({ message: 'Logged out successfully' });

  } catch (err) {
    handleError(res, err, 'Logout failed');
  }
});

// ================= refresh =================
app.post('/refresh', validateRefresh, async (req, res) => {
  const { refreshToken } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token = $1',
      [refreshToken]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        error: 'Forbidden',
        details: 'Invalid or expired refresh token'
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const newAccessToken = jwt.sign(
      { userId: decoded.userId },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({ accessToken: newAccessToken });

  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(403).json({
        error: 'Forbidden',
        details: 'Refresh token has expired'
      });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({
        error: 'Forbidden',
        details: 'Invalid token format'
      });
    }
    handleError(res, err, 'Token refresh failed');
  }
});
// ================= Role Based ============
const roleMiddleware = require('./middleware/roleMiddleware');
// Admin only
app.get('/admin', authMiddleware, roleMiddleware(['admin']), (req, res) => {
  res.json({ message: 'Welcome Admin' });
});

// Instructor only
app.get('/instructor', authMiddleware, roleMiddleware(['instructor']), (req, res) => {
  res.json({ message: 'Welcome Instructor' });
});

// Student only
app.get('/student', authMiddleware, roleMiddleware(['student']), (req, res) => {
  res.json({ message: 'Welcome Student' });
});
// ================= APP INIT =================

// Protected
app.get('/profile', authMiddleware, (req, res) => {
  res.json({ message: 'Protected data', user: req.user });
});

// ================= START =================
app.listen(process.env.PORT, () => {
  console.log(`Auth service running on port ${process.env.PORT}`);
});
