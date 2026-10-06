const ApiError = require('../utils/apiError');

const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || (error.name === 'ValidationError' ? 400 : 500);
    const message = error.message || 'An unexpected error occurred.';
    error = new ApiError(statusCode, message, false, err.stack);
  }

  // Handle Mongoose duplicate key error (e.g. unique email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = new ApiError(409, `A record with that ${field} already exists.`);
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    error = new ApiError(400, `Validation Failed: ${messages.join(', ')}`);
  }

  // Handle CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    error = new ApiError(400, `Invalid ID format for: ${err.path}`);
  }

  const response = {
    success: false,
    message: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  };

  res.status(error.statusCode || 500).json(response);
};

module.exports = errorHandler;
