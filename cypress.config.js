const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:3000',
    defaultCommandTimeout: 8000,
    video: false,
    supportFile: false,
  },
});

