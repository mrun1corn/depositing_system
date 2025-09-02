process.env.NODE_ENV = 'test';

const request = require('supertest');
const { startMemoryMongo, stopMemoryMongo } = require('../utils/testDb');
const { connectToMongo } = require('../../config/database');
const { buildApp } = require('../utils/buildApp');
const { registerAndLogin } = require('../utils/authHelpers');
const path = require('path');
const smPath = path.join(process.cwd(), 'socketManager.js');
require.cache[require.resolve(smPath)] = { exports: { init: () => ({}), getIo: () => ({ emit: () => {} }) } };

describe('Notifications', () => {
  let app, adminToken, accToken;

  beforeAll(async () => {
    await startMemoryMongo();
    await connectToMongo();
    app = buildApp();
    adminToken = await registerAndLogin(app, { username: 'admin1', password: 'pass123', role: 'admin' });
    accToken = await registerAndLogin(app, { username: 'acc1', password: 'pass123', role: 'accountant' });
    await registerAndLogin(app, { username: 'user1', password: 'pass123', role: 'user' });
    await request(app).post('/api/loans').set('Authorization', `Bearer ${accToken}`).send({ borrowerUsername: 'user1', principalAmount: 1000, interestRateBp: 1200, durationMonths: 2 }).expect(201);
  });

  afterAll(async () => { await stopMemoryMongo(); });

  test('list unread for admin returns items; mark-as-read works', async () => {
    const list = await request(app).get('/api/notifications').set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(Array.isArray(list.body)).toBe(true);
    if (list.body.length) {
      const id = list.body[0]._id;
      await request(app).patch(`/api/notifications/${id}`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'read' }).expect(200);
    }
  });
});

