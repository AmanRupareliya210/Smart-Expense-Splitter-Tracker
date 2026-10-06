const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/apiResponse');

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'super_secret_jwt_key_expense_splitter_2026_secure', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

const register = async (req, res, next) => {
  try {
    const { name, email, password, defaultCurrency } = req.body;

    if (!name || !email || !password) {
      return next(new ApiError(400, 'Please provide name, email and password.'));
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return next(new ApiError(409, 'An account with this email already exists.'));
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      defaultCurrency: defaultCurrency || 'INR'
    });

    const token = generateToken(user._id);

    return sendSuccess(res, 201, 'Account registered successfully', {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        defaultCurrency: user.defaultCurrency
      },
      token
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new ApiError(400, 'Please provide email and password.'));
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return next(new ApiError(401, 'Invalid email or password.'));
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(new ApiError(401, 'Invalid email or password.'));
    }

    const token = generateToken(user._id);

    if (!user.defaultCurrency || user.defaultCurrency === 'USD') {
      user.defaultCurrency = 'INR';
      await user.save();
    }

    return sendSuccess(res, 200, 'Logged in successfully', {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        defaultCurrency: user.defaultCurrency || 'INR'
      },
      token
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    if (!req.user.defaultCurrency || req.user.defaultCurrency === 'USD') {
      await User.findByIdAndUpdate(req.user._id, { defaultCurrency: 'INR' });
      req.user.defaultCurrency = 'INR';
    }

    return sendSuccess(res, 200, 'User profile fetched', {
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        avatarUrl: req.user.avatarUrl,
        defaultCurrency: req.user.defaultCurrency || 'INR'
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name, avatarUrl, defaultCurrency } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return next(new ApiError(404, 'User not found.'));
    }

    if (name) user.name = name;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (defaultCurrency) user.defaultCurrency = defaultCurrency;

    await user.save();

    return sendSuccess(res, 200, 'Profile updated successfully', {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        defaultCurrency: user.defaultCurrency
      }
    });
  } catch (error) {
    next(error);
  }
};

// Search users by email prefix for group invitation
const searchUsers = async (req, res, next) => {
  try {
    const { query } = req.query;
    if (!query || query.length < 2) {
      return sendSuccess(res, 200, 'Users query results', []);
    }

    const users = await User.find({
      $or: [
        { email: { $regex: query, $options: 'i' } },
        { name: { $regex: query, $options: 'i' } }
      ]
    })
      .select('name email avatarUrl')
      .limit(10);

    return sendSuccess(res, 200, 'Users found', users);
  } catch (error) {
    next(error);
  }
};

const quickLogin = async (req, res, next) => {
  try {
    const adminEmail = 'aman@gmail.com';
    let user = await User.findOne({
      email: { $in: [adminEmail, 'aman@admin.com', 'aman.admin@gmail.com'] }
    });
    
    if (!user) {
      user = await User.create({
        name: 'Aman',
        email: adminEmail,
        password: 'Password@123',
        defaultCurrency: 'INR'
      });
    } else {
      let modified = false;
      if (user.email !== adminEmail) {
        user.email = adminEmail;
        modified = true;
      }
      if (!user.defaultCurrency || user.defaultCurrency === 'USD') {
        user.defaultCurrency = 'INR';
        modified = true;
      }
      if (modified) {
        await user.save();
      }
    }

    const token = generateToken(user._id);

    return sendSuccess(res, 200, 'Logged in as Admin Aman successfully', {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        defaultCurrency: user.defaultCurrency
      },
      token
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    return sendSuccess(res, 200, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  quickLogin,
  logout,
  getMe,
  updateProfile,
  searchUsers
};
