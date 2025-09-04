export function setupRouter(loggedInUser, views) {
  const {
    renderAdminDashboard,
    renderAccountantDashboard,
    renderUserDashboard,
    renderLoansEmisPage,
    renderAdminUsers,
    renderAccountantDeposit,
    renderUserPaymentDetails,
  } = views;

  const handleRouting = () => {
    const hash = window.location.hash;
    if (hash.startsWith('#user-details/')) {
      const username = hash.split('/')[1];
      return renderUserPaymentDetails(username);
    }
    if (hash === '#admin-users') return renderAdminUsers();
    if (hash === '#admin-deposit' || hash === '#accountant-deposit') return renderAccountantDeposit();
    if (hash === '#accountant-dashboard') return renderAccountantDashboard();
    if (hash === '#user-dashboard') return renderUserDashboard();
    if (hash === '#loans-emis') return renderLoansEmisPage();

    if (loggedInUser.role === 'admin') return renderAdminDashboard();
    if (loggedInUser.role === 'accountant') return renderAccountantDashboard();
    if (loggedInUser.role === 'user') return renderUserDashboard();
  };

  window.addEventListener('hashchange', handleRouting);
  handleRouting();
  return handleRouting;
}

