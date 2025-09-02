document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));

    if (!token || !loggedInUser) {
        window.location.href = 'index.html';
        return;
    }

    // Initialize Socket.IO connection
    const socket = io();

    // Listen for payment events
    socket.on('paymentAdded', () => { refreshNotifBell(); });

    socket.on('paymentUpdated', () => { refreshNotifBell(); });

    socket.on('paymentDeleted', () => { refreshNotifBell(); });

    // Listen for notification events
    socket.on('notificationAdded', async (newNotification) => {
        console.log('Notification added in real-time:', newNotification);
        await refreshNotifBell();
    });

    socket.on('notificationUpdated', async (updatedNotification) => {
        console.log('Notification updated in real-time:', updatedNotification);
        await refreshNotifBell();
    });

    document.getElementById('logged-in-username').textContent = `Logged in as: ${loggedInUser.username} (${loggedInUser.role})`;

    const dashboardContent = document.getElementById('dashboard-content');
    const navLinksContainer = document.getElementById('nav-links');

    const formatDate = (value) => {
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
    };

    const calculatePaymentDetails = (username, allPayments) => {
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
    };

    const fetchData = async (endpoint) => {
        try {
            const response = await fetch(`/api/${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });
            if (!response.ok) {
                if (response.status === 403) {
                    alert('Access Denied: You do not have permission to view this data.');
                    return [];
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error fetching data from ${endpoint}:`, error);
            return [];
        }
    };

    const postData = async (endpoint, data) => {
        try {
            const response = await fetch(`/api/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                if (response.status === 403) {
                    alert('Access Denied: You do not have permission to perform this action.');
                    return 'Access Denied';
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.text();
        } catch (error) {
            console.error(`Error posting data to ${endpoint}:`, error);
        }
    };

    // JSON-post variant for endpoints that return JSON
    const postJson = async (endpoint, data) => {
        try {
            const response = await fetch(`/api/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                if (response.status === 403) {
                    alert('Access Denied: You do not have permission to perform this action.');
                    return null;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error posting JSON to ${endpoint}:`, error);
            return null;
        }
    };

    const putData = async (endpoint, data) => {
        try {
            const response = await fetch(`/api/${endpoint}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                if (response.status === 403) {
                    alert('Access Denied: You do not have permission to perform this action.');
                    return 'Access Denied';
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.text();
        } catch (error) {
            console.error(`Error putting data to ${endpoint}:`, error);
        }
    };

    const deleteData = async (endpoint) => {
        try {
            const response = await fetch(`/api/${endpoint}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });
            if (!response.ok) {
                if (response.status === 403) {
                    alert('Access Denied: You do not have permission to perform this action.');
                    return 'Access Denied';
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.text();
        } catch (error) {
            console.error(`Error deleting data from ${endpoint}:`, error);
        }
    };

    const renderNavBar = (activeTab) => {
        navLinksContainer.innerHTML = '';
        let links = [];

        if (loggedInUser.role === 'admin') {
            links = [
                { name: 'Overview', id: 'admin-dashboard', icon: 'fas fa-chart-line', hash: '#admin-dashboard' },
                { name: 'Members', id: 'admin-users', icon: 'fas fa-users', hash: '#admin-users' },
                { name: 'Collections (In)', id: 'admin-deposit', icon: 'fas fa-money-check-alt', hash: '#admin-deposit' },
                { name: 'Loans & EMIs', id: 'loans-emis', icon: 'fas fa-hand-holding-usd', hash: '#loans-emis' }
            ];
        } else if (loggedInUser.role === 'accountant') {
            links = [
                { name: 'Dashboard', id: 'accountant-dashboard', icon: 'fas fa-chart-line', hash: '#accountant-dashboard' },
                { name: 'Record Collection (In)', id: 'accountant-deposit', icon: 'fas fa-money-check-alt', hash: '#accountant-deposit' },
                { name: 'Loan Management', id: 'loans-emis', icon: 'fas fa-hand-holding-usd', hash: '#loans-emis' }
            ];
        } else if (loggedInUser.role === 'user') {
            links = [
                { name: 'My Balance', id: 'user-dashboard', icon: 'fas fa-chart-line', hash: '#user-dashboard' }
            ];
        }

        links.forEach(link => {
            const li = document.createElement('li');
            li.className = 'nav-item';
            const a = document.createElement('a');
            a.href = link.hash;
            a.className = `btn btn-outline-light mx-1 ${activeTab === link.id ? 'active' : ''}`;
            a.innerHTML = `<i class="${link.icon} mr-2"></i>${link.name}`;
            li.appendChild(a);
            navLinksContainer.appendChild(li);
        });
    };

    // Notifications UI helpers
    async function refreshNotifBell() {
        const limit = 5;
        const listAll = await fetchData(`all-notifications`);
        const list = Array.isArray(listAll) ? listAll.slice(-limit).reverse() : [];
        const countEl = document.getElementById('notif-count');
        const listEl = document.getElementById('notif-list');
        const unreadCount = Array.isArray(listAll) ? listAll.filter(n => (n.status || 'unread') !== 'read').length : 0;
        if (countEl) countEl.textContent = unreadCount;
        if (listEl) {
            listEl.innerHTML = '';
            (list || []).forEach(n => {
                const div = document.createElement('div');
                div.className = 'dropdown-item-text';
                const dateStr = n.createdAt ? new Date(n.createdAt).toISOString().split('T')[0] : '';
                div.innerHTML = `<small class="text-muted mr-2">${dateStr}</small>${n.message}`;
                listEl.appendChild(div);
            });
            if (!unreadCount) {
                const empty = document.createElement('div');
                empty.className = 'dropdown-item-text text-muted';
                empty.textContent = 'No unread notifications';
                listEl.appendChild(empty);
            }
        }
    }

    const setupPaymentEventListeners = () => {
        document.querySelectorAll('.edit-payment-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const btn = e.target.closest('.edit-payment-btn');
                const id = btn.dataset.id;
                const username = btn.dataset.username;
                const amount = btn.dataset.amount;
                const date = btn.dataset.date;
                const method = btn.dataset.method;

                document.getElementById('edit-payment-id').value = id;
                document.getElementById('edit-username').value = username;
                document.getElementById('edit-amount').value = amount;
                document.getElementById('edit-paymentDate').value = date;
                document.getElementById('edit-paymentMethod').value = method;
            });
        });

        document.querySelectorAll('.delete-payment-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const btn = e.target.closest('.delete-payment-btn');
                const id = btn.dataset.id;
                if (confirm('Are you sure you want to delete this payment?')) {
                    const result = await deleteData(`payments/${id}`);
                    if (result !== 'Access Denied') {
                        alert('Payment deleted successfully!');
                        await refreshNotifBell();
                    }
                }
            });
        });

        document.getElementById('edit-payment-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-payment-id').value;
            const username = document.getElementById('edit-username').value;
            const amount = document.getElementById('edit-amount').value;
            const paymentDate = document.getElementById('edit-paymentDate').value;
            const paymentMethod = document.getElementById('edit-paymentMethod').value;

            const result = await putData(`payments/${id}`, { username, amount, paymentDate, paymentMethod });
            if (result !== 'Access Denied') {
                alert('Payment updated successfully!');
                $('#editPaymentModal').modal('hide');
                await refreshNotifBell();
            }
        });
    };

    // Helpers to render modals
    function showLoansModal(loans) {
        // Build modal HTML dynamically
        const modalId = 'loansModal';
        let modal = document.getElementById(modalId);
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'modal fade';
            modal.id = modalId;
            modal.tabIndex = -1;
            modal.innerHTML = `
            <div class="modal-dialog modal-lg">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title">Loans List</h5>
                  <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                  </button>
                </div>
                <div class="modal-body">
                  <div class="d-flex justify-content-between align-items-center mb-2">
                    <form id="loans-filter" class="form-inline">
                      <label class="mr-2">Status</label>
                      <select id="loans-status" class="form-control form-control-sm mr-2">
                        <option value="active,closed" selected>Active + Closed</option>
                        <option value="active">Active</option>
                        <option value="closed">Closed</option>
                      </select>
                      <label class="mr-2">From</label>
                      <input id="loans-from" type="date" class="form-control form-control-sm mr-2"/>
                      <label class="mr-2">To</label>
                      <input id="loans-to" type="date" class="form-control form-control-sm mr-2"/>
                      <button class="btn btn-primary btn-sm" type="submit">Apply</button>
                    </form>
                    <div>
                      <button id="export-loans-xlsx" class="btn btn-success btn-sm mr-2"><i class="fas fa-file-excel mr-1"></i>Export XLSX</button>
                      <button id="export-loans-csv" class="btn btn-outline-secondary btn-sm"><i class="fas fa-file-csv mr-1"></i>Export CSV</button>
                      <button id="export-loans-server" class="btn btn-outline-primary btn-sm ml-2"><i class="fas fa-cloud-download-alt mr-1"></i>Server Export</button>
                    </div>
                  </div>
                  <div class="table-responsive">
                    <table class="table table-striped" id="loans-list-table">
                      <thead><tr><th>Borrower</th><th>Purpose</th><th>Principal</th><th>Issued</th><th>Next EMI Due</th><th>Status</th></tr></thead>
                      <tbody></tbody>
                    </table>
                  </div>
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                </div>
              </div>
            </div>`;
            document.body.appendChild(modal);
        }
        const tbody = modal.querySelector('tbody');
        tbody.innerHTML = '';
        loans.forEach(l => {
            const tr = document.createElement('tr');
            const nextStr = l.nextEmiDue ? `${new Date(l.nextEmiDue).toISOString().split('T')[0]}` : (l.nextEmi ? `#${l.nextEmi.periodNo} on ${new Date(l.nextEmi.dueDate).toISOString().split('T')[0]}` : '-');
            const principal = (l.principalAmount != null ? Number(l.principalAmount) : Number(l.amount || 0)).toFixed(2);
            const issued = l.issuedDate ? new Date(l.issuedDate).toISOString().split('T')[0] : '';
            const status = l.status || '';
            tr.innerHTML = `<td>${l.borrower || ''}</td><td>${l.purpose || ''}</td><td>${principal}</td><td>${issued}</td><td>${nextStr}</td><td>${status}</td>`;
            tbody.appendChild(tr);
        });
        const exportBtn = document.getElementById('export-loans-xlsx');
        if (exportBtn) {
          exportBtn.onclick = () => {
            const rows = loans.map(l => ({
              Borrower: l.borrower || '',
              Purpose: l.purpose || '',
              Principal: l.principalAmount != null ? Number(l.principalAmount) : Number(l.amount || 0),
              Issued: l.issuedDate ? new Date(l.issuedDate).toISOString().split('T')[0] : '',
              NextEmiDue: l.nextEmiDue ? new Date(l.nextEmiDue).toISOString().split('T')[0] : (l.nextEmi && l.nextEmi.dueDate ? new Date(l.nextEmi.dueDate).toISOString().split('T')[0] : ''),
              Status: l.status || ''
            }));
            window.exportUtil.exportJsonToXlsx('loans_detail.xlsx', 'Loans', rows);
          };
        }
        const exportCsvBtn = document.getElementById('export-loans-csv');
        if (exportCsvBtn) {
          exportCsvBtn.onclick = () => {
            const rows = loans.map(l => ({
              Borrower: l.borrower || '',
              Purpose: l.purpose || '',
              Principal: l.principalAmount != null ? Number(l.principalAmount) : Number(l.amount || 0),
              Issued: l.issuedDate ? new Date(l.issuedDate).toISOString().split('T')[0] : '',
              NextEmiDue: l.nextEmiDue ? new Date(l.nextEmiDue).toISOString().split('T')[0] : (l.nextEmi && l.nextEmi.dueDate ? new Date(l.nextEmi.dueDate).toISOString().split('T')[0] : ''),
              Status: l.status || ''
            }));
            window.exportUtil.exportJsonToCsv('loans_detail.csv', rows);
          };
        }
        const filterForm = document.getElementById('loans-filter');
        if (filterForm) {
          filterForm.onsubmit = async (e) => {
            e.preventDefault();
            const status = document.getElementById('loans-status').value;
            const from = document.getElementById('loans-from').value;
            const to = document.getElementById('loans-to').value;
            const qs = new URLSearchParams();
            if (status) qs.append('status', status);
            if (from) qs.append('from', from);
            if (to) qs.append('to', to);
            const rows = await fetchData(`dashboard/loans/detail?${qs.toString()}`);
            showLoansModal(Array.isArray(rows) ? rows : []);
          };
        }
        const serverBtn = document.getElementById('export-loans-server');
        if (serverBtn) {
          serverBtn.onclick = async () => {
            const status = (document.getElementById('loans-status')||{}).value;
            const from = (document.getElementById('loans-from')||{}).value;
            const to = (document.getElementById('loans-to')||{}).value;
            const payload = { type: 'loans', filters: { status, from, to }, format: 'csv' };
            try {
              const resp = await fetch('/api/exports', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
              const ct = resp.headers.get('content-type') || '';
              if (ct.includes('text/csv')) {
                const blob = await resp.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'loans.csv'; a.click(); window.URL.revokeObjectURL(url);
              } else {
                const data = await resp.json();
                if (data.jobId) alert('Export started. You will be notified when it is ready.');
              }
            } catch (e) { alert('Failed to start export'); }
          };
        }
        // @ts-ignore jQuery modal
        $('#'+modalId).modal('show');
    }

    function showBalancesModal(balanceRows) {
        const modalId = 'balancesModal';
        let modal = document.getElementById(modalId);
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'modal fade';
            modal.id = modalId;
            modal.tabIndex = -1;
            modal.innerHTML = `
            <div class="modal-dialog modal-lg">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title">Per-user Balances</h5>
                  <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                  </button>
                </div>
                <div class="modal-body">
                  <div class="table-responsive">
                    <table class="table table-striped" id="balances-table">
                      <thead><tr><th>User</th><th>Balance</th><th>Last Txn</th></tr></thead>
                      <tbody></tbody>
                    </table>
                  </div>
                </div>
                <div class="modal-footer">
                  <button id="export-balances-xlsx" class="btn btn-success"><i class="fas fa-file-excel mr-2"></i>Export</button>
                  <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                </div>
              </div>
            </div>`;
            document.body.appendChild(modal);
        }
        const tbody = modal.querySelector('tbody');
        tbody.innerHTML = '';
        balanceRows.forEach(r => {
          const tr = document.createElement('tr');
          const last = r.lastTxnAt ? new Date(r.lastTxnAt).toISOString().split('T')[0] : '';
          tr.innerHTML = `<td>${r.username || r.userId}</td><td>${Number(r.balance||0).toFixed(2)}</td><td>${last}</td>`;
          tbody.appendChild(tr);
        });
        document.getElementById('export-balances-xlsx').onclick = () => {
            const rows = balanceRows.map(r => ({ User: r.username || r.userId, Balance: Number(r.balance||0), LastTxn: r.lastTxnAt ? new Date(r.lastTxnAt).toISOString().split('T')[0] : '' }));
            window.exportUtil.exportJsonToXlsx('balances.xlsx', 'Balances', rows);
        };
        const exportCsvBtn = document.createElement('button');
        exportCsvBtn.className = 'btn btn-outline-secondary';
        exportCsvBtn.style.marginLeft = '8px';
        exportCsvBtn.id = 'export-balances-csv';
        exportCsvBtn.innerHTML = '<i class="fas fa-file-csv mr-2"></i>Export CSV';
        const footer = modal.querySelector('.modal-footer');
        footer.insertBefore(exportCsvBtn, footer.firstChild);
        exportCsvBtn.onclick = () => {
          const rows = balanceRows.map(r => ({ User: r.username || r.userId, Balance: Number(r.balance||0), LastTxn: r.lastTxnAt ? new Date(r.lastTxnAt).toISOString().split('T')[0] : '' }));
          window.exportUtil.exportJsonToCsv('balances.csv', rows);
        };
        // @ts-ignore
        $('#'+modalId).modal('show');
    }

    function showTotalAmountModal(detail) {
        const modalId = 'totalAmountModal';
        let modal = document.getElementById(modalId);
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'modal fade';
            modal.id = modalId;
            modal.tabIndex = -1;
            modal.innerHTML = `
            <div class="modal-dialog modal-lg">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title">Total Amount – Breakdown</h5>
                  <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                  </button>
                </div>
                <div class="modal-body">
                  <ul class="nav nav-tabs" role="tablist">
                    <li class="nav-item">
                      <a class="nav-link active" data-toggle="tab" href="#tab-interest" role="tab">Per-User Interest Earned</a>
                    </li>
                    <li class="nav-item">
                      <a class="nav-link" data-toggle="tab" href="#tab-closures" role="tab">Loan Closure History</a>
                    </li>
                  </ul>
                  <div class="tab-content pt-3">
                    <div class="tab-pane fade show active" id="tab-interest" role="tabpanel">
                    <div class="d-flex justify-content-end mb-2">
                        <button id="export-interest-xlsx" class="btn btn-success btn-sm mr-2"><i class="fas fa-file-excel mr-1"></i>Export XLSX</button>
                        <button id="export-interest-csv" class="btn btn-outline-secondary btn-sm"><i class="fas fa-file-csv mr-1"></i>Export CSV</button>
                      </div>
                      <div class="table-responsive">
                        <table class="table table-striped" id="interest-table">
                          <thead><tr><th>Loan</th><th>User</th><th>Interest Share</th><th>From</th><th>To</th></tr></thead>
                          <tbody></tbody>
                        </table>
                      </div>
                    </div>
                    <div class="tab-pane fade" id="tab-closures" role="tabpanel">
                      <div class="d-flex justify-content-end mb-2">
                        <button id="export-closures-xlsx" class="btn btn-success btn-sm mr-2"><i class="fas fa-file-excel mr-1"></i>Export XLSX</button>
                        <button id="export-closures-csv" class="btn btn-outline-secondary btn-sm"><i class="fas fa-file-csv mr-1"></i>Export CSV</button>
                      </div>
                      <div class="table-responsive">
                        <table class="table table-striped" id="closures-table">
                          <thead><tr><th>Loan</th><th>Borrower</th><th>Total Interest</th><th>Closed</th></tr></thead>
                          <tbody></tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                </div>
              </div>
            </div>`;
            document.body.appendChild(modal);
        }
        const tbody1 = modal.querySelector('#interest-table tbody');
        tbody1.innerHTML = '';
        (detail.perUserInterest || []).forEach(r => {
          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${r.loanId}</td><td>${r.username}</td><td>${Number(r.interestShare||0).toFixed(2)}</td><td>${r.from ? new Date(r.from).toISOString().split('T')[0] : ''}</td><td>${r.to ? new Date(r.to).toISOString().split('T')[0] : ''}</td>`;
          tbody1.appendChild(tr);
        });
        const exportInterest = document.getElementById('export-interest-xlsx');
        if (exportInterest) {
          exportInterest.onclick = () => {
            const rows = (detail.perUserInterest || []).map(r => ({ Loan: String(r.loanId), User: r.username, InterestShare: Number(r.interestShare||0), From: r.from ? new Date(r.from).toISOString().split('T')[0] : '', To: r.to ? new Date(r.to).toISOString().split('T')[0] : '' }));
            window.exportUtil.exportJsonToXlsx('per_user_interest.xlsx', 'Interest', rows);
          };
        }
        const exportInterestCsv = document.getElementById('export-interest-csv');
        if (exportInterestCsv) {
          exportInterestCsv.onclick = () => {
            const rows = (detail.perUserInterest || []).map(r => ({ Loan: String(r.loanId), User: r.username, InterestShare: Number(r.interestShare||0), From: r.from ? new Date(r.from).toISOString().split('T')[0] : '', To: r.to ? new Date(r.to).toISOString().split('T')[0] : '' }));
            window.exportUtil.exportJsonToCsv('per_user_interest.csv', rows);
          };
        }
        const tbody2 = modal.querySelector('#closures-table tbody');
        tbody2.innerHTML = '';
        (detail.loanClosures || []).forEach(l => {
          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${l._id}</td><td>${l.borrower || ''}</td><td>${Number(l.totalInterest||0).toFixed(2)}</td><td>${l.closedDate ? new Date(l.closedDate).toISOString().split('T')[0] : ''}</td>`;
          tbody2.appendChild(tr);
        });
        const exportClosures = document.getElementById('export-closures-xlsx');
        if (exportClosures) {
          exportClosures.onclick = () => {
            const rows = (detail.loanClosures || []).map(l => ({ Loan: String(l._id), Borrower: l.borrower || '', TotalInterest: Number(l.totalInterest||0), Closed: l.closedDate ? new Date(l.closedDate).toISOString().split('T')[0] : '' }));
            window.exportUtil.exportJsonToXlsx('loan_closures.xlsx', 'Closures', rows);
          };
        }
        const exportClosuresCsv = document.getElementById('export-closures-csv');
        if (exportClosuresCsv) {
          exportClosuresCsv.onclick = () => {
            const rows = (detail.loanClosures || []).map(l => ({ Loan: String(l._id), Borrower: l.borrower || '', TotalInterest: Number(l.totalInterest||0), Closed: l.closedDate ? new Date(l.closedDate).toISOString().split('T')[0] : '' }));
            window.exportUtil.exportJsonToCsv('loan_closures.csv', rows);
          };
        }
        // @ts-ignore
        $('#'+modalId).modal('show');
    }

    const renderAdminDashboard = async () => {
        const users = await fetchData('users');
        const payments = await fetchData('all-payments');
        const notifications = await fetchData('all-notifications');
        const summary = await fetchData('dashboard/summary');
        const totalAmount = summary?.totalAmount || 0;
        const totalLoanIssued = summary?.totalLoanIssued || 0;
        const remainingBalance = summary?.remainingBalance || 0;

        // Build user cards

        let userCardsHtml = '';
        users.forEach(user => {
            const { totalPayment, lastMonthPayment } = calculatePaymentDetails(user.username, payments);
            userCardsHtml += `
                <div class="col-12 col-sm-6 col-md-4 mb-4">
                    <div class="card user-card h-100 shadow-sm">
                        <div class="card-body">
                            <h5 class="card-title"><i class="fas fa-user-circle mr-2"></i>${user.username}</h5>
                            <p class="card-text"><strong>Role:</strong> ${user.role}</p>
                            <p class="card-text"><strong>Last Month Payment:</strong> ${lastMonthPayment}</p>
                            <p class="card-text"><strong>Total Payment:</strong> ${totalPayment}</p>
                        </div>
                    </div>
                </div>
            `;
        });

        dashboardContent.innerHTML = `
            <div class="row">
                <div class="col-12 col-md-4 mb-4">
                    <div class="card text-white bg-primary h-100 shadow">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <h5 class="card-title mb-0"><i class="fas fa-users mr-2"></i>Total Users</h5>
                                <h2 class="display-4 mb-0">${users.length}</h2>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-12 col-md-4 mb-4">
                    <div class="card text-white bg-success h-100 shadow">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <h5 class="card-title mb-0"><i class="fas fa-file-invoice-dollar mr-2"></i>Total Payments</h5>
                                <h2 class="display-4 mb-0">${payments.length}</h2>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-12 col-md-4 mb-4">
                    <div class="card text-white bg-info h-100 shadow clickable" id="card-total-amount">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <h5 class="card-title mb-0"><i class="fas fa-dollar-sign mr-2"></i>Total Amount</h5>
                                <h2 class="display-4 mb-0">${Number(totalAmount).toFixed(2)}</h2>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-12 col-md-6 mb-4">
                    <div class="card text-white bg-secondary h-100 shadow clickable" id="card-total-loan-issued">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <h5 class="card-title mb-0"><i class="fas fa-hand-holding-usd mr-2"></i>Total Loan Issued</h5>
                                <h2 class="display-4 mb-0">${Number(totalLoanIssued).toFixed(2)}</h2>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-12 col-md-6 mb-4">
                    <div class="card text-white bg-warning h-100 shadow clickable" id="card-remaining-balance">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <h5 class="card-title mb-0"><i class="fas fa-wallet mr-2"></i>Remaining Balance</h5>
                                <h2 class="display-4 mb-0">${Number(remainingBalance).toFixed(2)}</h2>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card shadow-lg mb-4">
                <div class="card-header bg-dark text-white">
                    <h2 class="mb-0"><i class="fas fa-bell mr-2"></i>Recent Notifications</h2>
                </div>
                <div class="card-body">
                    <div id="notification-list"></div>
                </div>
            </div>

            <h2 class="mt-4 mb-3 section-title">User Overview</h2>
            <div class="row" id="user-overview-cards">
                ${userCardsHtml}
            </div>

            <div class="card shadow mb-4">
                <div class="card-header bg-dark text-white">
                    <h2 class="mb-0"><i class="fas fa-money-bill-wave mr-2"></i>All Payments Overview</h2>
                </div>
                <div class="card-body">
                    <button id="download-all-payments-excel-admin" class="btn btn-success mb-3"><i class="fas fa-file-excel mr-2"></i>Download All Payments as Excel</button>
                    <div class="table-responsive">
                        <table class="table table-striped table-hover data-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Amount</th>
                                    <th>Payment Date</th>
                                    <th>Payment Method</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="all-payments-list-admin">
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        const notificationList = document.getElementById('notification-list');
        notifications.slice(-5).reverse().forEach(notification => {
            const notificationElement = document.createElement('div');
            notificationElement.className = 'notification-item';
            notificationElement.innerHTML = `
                <p>${notification.message || ''}</p>
            `;
            notificationList.appendChild(notificationElement);
        });

        // Click handlers: fetch details on demand
        document.getElementById('card-total-amount').addEventListener('click', async () => {
            const detail = await fetchData('dashboard/total-amount/detail');
            showTotalAmountModal(detail);
        });
        document.getElementById('card-total-loan-issued').addEventListener('click', async () => {
            const rows = await fetchData('dashboard/loans/detail?status=active,closed');
            showLoansModal(Array.isArray(rows) ? rows : []);
        });
        document.getElementById('card-remaining-balance').addEventListener('click', async () => {
            const rows = await fetchData('dashboard/balances/detail');
            showBalancesModal(Array.isArray(rows) ? rows : []);
        });

        const allPaymentsListAdmin = document.getElementById('all-payments-list-admin');
        payments.forEach(payment => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${payment.username}</td>
                <td>${payment.amount}</td>
                <td>${formatDate(payment.paymentDate)}</td>
                <td>${payment.paymentMethod}</td>
                <td>
                    <button class="btn btn-sm btn-info edit-payment-btn" data-id="${payment._id}" data-username="${payment.username}" data-amount="${payment.amount}" data-date="${formatDate(payment.paymentDate)}" data-method="${payment.paymentMethod}" data-toggle="modal" data-target="#editPaymentModal"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger delete-payment-btn" data-id="${payment._id}"><i class="fas fa-trash-alt"></i></button>
                </td>
            `;
            allPaymentsListAdmin.appendChild(tr);
        });

        document.getElementById('download-all-payments-excel-admin').addEventListener('click', () => {
            const monthlySummary = {};

            payments.forEach(payment => {
                const date = new Date(payment.paymentDate);
                const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

                if (!monthlySummary[payment.username]) {
                    monthlySummary[payment.username] = { Username: payment.username };
                }
                if (!monthlySummary[payment.username][yearMonth]) {
                    monthlySummary[payment.username][yearMonth] = [];
                }
                monthlySummary[payment.username][yearMonth].push(`${parseFloat(payment.amount).toFixed(2)} (${payment.paymentDate})`);
            });

            const summaryArray = Object.values(monthlySummary).map(userSummary => {
                const newUserSummary = { Username: userSummary.Username };
                let total = 0;
                for (const key in userSummary) {
                    if (key !== 'Username') {
                        newUserSummary[key] = userSummary[key].join(', ');
                        userSummary[key].forEach(entry => {
                            total += parseFloat(entry.split(' ')[0]);
                        });
                    }
                }
                newUserSummary['Total Deposit'] = total.toFixed(2);
                return newUserSummary;
            });

            const grandTotal = summaryArray.reduce((sum, user) => sum + parseFloat(user['Total Deposit']), 0);
            summaryArray.push({ Username: 'Grand Total', 'Total Deposit': grandTotal.toFixed(2) });

            const worksheet = XLSX.utils.json_to_sheet(summaryArray);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Monthly Payments Summary');
            XLSX.writeFile(workbook, 'all_payments_summary_admin.xlsx');
        });

        document.getElementById('user-overview-cards').addEventListener('click', (e) => {
            const userCard = e.target.closest('.user-card');
            if (userCard) {
                const username = userCard.querySelector('h5').textContent.trim();
                window.location.hash = `#user-details/${username}`;
            }
        });

        setupPaymentEventListeners();
        renderNavBar('admin-dashboard');
    };

    const renderUserPaymentDetails = async (username) => {
        const allPayments = await fetchData('all-payments');
        const userPayments = allPayments.filter(p => p.username === username);
        let total = 0;
        userPayments.forEach(p => total += parseFloat(p.amount));

        dashboardContent.innerHTML = `
            <h2 class="section-title mb-4">Payment History for ${username}</h2>
            <button id="back-to-admin-dashboard" class="btn btn-secondary mb-3"><i class="fas fa-arrow-left mr-2"></i>Back to Dashboard</button>
            <div class="card shadow mb-4">
                <div class="card-header bg-primary text-white">
                    <h5 class="mb-0"><i class="fas fa-filter mr-2"></i>Filter Payments</h5>
                </div>
                <div class="card-body">
                    <div class="form-group row">
                        <label for="month-filter" class="col-sm-2 col-form-label">Filter by Month:</label>
                        <div class="col-sm-4">
                            <input type="month" id="month-filter" class="form-control">
                        </div>
                        <div class="col-sm-6 text-right">
                            <button id="download-user-excel" class="btn btn-success"><i class="fas fa-file-excel mr-2"></i>Download as Excel</button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="card shadow mb-4">
                <div class="card-header bg-dark text-white">
                    <h5 class="mb-0"><i class="fas fa-table mr-2"></i>Payment Details</h5>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-striped table-hover data-table">
                            <thead>
                                <tr>
                                    <th>Amount</th>
                                    <th>Payment Date</th>
                                    <th>Payment Method</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="user-payment-list">
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        const renderPaymentsTable = (paymentsToRender) => {
            const userPaymentList = document.getElementById('user-payment-list');
            userPaymentList.innerHTML = '';
            paymentsToRender.forEach(payment => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${payment.amount}</td>
                    <td>${formatDate(payment.paymentDate)}</td>
                    <td>${payment.paymentMethod}</td>
                    <td>
                        <button class="btn btn-sm btn-info edit-payment-btn" data-id="${payment._id}" data-username="${payment.username}" data-amount="${payment.amount}" data-date="${formatDate(payment.paymentDate)}" data-method="${payment.paymentMethod}" data-toggle="modal" data-target="#editPaymentModal"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-danger delete-payment-btn" data-id="${payment._id}"><i class="fas fa-trash-alt"></i></button>
                    </td>
                `;
                userPaymentList.appendChild(tr);
            });
            setupPaymentEventListeners();
        };

        renderPaymentsTable(userPayments);

        document.getElementById('month-filter').addEventListener('change', (e) => {
            const filter = e.target.value;
            const filteredPayments = userPayments.filter(p => p.paymentDate.startsWith(filter));
            renderPaymentsTable(filteredPayments);
        });

        document.getElementById('download-user-excel').addEventListener('click', () => {
            const monthlySummary = {};

            userPayments.forEach(payment => {
                const date = new Date(payment.paymentDate);
                const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

                if (!monthlySummary[payment.username]) {
                    monthlySummary[payment.username] = { Username: payment.username };
                }
                if (!monthlySummary[payment.username][yearMonth]) {
                    monthlySummary[payment.username][yearMonth] = [];
                }
                monthlySummary[payment.username][yearMonth].push(`${parseFloat(payment.amount).toFixed(2)} (${payment.paymentDate})`);
            });

            const summaryArray = Object.values(monthlySummary).map(userSummary => {
                const newUserSummary = { Username: userSummary.Username };
                let total = 0;
                for (const key in userSummary) {
                    if (key !== 'Username') {
                        newUserSummary[key] = userSummary[key].join(', ');
                        userSummary[key].forEach(entry => {
                            total += parseFloat(entry.split(' ')[0]);
                        });
                    }
                }
                newUserSummary['Total Deposit'] = total.toFixed(2);
                return newUserSummary;
            });

            const grandTotal = summaryArray.reduce((sum, user) => sum + parseFloat(user['Total Deposit']), 0);
            summaryArray.push({ Username: 'Grand Total', 'Total Deposit': grandTotal.toFixed(2) });

            const worksheet = XLSX.utils.json_to_sheet(summaryArray);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Monthly Payments Summary');
            XLSX.writeFile(workbook, `${username}_payments_summary.xlsx`);
        });

        document.getElementById('back-to-admin-dashboard').addEventListener('click', () => {
            window.location.hash = '#admin-dashboard';
        });
    };

    const renderAdminUsers = async () => {
        const users = await fetchData('users');
        dashboardContent.innerHTML = `
            <div class="row">
                <div class="col-12 col-md-5 mb-4">
                    <div class="card shadow-lg">
                        <div class="card-header bg-primary text-white">
                            <h2 class="mb-0" id="user-form-title"><i class="fas fa-user-plus mr-2"></i>Create User</h2>
                        </div>
                        <div class="card-body">
                            <form id="user-form">
                                <input type="hidden" id="original-username">
                                <div class="form-group">
                                    <label for="new-username"><i class="fas fa-user mr-2"></i>Username</label>
                                    <input id="new-username" type="text" class="form-control" placeholder="Username">
                                </div>
                                <div class="form-group">
                                    <label for="new-password"><i class="fas fa-lock mr-2"></i>Password</label>
                                    <input id="new-password" type="password" class="form-control" placeholder="Leave blank to keep current password">
                                </div>
                                <div class="form-group">
                                    <label for="role"><i class="fas fa-user-tag mr-2"></i>Role</label>
                                    <select id="role" class="form-control">
                                        <option value="user">User</option>
                                        <option value="accountant">Accountant</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div class="form-actions text-center">
                                    <button id="user-form-submit" type="submit" class="btn btn-primary"><i class="fas fa-plus-circle mr-2"></i>Create User</button>
                                    <button id="cancel-edit" type="button" class="btn btn-secondary ml-2 hidden"><i class="fas fa-times-circle mr-2"></i>Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                <div class="col-12 col-md-7 mb-4">
                    <div class="card shadow-lg">
                        <div class="card-header bg-dark text-white">
                            <h2 class="mb-0"><i class="fas fa-users-cog mr-2"></i>Users Management</h2>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                        <table class="table table-striped table-hover data-table">
                            <thead>
                                <tr>
                                    <th>Username</th>
                                    <th>Role</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="user-list">
                            </tbody>
                        </table>
                    </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const userForm = document.getElementById('user-form');
        const userFormTitle = document.getElementById('user-form-title');
        const userFormSubmit = document.getElementById('user-form-submit');
        const cancelEditButton = document.getElementById('cancel-edit');
        const originalUsernameInput = document.getElementById('original-username');
        const newUsernameInput = document.getElementById('new-username');
        const newPasswordInput = document.getElementById('new-password');
        const roleInput = document.getElementById('role');

        const resetForm = () => {
            userForm.reset();
            userFormTitle.textContent = 'Create User';
            userFormSubmit.textContent = 'Create User';
            cancelEditButton.classList.add('hidden');
            originalUsernameInput.value = '';
        };

        const renderUsersTable = (usersToRender) => {
            const userList = document.getElementById('user-list');
            userList.innerHTML = '';
            usersToRender.forEach(user => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${user.username}</td>
                    <td>${user.role}</td>
                    <td>
                        <button class="btn btn-sm btn-info mr-2 edit-user-btn" data-username="${user.username}"><i class="fas fa-edit"></i> Edit</button>
                        <button class="btn btn-sm btn-danger delete-user-btn" data-username="${user.username}"><i class="fas fa-trash-alt"></i> Delete</button>
                    </td>
                `;
                userList.appendChild(tr);
            });

            document.querySelectorAll('.delete-user-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const username = e.target.closest('.delete-user-btn').dataset.username;
                    if (confirm(`Are you sure you want to delete ${username}?`)) {
                        await deleteData(`users/${username}`);
                        renderAdminUsers();
                    }
                });
            });

            document.querySelectorAll('.edit-user-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const username = e.target.closest('.edit-user-btn').dataset.username;
                    const userToEdit = await fetchData(`users/${username}`);
                    if (userToEdit) {
                        userFormTitle.textContent = 'Edit User';
                        userFormSubmit.textContent = 'Update User';
                        cancelEditButton.classList.remove('hidden');
                        originalUsernameInput.value = userToEdit.username;
                        newUsernameInput.value = userToEdit.username;
                        roleInput.value = userToEdit.role;
                    }
                });
            });
        };

        renderUsersTable(users);

        userForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newUsername = newUsernameInput.value;
            const newPassword = newPasswordInput.value;
            const role = roleInput.value;
            const originalUsername = originalUsernameInput.value;

            const userData = {
                username: newUsername,
                password: newPassword,
                role: role,
                originalUsername: originalUsername
            };

            await postData('users', userData);
            renderAdminUsers();
            resetForm();
        });

        cancelEditButton.addEventListener('click', resetForm);
        renderNavBar('admin-users');
    };

    const renderAccountantDashboard = async () => {
        const users = await fetchData('users');
        const payments = await fetchData('all-payments');
        const notifications = await fetchData('all-notifications');
        const summary = await fetchData('dashboard/summary');
        const totalAmount = summary?.totalAmount || 0;
        const totalLoanIssued = summary?.totalLoanIssued || 0;
        const remainingBalance = summary?.remainingBalance || 0;

        let userCardsHtml = '';
        users.forEach(user => {
            const { totalPayment, lastMonthPayment } = calculatePaymentDetails(user.username, payments);
            userCardsHtml += `
                <div class="col-12 col-sm-6 col-md-4 mb-4">
                    <div class="card user-card h-100 shadow-sm">
                        <div class="card-body">
                            <h5 class="card-title"><i class="fas fa-user-circle mr-2"></i>${user.username}</h5>
                            <p class="card-text"><strong>Role:</strong> ${user.role}</p>
                            <p class="card-text"><strong>Last Month Payment:</strong> ${lastMonthPayment}</p>
                            <p class="card-text"><strong>Total Payment:</strong> ${totalPayment}</p>
                        </div>
                    </div>
                </div>
            `;
        });

        dashboardContent.innerHTML = `
            <div class="row">
                <div class="col-12 col-md-4 mb-4">
                    <div class="card text-white bg-primary h-100 shadow">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <h5 class="card-title mb-0"><i class="fas fa-file-invoice-dollar mr-2"></i>Total Payments</h5>
                                <h2 class="display-4 mb-0">${payments.length}</h2>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-12 col-md-4 mb-4">
                    <div class="card text-white bg-info h-100 shadow clickable" id="ac-card-total-amount">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <h5 class="card-title mb-0"><i class="fas fa-dollar-sign mr-2"></i>Total Amount</h5>
                                <h2 class="display-4 mb-0">${Number(totalAmount).toFixed(2)}</h2>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-12 col-md-4 mb-4">
                    <div class="card text-white bg-warning h-100 shadow">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <h5 class="card-title mb-0"><i class="fas fa-bell mr-2"></i>Recent Notifications Sent</h5>
                                <h2 class="display-4 mb-0">${notifications.length}</h2>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-12 col-md-6 mb-4">
                    <div class="card text-white bg-secondary h-100 shadow clickable" id="ac-card-total-loan-issued">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <h5 class="card-title mb-0"><i class="fas fa-hand-holding-usd mr-2"></i>Total Loan Issued</h5>
                                <h2 class="display-4 mb-0">${Number(totalLoanIssued).toFixed(2)}</h2>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-12 col-md-6 mb-4">
                    <div class="card text-white bg-warning h-100 shadow clickable" id="ac-card-remaining-balance">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <h5 class="card-title mb-0"><i class="fas fa-wallet mr-2"></i>Remaining Balance</h5>
                                <h2 class="display-4 mb-0">${Number(remainingBalance).toFixed(2)}</h2>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="card shadow-lg mb-4">
                <div class="card-header bg-dark text-white">
                    <h2 class="mb-0"><i class="fas fa-bell mr-2"></i>Recent Notifications</h2>
                </div>
                <div class="card-body">
                    <div id="notification-list"></div>
                </div>
            </div>
            <h2 class="mt-4 mb-3 section-title">User Overview</h2>
            <div class="row" id="user-overview-cards">
                ${userCardsHtml}
            </div>
            <div class="card shadow mb-4">
                <div class="card-header bg-dark text-white">
                    <h2 class="mb-0"><i class="fas fa-money-bill-wave mr-2"></i>All Payments</h2>
                </div>
                <div class="card-body">
                    <button id="download-all-payments-excel" class="btn btn-success mb-3"><i class="fas fa-file-excel mr-2"></i>Download All Payments as Excel</button>
                    <div class="table-responsive">
                        <table class="table table-striped table-hover data-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Amount</th>
                                    <th>Payment Date</th>
                                    <th>Payment Method</th>
                                </tr>
                            </thead>
                            <tbody id="all-payments-list">
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        const notificationList = document.getElementById('notification-list');
        notifications.slice(-5).reverse().forEach(notification => {
            const notificationElement = document.createElement('div');
            notificationElement.className = 'notification-item';
            notificationElement.innerHTML = `
                <p>${notification.message || ''}</p>
            `;
            notificationList.appendChild(notificationElement);
        });

        const allPaymentsList = document.getElementById('all-payments-list');
        payments.forEach(payment => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${payment.username}</td>
                <td>${payment.amount}</td>
                <td>${payment.paymentDate}</td>
                <td>${payment.paymentMethod}</td>
                <td>
                    <button class="btn btn-sm btn-info edit-payment-btn" data-id="${payment._id}" data-username="${payment.username}" data-amount="${payment.amount}" data-date="${payment.paymentDate}" data-method="${payment.paymentMethod}" data-toggle="modal" data-target="#editPaymentModal"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger delete-payment-btn" data-id="${payment._id}"><i class="fas fa-trash-alt"></i></button>
                </td>
            `;
            allPaymentsList.appendChild(tr);
        });

        setupPaymentEventListeners();

        document.getElementById('download-all-payments-excel').addEventListener('click', () => {
            const monthlySummary = {};

            payments.forEach(payment => {
                const date = new Date(payment.paymentDate);
                const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

                if (!monthlySummary[payment.username]) {
                    monthlySummary[payment.username] = { Username: payment.username };
                }
                if (!monthlySummary[payment.username][yearMonth]) {
                    monthlySummary[payment.username][yearMonth] = [];
                }
                monthlySummary[payment.username][yearMonth].push(`${parseFloat(payment.amount).toFixed(2)} (${payment.paymentDate})`);
            });

            const summaryArray = Object.values(monthlySummary).map(userSummary => {
                const newUserSummary = { Username: userSummary.Username };
                let total = 0;
                for (const key in userSummary) {
                    if (key !== 'Username') {
                        newUserSummary[key] = userSummary[key].join(', ');
                        userSummary[key].forEach(entry => {
                            total += parseFloat(entry.split(' ')[0]);
                        });
                    }
                }
                newUserSummary['Total Deposit'] = total.toFixed(2);
                return newUserSummary;
            });

            const grandTotal = summaryArray.reduce((sum, user) => sum + parseFloat(user['Total Deposit']), 0);
            summaryArray.push({ Username: 'Grand Total', 'Total Deposit': grandTotal.toFixed(2) });

            const worksheet = XLSX.utils.json_to_sheet(summaryArray);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Monthly Payments Summary');
            XLSX.writeFile(workbook, 'all_payments_summary.xlsx');
        });

        // Card click handlers (accountant): fetch details on demand
        const acTotalAmount = document.getElementById('ac-card-total-amount');
        if (acTotalAmount) acTotalAmount.addEventListener('click', async () => {
            const detail = await fetchData('dashboard/total-amount/detail');
            showTotalAmountModal(detail);
        });
        const acTotalIssued = document.getElementById('ac-card-total-loan-issued');
        if (acTotalIssued) acTotalIssued.addEventListener('click', async () => {
            const rows = await fetchData('dashboard/loans/detail?status=active,closed');
            showLoansModal(Array.isArray(rows) ? rows : []);
        });
        const acRemainBal = document.getElementById('ac-card-remaining-balance');
        if (acRemainBal) acRemainBal.addEventListener('click', async () => {
            const rows = await fetchData('dashboard/balances/detail');
            showBalancesModal(Array.isArray(rows) ? rows : []);
        });

        // Add deposit breakdown click
        document.getElementById('ac-card-total-deposit').addEventListener('click', () => {
            showDepositBreakdownModal(users, payments, interestEarned, loans.filter(l => l.status === 'closed'));
        });

        document.getElementById('user-overview-cards').addEventListener('click', (e) => {
            const userCard = e.target.closest('.user-card');
            if (userCard) {
                const username = userCard.querySelector('h5').textContent.trim();
                window.location.hash = `#user-details/${username}`;
            }
        });

        renderNavBar('accountant-dashboard');
    };

    const renderAccountantDeposit = async () => {
        const users = await fetchData('users');
        dashboardContent.innerHTML = `
            <h2 class="section-title mb-4"><i class="fas fa-money-check-alt mr-2"></i>Add Payment</h2>
            <div class="card shadow mb-4">
                <div class="card-body">
                    <form id="payment-form">
                        <div class="form-group">
                            <label for="user-select"><i class="fas fa-user mr-2"></i>User</label>
                            <select id="user-select" class="form-control"></select>
                        </div>
                        <div class="form-group">
                          <label class="mr-3"><input type="radio" name="payment-type" value="deposit" checked> Deposit</label>
                          <label><input type="radio" name="payment-type" value="emi"> Pay EMI</label>
                        </div>
                        <div id="deposit-fields">
                          <div class="form-group">
                              <label for="amount"><i class="fas fa-dollar-sign mr-2"></i>Deposit Amount</label>
                              <input id="amount" type="number" class="form-control" placeholder="Amount">
                          </div>
                          <div class="form-group">
                              <label for="payment-date"><i class="fas fa-calendar-alt mr-2"></i>Date of Deposit</label>
                              <input id="payment-date" type="date" class="form-control">
                          </div>
                          <div class="form-group">
                              <label for="payment-method"><i class="fas fa-credit-card mr-2"></i>Payment Method</label>
                              <input id="payment-method" type="text" class="form-control" placeholder="e.g., Cash, Bank, Transfer">
                          </div>
                          <div class="form-group">
                              <label for="deposit-notes"><i class="fas fa-sticky-note mr-2"></i>Notes</label>
                              <textarea id="deposit-notes" class="form-control" placeholder="Optional notes"></textarea>
                          </div>
                        </div>
                        <div id="emi-fields" class="d-none">
                          <div class="form-group">
                              <label for="emi-loan-select"><i class="fas fa-hand-holding-usd mr-2"></i>Select Loan</label>
                              <select id="emi-loan-select" class="form-control"></select>
                          </div>
                          <div class="form-group">
                              <label for="emi-installment-select"><i class="fas fa-list-ol mr-2"></i>Select Installment</label>
                              <select id="emi-installment-select" class="form-control"></select>
                          </div>
                          <div class="form-group">
                              <label for="emi-amount"><i class="fas fa-coins mr-2"></i>Amount</label>
                              <input id="emi-amount" type="number" step="0.01" class="form-control" placeholder="Auto-filled from installment">
                          </div>
                          <div class="form-group">
                              <label for="emi-method"><i class="fas fa-credit-card mr-2"></i>Payment Method</label>
                              <input id="emi-method" type="text" class="form-control" placeholder="e.g., Cash, Bank, Transfer">
                          </div>
                          <div class="form-group">
                              <label for="emi-date"><i class="fas fa-calendar-alt mr-2"></i>Payment Date</label>
                              <input id="emi-date" type="date" class="form-control">
                          </div>
                          <div class="form-group">
                              <label for="emi-notes"><i class="fas fa-sticky-note mr-2"></i>Notes</label>
                              <textarea id="emi-notes" class="form-control" placeholder="Optional notes"></textarea>
                          </div>
                        </div>
                        <div class="form-actions text-center">
                            <button type="submit" class="btn btn-primary"><i class="fas fa-check mr-2"></i>Submit</button>
                        </div>
                    </form>
                </div>
            </div>

            <h2 class="section-title mb-4"><i class="fas fa-bell mr-2"></i>Send Notification</h2>
            <div class="card shadow mb-4">
                <div class="card-body">
                    <form id="notification-form">
                        <div class="form-group">
                            <label for="notification-user-select"><i class="fas fa-user mr-2"></i>User</label>
                            <select id="notification-user-select" class="form-control">
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="notification-message"><i class="fas fa-envelope mr-2"></i>Message</label>
                            <textarea id="notification-message" class="form-control" placeholder="Enter your notification message"></textarea>
                        </div>
                        <div class="form-actions text-center">
                            <button type="submit" class="btn btn-info"><i class="fas fa-paper-plane mr-2"></i>Send Notification</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        const userSelect = document.getElementById('user-select');
        const notificationUserSelect = document.getElementById('notification-user-select');
        const userOptions = users.map(user => `<option value="${user.username}">${user.username}</option>`).join('');
        userSelect.innerHTML = userOptions;
        notificationUserSelect.innerHTML = userOptions;
        const userIdByUsername = {};
        users.forEach(u => { userIdByUsername[u.username] = u._id || ''; });
        Array.from(userSelect.options).forEach(opt => { opt.dataset.userId = userIdByUsername[opt.value] || ''; });

        const paymentTypeRadios = document.getElementsByName('payment-type');
        const depositFields = document.getElementById('deposit-fields');
        const emiFields = document.getElementById('emi-fields');
        const emiLoanSelect = document.getElementById('emi-loan-select');
        const emiInstallmentSelect = document.getElementById('emi-installment-select');
        const emiAmountInput = document.getElementById('emi-amount');
        const emiMethodInput = document.getElementById('emi-method');
        const emiDateInput = document.getElementById('emi-date');
        const emiNotesInput = document.getElementById('emi-notes');
        const depositDateInput = document.getElementById('payment-date');

        const todayStr = new Date().toISOString().split('T')[0];
        if (depositDateInput) depositDateInput.value = todayStr;
        if (emiDateInput) emiDateInput.value = todayStr;

        function getSelectedPaymentType() {
            return Array.from(paymentTypeRadios).find(r => r.checked)?.value || 'deposit';
        }

        const emiRadio = document.querySelector('input[name="payment-type"][value="emi"]');
        const emiLabel = emiRadio ? emiRadio.closest('label') : null;

        function toggleFieldsVisibility(canShowEmi) {
            const mode = getSelectedPaymentType();
            if (mode === 'emi' && canShowEmi) {
                emiFields.classList.remove('d-none');
                depositFields.classList.add('d-none');
            } else {
                emiFields.classList.add('d-none');
                depositFields.classList.remove('d-none');
                // Reset EMI radio if cannot show EMI
                if (!canShowEmi) {
                    const depRadio = Array.from(paymentTypeRadios).find(r => r.value === 'deposit');
                    if (depRadio) depRadio.checked = true;
                }
            }
            if (emiLabel) {
                if (canShowEmi) emiLabel.classList.remove('d-none');
                else emiLabel.classList.add('d-none');
            }
        }

        let currentActiveLoans = [];
        let currentInstallmentsByLoan = {};

        async function loadActiveLoansForUser() {
            const sel = userSelect.selectedOptions[0];
            if (!sel) return [];
            const borrowerUserId = sel.dataset.userId;
            if (!borrowerUserId) return [];
            const loans = await fetchData(`loans?status=active&borrowerUserId=${borrowerUserId}`);
            return Array.isArray(loans) ? loans : [];
        }

        async function populateLoanSelect() {
            currentActiveLoans = await loadActiveLoansForUser();
            emiLoanSelect.innerHTML = '';
            if (!currentActiveLoans.length) {
                toggleFieldsVisibility(false);
                return;
            }
            currentInstallmentsByLoan = {};
            currentActiveLoans.forEach(l => {
                const opt = document.createElement('option');
                opt.value = l._id;
                opt.textContent = `${l.purpose || 'Loan'} - ${Number(l.principalAmount||0).toFixed(2)}`;
                emiLoanSelect.appendChild(opt);
            });
            await populateInstallmentsForSelectedLoan();
            toggleFieldsVisibility(true);
        }

        async function populateInstallmentsForSelectedLoan() {
            const loanId = emiLoanSelect.value;
            if (!loanId) { emiInstallmentSelect.innerHTML = ''; return; }
            if (!currentInstallmentsByLoan[loanId]) {
                const details = await fetchData(`loans/${loanId}`);
                const installments = (details && details.installments) ? details.installments : [];
                currentInstallmentsByLoan[loanId] = installments.filter(i => i.status !== 'paid');
            }
            const pending = currentInstallmentsByLoan[loanId];
            emiInstallmentSelect.innerHTML = '';
            pending.forEach(inst => {
                const opt = document.createElement('option');
                opt.value = inst._id;
                opt.textContent = `#${inst.periodNo} • Due ${new Date(inst.dueDate).toISOString().split('T')[0]} • ${Number(inst.totalDue||0).toFixed(2)}`;
                opt.dataset.totalDue = Number(inst.totalDue || 0).toFixed(2);
                emiInstallmentSelect.appendChild(opt);
            });
            if (pending.length) {
                const first = pending[0];
                emiAmountInput.value = Number(first.totalDue || 0).toFixed(2);
            } else {
                emiAmountInput.value = '';
            }
        }

        userSelect.addEventListener('change', populateLoanSelect);
        emiLoanSelect.addEventListener('change', populateInstallmentsForSelectedLoan);
        emiInstallmentSelect.addEventListener('change', () => {
            const opt = emiInstallmentSelect.selectedOptions[0];
            if (opt) emiAmountInput.value = opt.dataset.totalDue || '';
        });
        Array.from(paymentTypeRadios).forEach(r => r.addEventListener('change', async () => {
            if (r.value === 'emi' && r.checked) {
                await populateLoanSelect();
            }
            toggleFieldsVisibility(currentActiveLoans.length > 0);
        }));

        // Initialize EMI availability on load
        await populateLoanSelect();

        let isSubmittingPayment = false;
        const showToast = (msg, kind='success') => {
            let cont = document.getElementById('toast-container');
            if (!cont) {
                cont = document.createElement('div');
                cont.id = 'toast-container';
                cont.style.position = 'fixed';
                cont.style.top = '20px';
                cont.style.right = '20px';
                cont.style.zIndex = 2000;
                document.body.appendChild(cont);
            }
            const el = document.createElement('div');
            el.className = `alert alert-${kind}`;
            el.textContent = msg;
            cont.appendChild(el);
            setTimeout(() => { el.remove(); }, 2000);
        };

        document.getElementById('payment-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            if (isSubmittingPayment) return;
            isSubmittingPayment = true;
            const mode = getSelectedPaymentType();
            const username = userSelect.value;
            if (mode === 'deposit') {
                const amount = document.getElementById('amount').value;
                const paymentDate = document.getElementById('payment-date').value;
                const paymentMethod = document.getElementById('payment-method').value;
                const notes = (document.getElementById('deposit-notes')||{}).value;
                const result = await postData('payments', { username, amount, paymentDate, paymentMethod, notes });
                if (result !== 'Access Denied') {
                    showToast('Payment added!', 'success');
                    e.target.reset();
                    await refreshNotifBell();
                }
            } else {
                const loanId = emiLoanSelect.value;
                const installmentId = emiInstallmentSelect.value;
                const paidAmount = emiAmountInput.value;
                const paidDate = emiDateInput.value || todayStr;
                const method = emiMethodInput.value;
                const notes = emiNotesInput.value;
                if (!loanId || !installmentId || !paidAmount) {
                    alert('Please select loan, installment, and amount.');
                    isSubmittingPayment = false; return;
                }
                const result = await postJson(`loans/${loanId}/emi-payment`, { installmentId, paidAmount: Number(paidAmount), paidDate, method, notes });
                if (result) {
                    showToast('EMI payment recorded successfully.', 'success');
                    await refreshNotifBell();
                }
            }
                    isSubmittingPayment = false;
        });

        document.getElementById('notification-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = notificationUserSelect.value;
            const message = document.getElementById('notification-message').value;

            await postData('notifications', { username, message });
            alert('Notification sent!');
            e.target.reset();
        });
        renderNavBar('accountant-deposit');
    };

    const renderUserDashboard = async () => {
        const allPayments = await fetchData('all-payments');
        const userPayments = allPayments.filter(p => p.username === loggedInUser.username);
        const userData = await fetchData(`users/${loggedInUser.username}`);
        let total = 0;
        userPayments.forEach(p => total += parseFloat(p.amount));

        dashboardContent.innerHTML = `
            <div id="notifications" class="notification-container mb-4"></div>
            <div class="row">
                <div class="col-md-6 offset-md-3 mb-4">
                    <div class="card text-white bg-success h-100 shadow">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <h5 class="card-title mb-0"><i class="fas fa-dollar-sign mr-2"></i>Total Deposited</h5>
                                <h2 class="display-4 mb-0">${total.toFixed(2)}</h2>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <h2 class="section-title mb-4"><i class="fas fa-history mr-2"></i>Payment History</h2>
            <div class="card shadow mb-4">
                <div class="card-header bg-primary text-white">
                    <h5 class="mb-0"><i class="fas fa-filter mr-2"></i>Filter Payments</h5>
                </div>
                <div class="card-body">
                    <div class="form-group row">
                        <label for="month-filter" class="col-sm-2 col-form-label">Filter by Month:</label>
                        <div class="col-sm-4">
                            <input type="month" id="month-filter" class="form-control">
                        </div>
                        <div class="col-sm-6 text-right">
                            <button id="download-user-excel" class="btn btn-success"><i class="fas fa-file-excel mr-2"></i>Download as Excel</button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="card shadow mb-4">
                <div class="card-header bg-dark text-white">
                    <h5 class="mb-0"><i class="fas fa-table mr-2"></i>Your Payments</h5>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-striped table-hover data-table">
                            <thead>
                                <tr>
                                    <th>Amount</th>
                                    <th>Payment Date</th>
                                    <th>Payment Method</th>
                                </tr>
                            </thead>
                            <tbody id="user-payment-list">
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        const renderUserPaymentsTable = (paymentsToRender) => {
            const userPaymentList = document.getElementById('user-payment-list');
            userPaymentList.innerHTML = '';
            paymentsToRender.forEach(payment => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${payment.amount}</td>
                    <td>${formatDate(payment.paymentDate)}</td>
                    <td>${payment.paymentMethod}</td>
                `;
                userPaymentList.appendChild(tr);
            });
        };

        renderUserPaymentsTable(userPayments);

        document.getElementById('month-filter').addEventListener('change', (e) => {
            const filter = e.target.value;
            const filteredPayments = userPayments.filter(p => p.paymentDate.startsWith(filter));
            renderUserPaymentsTable(filteredPayments);
        });

        document.getElementById('download-user-excel').addEventListener('click', () => {
            const monthlySummary = {};

            userPayments.forEach(payment => {
                const date = new Date(payment.paymentDate);
                const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

                if (!monthlySummary[loggedInUser.username]) {
                    monthlySummary[loggedInUser.username] = { Username: loggedInUser.username };
                }
                if (!monthlySummary[loggedInUser.username][yearMonth]) {
                    monthlySummary[loggedInUser.username][yearMonth] = [];
                }
                monthlySummary[loggedInUser.username][yearMonth].push(`${parseFloat(payment.amount).toFixed(2)} (${payment.paymentDate})`);
            });

            const summaryArray = Object.values(monthlySummary).map(userSummary => {
                const newUserSummary = { Username: userSummary.Username };
                let total = 0;
                for (const key in userSummary) {
                    if (key !== 'Username') {
                        newUserSummary[key] = userSummary[key].join(', ');
                        userSummary[key].forEach(entry => {
                            total += parseFloat(entry.split(' ')[0]);
                        });
                    }
                }
                newUserSummary['Total Deposit'] = total.toFixed(2);
                return newUserSummary;
            });

            const grandTotal = summaryArray.reduce((sum, user) => sum + parseFloat(user['Total Deposit']), 0);
            summaryArray.push({ Username: 'Grand Total', 'Total Deposit': grandTotal.toFixed(2) });

            const worksheet = XLSX.utils.json_to_sheet(summaryArray);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Monthly Payments Summary');
            XLSX.writeFile(workbook, `${loggedInUser.username}_payments_summary.xlsx`);
        });

        const notificationsDiv = document.getElementById('notifications');
        const allNotifications = await fetchData('all-notifications');
        const userNotifications = allNotifications.filter(n => n.username === loggedInUser.username);
        notificationsDiv.innerHTML = '';
        userNotifications.filter(n => !n.read).forEach(notification => {
            const notificationElement = document.createElement('div');
            notificationElement.className = 'notification-item';
            notificationElement.innerHTML = `
                <p class="font-bold">Notification</p>
                <p>${notification.message}</p>
                <button class="btn btn-link" data-id="${notification._id}">Mark as read</button>
            `;
            notificationsDiv.appendChild(notificationElement);
        });

        notificationsDiv.addEventListener('click', async (e) => {
            if (e.target.tagName === 'BUTTON' && e.target.dataset.id) {
                const id = e.target.dataset.id;
                await putData(`notifications/${id}`);
                renderUserDashboard();
            }
        });
        renderNavBar('user-dashboard');
    };

    // Loans & EMIs Page
    const renderLoansEmisPage = async () => {
        const users = await fetchData('users');
        const prefillUser = sessionStorage.getItem('prefillLoanUser');
        if (prefillUser) sessionStorage.removeItem('prefillLoanUser');
        const userOptions = users.map(u => `<option value="${u.username}" ${prefillUser===u.username ? 'selected' : ''}>${u.username}</option>`).join('');
        dashboardContent.innerHTML = `
            <h2 class="section-title mb-4"><i class="fas fa-hand-holding-usd mr-2"></i>Loans & EMIs</h2>
            <div class="row">
              <div class="col-md-5">
                <div class="card shadow mb-4">
                  <div class="card-header bg-dark text-white">Issue Loan</div>
                  <div class="card-body">
                    <form id="loan-form">
                      <div class="form-group">
                        <label for="loan-user"><i class="fas fa-user mr-2"></i>Member Name / ID</label>
                        <select id="loan-user" class="form-control">${userOptions}</select>
                      </div>
                      <div class="form-group">
                        <label for="loan-purpose"><i class="fas fa-align-left mr-2"></i>Loan Purpose</label>
                        <input id="loan-purpose" type="text" class="form-control" placeholder="e.g., Medical expense">
                      </div>
                      <div class="form-group">
                        <label for="loan-amount"><i class="fas fa-coins mr-2"></i>Loan Amount</label>
                        <input id="loan-amount" type="number" step="0.01" class="form-control" placeholder="e.g., 50000" required>
                      </div>
                      <div class="form-group">
                        <label for="loan-duration"><i class="fas fa-hourglass-half mr-2"></i>Duration (Months)</label>
                        <input id="loan-duration" type="number" class="form-control" placeholder="e.g., 12" required>
                      </div>
                      <div class="form-group">
                        <label for="loan-rate"><i class="fas fa-percent mr-2"></i>Interest Rate (%)</label>
                        <input id="loan-rate" type="number" step="0.01" class="form-control" placeholder="e.g., 12" required>
                      </div>
                      <div class="form-row">
                        <div class="form-group col">
                          <label for="loan-window-start"><i class="fas fa-calendar-day mr-2"></i>Installment Window (From Day)</label>
                          <input id="loan-window-start" type="number" class="form-control" value="1">
                        </div>
                        <div class="form-group col">
                          <label for="loan-window-end"><i class="fas fa-calendar-day mr-2"></i>To Day</label>
                          <input id="loan-window-end" type="number" class="form-control" value="10">
                        </div>
                      </div>
                      <div class="form-group">
                        <label for="loan-start-date"><i class="fas fa-calendar-alt mr-2"></i>Start Date (optional)</label>
                        <input id="loan-start-date" type="date" class="form-control">
                      </div>
                      <button type="submit" class="btn btn-primary btn-block"><i class="fas fa-paper-plane mr-2"></i>Submit</button>
                    </form>
                  </div>
                </div>
              </div>
              <div class="col-md-7">
                <div class="card shadow mb-4">
                  <div class="card-header bg-info text-white">Loan Details</div>
                  <div class="card-body" id="loan-details">
                    <p class="text-muted">Submit a loan to see details and schedule preview here.</p>
                  </div>
                </div>
              </div>
            </div>
        `;

        const form = document.getElementById('loan-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const borrowerUsername = document.getElementById('loan-user').value;
            const purpose = document.getElementById('loan-purpose').value.trim();
            const principalAmount = parseFloat(document.getElementById('loan-amount').value);
            const durationMonths = parseInt(document.getElementById('loan-duration').value, 10);
            const ratePct = parseFloat(document.getElementById('loan-rate').value);
            const interestRateBp = Math.round(ratePct * 100);
            const dueDayStart = parseInt(document.getElementById('loan-window-start').value || '1', 10);
            const dueDayEnd = parseInt(document.getElementById('loan-window-end').value || '10', 10);
            const startDate = document.getElementById('loan-start-date').value;

            if (!borrowerUsername || !principalAmount || !durationMonths || !ratePct) {
                alert('Please fill in all required fields.');
                return;
            }

            const payload = { borrowerUsername, purpose, principalAmount, interestRateBp, durationMonths, dueDayStart, dueDayEnd };
            if (startDate) payload.startDate = startDate;

            const result = await postJson('loans', payload);
            if (result) {
                alert('Loan issued successfully.');
                renderLoanDetails(result);
            }
        });

        function renderLoanDetails(data) {
            const { loan, installments } = data;
            const detailsEl = document.getElementById('loan-details');
            const scheduleRows = (installments || []).map(inst => `
                <tr>
                   <td>${inst.periodNo}</td>
                   <td>${new Date(inst.dueDate).toISOString().split('T')[0]}</td>
                   <td>${inst.principalDue.toFixed(2)}</td>
                   <td>${inst.interestDue.toFixed(2)}</td>
                   <td>${inst.totalDue.toFixed(2)}</td>
                   <td>${inst.status}</td>
                </tr>
            `).join('');
            detailsEl.innerHTML = `
                <div class="mb-3">
                  <h5>Borrower: <span class="badge badge-secondary">${loan.borrowerUserId}</span></h5>
                  <p class="mb-1"><strong>Purpose:</strong> ${loan.purpose || '-'}</p>
                  <p class="mb-1"><strong>Amount:</strong> ${loan.principalAmount.toFixed(2)}</p>
                  <p class="mb-1"><strong>Duration:</strong> ${loan.durationMonths} months</p>
                  <p class="mb-1"><strong>Interest:</strong> ${(loan.interestRateBp/100).toFixed(2)}%</p>
                  <p class="mb-1"><strong>Window:</strong> ${loan.dueDayStart}-${loan.dueDayEnd}</p>
                  <p class="mb-1"><strong>Status:</strong> ${loan.status}</p>
                </div>
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <h5 class="mb-0">Installments</h5>
                  <div>
                    <button id="export-loan-xlsx" class="btn btn-success btn-sm"><i class="fas fa-file-excel mr-1"></i>Export Excel</button>
                    <button id="export-loan-csv" class="btn btn-outline-secondary btn-sm"><i class="fas fa-file-csv mr-1"></i>Export CSV</button>
                  </div>
                </div>
                <div class="table-responsive">
                  <table class="table table-striped" id="loan-schedule-table">
                    <thead>
                      <tr><th>Period</th><th>Due Date</th><th>Principal</th><th>Interest</th><th>Total</th><th>Status</th></tr>
                    </thead>
                    <tbody>${scheduleRows}</tbody>
                  </table>
                </div>
            `;

            document.getElementById('export-loan-xlsx').addEventListener('click', () => {
                const rows = (installments || []).map(i => ({
                    Period: i.periodNo,
                    DueDate: new Date(i.dueDate).toISOString().split('T')[0],
                    Principal: i.principalDue,
                    Interest: i.interestDue,
                    Total: i.totalDue,
                    Status: i.status,
                }));
                window.exportUtil.exportJsonToXlsx('loan_schedule.xlsx', 'Schedule', rows);
            });
            document.getElementById('export-loan-csv').addEventListener('click', () => {
                window.exportUtil.exportTableToCsv('loan_schedule.csv', '#loan-schedule-table');
            });
        }
    };

    const handleRouting = () => {
        const hash = window.location.hash;
        if (hash.startsWith('#user-details/')) {
            const username = hash.split('/')[1];
            renderUserPaymentDetails(username);
        } else if (hash === '#admin-users') {
            renderAdminUsers();
        } else if (hash === '#admin-deposit' || hash === '#accountant-deposit') {
            renderAccountantDeposit();
        } else if (hash === '#accountant-dashboard') {
            renderAccountantDashboard();
        } else if (hash === '#user-dashboard') {
            renderUserDashboard();
        } else if (hash === '#loans-emis') {
            renderLoansEmisPage();
        } else {
            if (loggedInUser.role === 'admin') {
                renderAdminDashboard();
            } else if (loggedInUser.role === 'accountant') {
                renderAccountantDashboard();
            } else if (loggedInUser.role === 'user') {
                renderUserDashboard();
            }
        }
    };

    window.addEventListener('hashchange', handleRouting);

    // Initial route render
    handleRouting();
    // Initial bell render
    (async () => { await refreshNotifBell(); })();

    document.getElementById('logout-button').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('loggedInUser');
        window.location.href = 'index.html';
    });

    // Initial notifications bell render and real-time updates
    refreshNotifBell();
    socket.on('notificationAdded', () => refreshNotifBell());
    socket.on('notificationUpdated', () => refreshNotifBell());
});

