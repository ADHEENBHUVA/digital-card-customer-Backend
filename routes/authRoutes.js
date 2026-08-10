const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret_key_change_me_in_prod', {
        expiresIn: '30d',
    });
};

// POST /api/auth/login
router.post('/login', async (req, res) => {
    let { username, password } = req.body;

    if (username) {
        username = username.trim().toLowerCase();
    }

    try {
        const user = await User.findOne({ username });

        if (user && (await bcrypt.compare(password, user.passwordHash))) {
            if (user.isDeleted) {
                return res.status(401).json({ message: 'Account has been deleted' });
            }

            res.json({
                _id: user._id,
                username: user.username,
                fullName: user.fullName,
                role: user.role,
                mustChangePassword: user.mustChangePassword,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid username or password' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error during login' });
    }
});

// POST /api/auth/change-password
router.post('/change-password', protect, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
        const user = await User.findById(req.user._id);

        if (user && (await bcrypt.compare(currentPassword, user.passwordHash))) {
            // User can change password
            const salt = await bcrypt.genSalt(10);
            user.passwordHash = await bcrypt.hash(newPassword, salt);
            user.mustChangePassword = false;
            await user.save();

            res.json({ message: 'Password updated successfully' });
        } else {
            res.status(401).json({ message: 'Invalid current password' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error updating password' });
    }
});

// Temporary route to reset Master Admin
router.get('/temp-reset', async (req, res) => {
    try {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('Admin123', salt);
        await User.findOneAndUpdate(
            { role: 'MASTER_ADMIN' },
            { username: 'admin@gmail.com', passwordHash, mustChangePassword: false },
            { new: true, upsert: true }
        );
        res.json({ message: 'Success! Use: admin@gmail.com / Admin123' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
