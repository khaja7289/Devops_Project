// Mock database before loading app
jest.mock('pg');

// Set test environment variables
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_NAME = 'test_db';
process.env.DB_PORT = '5432';
process.env.JWT_SECRET = 'test_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
process.env.PORT = '3000';

// Suppress morgan logs during tests
jest.mock('morgan', () => () => (req, res, next) => next());
