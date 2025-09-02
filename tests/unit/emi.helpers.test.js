const { generateEmiSchedule } = require('../../utils/emi');
const { round2 } = require('../../utils/rounding');

describe('EMI schedule helper', () => {
  test('generates correct months and sums principal', () => {
    const principal = 50000;
    const months = 12;
    const rateBp = 1200; // 12%
    const start = new Date('2025-09-01T00:00:00Z');
    const schedule = generateEmiSchedule({ principalAmount: principal, interestRateBp: rateBp, durationMonths: months, startDate: start, dueDayStart: 1, dueDayEnd: 10 });
    expect(schedule.length).toBe(months);
    const sumPrincipal = round2(schedule.reduce((s, i) => s + i.principalDue, 0));
    expect(sumPrincipal).toBe(principal);
    schedule.forEach(inst => {
      const day = new Date(inst.dueDate).getUTCDate();
      expect(day).toBeGreaterThanOrEqual(1);
      expect(day).toBeLessThanOrEqual(10);
    });
  });
});

