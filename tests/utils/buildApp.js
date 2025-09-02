const express = require('express');
const cors = require('cors');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cors());
  app.use('/api/auth', require('../../routes/auth'));
  app.use('/api', require('../../routes/protected'));
  return app;
}

module.exports = { buildApp };