document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    const darkIcon = document.getElementById('theme-toggle-dark-icon');
    const lightIcon = document.getElementById('theme-toggle-light-icon');

    const applyTheme = (theme) => {
        if (theme === 'dark') {
            body.classList.add('dark-mode');
            body.classList.remove('light-mode');
            darkIcon.classList.add('hidden');
            lightIcon.classList.remove('hidden');
        } else {
            body.classList.add('light-mode');
            body.classList.remove('dark-mode');
            darkIcon.classList.remove('hidden');
            lightIcon.classList.add('hidden');
        }
    };

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        applyTheme(savedTheme);
    }

    themeToggle.addEventListener('click', () => {
        if (body.classList.contains('light-mode')) {
            applyTheme('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            applyTheme('light');
            localStorage.setItem('theme', 'light');
        }
    });
});

// Notifications page renderer
async function renderNotificationsPage() {
    const token = localStorage.getItem('token');
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    const dashboardContent = document.getElementById('dashboard-content');
    const navLinksContainer = document.getElementById('nav-links');
    const statusOptions = ['all', 'unread', 'read'];

    dashboardContent.innerHTML = `
      <h2 class="section-title mb-4"><i class="fas fa-bell mr-2"></i>Notifications</h2>
      <div class="card shadow mb-4">
        <div class="card-body">
          <form id="notif-filter" class="form-inline mb-3">
            <label class="mr-2">Status</label>
            <select id="notif-status" class="form-control mr-3">
              <option value="unread" selected>Unread</option>
              <option value="read">Read</option>
              <option value="all">All</option>
            </select>
            <button class="btn btn-primary" type="submit">Apply</button>
          </form>
          <div class="table-responsive">
            <table class="table table-striped" id="notif-table">
              <thead><tr><th>Date</th><th>Message</th><th>Status</th><th>Action</th></tr></thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    async function loadAndRender() {
        const statusSel = document.getElementById('notif-status').value;
        const qs = new URLSearchParams();
        if (statusSel !== 'all') qs.append('status', statusSel);
        else qs.append('status', '');
        const rows = await (async () => {
            try {
                const res = await fetch(`/api/notifications?${qs.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (!res.ok) return [];
                return await res.json();
            } catch (_) { return []; }
        })();
        const tbody = document.querySelector('#notif-table tbody');
        tbody.innerHTML = '';
        rows.forEach(n => {
            const tr = document.createElement('tr');
            const dateStr = n.createdAt ? new Date(n.createdAt).toISOString().split('T')[0] : '';
            tr.innerHTML = `<td>${dateStr}</td><td>${n.message}</td><td>${n.status || 'unread'}</td><td>
              <button class="btn btn-sm btn-outline-${n.status==='read' ? 'secondary' : 'success'} notif-toggle" data-id="${n._id}" data-status="${n.status||'unread'}">${n.status==='read'?'Mark Unread':'Mark Read'}</button>
            </td>`;
            tbody.appendChild(tr);
        });
        // Add export buttons if not present
        if (!document.getElementById('notif-export-xlsx')) {
          const wrap = document.createElement('div');
          wrap.className = 'd-flex justify-content-end mb-2';
          const exportX = document.createElement('button');
          exportX.id = 'notif-export-xlsx';
          exportX.className = 'btn btn-success mr-2';
          exportX.innerHTML = '<i class="fas fa-file-excel mr-2"></i>Export XLSX';
          const exportC = document.createElement('button');
          exportC.id = 'notif-export-csv';
          exportC.className = 'btn btn-outline-secondary';
          exportC.innerHTML = '<i class="fas fa-file-csv mr-2"></i>Export CSV';
          const cardBody = document.querySelector('#notif-table').closest('.card-body');
          cardBody.insertBefore(wrap, cardBody.firstChild);
          wrap.appendChild(exportX);
          wrap.appendChild(exportC);
          exportX.onclick = () => {
            const rows2 = rows.map(n => ({ Recipient: n.userId ? String(n.userId) : (n.role || ''), Message: n.message || '', Status: n.status || 'unread', CreatedAt: n.createdAt ? new Date(n.createdAt).toISOString() : '' }));
            window.exportUtil.exportJsonToXlsx('notifications.xlsx', 'Notifications', rows2);
          };
          exportC.onclick = () => {
            const rows2 = rows.map(n => ({ Recipient: n.userId ? String(n.userId) : (n.role || ''), Message: n.message || '', Status: n.status || 'unread', CreatedAt: n.createdAt ? new Date(n.createdAt).toISOString() : '' }));
            window.exportUtil.exportJsonToCsv('notifications.csv', rows2);
          };
        }
        tbody.querySelectorAll('.notif-toggle').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const curr = e.currentTarget.getAttribute('data-status');
                const next = curr === 'read' ? 'unread' : 'read';
                try {
                    await fetch(`/api/notifications/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ status: next }) });
                } catch(_) {}
                await loadAndRender();
                if (typeof refreshNotifBell === 'function') refreshNotifBell();
            });
        });
    }

    document.getElementById('notif-filter').addEventListener('submit', async (e) => { e.preventDefault(); await loadAndRender(); });
    await loadAndRender();
}
