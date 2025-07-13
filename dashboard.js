document.addEventListener('DOMContentLoaded', () => {
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    if (!loggedInUser) {
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('logged-in-username').textContent = `Logged in as: ${loggedInUser.username} (${loggedInUser.role})`;

    const dashboardContent = document.getElementById('dashboard-content');
    const navLinksContainer = document.getElementById('nav-links');

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
            const response = await fetch(`http://localhost:3000/api/${endpoint}`, {
                headers: {
                    'X-Username': loggedInUser.username,
                    'X-User-Role': loggedInUser.role
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
            const response = await fetch(`http://localhost:3000/api/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Username': loggedInUser.username,
                    'X-User-Role': loggedInUser.role
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

    const putData = async (endpoint, data) => {
        try {
            const response = await fetch(`http://localhost:3000/api/${endpoint}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Username': loggedInUser.username,
                    'X-User-Role': loggedInUser.role
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
            const response = await fetch(`http://localhost:3000/api/${endpoint}`, {
                method: 'DELETE',
                headers: {
                    'X-Username': loggedInUser.username,
                    'X-User-Role': loggedInUser.role
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
                { name: 'Dashboard', id: 'admin-dashboard', icon: 'fas fa-chart-line' },
                { name: 'Users', id: 'admin-users', icon: 'fas fa-users' },
                { name: 'Deposit', id: 'admin-deposit', icon: 'fas fa-money-check-alt' }
            ];
        } else if (loggedInUser.role === 'accountant') {
            links = [
                { name: 'Dashboard', id: 'accountant-dashboard', icon: 'fas fa-chart-line' },
                { name: 'Deposit', id: 'accountant-deposit', icon: 'fas fa-money-check-alt' }
            ];
        } else if (loggedInUser.role === 'user') {
            links = [
                { name: 'Dashboard', id: 'user-dashboard', icon: 'fas fa-chart-line' }
            ];
        }

        links.forEach(link => {
            const li = document.createElement('li');
            li.className = 'nav-item';
            const button = document.createElement('button');
            button.className = `btn btn-outline-light mx-1 ${activeTab === link.id ? 'active' : ''}`;
            button.innerHTML = `<i class="${link.icon} mr-2"></i>${link.name}`;
            button.addEventListener('click', () => {
                if (link.id === 'admin-dashboard') renderAdminDashboard();
                else if (link.id === 'admin-users') renderAdminUsers();
                else if (link.id === 'admin-deposit') renderAccountantDeposit();
                else if (link.id === 'accountant-dashboard') renderAccountantDashboard();
                else if (link.id === 'accountant-deposit') renderAccountantDeposit();
                else if (link.id === 'user-dashboard') renderUserDashboard();
                renderNavBar(link.id);
            });
            li.appendChild(button);
            navLinksContainer.appendChild(li);
        });
    };

    // Admin Dashboard (Overview)
    const renderAdminDashboard = async () => {
        const users = await fetchData('users');
        const payments = await fetchData('all-payments');
        const notifications = await fetchData('all-notifications');

        let totalDeposit = 0;
        payments.forEach(payment => {
            totalDeposit += parseFloat(payment.amount);
        });

        

        let userCardsHtml = '';
        users.forEach(user => {
            const { totalPayment, lastMonthPayment } = calculatePaymentDetails(user.username, payments);
            userCardsHtml += `
                <div class="col-md-4 mb-4">
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
                <div class="col-md-4 mb-4">
                    <div class="card text-white bg-primary h-100 shadow">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <h5 class="card-title mb-0"><i class="fas fa-users mr-2"></i>Total Users</h5>
                                <h2 class="display-4 mb-0">${users.length}</h2>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-4 mb-4">
                    <div class="card text-white bg-success h-100 shadow">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <h5 class="card-title mb-0"><i class="fas fa-file-invoice-dollar mr-2"></i>Total Payments</h5>
                                <h2 class="display-4 mb-0">${payments.length}</h2>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-4 mb-4">
                    <div class="card text-white bg-info h-100 shadow">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <h5 class="card-title mb-0"><i class="fas fa-dollar-sign mr-2"></i>Total Deposit</h5>
                                <h2 class="display-4 mb-0">${totalDeposit.toFixed(2)}</h2>
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
        notifications.slice(-5).reverse().forEach(notification => { // Show last 5 notifications
            const notificationElement = document.createElement('div');
            notificationElement.className = 'notification-item';
            notificationElement.innerHTML = `
                <p><strong>To:</strong> ${notification.username}</p>
                <p>${notification.message}</p>
            `;
            notificationList.appendChild(notificationElement);
        });

        const allPaymentsListAdmin = document.getElementById('all-payments-list-admin');
        payments.forEach(payment => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${payment.username}</td>
                <td>${payment.amount}</td>
                <td>${payment.paymentDate}</td>
                <td>${payment.paymentMethod}</td>
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
                    monthlySummary[payment.username][yearMonth] = 0;
                }
                monthlySummary[payment.username][yearMonth] += parseFloat(payment.amount);
            });

            const summaryArray = Object.values(monthlySummary);

            // Add a total column
            summaryArray.forEach(userSummary => {
                let total = 0;
                for (const key in userSummary) {
                    if (key !== 'Username') {
                        total += userSummary[key];
                    }
                }
                userSummary['Total Deposit'] = total.toFixed(2);
            });

            const worksheet = XLSX.utils.json_to_sheet(summaryArray);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Monthly Payments Summary');
            XLSX.writeFile(workbook, 'all_payments_summary_admin.xlsx');
        });

        // Add click listener to user cards
        document.getElementById('user-overview-cards').addEventListener('click', (e) => {
            const userCard = e.target.closest('.user-card');
            if (userCard) {
                const username = userCard.querySelector('h5').textContent.trim();
                console.log('Clicked username:', username);
                renderUserPaymentDetails(username);
            }
        });

        renderNavBar('admin-dashboard');
    };

    // Function to render detailed payment history for a selected user
    const renderUserPaymentDetails = async (username) => {
        const userData = await fetchData(`users/${username}`);
        const userPayments = userData.payments || [];
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
                    <td>${payment.paymentDate}</td>
                    <td>${payment.paymentMethod}</td>
                `;
                userPaymentList.appendChild(tr);
            });
        };

        renderPaymentsTable(userPayments);

        document.getElementById('month-filter').addEventListener('change', (e) => {
            const filter = e.target.value;
            const filteredPayments = userPayments.filter(p => p.paymentDate.startsWith(filter));
            renderPaymentsTable(filteredPayments);
        });

        document.getElementById('download-user-excel').addEventListener('click', () => {
            const worksheet = XLSX.utils.json_to_sheet(userPayments);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Payments');
            XLSX.writeFile(workbook, `${username}_payments.xlsx`);
        });

        document.getElementById('back-to-admin-dashboard').addEventListener('click', () => {
            renderAdminDashboard();
        });
    };

    // Admin Users Management
    const renderAdminUsers = async () => {
        const users = await fetchData('users');
        dashboardContent.innerHTML = `
            <div class="row">
                <div class="col-md-5 mb-4">
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
                <div class="col-md-7 mb-4">
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
                        <button class="btn btn-sm btn-info mr-2" data-username="${user.username}" data-action="edit"><i class="fas fa-edit"></i> Edit</button>
                        <button class="btn btn-sm btn-danger" data-username="${user.username}" data-action="delete"><i class="fas fa-trash-alt"></i> Delete</button>
                    </td>
                `;
                userList.appendChild(tr);
            });

            userList.addEventListener('click', async (e) => {
                const action = e.target.dataset.action;
                const username = e.target.dataset.username;

                if (action === 'delete') {
                    if (confirm(`Are you sure you want to delete ${username}?`)) {
                        await deleteData(`users/${username}`);
                        renderAdminUsers();
                    }
                } else if (action === 'edit') {
                    const userToEdit = await fetchData(`users/${username}`);
                    if (userToEdit) {
                        userFormTitle.textContent = 'Edit User';
                        userFormSubmit.textContent = 'Update User';
                        cancelEditButton.classList.remove('hidden');
                        originalUsernameInput.value = userToEdit.username;
                        newUsernameInput.value = userToEdit.username;
                        roleInput.value = userToEdit.role;
                    }
                }
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
                originalUsername: originalUsername // Pass original username for update
            };

            await postData('users', userData);
            renderAdminUsers();
            resetForm();
        });

        cancelEditButton.addEventListener('click', resetForm);
        renderNavBar('admin-users');
    };

    // Accountant Dashboard (Overview)
    const renderAccountantDashboard = async () => {
        const users = await fetchData('users');
        const payments = await fetchData('all-payments');
        const notifications = await fetchData('all-notifications');

        let totalDeposit = 0;
        payments.forEach(payment => {
            totalDeposit += parseFloat(payment.amount);
        });

        let userCardsHtml = '';
        users.forEach(user => {
            const { totalPayment, lastMonthPayment } = calculatePaymentDetails(user.username, payments);
            userCardsHtml += `
                <div class="col-md-4 mb-4">
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
                <div class="col-md-4 mb-4">
                    <div class="card text-white bg-primary h-100 shadow">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <h5 class="card-title mb-0"><i class="fas fa-file-invoice-dollar mr-2"></i>Total Payments</h5>
                                <h2 class="display-4 mb-0">${payments.length}</h2>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-4 mb-4">
                    <div class="card text-white bg-info h-100 shadow">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <h5 class="card-title mb-0"><i class="fas fa-dollar-sign mr-2"></i>Total Deposit</h5>
                                <h2 class="display-4 mb-0">${totalDeposit.toFixed(2)}</h2>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-4 mb-4">
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
        notifications.slice(-5).reverse().forEach(notification => { // Show last 5 notifications
            const notificationElement = document.createElement('div');
            notificationElement.className = 'notification-item';
            notificationElement.innerHTML = `
                <p><strong>To:</strong> ${notification.username}</p>
                <p>${notification.message}</p>
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
            `;
            allPaymentsList.appendChild(tr);
        });

        document.getElementById('download-all-payments-excel').addEventListener('click', () => {
            const monthlySummary = {};

            payments.forEach(payment => {
                const date = new Date(payment.paymentDate);
                const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

                if (!monthlySummary[payment.username]) {
                    monthlySummary[payment.username] = { Username: payment.username };
                }
                if (!monthlySummary[payment.username][yearMonth]) {
                    monthlySummary[payment.username][yearMonth] = 0;
                }
                monthlySummary[payment.username][yearMonth] += parseFloat(payment.amount);
            });

            const summaryArray = Object.values(monthlySummary);

            // Add a total column
            summaryArray.forEach(userSummary => {
                let total = 0;
                for (const key in userSummary) {
                    if (key !== 'Username') {
                        total += userSummary[key];
                    }
                }
                userSummary['Total Deposit'] = total.toFixed(2);
            });

            const worksheet = XLSX.utils.json_to_sheet(summaryArray);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Monthly Payments Summary');
            XLSX.writeFile(workbook, 'all_payments_summary.xlsx');
        });

        // Add click listener to user cards
        document.getElementById('user-overview-cards').addEventListener('click', (e) => {
            const userCard = e.target.closest('.user-card');
            if (userCard) {
                const username = userCard.querySelector('h5').textContent.trim();
                console.log('Clicked username:', username);
                renderUserPaymentDetails(username);
            }
        });

        renderNavBar('accountant-dashboard');
    };

    // Accountant Deposit Input and Notifications
    const renderAccountantDeposit = async () => {
        const users = await fetchData('users');
        dashboardContent.innerHTML = `
            <h2 class="section-title mb-4"><i class="fas fa-money-check-alt mr-2"></i>Add Payment</h2>
            <div class="card shadow mb-4">
                <div class="card-body">
                    <form id="payment-form">
                        <div class="form-group">
                            <label for="user-select"><i class="fas fa-user mr-2"></i>User</label>
                            <select id="user-select" class="form-control">
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="amount"><i class="fas fa-dollar-sign mr-2"></i>Amount</label>
                            <input id="amount" type="number" class="form-control" placeholder="Amount">
                        </div>
                        <div class="form-group">
                            <label for="payment-date"><i class="fas fa-calendar-alt mr-2"></i>Payment Date</label>
                            <input id="payment-date" type="date" class="form-control">
                        </div>
                        <div class="form-group">
                            <label for="payment-method"><i class="fas fa-credit-card mr-2"></i>Payment Method</label>
                            <input id="payment-method" type="text" class="form-control" placeholder="e.g., Cash, Credit Card">
                        </div>
                        <div class="form-actions text-center">
                            <button type="submit" class="btn btn-primary"><i class="fas fa-plus-circle mr-2"></i>Add Payment</button>
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

        document.getElementById('payment-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = userSelect.value;
            const amount = document.getElementById('amount').value;
            const paymentDate = document.getElementById('payment-date').value;
            const paymentMethod = document.getElementById('payment-method').value;

            await postData('payments', { username, amount, paymentDate, paymentMethod });
            alert('Payment added!');
            e.target.reset();
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

    // User Dashboard (Overview)
    const renderUserDashboard = async () => {
        const userData = await fetchData(`users/${loggedInUser.username}`);
        const userPayments = userData.payments || [];
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
                    <td>${payment.paymentDate}</td>
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
            const worksheet = XLSX.utils.json_to_sheet(userPayments);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Payments');
            XLSX.writeFile(workbook, `${loggedInUser.username}_payments.xlsx`);
        });

        const notificationsDiv = document.getElementById('notifications');
        const userNotifications = userData.notifications || [];
        notificationsDiv.innerHTML = '';
        userNotifications.filter(n => !n.read).forEach((notification, index) => {
            const notificationElement = document.createElement('div');
            notificationElement.className = 'notification-item';
            notificationElement.innerHTML = `
                <p class="font-bold">Notification</p>
                <p>${notification.message}</p>
                <button class="btn btn-link" data-index="${index}">Mark as read</button>
            `;
            notificationsDiv.appendChild(notificationElement);
        });

        notificationsDiv.addEventListener('click', async (e) => {
            if (e.target.tagName === 'BUTTON' && e.target.dataset.index) {
                const index = parseInt(e.target.dataset.index);
                await putData(`notifications/${loggedInUser.username}/${index}`);
                renderUserDashboard();
            }
        });
        renderNavBar('user-dashboard');
    };

    // Initial render based on role
    if (loggedInUser.role === 'admin') {
        renderAdminDashboard();
    } else if (loggedInUser.role === 'accountant') {
        renderAccountantDashboard();
    } else if (loggedInUser.role === 'user') {
        renderUserDashboard();
    }

    document.getElementById('logout-button').addEventListener('click', () => {
        localStorage.removeItem('loggedInUser');
        window.location.href = 'index.html';
    });
});