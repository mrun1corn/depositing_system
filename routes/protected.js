const express = require('express');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const paymentController = require('../controllers/paymentController');
const notificationController = require('../controllers/notificationController');
const userController = require('../controllers/userController');

const router = express.Router();

router.get('/dashboard', authenticate, (req, res) => {
    res.send(`Welcome to your dashboard, ${req.user.username}!`);
});

// Payment routes
router.post('/payments', authenticate, authorize(['accountant', 'admin']), paymentController.addPayment);
router.put('/payments/:id', authenticate, authorize(['admin', 'accountant']), paymentController.updatePayment);
router.delete('/payments/:id', authenticate, authorize(['admin', 'accountant']), paymentController.deletePayment);
router.get('/all-payments', authenticate, paymentController.getAllPayments);

// Notification routes
router.post('/notifications', authenticate, authorize(['accountant']), notificationController.sendNotification);
router.put('/notifications/:id', authenticate, notificationController.markNotificationAsRead);
router.get('/all-notifications', authenticate, authorize(['admin', 'accountant', 'user']), notificationController.getAllNotifications);

// User routes
router.get('/users', authenticate, authorize(['admin', 'accountant']), userController.getAllUsers);
router.get('/users/:username', authenticate, userController.getUserByUsername);
router.post('/users', authenticate, authorize(['admin']), userController.createUser);
router.delete('/users/:username', authenticate, authorize(['admin']), userController.deleteUser);

module.exports = router;