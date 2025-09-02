function buildTransactions({ shares, loanId = null, txnType, meta = {} }) {
    const now = new Date();
    return shares.map(s => ({
        userId: s.userId,
        loanId: loanId ? loanId : null,
        txnType,
        amount: s.amount,
        meta,
        createdAt: now,
    }));
}

module.exports = { buildTransactions };

