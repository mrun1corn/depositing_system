const { round2 } = require('./rounding');

function equalSplit(totalAmount, members) {
    if (!Array.isArray(members) || members.length === 0) {
        throw new Error('members is required and must be non-empty');
    }
    const N = members.length;
    const absTotal = Math.abs(Number(totalAmount));
    const totalCents = Math.round(absTotal * 100);
    const baseCents = Math.floor(totalCents / N);
    const sharesCents = new Array(N).fill(baseCents);
    const used = baseCents * (N - 1);
    sharesCents[N - 1] = totalCents - used; // adjust last to exact sum
    const sign = totalAmount < 0 ? -1 : 1;
    return members.map((userId, idx) => ({ userId, amount: round2(sign * (sharesCents[idx] / 100)) }));
}

module.exports = { equalSplit };
