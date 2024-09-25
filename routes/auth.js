const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
    const { username, email, password, role } = req.body;

    try {
        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        // Create new user
        user = new User({ username, email, password, role });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        // Save user to database
        await user.save();

        // Create JWT payload
        const payload = { userId: user._id, role: user.role };

        // Sign token
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Set JWT in HTTP-only cookie
        res.cookie('token', token, { httpOnly: true, secure: false, maxAge: 3600000 }); // Set for 1 hour
        
        res.json({ msg: 'User registered and logged in' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if user exists
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Create JWT payload
        const payload = { userId: user._id, role: user.role };

        // Sign token
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Set JWT in HTTP-only cookie
        res.cookie('token', token, { httpOnly: true, secure: false, maxAge: 3600000 }); // Set for 1 hour

        res.json({ msg: 'User logged in' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Logout
router.post('/logout', (req, res) => {
    // Clear cookie by setting the token to an empty string with immediate expiration
    res.cookie('token', '', { httpOnly: true, expires: new Date(0) });
    res.json({ msg: 'Logged out' });
});

module.exports = router;
