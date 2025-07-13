const express = require('express');

const cors = require('cors');

const { MongoClient, ObjectId } = require('mongodb');
const { body, validationResult } = require('express-validator');

const mongoURI = "mongodb+srv://robin:robin01716@deposit.udyoebh.mongodb.net/?retryWrites=true&w=majority&appName=deposit";
const client = new MongoClient(mongoURI);

let usersCollection;
let paymentsCollection;
let notificationsCollection;

const app = express();
app.use(express.json());
app.use(cors());

async function connectToMongo() {
    try {
        await client.connect();
        console.log("Connected to MongoDB!");
        const db = client.db("deposit"); // Use your database name
        usersCollection = db.collection("users");
        paymentsCollection = db.collection("payments");
        notificationsCollection = db.collection("notifications");
    } catch (e) {
        console.error("Could not connect to MongoDB", e);
        process.exit(1); // Exit if MongoDB connection fails
    }
}

connectToMongo();

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

// Helper to read a user's data from MongoDB
const readUserData = async (username) => {
    try {
        const user = await usersCollection.findOne({ username: username });
        return user;
    } catch (error) {
        console.error("Error reading user data from MongoDB:", error);
        return null;
    }
};

// Helper to write a user's data to MongoDB
const writeUserData = async (userData) => {
    try {
        await usersCollection.updateOne(
            { username: userData.username },
            { $set: userData },
            { upsert: true }
        );
        return true;
    } catch (error) {
        console.error("Error writing user data to MongoDB:", error);
        return false;
    }
};

// Helper to get all users data from MongoDB
const getAllUsersData = async () => {
    try {
        const users = await usersCollection.find({}).toArray();
        return users;
    } catch (error) {
        console.error("Error getting all users data from MongoDB:", error);
        return [];
    }
};

// Helper to get all payments from all users from MongoDB
const getAllPayments = async () => {
    try {
        const payments = await paymentsCollection.find({}).toArray();
        return payments;
    } catch (error) {
        console.error("Error getting all payments from MongoDB:", error);
        return [];
    }
};

// Helper to get all notifications from all users from MongoDB
const getAllNotifications = async () => {
    try {
        const notifications = await notificationsCollection.find({}).toArray();
        return notifications;
    } catch (error) {
        console.error("Error getting all notifications from MongoDB:", error);
        return [];
    }
};

// API to get all users (for admin panel)
app.get('/api/users', authorize(['admin', 'accountant']), async (req, res) => {
    try {
        const users = await getAllUsersData();
        res.json(users.map(user => ({ username: user.username, role: user.role })));
    } catch (error) {
        res.status(500).send('Error fetching users');
    }
});

