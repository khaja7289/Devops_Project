const { handleError } = require('../utils/errorHandler');

describe('Error Handler', () => {
  let res;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    console.error = jest.fn();
  });

  test('should handle unique constraint violation (23505)', () => {
    const error = new Error('Unique constraint violation');
    error.code = '23505';

    handleError(res, error);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Conflict',
      details: 'Email already registered'
    });
  });

  test('should handle foreign key constraint violation (23503)', () => {
    const error = new Error('Foreign key constraint violation');
    error.code = '23503';

    handleError(res, error);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Invalid reference',
      details: 'Referenced record does not exist'
    });
  });

  test('should handle connection refused error', () => {
    const error = new Error('Connection refused');
    error.code = 'ECONNREFUSED';

    handleError(res, error);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Service unavailable',
      details: 'Database connection failed'
    });
  });

  test('should handle generic errors with default message', () => {
    const error = new Error('Unknown error');

    handleError(res, error, 'Custom error message');

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Internal Server Error',
      details: 'Custom error message'
    });
  });

  test('should log error to console', () => {
    const error = new Error('Test error');
    handleError(res, error);

    expect(console.error).toHaveBeenCalledWith('Error:', error);
  });
});
