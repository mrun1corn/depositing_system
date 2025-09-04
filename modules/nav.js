export function renderNavBar(container, role, activeTab) {
  if (!container) return;
  container.innerHTML = '';
  let links = [];
  if (role === 'admin') {
    links = [
      { name: 'Overview', id: 'admin-dashboard', icon: 'fas fa-chart-line', hash: '#admin-dashboard' },
      { name: 'Members', id: 'admin-users', icon: 'fas fa-users', hash: '#admin-users' },
      { name: 'Collections (In)', id: 'admin-deposit', icon: 'fas fa-money-check-alt', hash: '#admin-deposit' },
      { name: 'Loans & EMIs', id: 'loans-emis', icon: 'fas fa-hand-holding-usd', hash: '#loans-emis' }
    ];
  } else if (role === 'accountant') {
    links = [
      { name: 'Dashboard', id: 'accountant-dashboard', icon: 'fas fa-chart-line', hash: '#accountant-dashboard' },
      { name: 'Record Collection (In)', id: 'accountant-deposit', icon: 'fas fa-money-check-alt', hash: '#accountant-deposit' },
      { name: 'Loan Management', id: 'loans-emis', icon: 'fas fa-hand-holding-usd', hash: '#loans-emis' }
    ];
  } else if (role === 'user') {
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
    container.appendChild(li);
  });
}

