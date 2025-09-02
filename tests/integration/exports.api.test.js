process.env.NODE_ENV = 'test';

const request = require('supertest');
const { startMemoryMongo, stopMemoryMongo } = require('../utils/testDb');
const { connectToMongo } = require('../../config/database');
const { buildApp } = require('../utils/buildApp');
const { registerAndLogin } = require('../utils/authHelpers');
const path = require('path');
const smPath = path.join(process.cwd(), 'socketManager.js');
require.cache[require.resolve(smPath)] = { exports: { init: () => ({}), getIo: () => ({ emit: () => {} }) } };

describe('Exports small sets', () => {
  let app, accToken;

  beforeAll(async () => {
    await startMemoryMongo();
    await connectToMongo();
    app = buildApp();
    await registerAndLogin(app, { username: 'admin1', password: 'pass123', role: 'admin' });
    accToken = await registerAndLogin(app, { username: 'acc1', password: 'pass123', role: 'accountant' });
    await registerAndLogin(app, { username: 'user1', password: 'pass123', role: 'user' });
    await request(app).post('/api/loans').set('Authorization', `Bearer ${accToken}`).send({ borrowerUsername: 'user1', principalAmount: 500, interestRateBp: 1200, durationMonths: 1 }).expect(201);
  });

  afterAll(async () => { await stopMemoryMongo(); });

  test('POST /api/exports loans returns CSV directly', async () => {
    const res = await request(app)
      .post('/api/exports')
      .set('Authorization', `Bearer ${accToken}`)
      .send({ type: 'loans', filters: { status: 'active,closed' }, format: 'csv' })
      .expect(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text.split('\n')[0]).toContain('Loan ID');
  });
});

