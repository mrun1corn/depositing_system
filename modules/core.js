// Centralized logic utilities for the dashboard.

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
  const userPayments = (allPayments || []).filter(p => p.username === username);
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

export function api(token) {
  const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
  const fetchData = async (endpoint) => {
    try {
      const response = await fetch(`/api/${endpoint}`, { headers: { ...authHeaders } });
      if (!response.ok) {
        if (response.status === 403) return [];
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
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        if (response.status === 403) return 'Access Denied';
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      console.error(`Error posting data to ${endpoint}:`, error);
    }
  };

  const postJson = async (endpoint, data) => {
    try {
      const response = await fetch(`/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        if (response.status === 403) return null;
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
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        if (response.status === 403) return 'Access Denied';
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      console.error(`Error putting data to ${endpoint}:`, error);
    }
  };

  const deleteData = async (endpoint) => {
    try {
      const response = await fetch(`/api/${endpoint}`, { method: 'DELETE', headers: { ...authHeaders } });
      if (!response.ok) {
        if (response.status === 403) return 'Access Denied';
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      console.error(`Error deleting data from ${endpoint}:`, error);
    }
  };

  return { fetchData, postData, postJson, putData, deleteData };
}

export function notifications(token) {
  const { fetchData } = api(token);
  async function refreshNotifBell() {
    const listAll = await fetchData(`all-notifications`);
    const list = Array.isArray(listAll) ? listAll.slice().reverse() : [];
    const countEl = document.getElementById('notif-count');
    const listEl = document.getElementById('notif-list');
    const unreadCount = Array.isArray(listAll) ? listAll.filter(n => (n.status || 'unread') !== 'read').length : 0;
    if (countEl) countEl.textContent = unreadCount;
    if (listEl) {
      listEl.innerHTML = '';
      const actions = document.createElement('div');
      actions.className = 'dropdown-item-text text-right';
      const btn = document.createElement('button');
      btn.className = 'btn btn-link btn-sm';
      btn.type = 'button';
      btn.textContent = 'Mark all as read';
      btn.addEventListener('click', async () => { await markAllNotificationsAsRead(listAll); await refreshNotifBell(); });
      actions.appendChild(btn);
      listEl.appendChild(actions);

      (list || []).forEach(n => {
        const div = document.createElement('div');
        div.className = 'dropdown-item-text';
        const dateStr = n.createdAt ? new Date(n.createdAt).toISOString().split('T')[0] : '';
        div.innerHTML = `<small class=\"text-muted mr-2\">${dateStr}</small>${n.message}`;
        listEl.appendChild(div);
      });
      if (!list.length) {
        const empty = document.createElement('div');
        empty.className = 'dropdown-item-text text-muted';
        empty.textContent = 'No notifications';
        listEl.appendChild(empty);
      }
    }
  }

  async function markAllNotificationsAsRead(listAll) {
    try {
      const items = Array.isArray(listAll) ? listAll : await fetchData('all-notifications');
      const unread = (items || []).filter(n => (n.status || 'unread') !== 'read');
      await Promise.all(unread.map(n => fetch(`/api/notifications/${n._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ status: 'read' })
      }).catch(() => null)));
    } catch (e) { console.warn('markAllNotificationsAsRead failed', e); }
  }

  return { refreshNotifBell, markAllNotificationsAsRead };
}

