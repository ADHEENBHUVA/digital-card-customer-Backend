const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_change_me_in_prod');

            // Get user from the token
            req.user = await User.findById(decoded.id).select('-passwordHash');

            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized - user no longer exists' });
            }

            if (req.user.isDeleted) {
                return res.status(401).json({ message: 'Not authorized - user deleted' });
            }

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized - token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'MASTER_ADMIN') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as Master Admin' });
    }
};

const subAdminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'SUB_ADMIN') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as Sub Admin' });
    }
};

module.exports = { protect, adminOnly, subAdminOnly };
