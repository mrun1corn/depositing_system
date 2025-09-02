const { ObjectId } = require('mongodb');
const { getDb } = require('../config/database');

function parseDate(s) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function buildDateRange(query, field) {
  const from = parseDate(query.from);
  const to = parseDate(query.to);
  if (!from && !to) return {};
  const r = {};
  if (from) r.$gte = from;
  if (to) r.$lte = to;
  return { [field]: r };
}

exports.getSummary = async (req, res) => {
  try {
    const db = getDb();

    // Total deposits (from payments collection)
    const depAgg = await db.collection('payments').aggregate([
      { $group: { _id: null, totalDeposits: { $sum: { $toDouble: '$amount' } } } }
    ]).toArray();
    const totalDeposits = depAgg[0]?.totalDeposits || 0;

    // Total interest (from loanInstallments, schedule-based)
    const intAgg = await db.collection('loanInstallments').aggregate([
      { $group: { _id: null, totalInterest: { $sum: { $toDouble: '$interestDue' } } } }
    ]).toArray();
    const totalInterest = intAgg[0]?.totalInterest || 0;

    // Total loan issued (principal of active+closed loans)
    const loanAgg = await db.collection('loans').aggregate([
      { $match: { status: { $in: ['active', 'closed'] } } },
      { $group: { _id: null, totalIssued: { $sum: { $toDouble: '$principalAmount' } } } }
    ]).toArray();
    const totalLoanIssued = loanAgg[0]?.totalIssued || 0;

    // Remaining balance (sum of per-user balances via transactions)
    const balAgg = await db.collection('transactions').aggregate([
      { $group: { _id: '$userId', balance: { $sum: { $toDouble: '$amount' } } } },
      { $group: { _id: null, totalBalance: { $sum: '$balance' } } }
    ]).toArray();
    const remainingBalance = balAgg[0]?.totalBalance || 0;

    const totalAmount = Number(totalDeposits) + Number(totalInterest);

    res.json({ totalAmount, totalLoanIssued, remainingBalance, totalDeposits, totalInterest });
  } catch (e) {
    console.error('dashboard summary error', e);
    res.status(500).send('Error generating summary');
  }
};

exports.getTotalAmountDetail = async (req, res) => {
  try {
    const db = getDb();
    const { page = 1, limit = 100 } = req.query;
    const p = Math.max(1, parseInt(page, 10));
    const l = Math.max(1, Math.min(1000, parseInt(limit, 10)));

    // Members list for equal share calculations
    const users = await db.collection('users').find({}, { projection: { username: 1 } }).toArray();
    const memberCount = users.length || 1;

    // Aggregate interest per loan with optional date filters based on installment dueDate
    const dateMatch = buildDateRange(req.query, 'dueDate');
    const matchStage = Object.keys(dateMatch).length ? [{ $match: dateMatch }] : [];
    const interestPerLoan = await db.collection('loanInstallments').aggregate([
      ...matchStage,
      { $group: { _id: '$loanId', totalInterest: { $sum: { $toDouble: '$interestDue' } }, from: { $min: '$dueDate' }, to: { $max: '$dueDate' } } },
      { $sort: { _id: 1 } },
    ]).toArray();

    // Build per-user interest rows (paged)
    const rows = [];
    for (const loan of interestPerLoan) {
      const share = Number(loan.totalInterest || 0) / memberCount;
      for (const u of users) {
        rows.push({
          loanId: loan._id,
          userId: u._id,
          username: u.username,
          interestShare: Math.round(share * 100) / 100,
          from: loan.from,
          to: loan.to,
        });
      }
    }
    const start = (p - 1) * l;
    const pageRows = rows.slice(start, start + l);

    // Loan closure history (closed loans)
    const closedLoans = await db.collection('loans').aggregate([
      { $match: { status: 'closed' } },
      { $lookup: { from: 'loanInstallments', localField: '_id', foreignField: 'loanId', as: 'inst' } },
      { $addFields: {
        closedDate: { $max: '$inst.paidDate' },
        totalInterest: { $sum: { $map: { input: '$inst', as: 'i', in: { $toDouble: '$$i.interestDue' } } } },
      } },
      { $lookup: { from: 'users', localField: 'borrowerUserId', foreignField: '_id', as: 'borrower' } },
      { $unwind: { path: '$borrower', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 1, borrower: '$borrower.username', purpose: 1, totalInterest: 1, closedDate: 1 } },
      { $sort: { closedDate: -1 } },
      { $limit: 1000 },
    ]).toArray();

    res.json({ perUserInterest: pageRows, totalPerUserInterestCount: rows.length, loanClosures: closedLoans });
  } catch (e) {
    console.error('dashboard total-amount detail error', e);
    res.status(500).send('Error generating total amount detail');
  }
};

exports.getLoansDetail = async (req, res) => {
  try {
    const db = getDb();
    const { status, from, to, page = 1, limit = 100 } = req.query;
    const p = Math.max(1, parseInt(page, 10));
    const l = Math.max(1, Math.min(1000, parseInt(limit, 10)));

    const match = {};
    if (status) {
      const list = status.split(',').map(s => s.trim()).filter(Boolean);
      if (list.length) match.status = { $in: list };
    }
    const dateRange = buildDateRange({ from, to }, 'createdAt');
    Object.assign(match, dateRange);

    const pipeline = [
      { $match: match },
      { $lookup: { from: 'users', localField: 'borrowerUserId', foreignField: '_id', as: 'borrower' } },
      { $unwind: { path: '$borrower', preserveNullAndEmptyArrays: true } },
      { $lookup: {
          from: 'loanInstallments',
          let: { lid: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [ { $eq: ['$loanId', '$$lid'] }, { $ne: ['$status', 'paid'] } ] } } },
            { $sort: { periodNo: 1 } },
            { $limit: 1 },
          ],
          as: 'nextInst'
        }
      },
      { $addFields: { nextInst: { $arrayElemAt: ['$nextInst', 0] } } },
      { $project: {
          _id: 1,
          borrower: '$borrower.username',
          purpose: 1,
          principalAmount: 1,
          issuedDate: '$createdAt',
          status: 1,
          nextEmiDue: '$nextInst.dueDate',
          nextEmiPeriod: '$nextInst.periodNo'
        }
      },
      { $sort: { issuedDate: -1 } },
      { $skip: (p - 1) * l },
      { $limit: l },
    ];

    const rows = await db.collection('loans').aggregate(pipeline).toArray();
    res.json(rows);
  } catch (e) {
    console.error('dashboard loans detail error', e);
    res.status(500).send('Error generating loans detail');
  }
};

exports.getBalancesDetail = async (req, res) => {
  try {
    const db = getDb();
    const { page = 1, limit = 200 } = req.query;
    const p = Math.max(1, parseInt(page, 10));
    const l = Math.max(1, Math.min(1000, parseInt(limit, 10)));

    const pipeline = [
      { $group: { _id: '$userId', balance: { $sum: { $toDouble: '$amount' } }, lastTxnAt: { $max: '$createdAt' } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $project: { userId: '$_id', username: '$user.username', balance: 1, lastTxnAt: 1, _id: 0 } },
      { $sort: { balance: -1 } },
      { $skip: (p - 1) * l },
      { $limit: l }
    ];

    const rows = await db.collection('transactions').aggregate(pipeline).toArray();
    res.json(rows);
  } catch (e) {
    console.error('dashboard balances detail error', e);
    res.status(500).send('Error generating balances detail');
  }
};

