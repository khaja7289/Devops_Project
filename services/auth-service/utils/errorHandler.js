// Standardized error response handler
const handleError = (res, error, defaultMessage = 'Server error') => {
  console.error('Error:', error);

  if (error.code === '23505') { // PostgreSQL unique constraint
    return res.status(409).json({
      error: 'Conflict',
      details: 'Email already registered'
    });
  }

  if (error.code === '23503') { // PostgreSQL foreign key constraint
    return res.status(400).json({
      error: 'Invalid reference',
      details: 'Referenced record does not exist'
    });
  }

  if (error.code === 'ECONNREFUSED') {
    return res.status(503).json({
      error: 'Service unavailable',
      details: 'Database connection failed'
    });
  }

  res.status(500).json({
    error: 'Internal Server Error',
    details: defaultMessage
  });
};

module.exports = { handleError };
