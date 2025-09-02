module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/utils/jest.setup.js'],
  testTimeout: 45000,
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.js',
    '<rootDir>/tests/integration/**/*.test.js'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/tests/utils.test.js',
    '<rootDir>/tests/run.js'
  ],
  collectCoverageFrom: [
    'utils/**/*.js',
    'controllers/**/*.js',
    'models/**/*.js',
    '!**/node_modules/**'
  ],
};
