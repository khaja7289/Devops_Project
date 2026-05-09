module.exports = {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['/node_modules/'],
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: ['index.js', 'middleware/**/*.js', 'utils/**/*.js'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js']
};
