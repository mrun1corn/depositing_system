
const Payment = require('../models/payment');

exports.addPayment = async (req, res) => {
    try {
        const { username, amount, paymentDate, paymentMethod } = req.body;
        const payment = new Payment(username, parseFloat(amount), paymentDate, paymentMethod);
        await payment.save();
        res.status(200).send('Payment added successfully');
    } catch (error) {
        console.error("Error adding payment:", error);
        res.status(500).send('Error adding payment');
    }
};

exports.updatePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, amount, paymentDate, paymentMethod } = req.body;
        const result = await Payment.update(id, { username, amount: parseFloat(amount), paymentDate, paymentMethod });
        if (result.matchedCount > 0) {
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
