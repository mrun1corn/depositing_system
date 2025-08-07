
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

    const user = await User.findByUsername(username);
    if (!user) {
        return res.status(400).send('Invalid username or password.');
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
        return res.status(400).send('Invalid username or password.');
    }

    const token = jwt.sign({ _id: user._id, username: user.username, role: user.role }, 'your_jwt_secret');
    res.send({ token });
});

module.exports = router;
