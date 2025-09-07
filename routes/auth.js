
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/user');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

router.post(
    '/register',
    [
        body('username').isString().trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
        body('password').isString().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        body('role').optional().isIn(['user', 'accountant', 'admin']).withMessage('Invalid role')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password, role } = req.body;

        const existingUser = await User.findByUsername(username);
        if (existingUser) {
            return res.status(400).send('User already exists.');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User(username, hashedPassword, role);
        await user.save();

        res.status(201).send('User registered successfully.');
    }
);

router.post(
    '/login',
    [
        body('username').isString().trim().notEmpty(),
        body('password').isString().notEmpty()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password } = req.body;

        const user = await User.findByUsername(username);
        if (!user) {
            return res.status(400).send('Invalid username or password.');
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).send('Invalid username or password.');
        }

        const token = jwt.sign(
            { _id: user._id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '12h' }
        );
        res.send({ token });
    }
);

module.exports = router;
