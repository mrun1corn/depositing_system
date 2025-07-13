const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// Middleware for authorization
const authorize = (allowedRoles) => (req, res, next) => {
    const username = req.headers['x-username'];
    const role = req.headers['x-user-role'];

    if (!username || !role) {
        return res.status(401).send('Authentication headers missing.');
    }

    if (!allowedRoles.includes(role)) {
        return res.status(403).send('Access Denied: Insufficient role.');
    }

    req.loggedInUser = { username, role }; // Attach user info to request
    next();
};

// Serve static files from the current directory
app.use(express.static(__dirname));

const usersDir = path.join(__dirname, 'data', 'users');

// Helper to read a user's data file
const readUserData = (username) => {
    const userFilePath = path.join(usersDir, `${username}.json`);
    if (fs.existsSync(userFilePath)) {
        return JSON.parse(fs.readFileSync(userFilePath, 'utf8'));
    }
    return null;
};

// Helper to write a user's data file
const writeUserData = (username, userData) => {
    const userFilePath = path.join(usersDir, `${username}.json`);
    fs.writeFileSync(userFilePath, JSON.stringify(userData, null, 2), 'utf8');
};

// Helper to get all users data
const getAllUsersData = () => {
    const userFiles = fs.readdirSync(usersDir).filter(file => file.endsWith('.json'));
    return userFiles.map(file => {
        const username = file.replace('.json', '');
        return readUserData(username);
    }).filter(Boolean);
};

// Helper to get all payments from all users
const getAllPayments = () => {
    const allUsersData = getAllUsersData();
    let allPayments = [];
    allUsersData.forEach(userData => {
        if (userData.payments) {
            allPayments = allPayments.concat(userData.payments.map(p => ({ ...p, username: userData.username })));
        }
    });
    return allPayments;
};

// Helper to get all notifications from all users
const getAllNotifications = () => {
    const allUsersData = getAllUsersData();
    let allNotifications = [];
    allUsersData.forEach(userData => {
        if (userData.notifications) {
            allNotifications = allNotifications.concat(userData.notifications.map(n => ({ ...n, username: userData.username })));
        }
    });
    return allNotifications;
};

// API to get all users (for admin panel)
app.get('/api/users', authorize(['admin', 'accountant']), (req, res) => {
    const users = getAllUsersData().map(user => ({ username: user.username, role: user.role }));
    res.json(users);
});

// API to get a single user's data
app.get('/api/users/:username', (req, res) => {
    const username = req.params.username;
    const userData = readUserData(username);
    if (userData) {
        res.json(userData);
    } else {
        res.status(404).send('User not found');
    }
});

// API to create/update a user
app.post('/api/users', authorize(['admin']), (req, res) => {
    const { username, password, role, originalUsername } = req.body;
    let usersData = getAllUsersData();

    if (originalUsername && originalUsername !== username) {
        // Username changed, delete old file
        const oldFilePath = path.join(usersDir, `${originalUsername}.json`);
        if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
        }
        usersData = usersData.filter(u => u.username !== originalUsername);
    }

    let userToUpdate = usersData.find(u => u.username === username);

    if (userToUpdate) {
        // Update existing user
        userToUpdate.password = password || userToUpdate.password;
        userToUpdate.role = role;
    } else {
        // Create new user
        userToUpdate = { username, password, role, payments: [], notifications: [] };
    }
    writeUserData(username, userToUpdate);
    res.status(200).send('User saved successfully');
});

// API to delete a user
app.delete('/api/users/:username', authorize(['admin']), (req, res) => {
    const username = req.params.username;
    const userFilePath = path.join(usersDir, `${username}.json`);
    if (fs.existsSync(userFilePath)) {
        fs.unlinkSync(userFilePath);
        res.status(200).send('User deleted successfully');
    } else {
        res.status(404).send('User not found');
    }
});

// API to add a payment
app.post('/api/payments', authorize(['accountant']), (req, res) => {
    const { username, amount, paymentDate, paymentMethod } = req.body;
    const userData = readUserData(username);
    if (userData) {
        userData.payments.push({ amount, paymentDate, paymentMethod });
        writeUserData(username, userData);
        res.status(200).send('Payment added successfully');
    } else {
        res.status(404).send('User not found');
    }
});

// API to add a notification
app.post('/api/notifications', authorize(['accountant']), (req, res) => {
    const { username, message } = req.body;
    const userData = readUserData(username);
    if (userData) {
        userData.notifications.push({ message, read: false });
        writeUserData(username, userData);
        res.status(200).send('Notification sent successfully');
    } else {
        res.status(404).send('User not found');
    }
});

// API to mark a notification as read
app.put('/api/notifications/:username/:index', (req, res) => {
    const requestedUsername = req.params.username;
    const index = parseInt(req.params.index);
    const { username: loggedInUsername, role: loggedInUserRole } = req.loggedInUser;

    if (loggedInUserRole === 'admin' || requestedUsername === loggedInUsername) {
        const userData = readUserData(requestedUsername);
        if (userData && userData.notifications && userData.notifications[index]) {
            userData.notifications[index].read = true;
            writeUserData(requestedUsername, userData);
            res.status(200).send('Notification marked as read');
        } else {
            res.status(404).send('Notification not found');
        }
    } else {
        res.status(403).send('Access Denied: You can only mark your own notifications as read.');
    }
});

// API to get all payments (for admin/accountant dashboard)
app.get('/api/all-payments', authorize(['admin', 'accountant']), (req, res) => {
    res.json(getAllPayments());
});

// API to get all notifications (for admin dashboard)
app.get('/api/all-notifications', authorize(['admin', 'accountant']), (req, res) => {
    res.json(getAllNotifications());
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});