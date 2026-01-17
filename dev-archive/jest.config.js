module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    'index.js',
    'routes/**/*.js',
    'middleware/**/*.js',
    'models/**/*.js',
    'utils/**/*.js',
    '!node_modules/**',
    '!logs/**',
    '!public/**',
    '!views/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 10000,
  // Ignore Puppeteer downloads
  testPathIgnorePatterns: ['/node_modules/', '/logs/', '/public/'],
  // Environment variables for testing
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  }
};