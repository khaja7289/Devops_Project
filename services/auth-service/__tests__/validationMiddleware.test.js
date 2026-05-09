const {
  validateRegister,
  validateLogin,
  validateRefresh,
  validateLogout,
  isValidEmail,
  isValidPassword
} = require('../middleware/validationMiddleware');

describe('Validation Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('Email validation', () => {
    test('should accept valid email', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
    });

    test('should reject invalid email', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
    });
  });

  describe('Password validation', () => {
    test('should accept password with 6+ characters', () => {
      expect(isValidPassword('password123')).toBe(true);
    });

    test('should reject password less than 6 characters', () => {
      expect(isValidPassword('pass')).toBe(false);
      expect(isValidPassword('')).toBe(false);
    });
  });

  describe('validateRegister', () => {
    test('should pass with valid data', () => {
      req.body = {
        email: 'newuser@example.com',
        password: 'password123',
        role: 'student'
      };

      validateRegister(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('should reject missing fields', () => {
      req.body = { email: 'user@example.com' };
      validateRegister(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject invalid email', () => {
      req.body = {
        email: 'invalid-email',
        password: 'password123',
        role: 'student'
      };

      validateRegister(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should reject short password', () => {
      req.body = {
        email: 'user@example.com',
        password: 'pass',
        role: 'student'
      };

      validateRegister(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should reject invalid role', () => {
      req.body = {
        email: 'user@example.com',
        password: 'password123',
        role: 'superuser'
      };

      validateRegister(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateLogin', () => {
    test('should pass with valid credentials', () => {
      req.body = {
        email: 'user@example.com',
        password: 'password123'
      };

      validateLogin(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('should reject missing email', () => {
      req.body = { password: 'password123' };
      validateLogin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject invalid email format', () => {
      req.body = {
        email: 'invalid-email',
        password: 'password123'
      };

      validateLogin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateRefresh', () => {
    test('should pass with valid token', () => {
      req.body = { refreshToken: 'valid.jwt.token' };
      validateRefresh(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should reject missing token', () => {
      req.body = {};
      validateRefresh(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should reject empty token', () => {
      req.body = { refreshToken: '' };
      validateRefresh(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateLogout', () => {
    test('should pass with valid token', () => {
      req.body = { refreshToken: 'valid.jwt.token' };
      validateLogout(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should reject missing token', () => {
      req.body = {};
      validateLogout(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
