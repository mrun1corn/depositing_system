process.env.NODE_ENV = 'test';

const request = require('supertest');
const { startMemoryMongo, stopMemoryMongo } = require('../utils/testDb');
const { connectToMongo, getDb } = require('../../config/database');
const { buildApp } = require('../utils/buildApp');
const { registerAndLogin } = require('../utils/authHelpers');
const path = require('path');
const smPath = path.join(process.cwd(), 'socketManager.js');
require.cache[require.resolve(smPath)] = { exports: { init: () => ({}), getIo: () => ({ emit: () => {} }) } };

describe('EMI payment API', () => {
  let app, accToken, userToken, loanId, firstInstallmentId;

  beforeAll(async () => {
    await startMemoryMongo();
    await connectToMongo();
    app = buildApp();
    await registerAndLogin(app, { username: 'admin1', password: 'pass123', role: 'admin' });
    accToken = await registerAndLogin(app, { username: 'acc1', password: 'pass123', role: 'accountant' });
    userToken = await registerAndLogin(app, { username: 'user1', password: 'pass123', role: 'user' });
    const res = await request(app).post('/api/loans').set('Authorization', `Bearer ${accToken}`).send({ borrowerUsername: 'user1', purpose: 'Medical', principalAmount: 1200, interestRateBp: 1200, durationMonths: 2, dueDayStart: 1, dueDayEnd: 10 }).expect(201);
    loanId = res.body.loan._id;
    const db = getDb();
    const inst = await db.collection('loanInstallments').find({ loanId: res.body.loan._id }).sort({ periodNo: 1 }).toArray();
    firstInstallmentId = String(inst[0]._id);
  });

  afterAll(async () => { await stopMemoryMongo(); });

  test('repays an installment and updates status', async () => {
    const db = getDb();
    const instBefore = await db.collection('loanInstallments').findOne({ _id: new (require('mongodb').ObjectId)(firstInstallmentId) });
    await request(app).post(`/api/loans/${loanId}/emi-payment`).set('Authorization', `Bearer ${accToken}`).send({ installmentId: firstInstallmentId, paidAmount: instBefore.totalDue }).expect(200);
    const instAfter = await db.collection('loanInstallments').findOne({ _id: new (require('mongodb').ObjectId)(firstInstallmentId) });
    expect(instAfter.status).toBe('paid');
  });
});

