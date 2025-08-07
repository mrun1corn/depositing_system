
const User = require('../models/user');
const bcrypt = require('bcryptjs');

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll();
        res.json(users.map(user => ({ username: user.username, role: user.role })));
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

        let userToUpdate = await User.findByUsername(username);
        let hashedPassword = password; // Assume password is plain text if provided

        if (password) {
            hashedPassword = await bcrypt.hash(password, 10);
        }

        if (userToUpdate) {
            if (password) { // Only update password if a new one is provided
                userToUpdate.password = hashedPassword;
            }
            userToUpdate.role = role;
        } else {
            userToUpdate = new User(username, hashedPassword, role);
        }
        const success = await userToUpdate.save();
        if (success) {
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
            res.status(200).send('User deleted successfully');
        } else {
            res.status(404).send('User not found');
        }
    } catch (error) {
        res.status(500).send('Error deleting user');
    }
};
