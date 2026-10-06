const mongoose = require('mongoose');

let cachedConnection = null;

const connectDB = async () => {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart_expense_tracker';
  try {
    cachedConnection = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`[DATABASE] MongoDB Connected: ${cachedConnection.connection.host}/${cachedConnection.connection.name}`);
    return cachedConnection;
  } catch (error) {
    console.error(`[DATABASE ERROR] MongoDB Connection Failed: ${error.message}`);
    console.error(`[DATABASE HINT] Make sure MongoDB is running locally on port 27017 or set MONGODB_URI in server/.env`);
    if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
      process.exit(1);
    }
    throw error;
  }
};

module.exports = connectDB;
