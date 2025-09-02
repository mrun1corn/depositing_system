
const Payment = require('../models/payment');
const socketManager = require('../socketManager');
const { getDb } = require('../config/database');
const { ObjectId } = require('mongodb');
const { TransactionModel, TXN_TYPES } = require('../models/transaction');
const { logAudit } = require('../services/audit');
const HARD_MUTATIONS = process.env.ALLOW_HARD_MUTATIONS === 'true' || process.env.NODE_ENV === 'test';

exports.addPayment = async (req, res) => {
    try {
        const { username, amount, paymentDate, paymentMethod, notes } = req.body;
        const payment = new Payment(username, parseFloat(amount), paymentDate, paymentMethod);
        if (notes) payment.notes = notes;
        const result = await payment.save();
        if (result.acknowledged) {
            // Insert immutable transaction for this deposit (or updatable in HARD_MUTATIONS)
            try {
                const db2 = getDb();
                const u = await db2.collection('users').findOne({ username });
                if (u) {
                    await TransactionModel.insertMany([{ userId: u._id, loanId: null, txnType: TXN_TYPES.DEPOSIT, amount: parseFloat(amount), meta: { paymentId: result.insertedId, paymentMethod, hardEditable: !!HARD_MUTATIONS }, createdAt: new Date() }]);
                }
            } catch (_) {}
            try { await logAudit({ actorId: req.user?._id, action: 'payment.create', resource: String(result.insertedId), before: null, after: payment, meta: {} }); } catch (_) {}
            const io = socketManager.getIo();
            io.emit('paymentAdded', { ...payment, _id: result.insertedId }); // Emit real-time update
            res.status(200).send('Payment added successfully');
        } else {
            res.status(500).send('Failed to add payment');
        }
    } catch (error) {
        console.error("Error adding payment:", error);
        res.status(500).send('Error adding payment');
    }
};

exports.updatePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, amount, paymentDate, paymentMethod } = req.body;
        const db = getDb();
        const existing = await db.collection('payments').findOne({ _id: new ObjectId(id) });
        if (!existing) return res.status(404).send('Payment not found');
        const newAmount = parseFloat(amount);
        const updatedPaymentData = { username, amount: newAmount, paymentDate, paymentMethod };
        if (HARD_MUTATIONS) {
            // Hard edit: update payment and underlying DEPOSIT txn amount
            await Payment.update(id, updatedPaymentData);
            await db.collection('transactions').updateOne({ 'meta.paymentId': new ObjectId(id), txnType: TXN_TYPES.DEPOSIT }, { $set: { amount: newAmount, 'meta.updatedBy': req.user?._id, updatedAt: new Date() } });
        } else {
            // Immutable ledger: record ADJUSTMENT diff
            const diff = parseFloat((newAmount - parseFloat(existing.amount || 0)).toFixed(2));
            if (diff !== 0) {
                const user = await db.collection('users').findOne({ username });
                if (user) {
                    await TransactionModel.insertMany([{ userId: user._id, loanId: null, txnType: TXN_TYPES.ADJUSTMENT, amount: diff, meta: { reason: 'Payment correction', paymentId: id }, createdAt: new Date() }]);
                }
            }
            await Payment.update(id, updatedPaymentData);
        }
        try { await logAudit({ actorId: req.user?._id, action: 'payment.adjust', resource: String(id), before: existing, after: updatedPaymentData, meta: {} }); } catch (_) {}
        const io = socketManager.getIo();
        io.emit('paymentUpdated', { _id: id, ...updatedPaymentData });
        res.status(200).send('Payment updated successfully');
    } catch (error) {
        console.error("Error updating payment:", error);
        res.status(500).send('Error updating payment');
    }
};

exports.deletePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDb();
        const doc = await db.collection('payments').findOne({ _id: new ObjectId(id) });
        if (!doc) return res.status(404).send('Payment not found');
        if (HARD_MUTATIONS) {
            await db.collection('payments').deleteOne({ _id: new ObjectId(id) });
            await db.collection('transactions').deleteMany({ 'meta.paymentId': new ObjectId(id) });
        } else {
            const user = await db.collection('users').findOne({ username: doc.username });
            if (user) {
                await TransactionModel.insertMany([{ userId: user._id, loanId: null, txnType: TXN_TYPES.ADJUSTMENT, amount: -parseFloat(doc.amount || 0), meta: { reason: 'Payment canceled', paymentId: id }, createdAt: new Date() }]);
            }
            await db.collection('payments').updateOne({ _id: new ObjectId(id) }, { $set: { status: 'canceled', canceledAt: new Date() } });
        }
        try { await logAudit({ actorId: req.user?._id, action: 'payment.delete', resource: String(id), before: doc, after: null, meta: { hard: !!HARD_MUTATIONS } }); } catch (_) {}
        const io = socketManager.getIo();
        io.emit('paymentDeleted', { _id: id });
        res.status(200).send('Payment deleted successfully');
    } catch (error) {
        console.error("Error deleting payment:", error);
        res.status(500).send('Error deleting payment');
    }
};

exports.getAllPayments = async (req, res) => {
    try {
        const { username, role } = req.user;
        let payments;
        if (role === 'admin' || role === 'accountant') {
            payments = await Payment.findAll();
        } else {
            payments = await Payment.findAllByUsername(username);
        }
        res.json(payments);
    } catch (error) {
        res.status(500).send('Error fetching all payments');
    }
};
