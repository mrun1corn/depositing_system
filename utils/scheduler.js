const { getDb } = require('../config/database');
const Notification = require('../models/notification');

async function generateDueAndOverdueNotifications() {
  try {
    const db = getDb();
    const today = new Date();
    const pipeline = [
      { $match: { status: { $ne: 'paid' } } },
      { $lookup: { from: 'loans', localField: 'loanId', foreignField: '_id', as: 'loan' } },
      { $unwind: '$loan' },
      { $project: { loanId: 1, periodNo: 1, dueDate: 1, borrowerUserId: '$loan.borrowerUserId', dueDayStart: '$loan.dueDayStart', dueDayEnd: '$loan.dueDayEnd' } }
    ];
    const items = await db.collection('loanInstallments').aggregate(pipeline).toArray();
    for (const it of items) {
      const due = new Date(it.dueDate);
      const dueWindowStart = new Date(due.getFullYear(), due.getMonth(), it.dueDayStart || 1);
      const dueWindowEnd = new Date(due.getFullYear(), due.getMonth(), it.dueDayEnd || 10, 23, 59, 59, 999);
      const reminderDate = new Date(dueWindowStart.getTime() - 3 * 24 * 60 * 60 * 1000);

      if (today >= reminderDate && today < dueWindowStart) {
        const message = `Reminder: EMI #${it.periodNo} due between ${dueWindowStart.toDateString()} and ${dueWindowEnd.toDateString()}`;
        const recent = new Date(today.getTime() - 7*24*60*60*1000);
        const dup = await db.collection('notifications').findOne({ userId: it.borrowerUserId, message, createdAt: { $gte: recent } });
        if (!dup) await Notification.create({ userId: it.borrowerUserId, role: 'user', message });
      }
      if (today > dueWindowEnd) {
        const message = `Overdue: EMI #${it.periodNo} missed (window ended ${dueWindowEnd.toDateString()})`;
        const recent = new Date(today.getTime() - 7*24*60*60*1000);
        const dupUser = await db.collection('notifications').findOne({ userId: it.borrowerUserId, message, createdAt: { $gte: recent } });
        if (!dupUser) await Notification.create({ userId: it.borrowerUserId, role: 'user', message });
        const acctMsg = `EMI overdue for borrower ${it.borrowerUserId} on loan ${it.loanId}`;
        const dupAcct = await db.collection('notifications').findOne({ role: 'accountant', message: acctMsg, createdAt: { $gte: recent } });
        if (!dupAcct) await Notification.create({ role: 'accountant', userId: null, message: acctMsg });
      }
    }
  } catch (e) {
    try { await Notification.create({ role: 'admin', userId: null, message: `Scheduler error: ${e.message}` }); } catch (_) {}
  }
}

function init() {
  generateDueAndOverdueNotifications();
  setInterval(generateDueAndOverdueNotifications, 24 * 60 * 60 * 1000);
}

module.exports = { init };
