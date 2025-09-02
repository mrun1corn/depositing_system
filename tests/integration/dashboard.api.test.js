process.env.NODE_ENV = 'test';

const request = require('supertest');
const { startMemoryMongo, stopMemoryMongo } = require('../utils/testDb');
const { connectToMongo } = require('../../config/database');
const { buildApp } = require('../utils/buildApp');
const { registerAndLogin } = require('../utils/authHelpers');
const path = require('path');
const smPath = path.join(process.cwd(), 'socketManager.js');
require.cache[require.resolve(smPath)] = { exports: { init: () => ({}), getIo: () => ({ emit: () => {} }) } };

describe('Dashboard summary', () => {
  let app, accToken;

  beforeAll(async () => {
    await startMemoryMongo();
    await connectToMongo();
    app = buildApp();
    await registerAndLogin(app, { username: 'admin1', password: 'pass123', role: 'admin' });
    accToken = await registerAndLogin(app, { username: 'acc1', password: 'pass123', role: 'accountant' });
    await registerAndLogin(app, { username: 'user1', password: 'pass123', role: 'user' });
    await request(app).post('/api/loans').set('Authorization', `Bearer ${accToken}`).send({ borrowerUsername: 'user1', purpose: 'Seed', principalAmount: 1000, interestRateBp: 1200, durationMonths: 2 }).expect(201);
  });

  afterAll(async () => { await stopMemoryMongo(); });

  test('GET /api/dashboard/summary returns totals', async () => {
    const res = await request(app).get('/api/dashboard/summary').set('Authorization', `Bearer ${accToken}`).expect(200);
    expect(res.body).toHaveProperty('totalAmount');
    expect(res.body).toHaveProperty('totalLoanIssued');
    expect(res.body).toHaveProperty('remainingBalance');
  });
});

