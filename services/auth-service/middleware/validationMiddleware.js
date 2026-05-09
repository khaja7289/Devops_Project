// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength
const isValidPassword = (password) => {
  return password && password.length >= 6;
};

// Validate register request
const validateRegister = (req, res, next) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({
      error: 'Missing required fields',
      details: 'email, password, and role are required'
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      error: 'Invalid email format',
      details: 'Please provide a valid email address'
    });
  }

  if (!isValidPassword(password)) {
    return res.status(400).json({
      error: 'Invalid password',
      details: 'Password must be at least 6 characters long'
    });
  }

  const validRoles = ['student', 'instructor', 'admin'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({
      error: 'Invalid role',
      details: `Role must be one of: ${validRoles.join(', ')}`
    });
  }

  next();
};

// Validate login request
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'Missing required fields',
      details: 'email and password are required'
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      error: 'Invalid email format',
      details: 'Please provide a valid email address'
    });
  }

  next();
};

// Validate refresh token request
const validateRefresh = (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      error: 'Missing required fields',
      details: 'refreshToken is required'
    });
  }

  if (typeof refreshToken !== 'string' || refreshToken.trim() === '') {
    return res.status(400).json({
      error: 'Invalid token format',
      details: 'refreshToken must be a non-empty string'
    });
  }

  next();
};

// Validate logout request
const validateLogout = (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      error: 'Missing required fields',
      details: 'refreshToken is required'
    });
  }

  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateRefresh,
  validateLogout,
  isValidEmail,
  isValidPassword
};
