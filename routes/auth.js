
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const router = express.Router();

router.post('/register', async (req, res) => {
    const { username, password, role } = req.body;

    const existingUser = await User.findByUsername(username);
    if (existingUser) {
        return res.status(400).send('User already exists.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User(username, hashedPassword, role);
    await user.save();

    res.status(201).send('User registered successfully.');
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    console.log(`Login attempt for username: ${username}`);

    const user = await User.findByUsername(username);
    if (!user) {
        console.log(`Login failed: User ${username} not found.`);
        return res.status(400).send('Invalid username or password.');
    }
    console.log(`User ${username} found.`);

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
        console.log(`Login failed: Invalid password for user ${username}.`);
        return res.status(400).send('Invalid username or password.');
    }
    console.log(`Password for user ${username} is valid.`);

    const token = jwt.sign({ _id: user._id, username: user.username, role: user.role }, 'your_jwt_secret');
    res.send({ token });
});

module.exports = router;
