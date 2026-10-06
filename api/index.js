const app = require('../server/server');
const connectDB = require('../server/config/db');

module.exports = async (req, res) => {
  try {
    await connectDB();
  } catch (err) {
    console.error('Database connection error in Vercel serverless function:', err);
  }
  return app(req, res);
};
