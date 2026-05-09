const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

describe('Auth Service - Integration Tests (Real Database)', () => {
  let pool;
  const TEST_JWT_SECRET = 'test_secret_key_12345';
  const TEST_REFRESH_SECRET = 'test_refresh_secret_12345';

  // Test database configuration
  const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5434,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'test_db'
  };

  beforeAll(async () => {
    // Create database connection pool
    pool = new Pool(DB_CONFIG);

    // Wait for database to be ready
    let retries = 10;
    while (retries > 0) {
      try {
        const client = await pool.connect();
        client.release();
        break;
      } catch (err) {
        retries--;
        if (retries === 0) throw err;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  });

  afterAll(async () => {
    // Close database connection
    if (pool) {
      await pool.end();
    }
  });

  beforeEach(async () => {
    // Clean up test data before each test
    try {
      await pool.query('DELETE FROM refresh_tokens');
      await pool.query('DELETE FROM users');
    } catch (err) {
      console.error('Error cleaning up test data:', err);
    }
  });

  describe('User Registration', () => {
    test('should register user successfully', async () => {
      const email = 'newuser@example.com';
      const password = 'password123';
      const role = 'student';

      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await pool.query(
        'INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id, email, role',
        [email, hashedPassword, role]
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].email).toBe(email);
      expect(result.rows[0].role).toBe(role);
    });

    test('should reject duplicate email', async () => {
      const email = 'duplicate@example.com';
      const password = 'password123';
      const role = 'student';
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert first user
      await pool.query(
        'INSERT INTO users (email, password, role) VALUES ($1, $2, $3)',
        [email, hashedPassword, role]
      );

      // Try to insert duplicate
      try {
        await pool.query(
          'INSERT INTO users (email, password, role) VALUES ($1, $2, $3)',
          [email, hashedPassword, role]
        );
        throw new Error('Should have thrown unique constraint error');
      } catch (err) {
        expect(err.code).toBe('23505'); // Unique constraint violation
      }
    });

    test('should retrieve user after registration', async () => {
      const email = 'retrieve@example.com';
      const password = 'password123';
      const role = 'instructor';
      const hashedPassword = await bcrypt.hash(password, 10);

      await pool.query(
        'INSERT INTO users (email, password, role) VALUES ($1, $2, $3)',
        [email, hashedPassword, role]
      );

      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].email).toBe(email);
      expect(result.rows[0].role).toBe(role);

      // Verify password is hashed
      const passwordMatch = await bcrypt.compare(password, result.rows[0].password);
      expect(passwordMatch).toBe(true);
    });
  });

  describe('User Login & Refresh Tokens', () => {
    test('should store and retrieve refresh token', async () => {
      // Create user
      const email = 'login@example.com';
      const password = 'password123';
      const role = 'student';
      const hashedPassword = await bcrypt.hash(password, 10);

      const userResult = await pool.query(
        'INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id',
        [email, hashedPassword, role]
      );
      const userId = userResult.rows[0].id;

      // Create refresh token
      const refreshToken = jwt.sign(
        { userId },
        TEST_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      // Store in database
      await pool.query(
        'INSERT INTO refresh_tokens (user_id, token) VALUES ($1, $2)',
        [userId, refreshToken]
      );

      // Retrieve from database
      const result = await pool.query(
        'SELECT * FROM refresh_tokens WHERE token = $1',
        [refreshToken]
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].user_id).toBe(userId);
      expect(result.rows[0].token).toBe(refreshToken);
    });

    test('should delete token on logout', async () => {
      // Create user
      const userResult = await pool.query(
        'INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id',
        ['logout@example.com', 'hashed', 'student']
      );
      const userId = userResult.rows[0].id;

      // Create refresh token
      const refreshToken = jwt.sign({ userId }, TEST_REFRESH_SECRET, { expiresIn: '7d' });

      await pool.query(
        'INSERT INTO refresh_tokens (user_id, token) VALUES ($1, $2)',
        [userId, refreshToken]
      );

      // Verify token exists
      let result = await pool.query(
        'SELECT * FROM refresh_tokens WHERE token = $1',
        [refreshToken]
      );
      expect(result.rows.length).toBe(1);

      // Delete token (logout)
      await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);

      // Verify token is deleted
      result = await pool.query(
        'SELECT * FROM refresh_tokens WHERE token = $1',
        [refreshToken]
      );
      expect(result.rows.length).toBe(0);
    });

    test('should delete old tokens on re-login', async () => {
      // Create user
      const userResult = await pool.query(
        'INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id',
        ['relogin@example.com', 'hashed', 'student']
      );
      const userId = userResult.rows[0].id;

      // Create first token
      const token1 = jwt.sign({ userId }, TEST_REFRESH_SECRET, { expiresIn: '7d' });
      await pool.query(
        'INSERT INTO refresh_tokens (user_id, token) VALUES ($1, $2)',
        [userId, token1]
      );

      // Verify first token exists
      let result = await pool.query('SELECT COUNT(*) FROM refresh_tokens WHERE user_id = $1', [userId]);
      expect(parseInt(result.rows[0].count)).toBe(1);

      // Login again - delete old and add new
      const token2 = jwt.sign({ userId }, TEST_REFRESH_SECRET, { expiresIn: '7d' });
      await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
      await pool.query(
        'INSERT INTO refresh_tokens (user_id, token) VALUES ($1, $2)',
        [userId, token2]
      );

      // Verify only new token exists
      result = await pool.query('SELECT COUNT(*) FROM refresh_tokens WHERE user_id = $1', [userId]);
      expect(parseInt(result.rows[0].count)).toBe(1);

      result = await pool.query(
        'SELECT * FROM refresh_tokens WHERE user_id = $1',
        [userId]
      );
      expect(result.rows[0].token).toBe(token2);
    });
  });

  describe('Role-Based Access', () => {
    test('should retrieve admin users', async () => {
      const hashedPassword = await bcrypt.hash('password', 10);

      // Insert admin user
      await pool.query(
        'INSERT INTO users (email, password, role) VALUES ($1, $2, $3)',
        ['admin@example.com', hashedPassword, 'admin']
      );

      // Insert non-admin user
      await pool.query(
        'INSERT INTO users (email, password, role) VALUES ($1, $2, $3)',
        ['student@example.com', hashedPassword, 'student']
      );

      // Query admin users
      const result = await pool.query(
        'SELECT * FROM users WHERE role = $1',
        ['admin']
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].role).toBe('admin');
    });

    test('should count users by role', async () => {
      const hashedPassword = await bcrypt.hash('password', 10);

      // Insert multiple users with different roles
      await pool.query(
        'INSERT INTO users (email, password, role) VALUES ($1, $2, $3), ($4, $5, $6), ($7, $8, $9)',
        [
          'admin1@example.com', hashedPassword, 'admin',
          'inst1@example.com', hashedPassword, 'instructor',
          'student1@example.com', hashedPassword, 'student'
        ]
      );

      // Count by role
      const result = await pool.query(
        'SELECT role, COUNT(*) as count FROM users GROUP BY role ORDER BY role'
      );

      expect(result.rows.length).toBe(3);
      expect(result.rows[0].role).toBe('admin');
      expect(parseInt(result.rows[0].count)).toBe(1);
    });
  });

  describe('Data Integrity', () => {
    test('should enforce foreign key constraints', async () => {
      try {
        // Try to insert refresh token with non-existent user
        await pool.query(
          'INSERT INTO refresh_tokens (user_id, token) VALUES ($1, $2)',
          [99999, 'fake-token']
        );
        throw new Error('Should have thrown foreign key constraint error');
      } catch (err) {
        expect(err.code).toBe('23503'); // Foreign key constraint violation
      }
    });

    test('should cascade delete refresh tokens when user deleted', async () => {
      const hashedPassword = await bcrypt.hash('password', 10);

      // Create user
      const userResult = await pool.query(
        'INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id',
        ['cascade@example.com', hashedPassword, 'student']
      );
      const userId = userResult.rows[0].id;

      // Create refresh tokens
      const token = jwt.sign({ userId }, TEST_REFRESH_SECRET, { expiresIn: '7d' });
      await pool.query(
        'INSERT INTO refresh_tokens (user_id, token) VALUES ($1, $2)',
        [userId, token]
      );

      // Verify token exists
      let result = await pool.query('SELECT COUNT(*) FROM refresh_tokens WHERE user_id = $1', [userId]);
      expect(parseInt(result.rows[0].count)).toBe(1);

      // Delete user (should cascade delete tokens)
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);

      // Verify tokens are deleted
      result = await pool.query('SELECT COUNT(*) FROM refresh_tokens WHERE user_id = $1', [userId]);
      expect(parseInt(result.rows[0].count)).toBe(0);
    });
  });

  describe('Performance', () => {
    test('should handle multiple concurrent inserts', async () => {
      const hashedPassword = await bcrypt.hash('password', 10);
      const insertPromises = [];

      // Create 10 concurrent insert promises
      for (let i = 0; i < 10; i++) {
        insertPromises.push(
          pool.query(
            'INSERT INTO users (email, password, role) VALUES ($1, $2, $3)',
            [`user${i}@example.com`, hashedPassword, 'student']
          )
        );
      }

      await Promise.all(insertPromises);

      const result = await pool.query('SELECT COUNT(*) FROM users');
      expect(parseInt(result.rows[0].count)).toBe(10);
    });

    test('should efficiently query with index', async () => {
      const hashedPassword = await bcrypt.hash('password', 10);

      // Insert test user
      await pool.query(
        'INSERT INTO users (email, password, role) VALUES ($1, $2, $3)',
        ['indexed@example.com', hashedPassword, 'student']
      );

      // Query by email (should use index)
      const start = Date.now();
      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        ['indexed@example.com']
      );
      const duration = Date.now() - start;

      expect(result.rows.length).toBe(1);
      expect(duration).toBeLessThan(100); // Should be fast with index
    });
  });
});
