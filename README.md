# ShiftApp Pro — Final Version 🚀
## Fixed: Login, Auto-Seed, Create Account

---

## What Was Fixed
- ✅ "Email not found" error — FIXED (password double-hash bug removed)
- ✅ Auto-seed on startup — NO manual `node seed.js` needed
- ✅ Create Account page — agents can self-register
- ✅ All 32 employees seeded automatically on first run

---

## Quick Start (3 Steps Only)

### Step 1 — Install MongoDB
Download from: https://www.mongodb.com/try/download/community
- Windows: Run installer → Complete install → MongoDB starts as a service automatically

### Step 2 — Install & Run
```bash
# Open folder in VS Code terminal, then:
npm run install:all
npm run dev
```

### Step 3 — Open Browser
Open: http://localhost:5173

**Login credentials (auto-seeded):**
| Role  | Email | Password |
|-------|-------|----------|
| Admin | admin@shift.com | admin123 |
| Agent | jothika@shift.com | pass123 |
| Agent | alice@shift.com | pass123 |
| Any agent | (firstname)@shift.com | pass123 |

---

## Features
- ✅ Admin login → Full schedule management
- ✅ Agent login → View-only schedule, request shift changes
- ✅ Create Account → Any new agent can register
- ✅ MongoDB storage → Multi-user, multi-device
- ✅ JWT auth → Secure login (7 days)
- ✅ Excel export → Schedule, leaves, shift requests
- ✅ Coverage analysis → Min staffing check
- ✅ Leave management → Apply, approve, reject
- ✅ Shift requests → Agent submits, admin approves

---

## Troubleshooting

### "Email not found" after login
The database auto-seeds on first server start. Just start the server and try again.

### MongoDB not connecting
- Windows: `net start MongoDB` (run as Administrator)
- Check: `mongod --version` in terminal

### Port already in use
Edit `server/.env` → change `PORT=5001`
Edit `client/vite.config.js` → change proxy target to `http://localhost:5001`
