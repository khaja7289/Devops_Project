const request = require('supertest');

// Mock database
const { Pool } = require('pg');
jest.mock('pg');

describe('Auth Service API', () => {
  let app;
  let mockPool;

  beforeEach(() => {
    // Clear module cache and create fresh app
    jest.resetModules();
    jest.clearAllMocks();

    // Mock Pool
    mockPool = {
      query: jest.fn()
    };
    Pool.mockImplementation(() => mockPool);

    // Load app after mocking
    app = require('../index');
  });

  describe('GET /health', () => {
    test('should return health status', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.text).toContain('Auth Service is running');
    });
  });

  describe('POST /register', () => {
    test('should register user successfully', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/register')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
          role: 'student'
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('User registered successfully');
    });

    test('should reject missing email', async () => {
      const res = await request(app)
        .post('/register')
        .send({
          password: 'password123',
          role: 'student'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Missing required fields');
    });

    test('should reject invalid email', async () => {
      const res = await request(app)
        .post('/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          role: 'student'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid email format');
    });

    test('should reject short password', async () => {
      const res = await request(app)
        .post('/register')
        .send({
          email: 'user@example.com',
          password: 'short',
          role: 'student'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid password');
    });

    test('should reject duplicate email', async () => {
      const error = new Error('Unique constraint violation');
      error.code = '23505';
      mockPool.query.mockRejectedValueOnce(error);

      const res = await request(app)
        .post('/register')
        .send({
          email: 'existing@example.com',
          password: 'password123',
          role: 'student'
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Conflict');
    });
  });

  describe('POST /login', () => {
    test('should return 400 for missing credentials', async () => {
      const res = await request(app)
        .post('/login')
        .send({
          email: 'user@example.com'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Missing required fields');
    });

    test('should return 401 for invalid email', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    test('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/login')
        .send({
          email: 'invalid-email',
          password: 'password123'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid email format');
    });
  });

  describe('POST /refresh', () => {
    test('should reject missing refresh token', async () => {
      const res = await request(app)
        .post('/refresh')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Missing required fields');
    });

    test('should reject invalid refresh token', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/refresh')
        .send({
          refreshToken: 'invalid.token'
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });

    test('should reject empty refresh token', async () => {
      const res = await request(app)
        .post('/refresh')
        .send({
          refreshToken: ''
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /logout', () => {
    test('should reject missing refresh token', async () => {
      const res = await request(app)
        .post('/logout')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Missing required fields');
    });

    test('should logout successfully', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/logout')
        .send({
          refreshToken: 'valid.token'
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged out successfully');
    });
  });

  describe('GET /metrics', () => {
    test('should return Prometheus metrics', async () => {
      const res = await request(app).get('/metrics');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
    });
  });
});
