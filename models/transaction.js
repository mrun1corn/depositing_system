const { getDb } = require('../config/database');
const { ObjectId } = require('mongodb');

const TXN_TYPES = {
    DEPOSIT: 'DEPOSIT',
    WITHDRAW: 'WITHDRAW',
    LOAN_ISSUE_SPLIT_DEBIT: 'LOAN_ISSUE_SPLIT_DEBIT',
    EMI_REPAYMENT_SPLIT_CREDIT: 'EMI_REPAYMENT_SPLIT_CREDIT',
    ADJUSTMENT: 'ADJUSTMENT',
};

class TransactionModel {
    static collection() {
        const db = getDb();
        return db.collection('transactions');
    }

    static async insertMany(transactions) {
        if (!Array.isArray(transactions) || transactions.length === 0) return { insertedCount: 0 };
        const result = await TransactionModel.collection().insertMany(transactions);
        return result;
    }

    static async listByLoan(loanId) {
        return await TransactionModel.collection().find({ loanId: new ObjectId(loanId) }).toArray();
    }

    static async listByUser(userId) {
        return await TransactionModel.collection().find({ userId: new ObjectId(userId) }).toArray();
    }
}

module.exports = { TransactionModel, TXN_TYPES };

