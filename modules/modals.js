// UI helpers to populate and show existing modals in dashboard.html

export function showLoansModal(loans, { token } = {}) {
  const modal = document.getElementById('loansModal');
  if (!modal) return;
  const tbody = modal.querySelector('#loans-list-table tbody');
  if (tbody) {
    tbody.innerHTML = '';
    (loans || []).forEach(l => {
      const tr = document.createElement('tr');
      const nextStr = l.nextEmiDue ? new Date(l.nextEmiDue).toISOString().split('T')[0]
        : (l.nextEmi && l.nextEmi.dueDate ? new Date(l.nextEmi.dueDate).toISOString().split('T')[0] : '-');
      const principalNum = (l.principalAmount != null ? Number(l.principalAmount) : Number(l.amount || 0));
      const principal = principalNum.toFixed(2);
      const issued = l.issuedDate ? new Date(l.issuedDate).toISOString().split('T')[0] : '';
      const status = l.status || '';
      tr.innerHTML = `<td>${l.borrower || ''}</td><td>${l.purpose || ''}</td><td>${principal}</td><td>${issued}</td><td>${nextStr}</td><td>${status}</td>`;
      tbody.appendChild(tr);
    });
  }
  const exportBtn = document.getElementById('export-loans-xlsx');
  if (exportBtn) {
    exportBtn.onclick = () => {
      const rows = (loans || []).map(l => ({
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
      const rows = (loans || []).map(l => ({
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
      try {
        const resp = await fetch(`/api/dashboard/loans/detail?${qs.toString()}`, { headers: token ? { 'Authorization': `Bearer ${token}` } : {} });
        const data = await resp.json();
        showLoansModal(Array.isArray(data) ? data : [], { token });
      } catch (_) {}
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
        const resp = await fetch('/api/exports', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }, body: JSON.stringify(payload) });
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
  $('#loansModal').modal('show');
}

export function showBalancesModal(balanceRows) {
  const modal = document.getElementById('balancesModal');
  if (!modal) return;
  const tbody = modal.querySelector('#balances-table tbody');
  if (tbody) {
    tbody.innerHTML = '';
    (balanceRows || []).forEach(r => {
      const tr = document.createElement('tr');
      const last = r.lastTxnAt ? new Date(r.lastTxnAt).toISOString().split('T')[0] : '';
      tr.innerHTML = `<td>${r.username || r.userId}</td><td>${Number(r.balance||0).toFixed(2)}</td><td>${last}</td>`;
      tbody.appendChild(tr);
    });
  }
  const exportX = document.getElementById('export-balances-xlsx');
  if (exportX) {
    exportX.onclick = () => {
      const rows = (balanceRows || []).map(r => ({ User: r.username || r.userId, Balance: Number(r.balance||0), LastTxn: r.lastTxnAt ? new Date(r.lastTxnAt).toISOString().split('T')[0] : '' }));
      window.exportUtil.exportJsonToXlsx('balances.xlsx', 'Balances', rows);
    };
  }
  // Inject CSV button if not present
  const footer = modal.querySelector('.modal-footer');
  if (footer && !document.getElementById('export-balances-csv')) {
    const exportCsvBtn = document.createElement('button');
    exportCsvBtn.className = 'btn btn-outline-secondary ml-2';
    exportCsvBtn.id = 'export-balances-csv';
    exportCsvBtn.innerHTML = '<i class="fas fa-file-csv mr-2"></i>Export CSV';
    footer.insertBefore(exportCsvBtn, footer.firstChild);
    exportCsvBtn.onclick = () => {
      const rows = (balanceRows || []).map(r => ({ User: r.username || r.userId, Balance: Number(r.balance||0), LastTxn: r.lastTxnAt ? new Date(r.lastTxnAt).toISOString().split('T')[0] : '' }));
      window.exportUtil.exportJsonToCsv('balances.csv', rows);
    };
  }
  // @ts-ignore
  $('#balancesModal').modal('show');
}

export function showTotalAmountModal(detail) {
  const modal = document.getElementById('totalAmountModal');
  if (!modal) return;
  const tbody1 = modal.querySelector('#interest-table tbody');
  if (tbody1) {
    tbody1.innerHTML = '';
    (detail?.perUserInterest || []).forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${r.loanId}</td><td>${r.username}</td><td>${Number(r.interestShare||0).toFixed(2)}</td><td>${r.from ? new Date(r.from).toISOString().split('T')[0] : ''}</td><td>${r.to ? new Date(r.to).toISOString().split('T')[0] : ''}</td>`;
      tbody1.appendChild(tr);
    });
  }
  const exportInterest = document.getElementById('export-interest-xlsx');
  if (exportInterest) {
    exportInterest.onclick = () => {
      const rows = (detail?.perUserInterest || []).map(r => ({ Loan: String(r.loanId), User: r.username, InterestShare: Number(r.interestShare||0), From: r.from ? new Date(r.from).toISOString().split('T')[0] : '', To: r.to ? new Date(r.to).toISOString().split('T')[0] : '' }));
      window.exportUtil.exportJsonToXlsx('per_user_interest.xlsx', 'Interest', rows);
    };
  }
  const exportInterestCsv = document.getElementById('export-interest-csv');
  if (exportInterestCsv) {
    exportInterestCsv.onclick = () => {
      const rows = (detail?.perUserInterest || []).map(r => ({ Loan: String(r.loanId), User: r.username, InterestShare: Number(r.interestShare||0), From: r.from ? new Date(r.from).toISOString().split('T')[0] : '', To: r.to ? new Date(r.to).toISOString().split('T')[0] : '' }));
      window.exportUtil.exportJsonToCsv('per_user_interest.csv', rows);
    };
  }
  const tbody2 = modal.querySelector('#closures-table tbody');
  if (tbody2) {
    tbody2.innerHTML = '';
    (detail?.loanClosures || []).forEach(l => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${l._id}</td><td>${l.borrower || ''}</td><td>${Number(l.totalInterest||0).toFixed(2)}</td><td>${l.closedDate ? new Date(l.closedDate).toISOString().split('T')[0] : ''}</td>`;
      tbody2.appendChild(tr);
    });
  }
  const exportClosures = document.getElementById('export-closures-xlsx');
  if (exportClosures) {
    exportClosures.onclick = () => {
      const rows = (detail?.loanClosures || []).map(l => ({ Loan: String(l._id), Borrower: l.borrower || '', TotalInterest: Number(l.totalInterest||0), Closed: l.closedDate ? new Date(l.closedDate).toISOString().split('T')[0] : '' }));
      window.exportUtil.exportJsonToXlsx('loan_closures.xlsx', 'Closures', rows);
    };
  }
  const exportClosuresCsv = document.getElementById('export-closures-csv');
  if (exportClosuresCsv) {
    exportClosuresCsv.onclick = () => {
      const rows = (detail?.loanClosures || []).map(l => ({ Loan: String(l._id), Borrower: l.borrower || '', TotalInterest: Number(l.totalInterest||0), Closed: l.closedDate ? new Date(l.closedDate).toISOString().split('T')[0] : '' }));
      window.exportUtil.exportJsonToCsv('loan_closures.csv', rows);
    };
  }
  // @ts-ignore
  $('#totalAmountModal').modal('show');
}

