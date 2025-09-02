const { ObjectId } = require('mongodb');
const User = require('../models/user');
const LoanModel = require('../models/loan');
const LoanInstallmentModel = require('../models/loanInstallment');
const { TransactionModel, TXN_TYPES } = require('../models/transaction');
const Notification = require('../models/notification');
const { logAudit } = require('../services/audit');
const { round2 } = require('../utils/rounding');
const { generateEmiSchedule } = require('../utils/emi');
const { equalSplit } = require('../utils/split');
const { buildTransactions } = require('../utils/transactions');

async function splitAcrossMembers(amount, meta, loanId) {
    // Split across all users (members)
    const members = await User.findAll();
    if (!members.length) throw new Error('No users found to split across.');
    const memberIds = members.map(u => new ObjectId(u._id));
    const shares = equalSplit(amount, memberIds);
    const txnType = amount < 0 ? TXN_TYPES.LOAN_ISSUE_SPLIT_DEBIT : TXN_TYPES.EMI_REPAYMENT_SPLIT_CREDIT;
    const txns = buildTransactions({ shares, loanId: new ObjectId(loanId), txnType, meta });
    await TransactionModel.insertMany(txns);
}

exports.createLoan = async (req, res) => {
    try {
        const {
            borrowerUserId,
            borrowerUsername,
            purpose,
            principalAmount,
            interestRateBp,
            durationMonths,
            startDate,
            dueDayStart = 1,
            dueDayEnd = 10,
        } = req.body;

        if (!principalAmount || !interestRateBp || !durationMonths) {
            return res.status(400).send('principalAmount, interestRateBp, durationMonths are required');
        }

        let borrowerId = borrowerUserId;
        if (!borrowerId && borrowerUsername) {
            const borrower = await User.findByUsername(borrowerUsername);
            if (!borrower) return res.status(404).send('Borrower not found');
            borrowerId = borrower._id;
        }
        if (!borrowerId) return res.status(400).send('borrowerUserId or borrowerUsername is required');

        const createdBy = req.user?._id;
        const loan = await LoanModel.createLoan({
            borrowerUserId: borrowerId,
            purpose: purpose || '',
            principalAmount: Number(principalAmount),
            interestRateBp: Number(interestRateBp),
            durationMonths: Number(durationMonths),
            startDate: startDate ? new Date(startDate) : new Date(),
            dueDayStart: Number(dueDayStart) || 1,
            dueDayEnd: Number(dueDayEnd) || 10,
            createdBy: createdBy || null,
        });

        const schedule = generateEmiSchedule({
            principalAmount: loan.principalAmount,
            interestRateBp: loan.interestRateBp,
            durationMonths: loan.durationMonths,
            startDate: loan.startDate,
            dueDayStart: loan.dueDayStart,
            dueDayEnd: loan.dueDayEnd,
        }).map(inst => ({
            loanId: new ObjectId(loan._id),
            periodNo: inst.periodNo,
            dueDate: inst.dueDate,
            principalDue: inst.principalDue,
            interestDue: inst.interestDue,
            totalDue: inst.totalDue,
            paidAmount: 0,
            paidDate: null,
            status: 'due',
            createdAt: new Date(),
        }));
        const insertRes = await LoanInstallmentModel.bulkInsert(schedule);
        if (insertRes?.insertedIds) {
            schedule.forEach((item, idx) => { item._id = insertRes.insertedIds[idx]; });
        }

        // Equal split debit across members
        await splitAcrossMembers(-Number(principalAmount), { reason: 'Loan Issue Pool Deduction', createdBy: req.user?._id }, loan._id);

        // Notifications
        try {
            // Admin + Accountant role-wide
            await Notification.create({ role: 'admin', userId: null, message: `Loan of ${Number(principalAmount).toFixed(2)} issued to borrower ${borrowerUsername || borrowerId}` });
            await Notification.create({ role: 'accountant', userId: null, message: `Loan of ${Number(principalAmount).toFixed(2)} issued to borrower ${borrowerUsername || borrowerId}` });
            // Borrower schedule ready
            await Notification.create({ userId: borrowerId, role: 'user', message: `Your EMI schedule is ready for loan ${loan._id}` });
        } catch (e) { /* best-effort */ }

        try { await logAudit({ actorId: req.user?._id, action: 'loan.create', resource: String(loan._id), before: null, after: loan, meta: { installments: schedule.length } }); } catch (_) {}
        res.status(201).json({ loan, installments: schedule });
    } catch (err) {
        console.error('Error creating loan:', err);
        try {
            await Notification.create({ role: 'admin', userId: null, message: `System error: Loan creation failed - ${err.message}` });
        } catch (_) {}
        res.status(500).send('Error creating loan');
    }
};

