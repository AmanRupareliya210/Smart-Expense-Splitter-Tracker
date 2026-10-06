# Smart Expense Splitter & Tracker

A full-stack, enterprise-grade expense-sharing application built with **React.js**, **Node.js/Express**, and **MongoDB/Mongoose**.

---

## 🌟 Key Features

1. **Greedy Debt Minimization Engine**:
   - Reduces complex $O(N^2)$ bilateral group debts to at most $N-1$ simplified transactions using graph net-balance greedy matching.
2. **4 Flexible Split Modes**:
   - **Equal Split**: Splits bills equally with exact penny/cent remainder distribution.
   - **Exact Amounts**: Assigns custom monetary amounts with real-time sum validation.
   - **Percentages**: Proportional allocation with strict 100% total verification.
   - **Weighted Shares**: Splits proportional to weighted units (e.g. 2 shares, 1 share).
3. **Financial Precision**:
   - All internal calculations and database records are stored in **integer cents/paise** to eliminate floating-point drift.
4. **Interactive Dashboard & Multi-Group Management**:
   - Global net balances across all groups (What you owe vs what you are owed).
   - Category-wise spending breakdown and contributor distribution charts.
   - Audit trail activity history for all group events.
5. **In-App Notifications & Settlement Reminders**:
   - Real-time event notifications for member additions, new expenses, settlements, and reversals.
   - Rate-limited settlement reminders with custom notes.
6. **Modern Design System**:
   - Ultra-responsive, clean light theme with custom brand logo, subtle animations, and 1-tap admin login (`aman@gmail.com`).

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [MongoDB](https://www.mongodb.com/) running locally on `mongodb://localhost:27017` or a MongoDB Atlas URI.

### 2. Installation
Install all dependencies in root, backend, and frontend:
```bash
# In the project root directory
npm install
npm install --prefix server
npm install --prefix client
```

### 3. Environment Variables
Create `.env` in `server/` (refer to `server/.env.example`):
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/smart_expense_tracker
JWT_SECRET=super_secret_jwt_key_expense_splitter_2026_secure
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

### 4. Running Locally
Start both backend API server and frontend client concurrently:
```bash
node run-dev.js
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📁 Architecture Overview

```
├── server/
│   ├── config/          # Database connection
│   ├── controllers/     # Auth, Group, Expense, Settlement, Analytics, Notifications
│   ├── middleware/      # JWT Protect, Group Guard, Error Handler
│   ├── models/          # User, Group, Expense, Settlement, Notification, ActivityLog
│   ├── routes/          # REST API Endpoints
│   ├── services/        # Debt Minimizer, Balance Engine, Notification Service
│   ├── utils/           # Cents Math & API Response Formatters
│   └── server.js        # Express Bootstrap
│
├── client/
│   ├── src/
│   │   ├── components/  # Modals, Settlement Views, Analytics, Activity, Notifications
│   │   ├── context/     # Auth, Group, and Notification Context State Providers
│   │   ├── pages/       # Landing, Login, Register, Dashboard, GroupDetail, AcceptInvite
│   │   ├── services/    # Axios API Clients
│   │   ├── styles/      # Design Tokens & Light Theme CSS
│   │   └── utils/       # Formatters & Constants
│   ├── index.html
│   └── vite.config.js
```

---

## 🔒 Security & Best Practices
- **Helmet** security headers & CORS origin whitelisting.
- **Tenant Isolation**: `ensureGroupMember` middleware verifies user membership on every group query/mutation.
- **bcryptjs** password hashing (salt rounds 12).
- **Cryptographic Invitations**: 32-byte secure token-based group invitations.
