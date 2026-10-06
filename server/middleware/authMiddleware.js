const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/apiError');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new ApiError(401, 'Authentication token missing. Please log in.'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_expense_splitter_2026_secure');
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new ApiError(401, 'User belonging to this token no longer exists.'));
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new ApiError(401, 'Invalid authentication token.'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Authentication token expired. Please log in again.'));
    }
    next(error);
  }
};

module.exports = { protect };
