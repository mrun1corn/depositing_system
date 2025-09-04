// Aggregated views; these functions expect the dependencies passed in from dashboard.js
export function createViews(deps) {
  const {
    token,
    loggedInUser,
    fetchData,
    postData,
    postJson,
    putData,
    deleteData,
    dashboardContent,
    navLinksContainer,
    formatDate,
    calculatePaymentDetails,
    renderNavBarUI,
    showTotalAmountModalUI,
    showLoansModalUI,
    showBalancesModalUI,
    setupPaymentEventListeners,
    refreshNotifBell,
  } = deps;

  function mountTemplate(tplId) {
    const tpl = document.getElementById(tplId);
    if (!tpl) return null;
    while (dashboardContent.firstChild) dashboardContent.removeChild(dashboardContent.firstChild);
    const fragment = tpl.content.cloneNode(true);
    dashboardContent.appendChild(fragment);
    return dashboardContent;
  }

  // For now, call through to existing implementations if present on the page.
  // Later we can migrate the full bodies here; this keeps the module boundary without breaking behavior.
  const viewsFromPage = {
    renderAdminDashboard: deps.renderAdminDashboard,
    renderUserPaymentDetails: deps.renderUserPaymentDetails,
    renderAdminUsers: deps.renderAdminUsers,
    renderAccountantDashboard: deps.renderAccountantDashboard,
    renderAccountantDeposit: deps.renderAccountantDeposit,
    renderUserDashboard: deps.renderUserDashboard,
    renderLoansEmisPage: deps.renderLoansEmisPage,
  };

  // Admin Overview view
  async function renderAdminDashboard() {
    mountTemplate('tpl-admin-dashboard');
    const users = await fetchData('users');
    const payments = await fetchData('all-payments');
    const notifications = await fetchData('all-notifications');
    const summary = await fetchData('dashboard/summary');
    const totalAmount = summary?.totalAmount || 0;
    const totalLoanIssued = summary?.totalLoanIssued || 0;
    const remainingBalance = summary?.remainingBalance || 0;
    const usersCountEl = document.getElementById('admin-users-count');
    const paymentsCountEl = document.getElementById('admin-payments-count');
    const totalAmountEl = document.getElementById('admin-total-amount');
    const totalLoanIssuedEl = document.getElementById('admin-total-loan-issued');
    const remainingBalanceEl = document.getElementById('admin-remaining-balance');
    if (usersCountEl) usersCountEl.textContent = String(users.length);
    if (paymentsCountEl) paymentsCountEl.textContent = String(payments.length);
    if (totalAmountEl) totalAmountEl.textContent = Number(totalAmount).toFixed(2);
    if (totalLoanIssuedEl) totalLoanIssuedEl.textContent = Number(totalLoanIssued).toFixed(2);
    if (remainingBalanceEl) remainingBalanceEl.textContent = Number(remainingBalance).toFixed(2);

    const cardsWrap = document.getElementById('user-overview-cards');
    if (cardsWrap) {
      users.forEach(user => {
        const { totalPayment, lastMonthPayment } = calculatePaymentDetails(user.username, payments);
        const col = document.createElement('div'); col.className = 'col-12 col-sm-6 col-md-4 mb-4';
        const card = document.createElement('div'); card.className = 'card user-card h-100 shadow-sm';
        const body = document.createElement('div'); body.className = 'card-body';
        const h5 = document.createElement('h5'); h5.className = 'card-title'; h5.innerHTML = `<i class=\"fas fa-user-circle mr-2\"></i>${user.username}`;
        const p1 = document.createElement('p'); p1.className = 'card-text'; p1.innerHTML = `<strong>Role:</strong> ${user.role}`;
        const p2 = document.createElement('p'); p2.className = 'card-text'; p2.innerHTML = `<strong>Last Month Payment:</strong> ${lastMonthPayment}`;
        const p3 = document.createElement('p'); p3.className = 'card-text'; p3.innerHTML = `<strong>Total Payment:</strong> ${totalPayment}`;
        body.appendChild(h5); body.appendChild(p1); body.appendChild(p2); body.appendChild(p3);
        card.appendChild(body); col.appendChild(card); cardsWrap.appendChild(col);
      });
    }

    const notificationList = document.getElementById('notification-list');
    if (notificationList) {
      (notifications || []).slice(-3).reverse().forEach(n => {
        const el = document.createElement('div'); el.className = 'notification-item';
        const p = document.createElement('p'); p.textContent = n.message || '';
        el.appendChild(p); notificationList.appendChild(el);
      });
    }

    document.getElementById('card-total-amount')?.addEventListener('click', async () => { const d = await fetchData('dashboard/total-amount/detail'); showTotalAmountModalUI(d); });
    document.getElementById('card-total-loan-issued')?.addEventListener('click', async () => { const rows = await fetchData('dashboard/loans/detail?status=active,closed'); showLoansModalUI(Array.isArray(rows) ? rows : [], { token }); });
    document.getElementById('card-remaining-balance')?.addEventListener('click', async () => { const rows = await fetchData('dashboard/balances/detail'); showBalancesModalUI(Array.isArray(rows) ? rows : []); });

    const list = document.getElementById('all-payments-list-admin');
    if (list) {
      (payments || []).forEach(p => {
        const tr = document.createElement('tr');
        const tdUser = document.createElement('td'); tdUser.textContent = p.username;
        const tdAmt = document.createElement('td'); tdAmt.textContent = String(p.amount);
        const tdDate = document.createElement('td'); tdDate.textContent = formatDate(p.paymentDate);
        const tdMethod = document.createElement('td'); tdMethod.textContent = p.paymentMethod;
        const tdAct = document.createElement('td');
        const btnEdit = document.createElement('button'); btnEdit.className = 'btn btn-sm btn-info edit-payment-btn'; btnEdit.setAttribute('data-id', p._id); btnEdit.setAttribute('data-username', p.username); btnEdit.setAttribute('data-amount', p.amount); btnEdit.setAttribute('data-date', formatDate(p.paymentDate)); btnEdit.setAttribute('data-method', p.paymentMethod); btnEdit.setAttribute('data-toggle','modal'); btnEdit.setAttribute('data-target','#editPaymentModal'); btnEdit.innerHTML = '<i class="fas fa-edit"></i>';
        const btnDel = document.createElement('button'); btnDel.className = 'btn btn-sm btn-danger delete-payment-btn'; btnDel.setAttribute('data-id', p._id); btnDel.innerHTML = '<i class="fas fa-trash-alt"></i>';
        tdAct.appendChild(btnEdit); tdAct.appendChild(btnDel);
        tr.appendChild(tdUser); tr.appendChild(tdAmt); tr.appendChild(tdDate); tr.appendChild(tdMethod); tr.appendChild(tdAct);
        list.appendChild(tr);
      });
    }

    document.getElementById('download-all-payments-excel-admin')?.addEventListener('click', () => {
      const monthlySummary = {};
      (payments || []).forEach(payment => {
        const d = new Date(payment.paymentDate);
        const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        if (!monthlySummary[payment.username]) monthlySummary[payment.username] = { Username: payment.username };
        if (!monthlySummary[payment.username][ym]) monthlySummary[payment.username][ym] = [];
        monthlySummary[payment.username][ym].push(`${parseFloat(payment.amount).toFixed(2)} (${payment.paymentDate})`);
      });
      const summaryArray = Object.values(monthlySummary).map(us => { const row = { Username: us.Username }; let total = 0; for (const k in us) if (k !== 'Username') { row[k] = us[k].join(', '); us[k].forEach(e => total += parseFloat(e.split(' ')[0])); } row['Total Deposit'] = total.toFixed(2); return row; });
      const grandTotal = summaryArray.reduce((s, r) => s + parseFloat(r['Total Deposit']), 0);
      summaryArray.push({ Username: 'Grand Total', 'Total Deposit': grandTotal.toFixed(2) });
      const ws = XLSX.utils.json_to_sheet(summaryArray); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Monthly Payments Summary'); XLSX.writeFile(wb, 'all_payments_summary_admin.xlsx');
    });

    document.getElementById('user-overview-cards')?.addEventListener('click', (e) => {
      const card = e.target.closest('.user-card');
      if (card) { const username = card.querySelector('h5').textContent.trim(); window.location.hash = `#user-details/${username}`; }
    });

    setupPaymentEventListeners();
    renderNavBarUI(navLinksContainer, loggedInUser.role, 'admin-dashboard');
  }

  // Admin Users view
  async function renderAdminUsers() {
    mountTemplate('tpl-admin-users');
    const users = await fetchData('users');

    const userForm = document.getElementById('user-form');
    const userFormTitle = document.getElementById('user-form-title');
    const userFormSubmit = document.getElementById('user-form-submit');
    const cancelEditButton = document.getElementById('cancel-edit');
    const originalUsernameInput = document.getElementById('original-username');
    const newUsernameInput = document.getElementById('new-username');
    const newPasswordInput = document.getElementById('new-password');
    const roleInput = document.getElementById('role');

    const resetForm = () => {
      userForm.reset(); userFormTitle.textContent = 'Create User'; userFormSubmit.textContent = 'Create User'; cancelEditButton.classList.add('hidden'); originalUsernameInput.value = '';
    };

    const renderUsersTable = (usersToRender) => {
      const userList = document.getElementById('user-list');
      if (!userList) return;
      while (userList.firstChild) userList.removeChild(userList.firstChild);
      usersToRender.forEach(user => {
        const tr = document.createElement('tr');
        const tdU = document.createElement('td'); tdU.textContent = user.username;
        const tdR = document.createElement('td'); tdR.textContent = user.role;
        const tdA = document.createElement('td');
        const bE = document.createElement('button'); bE.className = 'btn btn-sm btn-info mr-2 edit-user-btn'; bE.setAttribute('data-username', user.username); bE.innerHTML = '<i class="fas fa-edit"></i> Edit';
        const bD = document.createElement('button'); bD.className = 'btn btn-sm btn-danger delete-user-btn'; bD.setAttribute('data-username', user.username); bD.innerHTML = '<i class="fas fa-trash-alt"></i> Delete';
        tdA.appendChild(bE); tdA.appendChild(bD);
        tr.appendChild(tdU); tr.appendChild(tdR); tr.appendChild(tdA);
        userList.appendChild(tr);
      });

      document.querySelectorAll('.delete-user-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
          const username = e.target.closest('.delete-user-btn').dataset.username;
          if (confirm(`Are you sure you want to delete ${username}?`)) { await deleteData(`users/${username}`); renderAdminUsers(); }
        });
      });

      document.querySelectorAll('.edit-user-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
          const username = e.target.closest('.edit-user-btn').dataset.username;
          const userToEdit = await fetchData(`users/${username}`);
          if (userToEdit) {
            userFormTitle.textContent = 'Edit User'; userFormSubmit.textContent = 'Update User'; cancelEditButton.classList.remove('hidden'); originalUsernameInput.value = userToEdit.username; newUsernameInput.value = userToEdit.username; roleInput.value = userToEdit.role;
          }
        });
      });
    };

    renderUsersTable(users);
    userForm.addEventListener('submit', async (e) => {
      e.preventDefault(); const userData = { username: newUsernameInput.value, password: newPasswordInput.value, role: roleInput.value, originalUsername: originalUsernameInput.value };
      await postData('users', userData); renderAdminUsers(); resetForm();
    });
    cancelEditButton.addEventListener('click', resetForm);
    renderNavBarUI(navLinksContainer, loggedInUser.role, 'admin-users');
  }

  // User Payment Details using template
  async function renderUserPaymentDetails(username) {
    mountTemplate('tpl-user-details');
    const nameSpan = document.getElementById('user-details-username'); if (nameSpan) nameSpan.textContent = username;
    const allPayments = await fetchData('all-payments');
    const userPayments = (allPayments || []).filter(p => p.username === username);
    let deductions = [];
    try { deductions = await fetchData(`users/${encodeURIComponent(username)}/deductions`); } catch (_) {}
    let userDoc = null;
    try { userDoc = await fetchData(`users/${encodeURIComponent(username)}`); } catch (_) {}
    const userId = userDoc?._id;
    let loans = [];
    if (userId) {
      try { loans = await fetchData(`loans?borrowerUserId=${encodeURIComponent(userId)}`); } catch (_) {}
    }

    const dedCard = document.getElementById('user-deductions-card');
    const dedBody = document.getElementById('user-deductions-body');
    if (!Array.isArray(deductions) || !deductions.length) { dedCard?.classList.add('d-none'); }
    else if (dedBody) {
      deductions.forEach(d => {
        const tr = document.createElement('tr');
        const tdD = document.createElement('td'); tdD.textContent = d.createdAt ? new Date(d.createdAt).toISOString().split('T')[0] : '';
        const tdA = document.createElement('td'); tdA.textContent = Number(d.amount||0).toFixed(2);
        const tdT = document.createElement('td'); tdT.textContent = d.txnType || '';
        const tdR = document.createElement('td'); tdR.textContent = d.reason || '';
        const tdL = document.createElement('td'); tdL.textContent = d.loanId || '';
        tr.appendChild(tdD); tr.appendChild(tdA); tr.appendChild(tdT); tr.appendChild(tdR); tr.appendChild(tdL); dedBody.appendChild(tr);
      });
    }

    const loansCard = document.getElementById('user-loans-card');
    const loansBody = document.getElementById('user-loans-body');
    if (!Array.isArray(loans) || !loans.length) { loansCard?.classList.add('d-none'); }
    else if (loansBody) {
      for (const l of loans) {
        let nextStr = '-';
        try {
          const inst = await fetchData(`loans/${l._id}/installments`);
          const next = Array.isArray(inst) ? inst.find(i => i.status !== 'paid') : null;
          if (next) nextStr = `#${next.periodNo} on ${formatDate(next.dueDate)}`; else nextStr = 'All paid';
        } catch(_) {}
        const tr = document.createElement('tr');
        const tdP = document.createElement('td'); tdP.textContent = l.purpose || '';
        const tdPr = document.createElement('td'); tdPr.textContent = Number(l.principalAmount||0).toFixed(2);
        const tdS = document.createElement('td'); tdS.textContent = l.status || '';
        const tdN = document.createElement('td'); tdN.textContent = nextStr;
        tr.appendChild(tdP); tr.appendChild(tdPr); tr.appendChild(tdS); tr.appendChild(tdN); loansBody.appendChild(tr);
      }
    }

    const tableBody = document.getElementById('user-payment-list');
    function renderPaymentsTable(paymentsToRender) {
      if (!tableBody) return;
      while (tableBody.firstChild) tableBody.removeChild(tableBody.firstChild);
      paymentsToRender.forEach(payment => {
        const tr = document.createElement('tr');
        const tdAmt = document.createElement('td'); tdAmt.textContent = String(payment.amount);
        const tdDate = document.createElement('td'); tdDate.textContent = formatDate(payment.paymentDate);
        const tdMethod = document.createElement('td'); tdMethod.textContent = payment.paymentMethod;
        const tdAct = document.createElement('td');
        const editBtn = document.createElement('button'); editBtn.className = 'btn btn-sm btn-info edit-payment-btn';
        editBtn.setAttribute('data-id', payment._id);
        editBtn.setAttribute('data-username', payment.username);
        editBtn.setAttribute('data-amount', payment.amount);
        editBtn.setAttribute('data-date', formatDate(payment.paymentDate));
        editBtn.setAttribute('data-method', payment.paymentMethod);
        editBtn.setAttribute('data-toggle', 'modal');
        editBtn.setAttribute('data-target', '#editPaymentModal');
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        const delBtn = document.createElement('button'); delBtn.className = 'btn btn-sm btn-danger delete-payment-btn'; delBtn.setAttribute('data-id', payment._id); delBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        tdAct.appendChild(editBtn); tdAct.appendChild(delBtn);
        tr.appendChild(tdAmt); tr.appendChild(tdDate); tr.appendChild(tdMethod); tr.appendChild(tdAct);
        tableBody.appendChild(tr);
      });
      setupPaymentEventListeners();
    }
    renderPaymentsTable(userPayments);

    const monthInput = document.getElementById('month-filter');
    monthInput && monthInput.addEventListener('change', (e) => {
      const filter = e.target.value; renderPaymentsTable(userPayments.filter(p => String(p.paymentDate||'').startsWith(filter)));
    });
    const dlBtn = document.getElementById('download-user-excel');
    dlBtn && dlBtn.addEventListener('click', () => {
      const monthlySummary = {};
      (userPayments || []).forEach(payment => {
        const d = new Date(payment.paymentDate);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlySummary[payment.username]) monthlySummary[payment.username] = { Username: payment.username };
        if (!monthlySummary[payment.username][ym]) monthlySummary[payment.username][ym] = [];
        monthlySummary[payment.username][ym].push(`${parseFloat(payment.amount).toFixed(2)} (${payment.paymentDate})`);
      });
      const summaryArray = Object.values(monthlySummary).map(us => { const row = { Username: us.Username }; let total = 0; for (const k in us) if (k !== 'Username') { row[k] = us[k].join(', '); us[k].forEach(e => total += parseFloat(e.split(' ')[0])); } row['Total Deposit'] = total.toFixed(2); return row; });
      const grandTotal = summaryArray.reduce((s, r) => s + parseFloat(r['Total Deposit']), 0);
      summaryArray.push({ Username: 'Grand Total', 'Total Deposit': grandTotal.toFixed(2) });
      const ws = XLSX.utils.json_to_sheet(summaryArray); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Monthly Payments Summary'); XLSX.writeFile(wb, `${username}_payments_summary.xlsx`);
    });

    document.getElementById('back-to-admin-dashboard')?.addEventListener('click', () => { window.location.hash = '#admin-dashboard'; });
    renderNavBarUI(navLinksContainer, loggedInUser.role, 'admin-dashboard');
  }
  // Accountant Dashboard implemented here using template
  async function renderAccountantDashboard() {
    mountTemplate('tpl-accountant-dashboard');
    const users = await fetchData('users');
    const payments = await fetchData('all-payments');
    const notificationsList = await fetchData('all-notifications');
    const summary = await fetchData('dashboard/summary');
    const totalAmount = summary?.totalAmount || 0;
    const totalLoanIssued = summary?.totalLoanIssued || 0;
    const remainingBalance = summary?.remainingBalance || 0;

    const paymentsCountEl = document.getElementById('ac-payments-count');
    const totalAmountEl = document.getElementById('ac-total-amount');
    const notifCountEl = document.getElementById('ac-notif-count');
    const totalLoanIssuedEl = document.getElementById('ac-total-loan-issued');
    const remainingBalanceEl = document.getElementById('ac-remaining-balance');
    if (paymentsCountEl) paymentsCountEl.textContent = String(payments.length);
    if (totalAmountEl) totalAmountEl.textContent = Number(totalAmount).toFixed(2);
    if (notifCountEl) notifCountEl.textContent = String((notificationsList || []).length);
    if (totalLoanIssuedEl) totalLoanIssuedEl.textContent = Number(totalLoanIssued).toFixed(2);
    if (remainingBalanceEl) remainingBalanceEl.textContent = Number(remainingBalance).toFixed(2);

    // Notification list
    const notifWrap = document.getElementById('ac-notification-list');
    if (notifWrap) {
      (notificationsList || []).slice(-3).reverse().forEach(n => {
        const item = document.createElement('div'); item.className = 'notification-item';
        const p = document.createElement('p'); p.textContent = n.message || '';
        item.appendChild(p); notifWrap.appendChild(item);
      });
    }

    // User overview cards
    const cardsWrap = document.getElementById('ac-user-overview-cards');
    if (cardsWrap) {
      users.forEach(user => {
        const { totalPayment, lastMonthPayment } = calculatePaymentDetails(user.username, payments);
        const col = document.createElement('div'); col.className = 'col-12 col-sm-6 col-md-4 mb-4';
        const card = document.createElement('div'); card.className = 'card user-card h-100 shadow-sm';
        const body = document.createElement('div'); body.className = 'card-body';
        const h5 = document.createElement('h5'); h5.className = 'card-title'; h5.innerHTML = `<i class=\"fas fa-user-circle mr-2\"></i>${user.username}`;
        const p1 = document.createElement('p'); p1.className = 'card-text'; p1.innerHTML = `<strong>Role:</strong> ${user.role}`;
        const p2 = document.createElement('p'); p2.className = 'card-text'; p2.innerHTML = `<strong>Last Month Payment:</strong> ${lastMonthPayment}`;
        const p3 = document.createElement('p'); p3.className = 'card-text'; p3.innerHTML = `<strong>Total Payment:</strong> ${totalPayment}`;
        body.appendChild(h5); body.appendChild(p1); body.appendChild(p2); body.appendChild(p3);
        card.appendChild(body); col.appendChild(card); cardsWrap.appendChild(col);
      });
    }

    // All payments table
    const list = document.getElementById('ac-all-payments-list');
    if (list) {
      (payments || []).forEach(p => {
        const tr = document.createElement('tr');
        const tdUser = document.createElement('td'); tdUser.textContent = p.username;
        const tdAmt = document.createElement('td'); tdAmt.textContent = String(p.amount);
        const tdDate = document.createElement('td'); tdDate.textContent = formatDate(p.paymentDate);
        const tdMethod = document.createElement('td'); tdMethod.textContent = p.paymentMethod;
        tr.appendChild(tdUser); tr.appendChild(tdAmt); tr.appendChild(tdDate); tr.appendChild(tdMethod);
        list.appendChild(tr);
      });
    }

    // Export button
    const exportBtn = document.getElementById('ac-download-all-payments-excel');
    exportBtn && exportBtn.addEventListener('click', () => {
      const rows = (payments || []).map(p => ({ User: p.username, Amount: p.amount, PaymentDate: formatDate(p.paymentDate), Method: p.paymentMethod }));
      window.exportUtil.exportJsonToXlsx('all_payments.xlsx', 'Payments', rows);
    });

    // Cards → modals
    document.getElementById('ac-card-total-amount')?.addEventListener('click', async () => { const d = await fetchData('dashboard/total-amount/detail'); showTotalAmountModalUI(d); });
    document.getElementById('ac-card-total-loan-issued')?.addEventListener('click', async () => { const rows = await fetchData('dashboard/loans/detail?status=active,closed'); showLoansModalUI(Array.isArray(rows) ? rows : [], { token }); });
    document.getElementById('ac-card-remaining-balance')?.addEventListener('click', async () => { const rows = await fetchData('dashboard/balances/detail'); showBalancesModalUI(Array.isArray(rows) ? rows : []); });

    renderNavBarUI(navLinksContainer, loggedInUser.role, 'accountant-dashboard');
  }

  // User Dashboard implemented here using template
  async function renderUserDashboard() {
    mountTemplate('tpl-user-dashboard');
    const allPayments = await fetchData('all-payments');
    const userPayments = (allPayments || []).filter(p => p.username === loggedInUser.username);
    const total = userPayments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);

    const totalEl = document.getElementById('user-total-deposited'); if (totalEl) totalEl.textContent = total.toFixed(2);
    const tbody = document.getElementById('user-payments-list');
    function renderRows(list) {
      if (!tbody) return;
      while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
      list.forEach(p => {
        const tr = document.createElement('tr');
        const tdAmt = document.createElement('td'); tdAmt.textContent = String(p.amount);
        const tdDate = document.createElement('td'); tdDate.textContent = formatDate(p.paymentDate);
        const tdMethod = document.createElement('td'); tdMethod.textContent = p.paymentMethod;
        tr.appendChild(tdAmt); tr.appendChild(tdDate); tr.appendChild(tdMethod); tbody.appendChild(tr);
      });
    }
    renderRows(userPayments);

    const monthFilter = document.getElementById('user-month-filter');
    monthFilter && monthFilter.addEventListener('change', (e) => {
      const filter = e.target.value; renderRows(userPayments.filter(p => String(p.paymentDate || '').startsWith(filter)));
    });
    const dlBtn = document.getElementById('user-download-excel');
    dlBtn && dlBtn.addEventListener('click', () => {
      const rows = userPayments.map(p => ({ Amount: p.amount, PaymentDate: formatDate(p.paymentDate), Method: p.paymentMethod }));
      window.exportUtil.exportJsonToXlsx(`${loggedInUser.username}_payments.xlsx`, 'Payments', rows);
    });

    renderNavBarUI(navLinksContainer, loggedInUser.role, 'user-dashboard');
  }

  // Accountant Deposit view using template
  async function renderAccountantDeposit() {
    mountTemplate('tpl-accountant-deposit');
    const users = await fetchData('users');
    const userSelect = document.getElementById('user-select');
    const notifUserSelect = document.getElementById('notification-user-select');
    if (userSelect) {
      while (userSelect.firstChild) userSelect.removeChild(userSelect.firstChild);
      users.forEach(u => { const opt = document.createElement('option'); opt.value = u.username; opt.textContent = u.username; userSelect.appendChild(opt); });
    }
    if (notifUserSelect) {
      while (notifUserSelect.firstChild) notifUserSelect.removeChild(notifUserSelect.firstChild);
      users.forEach(u => { const opt = document.createElement('option'); opt.value = u.username; opt.textContent = u.username; notifUserSelect.appendChild(opt); });
    }

    const paymentTypeRadios = Array.from(document.querySelectorAll('input[name="payment-type"]'));
    const depositFields = document.getElementById('deposit-fields');
    const emiFields = document.getElementById('emi-fields');
    const emiLoanSelect = document.getElementById('emi-loan-select');
    const emiInstallmentSelect = document.getElementById('emi-installment-select');
    const emiAmountInput = document.getElementById('emi-amount');
    const emiMethodInput = document.getElementById('emi-method');
    const emiDateInput = document.getElementById('emi-date');
    const emiNotesInput = document.getElementById('emi-notes');
    const todayStr = new Date().toISOString().split('T')[0];
    const depositDateInput = document.getElementById('payment-date');
    if (depositDateInput) depositDateInput.value = todayStr;
    if (emiDateInput) emiDateInput.value = todayStr;

    function getMode() { const r = paymentTypeRadios.find(x => x.checked); return r ? r.value : 'deposit'; }

    let currentActiveLoans = [];
    const installmentsByLoan = {};
    async function loadActiveLoansForSelectedUser() {
      const sel = userSelect?.selectedOptions[0]; if (!sel) return [];
      const userDoc = await fetchData(`users/${encodeURIComponent(sel.value)}`);
      const userId = userDoc?._id; if (!userId) return [];
      const loans = await fetchData(`loans?status=active&borrowerUserId=${encodeURIComponent(userId)}`);
      return Array.isArray(loans) ? loans : [];
    }
    async function populateLoanSelect() {
      if (!emiLoanSelect) return;
      currentActiveLoans = await loadActiveLoansForSelectedUser();
      emiLoanSelect.innerHTML = '';
      if (!currentActiveLoans.length) { emiFields?.classList.add('d-none'); depositFields?.classList.remove('d-none'); return; }
      currentActiveLoans.forEach(l => { const opt = document.createElement('option'); opt.value = l._id; opt.textContent = `${l.purpose || 'Loan'} - ${Number(l.principalAmount||0).toFixed(2)}`; emiLoanSelect.appendChild(opt); });
      await populateInstallments();
      emiFields?.classList.remove('d-none'); depositFields?.classList.add('d-none');
    }
    async function populateInstallments() {
      if (!emiInstallmentSelect || !emiLoanSelect) return;
      const loanId = emiLoanSelect.value; if (!loanId) { emiInstallmentSelect.innerHTML = ''; return; }
      if (!installmentsByLoan[loanId]) {
        const details = await fetchData(`loans/${loanId}`);
        const installments = (details && details.installments) ? details.installments : [];
        installmentsByLoan[loanId] = installments.filter(i => i.status !== 'paid');
      }
      const pending = installmentsByLoan[loanId];
      emiInstallmentSelect.innerHTML = '';
      pending.forEach(inst => { const opt = document.createElement('option'); opt.value = inst._id; opt.textContent = `#${inst.periodNo} • Due ${new Date(inst.dueDate).toISOString().split('T')[0]} • ${Number(inst.totalDue||0).toFixed(2)}`; opt.dataset.totalDue = Number(inst.totalDue||0).toFixed(2); emiInstallmentSelect.appendChild(opt); });
      if (pending.length && emiAmountInput) emiAmountInput.value = Number(pending[0].totalDue||0).toFixed(2);
    }
    userSelect?.addEventListener('change', populateLoanSelect);
    emiLoanSelect?.addEventListener('change', populateInstallments);
    emiInstallmentSelect?.addEventListener('change', () => { const opt = emiInstallmentSelect.selectedOptions[0]; if (opt && emiAmountInput) emiAmountInput.value = opt.dataset.totalDue || ''; });
    paymentTypeRadios.forEach(r => r.addEventListener('change', async () => { if (r.value === 'emi' && r.checked) await populateLoanSelect(); else { emiFields?.classList.add('d-none'); depositFields?.classList.remove('d-none'); } }));

    // Submit payment
    document.getElementById('payment-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = userSelect?.value;
      if (getMode() === 'deposit') {
        const amount = document.getElementById('amount').value;
        const paymentDate = document.getElementById('payment-date').value;
        const paymentMethod = document.getElementById('payment-method').value;
        const notes = (document.getElementById('deposit-notes')||{}).value;
        const result = await postData('payments', { username, amount, paymentDate, paymentMethod, notes });
        if (result !== 'Access Denied') { alert('Payment added!'); e.target.reset(); await refreshNotifBell(); }
      } else {
        const loanId = emiLoanSelect?.value; const installmentId = emiInstallmentSelect?.value; const paidAmount = emiAmountInput?.value; const paidDate = emiDateInput?.value || todayStr; const method = emiMethodInput?.value; const notes = emiNotesInput?.value;
        if (!loanId || !installmentId || !paidAmount) { alert('Please select loan, installment, and amount.'); return; }
        const result = await postJson(`loans/${loanId}/emi-payment`, { installmentId, paidAmount: Number(paidAmount), paidDate, method, notes });
        if (result) { alert('EMI payment recorded successfully.'); await refreshNotifBell(); }
      }
    });

    // Notification submit
    document.getElementById('notification-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = notifUserSelect?.value; const message = document.getElementById('notification-message').value;
      await postData('notifications', { username, message }); alert('Notification sent!'); e.target.reset();
    });

    renderNavBarUI(navLinksContainer, loggedInUser.role, 'accountant-deposit');
  }

  // Loans & EMIs using template
  async function renderLoansEmisPage() {
    mountTemplate('tpl-loans-emis');
    const users = await fetchData('users');
    const prefillUser = sessionStorage.getItem('prefillLoanUser'); if (prefillUser) sessionStorage.removeItem('prefillLoanUser');
    const loanUserSel = document.getElementById('loan-user');
    if (loanUserSel) {
      while (loanUserSel.firstChild) loanUserSel.removeChild(loanUserSel.firstChild);
      users.forEach(u => { const opt = document.createElement('option'); opt.value = u.username; opt.textContent = u.username; if (prefillUser === u.username) opt.selected = true; loanUserSel.appendChild(opt); });
    }
    const form = document.getElementById('loan-form');
    const detailsEl = document.getElementById('loan-details');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const borrowerUsername = loanUserSel?.value;
      const purpose = document.getElementById('loan-purpose').value.trim();
      const principalAmount = parseFloat(document.getElementById('loan-amount').value);
      const durationMonths = parseInt(document.getElementById('loan-duration').value, 10);
      const ratePct = parseFloat(document.getElementById('loan-rate').value);
      const interestRateBp = Math.round(ratePct * 100);
      const dueDayStart = parseInt(document.getElementById('loan-window-start').value || '1', 10);
      const dueDayEnd = parseInt(document.getElementById('loan-window-end').value || '10', 10);
      const startDate = document.getElementById('loan-start-date').value;
      if (!borrowerUsername || !principalAmount || !durationMonths || !ratePct) { alert('Please fill in all required fields.'); return; }
      const payload = { borrowerUsername, purpose, principalAmount, interestRateBp, durationMonths, dueDayStart, dueDayEnd }; if (startDate) payload.startDate = startDate;
      const result = await postJson('loans', payload);
      if (result) { alert('Loan issued successfully.'); renderLoanDetails(result); }
    });

    function renderLoanDetails(data) {
      if (!detailsEl) return;
      detailsEl.innerHTML = '';
      const { loan, installments } = data;
      const top = document.createElement('div'); top.className = 'mb-3';
      top.innerHTML = `
        <h5>Borrower: <span class="badge badge-secondary">${loan.borrowerUserId}</span></h5>
        <p class="mb-1"><strong>Purpose:</strong> ${loan.purpose || '-'}</p>
        <p class="mb-1"><strong>Amount:</strong> ${loan.principalAmount.toFixed(2)}</p>
        <p class="mb-1"><strong>Duration:</strong> ${loan.durationMonths} months</p>
        <p class="mb-1"><strong>Interest:</strong> ${(loan.interestRateBp/100).toFixed(2)}%</p>
        <p class="mb-1"><strong>Window:</strong> ${loan.dueDayStart}-${loan.dueDayEnd}</p>
        <p class="mb-1"><strong>Status:</strong> ${loan.status}</p>`;
      detailsEl.appendChild(top);

      const header = document.createElement('div'); header.className = 'd-flex justify-content-between align-items-center mb-2';
      const h5 = document.createElement('h5'); h5.className = 'mb-0'; h5.textContent = 'Installments';
      const btnWrap = document.createElement('div');
      const btnX = document.createElement('button'); btnX.id = 'export-loan-xlsx'; btnX.className = 'btn btn-success btn-sm'; btnX.innerHTML = '<i class="fas fa-file-excel mr-1"></i>Export Excel';
      const btnC = document.createElement('button'); btnC.id = 'export-loan-csv'; btnC.className = 'btn btn-outline-secondary btn-sm'; btnC.innerHTML = '<i class="fas fa-file-csv mr-1"></i>Export CSV';
      btnWrap.appendChild(btnX); btnWrap.appendChild(btnC); header.appendChild(h5); header.appendChild(btnWrap); detailsEl.appendChild(header);

      const tableWrap = document.createElement('div'); tableWrap.className = 'table-responsive';
      const table = document.createElement('table'); table.className = 'table table-striped'; table.id = 'loan-schedule-table';
      const thead = document.createElement('thead'); thead.innerHTML = '<tr><th>Period</th><th>Due Date</th><th>Principal</th><th>Interest</th><th>Total</th><th>Status</th></tr>';
      const tbody = document.createElement('tbody');
      (installments || []).forEach(inst => {
        const tr = document.createElement('tr');
        const tdP = document.createElement('td'); tdP.textContent = String(inst.periodNo);
        const tdD = document.createElement('td'); tdD.textContent = new Date(inst.dueDate).toISOString().split('T')[0];
        const tdPr = document.createElement('td'); tdPr.textContent = inst.principalDue.toFixed(2);
        const tdI = document.createElement('td'); tdI.textContent = inst.interestDue.toFixed(2);
        const tdT = document.createElement('td'); tdT.textContent = inst.totalDue.toFixed(2);
        const tdS = document.createElement('td'); tdS.textContent = inst.status;
        tr.appendChild(tdP); tr.appendChild(tdD); tr.appendChild(tdPr); tr.appendChild(tdI); tr.appendChild(tdT); tr.appendChild(tdS); tbody.appendChild(tr);
      });
      table.appendChild(thead); table.appendChild(tbody); tableWrap.appendChild(table); detailsEl.appendChild(tableWrap);

      btnX.addEventListener('click', () => {
        const rows = (installments || []).map(i => ({ Period: i.periodNo, DueDate: new Date(i.dueDate).toISOString().split('T')[0], Principal: i.principalDue, Interest: i.interestDue, Total: i.totalDue, Status: i.status }));
        window.exportUtil.exportJsonToXlsx('loan_schedule.xlsx', 'Schedule', rows);
      });
      btnC.addEventListener('click', () => { window.exportUtil.exportTableToCsv('loan_schedule.csv', '#loan-schedule-table'); });
    }

    renderNavBarUI(navLinksContainer, loggedInUser.role, 'loans-emis');
  }

  // expose views

  return {
    renderAdminDashboard,
    renderUserPaymentDetails,
    renderAdminUsers,
    renderAccountantDashboard,
    renderAccountantDeposit,
    renderUserDashboard,
    renderLoansEmisPage,
  };
}