// API to get a single user's data
app.get('/api/users/:username', async (req, res) => {
    try {
        const username = req.params.username;
        const userData = await readUserData(username);

        if (userData) {
            res.json(userData);
        } else {
            res.status(404).send('User not found');
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
        res.status(500).send('Error fetching user data');
    }
});

// API to create/update a user
app.post(
    '/api/users',
    authorize(['admin']),
    [
        body('username').notEmpty().withMessage('Username is required'),
        body('password').notEmpty().withMessage('Password is required'),
        body('role').isIn(['admin', 'accountant', 'user']).withMessage('Invalid role')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
    try {
        const { username, password, role, originalUsername } = req.body;

        if (originalUsername && originalUsername !== username) {
            // Username changed, delete old user from MongoDB
            await usersCollection.deleteOne({ username: originalUsername });
        }

        let userToUpdate = await usersCollection.findOne({ username: username });

        if (userToUpdate) {
            // Update existing user
            userToUpdate.password = password || userToUpdate.password;
            userToUpdate.role = role;
        } else {
            // Create new user
            userToUpdate = { username, password, role };
        }
        const success = await writeUserData(userToUpdate);
        if (success) {
            res.status(200).send('User saved successfully');
        } else {
            res.status(500).send('Failed to save user');
        }
    } catch (error) {
        res.status(500).send('Error saving user');
    }
});

// API to delete a user
app.delete('/api/users/:username', authorize(['admin']), async (req, res) => {
    try {
        const username = req.params.username;
        const result = await usersCollection.deleteOne({ username: username });
        if (result.deletedCount > 0) {
            res.status(200).send('User deleted successfully');
        } else {
            res.status(404).send('User not found');
        }
    } catch (error) {
        res.status(500).send('Error deleting user');
    }
});

// API to add a payment
app.post('/api/payments', authorize(['accountant', 'admin']), async (req, res) => {
    try {
        const { username, amount, paymentDate, paymentMethod } = req.body;
        // Only insert into the separate payments collection
        await paymentsCollection.insertOne({ username, amount: parseFloat(amount), paymentDate, paymentMethod, timestamp: new Date() });
        res.status(200).send('Payment added successfully');
    } catch (error) {
        console.error("Error adding payment:", error);
        res.status(500).send('Error adding payment');
    }
});

// API to add a notification
// API to update a payment
app.put('/api/payments/:id', authorize(['admin', 'accountant']), async (req, res) => {
    try {
        const { id } = req.params;
        const { username, amount, paymentDate, paymentMethod } = req.body;
        const result = await paymentsCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { username, amount: parseFloat(amount), paymentDate, paymentMethod } }
        );
        if (result.matchedCount > 0) {
            res.status(200).send('Payment updated successfully');
        } else {
            res.status(404).send('Payment not found');
        }
    } catch (error) {
        console.error("Error updating payment:", error);
        res.status(500).send('Error updating payment');
    }
});

// API to delete a payment
app.delete('/api/payments/:id', authorize(['admin', 'accountant']), async (req, res) => {
    try {
        const { id } = req.params;
        const result = await paymentsCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount > 0) {
            res.status(200).send('Payment deleted successfully');
        } else {
            res.status(404).send('Payment not found');
        }
    } catch (error) {
        console.error("Error deleting payment:", error);
        res.status(500).send('Error deleting payment');
    }
});

app.post('/api/notifications', authorize(['accountant']), async (req, res) => {
    try {
        const { username, message } = req.body;
        // Only insert into a separate notifications collection for easier querying of all notifications
        await notificationsCollection.insertOne({ username, message, read: false, timestamp: new Date() });
        res.status(200).send('Notification sent successfully');
    } catch (error) {
        console.error("Error sending notification:", error);
        res.status(500).send('Error sending notification');
    }
});

// API to mark a notification as read
app.put('/api/notifications/:id', authorize(['admin', 'accountant', 'user']), async (req, res) => {
    try {
        const { id } = req.params;
        const { username: loggedInUsername, role: loggedInUserRole } = req.loggedInUser;

        const notification = await notificationsCollection.findOne({ _id: new ObjectId(id) });

        if (!notification) {
            return res.status(404).send('Notification not found');
        }

        if (loggedInUserRole === 'admin' || notification.username === loggedInUsername) {
            const result = await notificationsCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { read: true } }
            );

            if (result.matchedCount > 0) {
                res.status(200).send('Notification marked as read');
            } else {
                res.status(500).send('Failed to mark notification as read');
            }
        } else {
            res.status(403).send('Access Denied: You can only mark your own notifications as read.');
        }
    } catch (error) {
        console.error("Error marking notification as read:", error);
        res.status(500).send('Error marking notification as read');
    }
});

// API to get all payments (for admin/accountant dashboard)
app.get('/api/all-payments', authorize(['admin', 'accountant', 'user']), async (req, res) => {
    try {
        const { username, role } = req.loggedInUser;
        let payments;
        if (role === 'admin' || role === 'accountant') {
            payments = await getAllPayments();
        } else {
            payments = await paymentsCollection.find({ username: username }).toArray();
        }
        res.json(payments);
    } catch (error) {
        res.status(500).send('Error fetching all payments');
    }
});

// API to get all notifications (for admin dashboard)
app.get('/api/all-notifications', authorize(['admin', 'accountant']), async (req, res) => {
    try {
        const notifications = await getAllNotifications();
        res.json(notifications);
    } catch (error) {
        res.status(500).send('Error fetching all notifications');
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});