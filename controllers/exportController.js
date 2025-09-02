const fs = require('fs');
const path = require('path');
const { ObjectId } = require('mongodb');
const { getDb } = require('../config/database');
const Notification = require('../models/notification');

function toCsvValue(v) {
  if (v === null || v === undefined) return '';
  const s = String(v).replace(/"/g, '""');
  if (/[",\n]/.test(s)) return '"' + s + '"';
  return s;
}

function buildCsv(rows, headers) {
  const cols = headers.map(h => h.header);
  const keys = headers.map(h => h.key);
  const lines = [];
  lines.push(cols.join(','));
  for (const r of rows) {
    const line = keys.map(k => toCsvValue(r[k])).join(',');
    lines.push(line);
  }
  return lines.join('\n');
}

async function getDataset(type, filters, caller) {
  const db = getDb();
  const role = caller.role;
  const callerId = new ObjectId(caller._id);
  const from = filters?.from ? new Date(filters.from) : null;
  const to = filters?.to ? new Date(filters.to) : null;

  const dateRange = (field) => {
    const cond = {};
    if (from) cond.$gte = from;
    if (to) cond.$lte = to;
    return Object.keys(cond).length ? { [field]: cond } : {};
  };

  switch (type) {
    case 'transactions': {
      const match = {};
      if (filters?.userId) match.userId = new ObjectId(filters.userId);
      if (filters?.loanId) match.loanId = new ObjectId(filters.loanId);
      if (filters?.txnType) match.txnType = String(filters.txnType);
      Object.assign(match, dateRange('createdAt'));
      if (role === 'user') match.userId = callerId;
      const rows = await db.collection('transactions').aggregate([
        { $match: match },
        { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $project: {
          _id: 1,
          username: '$user.username',
          loanId: 1,
          txnType: 1,
          amount: 1,
          meta: 1,
          createdAt: 1,
        }},
        { $sort: { createdAt: -1 } }
      ]).toArray();
      const headers = [
        { header: 'Transaction ID', key: '_id' },
        { header: 'User', key: 'username' },
        { header: 'Loan ID', key: 'loanId' },
        { header: 'Type', key: 'txnType' },
        { header: 'Amount', key: 'amount' },
        { header: 'Reason/Meta', key: 'meta' },
        { header: 'Created At', key: 'createdAt' },
      ];
      const mapped = rows.map(r => ({
        _id: r._id,
        username: r.username || '',
        loanId: r.loanId || '',
        txnType: r.txnType,
        amount: Number(r.amount || 0),
        meta: r.meta ? JSON.stringify(r.meta) : '',
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : '',
      }));
      return { headers, rows: mapped };
    }
    case 'loans': {
      const match = {};
      if (filters?.status) match.status = { $in: String(filters.status).split(',') };
      if (filters?.borrowerUserId) match.borrowerUserId = new ObjectId(filters.borrowerUserId);
      Object.assign(match, dateRange('createdAt'));
      if (role === 'user') match.borrowerUserId = callerId;
      const rows = await db.collection('loans').aggregate([
        { $match: match },
        { $lookup: { from: 'users', localField: 'borrowerUserId', foreignField: '_id', as: 'borrower' } },
        { $unwind: { path: '$borrower', preserveNullAndEmptyArrays: true } },
        { $project: {
          _id: 1, borrower: '$borrower.username', purpose: 1, principalAmount: 1,
          interestRateBp: 1, durationMonths: 1, dueDayStart: 1, dueDayEnd: 1, startDate: 1,
          status: 1, createdBy: 1, createdAt: 1
        }},
        { $sort: { createdAt: -1 } }
      ]).toArray();
      const headers = [
        { header: 'Loan ID', key: '_id' },
        { header: 'Borrower', key: 'borrower' },
        { header: 'Purpose', key: 'purpose' },
        { header: 'Principal', key: 'principalAmount' },
        { header: 'Interest %', key: 'interestPct' },
        { header: 'Duration (months)', key: 'durationMonths' },
        { header: 'Due Window', key: 'dueWindow' },
        { header: 'Start Date', key: 'startDate' },
        { header: 'Status', key: 'status' },
        { header: 'Created By', key: 'createdBy' },
        { header: 'Created At', key: 'createdAt' },
      ];
      const mapped = rows.map(r => ({
        _id: r._id,
        borrower: r.borrower || '',
        purpose: r.purpose || '',
        principalAmount: Number(r.principalAmount || 0),
        interestPct: r.interestRateBp != null ? (Number(r.interestRateBp)/100).toFixed(2) : '',
        durationMonths: r.durationMonths,
        dueWindow: `${r.dueDayStart}-${r.dueDayEnd}`,
        startDate: r.startDate ? new Date(r.startDate).toISOString().split('T')[0] : '',
        status: r.status,
        createdBy: r.createdBy || '',
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : '',
      }));
      return { headers, rows: mapped };
    }
    case 'loanInstallments': {
      const loanId = filters?.loanId ? new ObjectId(filters.loanId) : null;
      if (!loanId) return { headers: [], rows: [] };
      const match = { loanId };
      if (filters?.status) match.status = filters.status;
      const rows = await db.collection('loanInstallments').find(match).sort({ periodNo: 1 }).toArray();
      const headers = [
        { header: 'Loan ID', key: 'loanId' },
        { header: 'Period No', key: 'periodNo' },
        { header: 'Due Date', key: 'dueDate' },
        { header: 'Principal Due', key: 'principalDue' },
        { header: 'Interest Due', key: 'interestDue' },
        { header: 'Total Due', key: 'totalDue' },
        { header: 'Paid Amount', key: 'paidAmount' },
        { header: 'Paid Date', key: 'paidDate' },
        { header: 'Status', key: 'status' },
      ];
      const mapped = rows.map(r => ({
        loanId: r.loanId,
        periodNo: r.periodNo,
        dueDate: r.dueDate ? new Date(r.dueDate).toISOString().split('T')[0] : '',
        principalDue: Number(r.principalDue || 0),
        interestDue: Number(r.interestDue || 0),
        totalDue: Number(r.totalDue || 0),
        paidAmount: Number(r.paidAmount || 0),
        paidDate: r.paidDate ? new Date(r.paidDate).toISOString().split('T')[0] : '',
        status: r.status,
      }));
      return { headers, rows: mapped };
    }
    case 'balances': {
      const rows = await db.collection('transactions').aggregate([
        { $group: { _id: '$userId', balance: { $sum: { $toDouble: '$amount' } }, lastTxnAt: { $max: '$createdAt' } } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $project: { username: '$user.username', balance: 1, lastTxnAt: 1 } },
        { $sort: { balance: -1 } }
      ]).toArray();
      const headers = [
        { header: 'User', key: 'username' },
        { header: 'Balance', key: 'balance' },
        { header: 'Last Transaction At', key: 'lastTxnAt' },
      ];
      const mapped = rows.map(r => ({ username: r.username || '', balance: Number(r.balance || 0), lastTxnAt: r.lastTxnAt ? new Date(r.lastTxnAt).toISOString() : '' }));
      return { headers, rows: mapped };
    }
    case 'notifications': {
      const match = {};
      if (filters?.role) match.role = String(filters.role);
      if (filters?.userId) match.userId = new ObjectId(filters.userId);
      if (filters?.status) match.status = String(filters.status);
      Object.assign(match, dateRange('createdAt'));
      if (role === 'user') match.userId = callerId;
      const rows = await db.collection('notifications').find(match).sort({ createdAt: -1 }).toArray();
      const headers = [
        { header: 'Recipient', key: 'recipient' },
        { header: 'Message', key: 'message' },
        { header: 'Status', key: 'status' },
        { header: 'Created At', key: 'createdAt' },
      ];
      const mapped = rows.map(r => ({ recipient: r.userId ? String(r.userId) : (r.role || ''), message: r.message || '', status: r.status || 'unread', createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : '' }));
      return { headers, rows: mapped };
    }
    case 'dashboardTotalAmount': {
      // Compose two tables: per-user interest and loan closures
      const users = await db.collection('users').find({}, { projection: { username: 1 } }).toArray();
      const memberCount = users.length || 1;
      const dateMatch = {};
      if (from || to) Object.assign(dateMatch, dateRange('dueDate'));
      const interestPerLoan = await db.collection('loanInstallments').aggregate([
        Object.keys(dateMatch).length ? { $match: dateMatch } : { $match: {} },
        { $group: { _id: '$loanId', totalInterest: { $sum: { $toDouble: '$interestDue' } }, from: { $min: '$dueDate' }, to: { $max: '$dueDate' } } },
        { $sort: { _id: 1 } },
      ]).toArray();
      const perUser = [];
      for (const loan of interestPerLoan) {
        const share = Number(loan.totalInterest || 0) / memberCount;
        for (const u of users) {
          perUser.push({ loanId: loan._id, username: u.username, interestShare: share, from: loan.from, to: loan.to });
        }
      }
      const closures = await db.collection('loans').aggregate([
        { $match: { status: 'closed' } },
        { $lookup: { from: 'loanInstallments', localField: '_id', foreignField: 'loanId', as: 'inst' } },
        { $addFields: { closedDate: { $max: '$inst.paidDate' }, totalInterest: { $sum: { $map: { input: '$inst', as: 'i', in: { $toDouble: '$$i.interestDue' } } } } } },
        { $lookup: { from: 'users', localField: 'borrowerUserId', foreignField: '_id', as: 'borrower' } },
        { $unwind: { path: '$borrower', preserveNullAndEmptyArrays: true } },
        { $project: { _id: 1, borrower: '$borrower.username', totalInterest: 1, closedDate: 1 }},
        { $sort: { closedDate: -1 } }
      ]).toArray();
      return {
        headers: [
          { header: 'Loan', key: 'loanId' },
          { header: 'User', key: 'username' },
          { header: 'Interest Earned', key: 'interestShare' },
          { header: 'Start Date', key: 'from' },
          { header: 'Closed Date', key: 'to' },
        ],
        rows: perUser.map(r => ({ loanId: r.loanId, username: r.username, interestShare: Number(r.interestShare||0), from: r.from ? new Date(r.from).toISOString().split('T')[0] : '', to: r.to ? new Date(r.to).toISOString().split('T')[0] : '' })),
        extra: { closures: closures.map(c => ({ loanId: c._id, borrower: c.borrower || '', totalInterest: Number(c.totalInterest||0), closedDate: c.closedDate ? new Date(c.closedDate).toISOString().split('T')[0] : '' })) }
      };
    }
    case 'dashboardLoans': {
      const status = filters?.status || 'active,closed';
      return await getDataset('loans', { status }, caller);
    }
    default:
      return { headers: [], rows: [] };
  }
}

// POST /api/exports
exports.requestExport = async (req, res) => {
  try {
    const { type, filters = {}, format = 'csv' } = req.body || {};
    if (!type) return res.status(400).send('type is required');
    // Enforce max range for on-the-fly
    const db = getDb();
    const caller = req.user;
    // Estimate size: use counts for heavy collections
    let estimated = 0;
    if (type === 'transactions') {
      const match = {};
      if (filters.userId) match.userId = new ObjectId(filters.userId);
      if (filters.loanId) match.loanId = new ObjectId(filters.loanId);
      if (filters.txnType) match.txnType = String(filters.txnType);
      if (filters.from || filters.to) {
        const cond = {};
        if (filters.from) cond.$gte = new Date(filters.from);
        if (filters.to) cond.$lte = new Date(filters.to);
        match.createdAt = cond;
      }
      if (caller.role === 'user') match.userId = new ObjectId(caller._id);
      estimated = await db.collection('transactions').countDocuments(match);
    }
    // Threshold to decide async job
    const threshold = 5000;
    if (estimated && estimated > threshold) {
      const jobId = new ObjectId();
      const now = new Date();
      await db.collection('exportJobs').insertOne({ _id: jobId, userId: new ObjectId(caller._id), type, filters, format, status: 'queued', createdAt: now, updatedAt: now });
      process.nextTick(() => runExportJob(jobId).catch(()=>{}));
      return res.json({ jobId: String(jobId) });
    }

    // Direct generate small CSV
    const dataset = await getDataset(type, filters, caller);
    // If XLSX requested, return CSV for now (client has XLSX export utilities for views).
    const csv = buildCsv(dataset.rows, dataset.headers);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${type}.csv"`);
    return res.send(csv);
  } catch (e) {
    console.error('requestExport error', e);
    res.status(500).send('Export failed');
  }
};

async function runExportJob(jobId) {
  const db = getDb();
  const job = await db.collection('exportJobs').findOne({ _id: jobId });
  if (!job) return;
  const update = (fields) => db.collection('exportJobs').updateOne({ _id: jobId }, { $set: { ...fields, updatedAt: new Date() } });
  try {
    await update({ status: 'running' });
    const user = await db.collection('users').findOne({ _id: job.userId });
    const { headers, rows, extra } = await getDataset(job.type, job.filters, { role: user.role, _id: user._id });
    const csv = buildCsv(rows, headers);
    const dir = path.join(process.cwd(), 'exports');
    fs.mkdirSync(dir, { recursive: true });
    const fileName = `${String(jobId)}.csv`;
    const abs = path.join(dir, fileName);
    fs.writeFileSync(abs, csv);
    const fileUrl = `/exports/${fileName}`;
    await update({ status: 'done', fileUrl });
    try { await Notification.create({ userId: job.userId, role: null, message: `Your export is ready: ${fileUrl}`, status: 'unread' }); } catch (_) {}
  } catch (e) {
    console.error('runExportJob error', e);
    await update({ status: 'error', error: e.message });
    try { await Notification.create({ userId: job.userId, role: null, message: `Export failed: ${e.message}`, status: 'unread' }); } catch (_) {}
  }
}

// GET /api/exports/:jobId/status
exports.getExportStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const db = getDb();
    const job = await db.collection('exportJobs').findOne({ _id: new ObjectId(jobId) });
    if (!job) return res.status(404).send('Not found');
    // Only owner or admin/accountant can see
    const caller = req.user;
    if (String(job.userId) !== String(caller._id) && !(caller.role === 'admin' || caller.role === 'accountant')) {
      return res.status(403).send('Forbidden');
    }
    res.json({ status: job.status, fileUrl: job.fileUrl || null, error: job.error || null });
  } catch (e) {
    res.status(500).send('Error fetching job status');
  }
};

