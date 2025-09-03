const express = require('express');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const paymentController = require('../controllers/paymentController');
const loanController = require('../controllers/loanController');
const notificationController = require('../controllers/notificationController');
const userController = require('../controllers/userController');
const dashboardController = require('../controllers/dashboardController');
const exportController = require('../controllers/exportController');

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
// New notifications API
router.get('/notifications', authenticate, authorize(['admin', 'accountant', 'user']), notificationController.listNotifications);
router.post('/notifications/new', authenticate, authorize(['admin', 'accountant']), notificationController.createNotification);
router.patch('/notifications/:id', authenticate, authorize(['admin', 'accountant', 'user']), notificationController.patchNotification);

// User routes
router.get('/users', authenticate, authorize(['admin', 'accountant']), userController.getAllUsers);
router.get('/users/:username', authenticate, userController.getUserByUsername);
router.get('/users/:username/deductions', authenticate, userController.getUserDeductions);
router.post('/users', authenticate, authorize(['admin']), userController.createUser);
router.delete('/users/:username', authenticate, authorize(['admin']), userController.deleteUser);

// Loan routes
router.post('/loans', authenticate, authorize(['admin', 'accountant']), loanController.createLoan);
router.get('/loans', authenticate, authorize(['admin', 'accountant', 'user']), loanController.listLoans);
router.get('/loans/:id', authenticate, authorize(['admin', 'accountant', 'user']), loanController.getLoanDetails);
router.get('/loans/:loanId/installments', authenticate, authorize(['admin', 'accountant', 'user']), loanController.listInstallments);
router.post('/loans/:loanId/repay', authenticate, authorize(['admin', 'accountant']), loanController.repayInstallment);
router.post('/loans/:id/emi-payment', authenticate, authorize(['admin', 'accountant']), loanController.repayEmiPayment);

// Dashboard summary + details (admin/accountant)
router.get('/dashboard/summary', authenticate, authorize(['admin', 'accountant']), dashboardController.getSummary);
router.get('/dashboard/total-amount/detail', authenticate, authorize(['admin', 'accountant']), dashboardController.getTotalAmountDetail);
router.get('/dashboard/loans/detail', authenticate, authorize(['admin', 'accountant']), dashboardController.getLoansDetail);
router.get('/dashboard/balances/detail', authenticate, authorize(['admin', 'accountant']), dashboardController.getBalancesDetail);

// Exports
router.post('/exports', authenticate, authorize(['admin', 'accountant', 'user']), exportController.requestExport);
router.get('/exports/:jobId/status', authenticate, authorize(['admin', 'accountant', 'user']), exportController.getExportStatus);

module.exports = router;
