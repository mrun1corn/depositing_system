const { equalSplit } = require('../../utils/split');

describe('equalSplit', () => {
  test('sums exactly and adjusts last for odd cents', () => {
    const members = ['a','b','c'];
    const total = 100.01;
    const shares = equalSplit(total, members);
    const sum = Math.round(shares.reduce((s, r) => s + r.amount, 0) * 100) / 100;
    expect(sum).toBe(100.01);
    expect(shares.length).toBe(3);
  });
  test('handles negative amounts', () => {
    const members = ['a','b'];
    const shares = equalSplit(-50, members);
    const sum = Math.round(shares.reduce((s, r) => s + r.amount, 0) * 100) / 100;
    expect(sum).toBe(-50);
  });
});

