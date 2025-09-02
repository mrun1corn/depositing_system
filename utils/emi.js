const { round2, clampInt } = require('./rounding');

function addMonthsKeepDay(date, months, day) {
    const d = new Date(date);
    const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
    const daysInMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    const clampedDay = clampInt(day, 1, daysInMonth);
    return new Date(target.getFullYear(), target.getMonth(), clampedDay);
}

function midpointDay(dueDayStart, dueDayEnd) {
    const start = Number.isFinite(+dueDayStart) ? +dueDayStart : 1;
    const end = Number.isFinite(+dueDayEnd) ? +dueDayEnd : 10;
    return Math.floor((start + end) / 2) || 5;
}

function generateEmiSchedule({
    principalAmount,
    interestRateBp,
    durationMonths,
    startDate,
    dueDayStart = 1,
    dueDayEnd = 10,
}) {
    const P = Number(principalAmount);
    const n = Number(durationMonths);
    const monthlyRate = Number(interestRateBp) / 10000 / 12;
    const baseDueDay = midpointDay(dueDayStart, dueDayEnd);

    let emi;
    if (monthlyRate === 0) {
        emi = round2(P / n);
    } else {
        const r = monthlyRate;
        emi = round2(P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1));
    }

    const installments = [];
    let outstanding = P;
    for (let i = 1; i <= n; i++) {
        const interestDue = round2(outstanding * monthlyRate);
        let principalDue = round2(emi - interestDue);
        if (i === n) {
            principalDue = round2(outstanding); // clear residuals on last
        }
        const totalDue = round2(principalDue + interestDue);
        outstanding = round2(outstanding - principalDue);

        const dueDate = addMonthsKeepDay(new Date(startDate || Date.now()), i, baseDueDay);
        installments.push({
            periodNo: i,
            dueDate,
            principalDue,
            interestDue,
            totalDue,
            status: 'due',
        });
    }
    return installments;
}

module.exports = { generateEmiSchedule, addMonthsKeepDay };

