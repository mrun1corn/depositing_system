const { getDb } = require('../config/database');
const { ObjectId } = require('mongodb');

class LoanModel {
    static collection() {
        const db = getDb();
        return db.collection('loans');
    }

    static async createLoan({
        borrowerUserId,
        purpose,
        principalAmount,
        interestRateBp,
        durationMonths,
        startDate,
        dueDayStart = 1,
        dueDayEnd = 10,
        createdBy,
    }) {
        const doc = {
            borrowerUserId: new ObjectId(borrowerUserId),
            purpose,
            principalAmount: Number(principalAmount),
            interestRateBp: Number(interestRateBp),
            durationMonths: Number(durationMonths),
            startDate: new Date(startDate),
            dueDayStart: Number(dueDayStart),
            dueDayEnd: Number(dueDayEnd),
            status: 'active',
            createdBy: createdBy ? new ObjectId(createdBy) : null,
            createdAt: new Date(),
        };
        const result = await LoanModel.collection().insertOne(doc);
        return { ...doc, _id: result.insertedId };
    }

    static async findById(id) {
        return await LoanModel.collection().findOne({ _id: new ObjectId(id) });
    }

    static async listByBorrower(borrowerUserId) {
        return await LoanModel.collection()
            .find({ borrowerUserId: new ObjectId(borrowerUserId) })
            .toArray();
    }

    static async listAll(filter = {}) {
        return await LoanModel.collection().find(filter).toArray();
    }

    static async setStatus(id, status) {
        await LoanModel.collection().updateOne(
            { _id: new ObjectId(id) },
            { $set: { status } }
        );
    }
}

module.exports = LoanModel;

