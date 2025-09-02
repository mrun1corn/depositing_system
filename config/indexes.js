async function ensureIndexes(db) {
    // users: unique username
    try {
        await db.collection('users').createIndexes([
            { key: { username: 1 }, name: 'uniq_username', unique: true },
            { key: { role: 1 }, name: 'role_idx' },
        ]);
    } catch (e) {
        // ignore index create errors (e.g., duplicates), surface minimal info
        console.warn('users index creation warning:', e.message);
    }

    // loans: borrowerUserId, status
    try {
        await db.collection('loans').createIndexes([
            { key: { borrowerUserId: 1 }, name: 'loan_borrowerUserId_idx' },
            { key: { status: 1 }, name: 'loan_status_idx' },
            { key: { createdAt: -1 }, name: 'loan_createdAt_idx' },
        ]);
    } catch (e) {
        console.warn('loans index creation warning:', e.message);
    }

    // loanInstallments: loanId, dueDate
    try {
        await db.collection('loanInstallments').createIndexes([
            { key: { loanId: 1, periodNo: 1 }, name: 'loanInstallments_loan_period_idx' },
            { key: { dueDate: 1 }, name: 'loanInstallments_dueDate_idx' },
            { key: { status: 1 }, name: 'loanInstallments_status_idx' },
        ]);
    } catch (e) {
        console.warn('loanInstallments index creation warning:', e.message);
    }

    // transactions: userId, loanId, txnType
    try {
        await db.collection('transactions').createIndexes([
            { key: { userId: 1 }, name: 'transactions_userId_idx' },
            { key: { loanId: 1 }, name: 'transactions_loanId_idx' },
            { key: { txnType: 1 }, name: 'transactions_txnType_idx' },
            { key: { createdAt: -1 }, name: 'transactions_createdAt_idx' },
        ]);
    } catch (e) {
        console.warn('transactions index creation warning:', e.message);
    }

    // notifications: userId, role, status, createdAt
    try {
        await db.collection('notifications').createIndexes([
            { key: { userId: 1 }, name: 'notifications_userId_idx' },
            { key: { role: 1 }, name: 'notifications_role_idx' },
            { key: { status: 1 }, name: 'notifications_status_idx' },
            { key: { createdAt: -1 }, name: 'notifications_createdAt_idx' },
        ]);
    } catch (e) {
        console.warn('notifications index creation warning:', e.message);
    }

    // exportJobs: status, createdAt
    try {
        await db.collection('exportJobs').createIndexes([
            { key: { status: 1 }, name: 'exportJobs_status_idx' },
            { key: { createdAt: -1 }, name: 'exportJobs_createdAt_idx' },
        ]);
    } catch (e) {
        console.warn('exportJobs index creation warning:', e.message);
    }

    // audit_logs: actorId, action, resource, createdAt
    try {
        await db.collection('audit_logs').createIndexes([
            { key: { actorId: 1 }, name: 'audit_actor_idx' },
            { key: { action: 1 }, name: 'audit_action_idx' },
            { key: { resource: 1 }, name: 'audit_resource_idx' },
            { key: { createdAt: -1 }, name: 'audit_createdAt_idx' },
        ]);
    } catch (e) {
        console.warn('audit_logs index creation warning:', e.message);
    }
}

module.exports = { ensureIndexes };
