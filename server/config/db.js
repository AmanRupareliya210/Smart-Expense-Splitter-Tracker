const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart_expense_tracker';
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`[DATABASE] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`[DATABASE ERROR] MongoDB Connection Failed: ${error.message}`);
    console.error(`[DATABASE HINT] Make sure MongoDB is running locally on port 27017 or set MONGODB_URI in server/.env`);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('[DATABASE] MongoDB Disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('[DATABASE] MongoDB Reconnected');
  });
};

module.exports = connectDB;
