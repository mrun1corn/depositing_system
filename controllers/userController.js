
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const socketManager = require('../socketManager');

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll();
        res.json(users.map(user => ({ _id: user._id, username: user.username, role: user.role })));
    } catch (error) {
        res.status(500).send('Error fetching users');
    }
};

exports.getUserByUsername = async (req, res) => {
    try {
        const username = req.params.username;
        const userData = await User.findByUsername(username);

        if (userData) {
            res.json(userData);
        } else {
            res.status(404).send('User not found');
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
        res.status(500).send('Error fetching user data');
    }
};

exports.createUser = async (req, res) => {
    try {
        const { username, password, role, originalUsername } = req.body;

        if (originalUsername && originalUsername !== username) {
            await User.deleteByUsername(originalUsername);
        }

        let userToUpdate;
        const existingUserDoc = await User.findByUsername(username);

        if (existingUserDoc) {
            userToUpdate = new User(existingUserDoc.username, existingUserDoc.password, existingUserDoc.role);
            userToUpdate._id = existingUserDoc._id; // Preserve the original _id

            if (password) { // Only update password if a new one is provided
                const newHashedPassword = await bcrypt.hash(password, 10);
                userToUpdate.password = newHashedPassword;
            }
            userToUpdate.role = role;
        } else {
            if (!password) {
                return res.status(400).send('Password is required for new user creation.');
            }
            const newHashedPassword = await bcrypt.hash(password, 10);
            userToUpdate = new User(username, newHashedPassword, role);
        }
        const success = await userToUpdate.save();

        if (success) {
            const io = socketManager.getIo();
            io.emit('userUpdated', { username: userToUpdate.username, role: userToUpdate.role }); // Emit real-time update
            res.status(200).send('User saved successfully');
        } else {
            res.status(500).send('Failed to save user');
        }
    } catch (error) {
        res.status(500).send('Error saving user');
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const username = req.params.username;
        const result = await User.deleteByUsername(username);
        if (result.deletedCount > 0) {
            const io = socketManager.getIo();
            io.emit('userDeleted', { username: username }); // Emit real-time update
            res.status(200).send('User deleted successfully');
        } else {
            res.status(404).send('User not found');
        }
    } catch (error) {
        res.status(500).send('Error deleting user');
    }
};
