export function formatDate(value) {
  if (!value) return '';
  let date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'object' && value.$date) {
    date = new Date(value.$date);
  } else {
    date = new Date(value);
  }
  if (isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
}

export function calculatePaymentDetails(username, allPayments) {
  const userPayments = allPayments.filter(p => p.username === username);
  let totalPayment = 0;
  let lastMonthPayment = 0;
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  userPayments.forEach(p => {
    const amount = parseFloat(p.amount);
    totalPayment += amount;
    const paymentDate = new Date(p.paymentDate);
    if (paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear) {
      lastMonthPayment += amount;
    }
  });
  return { totalPayment: totalPayment.toFixed(2), lastMonthPayment: lastMonthPayment.toFixed(2) };
}

