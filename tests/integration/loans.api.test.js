process.env.NODE_ENV = 'test';

const request = require('supertest');
const { startMemoryMongo, stopMemoryMongo } = require('../utils/testDb');
const { connectToMongo } = require('../../config/database');
const { buildApp } = require('../utils/buildApp');
const { registerAndLogin } = require('../utils/authHelpers');

// Silence socket.io in controllers
const path = require('path');
const smPath = path.join(process.cwd(), 'socketManager.js');
require.cache[require.resolve(smPath)] = { exports: { init: () => ({}), getIo: () => ({ emit: () => {} }) } };

describe('Loans API', () => {
  let app;
  let adminToken, accountantToken, userToken;

  beforeAll(async () => {
    await startMemoryMongo();
    await connectToMongo();
    app = buildApp();
    adminToken = await registerAndLogin(app, { username: 'admin1', password: 'pass123', role: 'admin' });
    accountantToken = await registerAndLogin(app, { username: 'acc1', password: 'pass123', role: 'accountant' });
    userToken = await registerAndLogin(app, { username: 'user1', password: 'pass123', role: 'user' });
  });

  afterAll(async () => {
    await stopMemoryMongo();
  });

  test('POST /api/loans creates loan+installments+split debits; RBAC denies user', async () => {
    await request(app).post('/api/loans').set('Authorization', `Bearer ${userToken}`).send({ borrowerUsername: 'user1', principalAmount: 6000, interestRateBp: 1200, durationMonths: 6 }).expect(403);

    const res = await request(app).post('/api/loans').set('Authorization', `Bearer ${accountantToken}`).send({ borrowerUsername: 'user1', purpose: 'Test', principalAmount: 6000, interestRateBp: 1200, durationMonths: 6, dueDayStart: 1, dueDayEnd: 10 }).expect(201);
    expect(res.body.loan).toBeDefined();
    expect(res.body.installments.length).toBe(6);

    const { getDb } = require('../../config/database');
    const db = getDb();
    const txnCount = await db.collection('transactions').countDocuments({ loanId: res.body.loan._id, txnType: 'LOAN_ISSUE_SPLIT_DEBIT' });
    expect(txnCount).toBeGreaterThanOrEqual(3);
  });
});