exports.listLoans = async (req, res) => {
    try {
        const { role, _id } = req.user;
        const { status, borrowerUserId } = req.query || {};
        const filter = {};
        if (status) filter.status = String(status);
        if (borrowerUserId) filter.borrowerUserId = new ObjectId(borrowerUserId);
        if (role === 'user') {
            // Users can only see their own loans regardless of filter
            filter.borrowerUserId = new ObjectId(_id);
        }
        const loans = await LoanModel.listAll(filter);
        res.json(loans);
    } catch (err) {
        res.status(500).send('Error listing loans');
    }
};

exports.listInstallments = async (req, res) => {
    try {
        const { loanId } = req.params;
        const loan = await LoanModel.findById(loanId);
        if (!loan) return res.status(404).send('Loan not found');
        if (req.user.role === 'user' && String(loan.borrowerUserId) !== String(req.user._id)) {
            return res.status(403).send('Access denied');
        }
        const items = await LoanInstallmentModel.listByLoan(loanId);
        res.json(items);
    } catch (err) {
        res.status(500).send('Error listing installments');
    }
};

exports.repayInstallment = async (req, res) => {
    try {
        const { loanId } = req.params;
        const { periodNo } = req.body; // optional; if not provided, use next due

        const loan = await LoanModel.findById(loanId);
        if (!loan) return res.status(404).send('Loan not found');
        if (loan.status !== 'active') return res.status(400).send('Loan not active');

        let installment;
        if (periodNo) {
            installment = await LoanInstallmentModel.findByLoanAndPeriod(loanId, Number(periodNo));
        } else {
            const list = await LoanInstallmentModel.listByLoan(loanId);
            installment = list.find(i => i.status !== 'paid');
        }
        if (!installment) return res.status(404).send('Installment not found or already all paid');
        if (installment.status === 'paid') return res.status(400).send('Installment already paid');

        // Create equal credit transactions across members for totalDue
        await splitAcrossMembers(Number(installment.totalDue), { reason: 'EMI Repayment Pool Credit', periodNo: installment.periodNo, createdBy: req.user?._id }, loanId);

        await LoanInstallmentModel.markPaid({
            loanId,
            periodNo: installment.periodNo,
            paidAmount: installment.totalDue,
            paidDate: new Date(),
        });

        // Close loan if all installments paid
        const remaining = (await LoanInstallmentModel.listByLoan(loanId)).some(i => i.status !== 'paid');
        if (!remaining) {
            await LoanModel.setStatus(loanId, 'closed');
            try {
                await Notification.create({ userId: loan.borrowerUserId, role: 'user', message: `Loan ${loanId} fully repaid. Congratulations!` });
            } catch (_) {}
        }

        try {
            await Notification.create({ userId: loan.borrowerUserId, role: 'user', message: `EMI #${installment.periodNo} paid successfully` });
        } catch (_) {}

        try { await logAudit({ actorId: req.user?._id, action: 'loan.repay', resource: String(loanId), before: { periodNo: installment.periodNo }, after: { periodNo: installment.periodNo, paidAmount: installment.totalDue }, meta: {} }); } catch (_) {}
        res.json({ message: 'Installment repaid', loanId, periodNo: installment.periodNo });
    } catch (err) {
        console.error('Error repaying installment:', err);
        res.status(500).send('Error repaying installment');
    }
};

