const { buildTransactions } = require('../../utils/transactions');

describe('transactions builder', () => {
  test('builds docs with userId, loanId, type, amount, meta, createdAt', () => {
    const shares = [{ userId: 'u1', amount: 10 }, { userId: 'u2', amount: -10 }];
    const txns = buildTransactions({ shares, loanId: 'l1', txnType: 'TEST', meta: { foo: 'bar' } });
    expect(txns.length).toBe(2);
    txns.forEach(t => {
      expect(t.userId).toBeDefined();
      expect(t.loanId).toBe('l1');
      expect(t.txnType).toBe('TEST');
      expect(typeof t.amount).toBe('number');
      expect(t.meta).toEqual({ foo: 'bar' });
      expect(t.createdAt instanceof Date).toBe(true);
    });
  });
});

