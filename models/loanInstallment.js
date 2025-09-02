const { getDb } = require('../config/database');
const { ObjectId } = require('mongodb');

class LoanInstallmentModel {
    static collection() {
        const db = getDb();
        return db.collection('loanInstallments');
    }

    static async bulkInsert(installments) {
        if (!Array.isArray(installments) || installments.length === 0) return { insertedCount: 0 };
        const result = await LoanInstallmentModel.collection().insertMany(installments);
        return result;
    }

    static async listByLoan(loanId) {
        return await LoanInstallmentModel.collection()
            .find({ loanId: new ObjectId(loanId) })
            .sort({ periodNo: 1 })
            .toArray();
    }

    static async findByLoanAndPeriod(loanId, periodNo) {
        return await LoanInstallmentModel.collection().findOne({ loanId: new ObjectId(loanId), periodNo: Number(periodNo) });
    }

    static async markPaid({ loanId, periodNo, paidAmount, paidDate = new Date() }) {
        const res = await LoanInstallmentModel.collection().updateOne(
            { loanId: new ObjectId(loanId), periodNo: Number(periodNo) },
            { $set: { paidAmount: Number(paidAmount), paidDate: new Date(paidDate), status: 'paid' } }
        );
        return res.modifiedCount > 0;
    }
}

module.exports = LoanInstallmentModel;