exports.getLoanDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const loan = await LoanModel.findById(id);
        if (!loan) return res.status(404).send('Loan not found');
        if (req.user.role === 'user' && String(loan.borrowerUserId) !== String(req.user._id)) {
            return res.status(403).send('Access denied');
        }
        const installments = await LoanInstallmentModel.listByLoan(id);
        // borrower details (limited)
        const db = require('../config/database').getDb();
        const borrower = await db.collection('users').findOne({ _id: new ObjectId(loan.borrowerUserId) }, { projection: { username: 1, role: 1 } });
        res.json({ loan, borrower, installments });
    } catch (err) {
        console.error('Error fetching loan details:', err);
        res.status(500).send('Error fetching loan details');
    }
};

exports.repayEmiPayment = async (req, res) => {
    try {
        const { id } = req.params; // loan id
        const { installmentId, paidAmount, paidDate, method, notes } = req.body;
        if (!installmentId || !paidAmount) {
            return res.status(400).send('installmentId and paidAmount are required');
        }

        const loan = await LoanModel.findById(id);
        if (!loan) return res.status(404).send('Loan not found');
        if (loan.status !== 'active') return res.status(400).send('Loan not active');

        // RBAC: only admin/accountant should reach here via router guard

        const allInstallments = await LoanInstallmentModel.listByLoan(id);
        const installment = allInstallments.find(i => String(i._id) === String(installmentId));
        if (!installment) return res.status(404).send('Installment not found');

        const newPaid = (Number(installment.paidAmount) || 0) + Number(paidAmount);
        const isPaidFull = newPaid + 1e-6 >= Number(installment.totalDue);
        const newStatus = isPaidFull ? 'paid' : 'partial';

        const db = require('../config/database').getDb();
        await db.collection('loanInstallments').updateOne(
            { _id: new ObjectId(installmentId) },
            { $set: { paidAmount: Math.round(newPaid * 100) / 100, paidDate: paidDate ? new Date(paidDate) : new Date(), status: newStatus, updatedAt: new Date(), updatedBy: req.user?._id } }
        );

        // Split the actual paidAmount across members
        await splitAcrossMembers(Number(paidAmount), { reason: 'EMI Repayment Pool Credit', installmentId, paymentMethod: method || null, notes: notes || null, createdBy: req.user?._id }, id);

        const remaining = (await LoanInstallmentModel.listByLoan(id)).some(i => i.status !== 'paid');
        if (!remaining) {
            await LoanModel.setStatus(id, 'closed');
        }

        const updated = await LoanInstallmentModel.listByLoan(id);
        const updatedInst = updated.find(i => String(i._id) === String(installmentId));
        const loanAfter = await LoanModel.findById(id);
        try {
            await Notification.create({ userId: loanAfter.borrowerUserId, role: 'user', message: `EMI #${updatedInst.periodNo} paid successfully` });
            if (!(updated.some(i => i.status !== 'paid'))) {
                await Notification.create({ userId: loanAfter.borrowerUserId, role: 'user', message: `Loan ${id} fully repaid. Congratulations!` });
            }
        } catch (_) {}
        try { await logAudit({ actorId: req.user?._id, action: 'loan.repay.partial', resource: String(id), before: { installmentId }, after: { installmentId, paidAmount }, meta: {} }); } catch (_) {}
        res.json({ installment: updatedInst, loanStatus: loanAfter.status });
    } catch (err) {
        console.error('Error processing EMI payment:', err);
        try { await Notification.create({ role: 'admin', userId: null, message: `System error: EMI payment failed - ${err.message}` }); } catch(_) {}
        res.status(500).send('Error processing EMI payment');
    }
};
