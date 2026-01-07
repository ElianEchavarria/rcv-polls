module.exports = {
  testEnvironment: "node",
  setupFiles: ["<rootDir>/jest.setup.js"],
  testMatch: ["**/__tests__/**/*.test.js", "**/*.test.js"],
  collectCoverageFrom: [
    "**/*.js",
    "!**/node_modules/**",
    "!**/__tests__/**",
    "!**/coverage/**",
    "!jest.config.js",
    "!jest.setup.js",
    "!app.js",
  ],
  coverageDirectory: "coverage",
  verbose: true,
  testTimeout: 10000,
};

