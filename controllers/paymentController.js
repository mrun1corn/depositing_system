
const Payment = require('../models/payment');
const socketManager = require('../socketManager');

exports.addPayment = async (req, res) => {
    try {
        const { username, amount, paymentDate, paymentMethod } = req.body;
        const payment = new Payment(username, parseFloat(amount), paymentDate, paymentMethod);
        const result = await payment.save();
        if (result.acknowledged) {
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
        const updatedPaymentData = { username, amount: parseFloat(amount), paymentDate, paymentMethod };
        const result = await Payment.update(id, updatedPaymentData);
        if (result.matchedCount > 0) {
            const io = socketManager.getIo();
            io.emit('paymentUpdated', { _id: id, ...updatedPaymentData }); // Emit real-time update
            res.status(200).send('Payment updated successfully');
        } else {
            res.status(404).send('Payment not found');
        }
    } catch (error) {
        console.error("Error updating payment:", error);
        res.status(500).send('Error updating payment');
    }
};

exports.deletePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Payment.delete(id);
        if (result.deletedCount > 0) {
            const io = socketManager.getIo();
            io.emit('paymentDeleted', { _id: id }); // Emit real-time update
            res.status(200).send('Payment deleted successfully');
        } else {
            res.status(404).send('Payment not found');
        }
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
