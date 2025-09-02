const assert = require('assert');
const { generateEmiSchedule } = require('../utils/emi');
const { equalSplit } = require('../utils/split');
const { buildTransactions } = require('../utils/transactions');
const { interestBreakdown } = require('../utils/reports');
const { round2 } = require('../utils/rounding');

(function testEmiSchedule() {
  const principal = 50000;
  const rateBp = 1200; // 12% annual
  const months = 12;
  const start = new Date('2025-09-01T00:00:00Z');
  const schedule = generateEmiSchedule({ principalAmount: principal, interestRateBp: rateBp, durationMonths: months, startDate: start, dueDayStart: 1, dueDayEnd: 10 });

  assert.strictEqual(schedule.length, months, 'Schedule length should equal duration');
  // EMIs should sum principal across principalDue
  const sumPrincipal = round2(schedule.reduce((s, i) => s + i.principalDue, 0));
  assert.strictEqual(sumPrincipal, principal, 'Sum principal should equal loan principal');
  // All status due
  schedule.forEach(i => assert.strictEqual(i.status, 'due'));
})();

(function testEqualSplit() {
  const members = ['a','b','c','d','e'];
  const total = 100;
  const shares = equalSplit(total, members);
  assert.strictEqual(shares.length, members.length);
  const sum = round2(shares.reduce((s, x) => s + x.amount, 0));
  assert.strictEqual(sum, total, 'Split should sum to total');
  // Negatives
  const sharesNeg = equalSplit(-100, members);
  const sumNeg = round2(sharesNeg.reduce((s, x) => s + x.amount, 0));
  assert.strictEqual(sumNeg, -100, 'Negative split should sum to total');
})();

(function testBuildTransactions() {
  const members = ['u1','u2','u3'];
  const shares = equalSplit(90, members);
  const txns = buildTransactions({ shares, loanId: 'loan1', txnType: 'TEST', meta: { foo: 'bar' } });
  assert.strictEqual(txns.length, 3);
  txns.forEach(t => {
    assert.ok(t.createdAt instanceof Date);
    assert.strictEqual(t.txnType, 'TEST');
    assert.strictEqual(String(t.loanId), 'loan1');
    assert.deepStrictEqual(t.meta, { foo: 'bar' });
  });
})();

(function testInterestBreakdown() {
  const inst = [
    { interestDue: 100 },
    { interestDue: 95.55 },
    { interestDue: 80 },
  ];
  const { totalInterest, perUserShare } = interestBreakdown(inst, 5);
  assert.strictEqual(totalInterest, 275.55);
  assert.strictEqual(perUserShare, 55.11);
})();

