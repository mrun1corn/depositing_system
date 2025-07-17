
const { getDb } = require('../config/database');
const { ObjectId } = require('mongodb');

class Payment {
    constructor(username, amount, paymentDate, paymentMethod) {
        this.username = username;
        this.amount = amount;
        this.paymentDate = paymentDate;
        this.paymentMethod = paymentMethod;
        this.timestamp = new Date();
    }

    async save() {
        const db = getDb();
        const result = await db.collection('payments').insertOne(this);
        return result;
    }

    static async findById(id) {
        const db = getDb();
        const payment = await db.collection('payments').findOne({ _id: new ObjectId(id) });
        return payment;
    }

    static async findAllByUsername(username) {
        const db = getDb();
        const payments = await db.collection('payments').find({ username: username }).toArray();
        return payments;
    }

    static async findAll() {
        const db = getDb();
        const payments = await db.collection('payments').find({}).toArray();
        return payments;
    }

    static async update(id, updatedPayment) {
        const db = getDb();
        const result = await db.collection('payments').updateOne({ _id: new ObjectId(id) }, { $set: updatedPayment });
        return result;
    }

    static async delete(id) {
        const db = getDb();
        const result = await db.collection('payments').deleteOne({ _id: new ObjectId(id) });
        return result;
    }
}

module.exports = Payment;
