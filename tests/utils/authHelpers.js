const request = require('supertest');

async function registerAndLogin(app, { username, password, role }) {
  await request(app).post('/api/auth/register').send({ username, password, role }).expect(201);
  const res = await request(app).post('/api/auth/login').send({ username, password }).expect(200);
  const token = res.body.token;
  return token;
}

module.exports = { registerAndLogin };

