const { round2 } = require('./rounding');

function interestBreakdown(loanInstallments = [], memberCount = 1) {
    const totalInterest = round2(loanInstallments.reduce((sum, inst) => sum + Number(inst.interestDue || 0), 0));
    const perUserShare = round2(totalInterest / Math.max(1, Number(memberCount)));
    return { totalInterest, perUserShare };
}

module.exports = { interestBreakdown };

