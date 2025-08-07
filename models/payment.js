
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
        const payments = await db.collection('payments').find({ username: username }).sort({ amount: -1, paymentDate: 1 }).toArray();
        return payments;
    }

    static async findAll() {
        const db = getDb();
        const payments = await db.collection('payments').find({}).sort({ amount: -1, paymentDate: 1 }).toArray();
        return payments;
    }

    static async update(id, updatedPayment) {
        const db = getDb();
        // Ensure paymentDate is stored as a Date object if it's a string
        if (updatedPayment.paymentDate && typeof updatedPayment.paymentDate === 'string') {
            updatedPayment.paymentDate = new Date(updatedPayment.paymentDate);
        }
        const result = await db.collection('payments').updateOne({ _id: new ObjectId(id) }, { $set: updatedPayment });
        return result;
    }

    static async migratePaymentDates() {
        const db = getDb();
        const payments = await db.collection('payments').find({}).toArray();
        let updatedCount = 0;

        for (const payment of payments) {
            if (typeof payment.paymentDate === 'string') {
                try {
                    const newDate = new Date(payment.paymentDate);
                    if (!isNaN(newDate.getTime())) { // Check if the date is valid
                        await db.collection('payments').updateOne(
                            { _id: payment._id },
                            { $set: { paymentDate: newDate } }
                        );
                        updatedCount++;
                    } else {
                        console.warn(`Invalid date string found for payment ${payment._id}: ${payment.paymentDate}`);
                    }
                } catch (e) {
                    console.error(`Error converting date for payment ${payment._id}: ${payment.paymentDate}`, e);
                }
            }
        }
        console.log(`Migrated ${updatedCount} payment dates to Date objects.`);
        return updatedCount;
    }

    static async delete(id) {
        const db = getDb();
        const result = await db.collection('payments').deleteOne({ _id: new ObjectId(id) });
        return result;
    }
}

module.exports = Payment;
