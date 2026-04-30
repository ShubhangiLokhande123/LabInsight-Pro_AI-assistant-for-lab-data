---
name: reload-and-test-app
description: "Reload and test the LabInsight Pro app end-to-end. Use when: starting dev servers, verifying all features work, debugging startup failures, smoke-testing after code changes, checking API connectivity, testing auth/login/signup, blood report upload, chatbot, lab reports, and user profile."
argument-hint: "Optional: feature to focus on (e.g. auth, upload, chatbot, reports)"
---

# Reload and Test — LabInsight Pro

## Overview

LabInsight Pro is a full-stack app:
- **Server**: Express.js on port `8080`, Redis (ioredis), routes for auth / users / files / conversations / blood reports
- **Client**: React (CRA) on port `3000`, talking to the server via `axios`

---

## Step 0 — Verify `.env` File

The server requires `server/.env`. Create it if missing:

```env
# server/.env

# JWT signing secret — any long random string
JWTPRIVATEKEY=your_super_secret_jwt_key_here

# bcrypt salt rounds (10 is a safe default)
SALT=10

# Redis (defaults to local if omitted)
REDIS_URL=redis://127.0.0.1:6379

# Google Gemini API key (required for chatbot)
GEMINI_API_KEY=your_gemini_api_key_here

# Ollama host (optional, defaults to http://127.0.0.1:11434)
# OLLAMA_HOST=http://127.0.0.1:11434

# Server port (optional, defaults to 8080)
# PORT=8080
```

**Required keys that will crash the server if missing:**
| Key | Used by |
|-----|---------|
| `JWTPRIVATEKEY` | All auth-protected routes (auth, files, conversations, blood reports, users) |
| `SALT` | User signup (`bcrypt.genSalt`) |
| `GEMINI_API_KEY` | Chatbot (`GoogleGenerativeAI`) |

`REDIS_URL` defaults to `redis://127.0.0.1:6379` if omitted — only add it when using a remote Redis.

---

## Step 0b — Seed Test Account

Run this **once** after the server is running (Step 3) to create a reusable test account.  
Password must meet complexity rules (uppercase + number + special char):

```powershell
Invoke-RestMethod -Uri "http://localhost:8080/api/users" -Method POST `
  -ContentType "application/json" `
  -Body '{
    "firstName": "Test",
    "lastName": "User",
    "email": "testuser@labinsight.dev",
    "password": "Test@12345",
    "age": 30,
    "height": "175cm",
    "weight": "70kg",
    "ethnicity": "Other",
    "sex": "Male"
  }'
# Expected: { message: "User created successfully!" }
# If 409 "Email already in use" → account already exists, skip this step
```

**Test credentials for all subsequent steps:**
- Email: `testuser@labinsight.dev`
- Password: `Test@12345`

---

## Step 1 — Kill Stale Processes

Free ports before starting:
```powershell
# Kill anything on 8080 (server)
$proc = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
if ($proc) { Stop-Process -Id $proc -Force }

# Kill anything on 3000 (client)
$proc = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
if ($proc) { Stop-Process -Id $proc -Force }
```

---

## Step 2 — Start Redis

Redis must be running before the server starts. Check and start:
```powershell
# Check if Redis is already running
redis-cli ping
# If output is not "PONG", start it:
# redis-server  (or use the Windows service)
```

If Redis is unavailable, the server will fail on startup. Fix `server/db.js` connection settings first.

---

## Step 3 — Start the Server

```powershell
cd "D:\LabInsight Pro_AI assistant for lab data\server"
npm start   # runs nodemon index.js
```

**Expected output**: `Listening on port 8080...`

**Common failures**:
| Error | Fix |
|-------|-----|
| `ECONNREFUSED` on Redis | Start Redis first (Step 2) |
| `Cannot find module` | Run `npm install` in `server/` |
| `EADDRINUSE :8080` | Kill process on 8080 (Step 1) |
| Missing `.env` | Check `server/.env` has `PORT`, `JWT_PRIVATE_KEY`, `GOOGLE_API_KEY`, Redis vars |

---

## Step 4 — Start the Client

```powershell
cd "D:\LabInsight Pro_AI assistant for lab data\client"
npm start   # starts CRA dev server on port 3000
```

**Expected output**: Browser opens `http://localhost:3000`

**Common failures**:
| Error | Fix |
|-------|-----|
| `Cannot find module` | Run `npm install` in `client/` |
| `EADDRINUSE :3000` | Kill process on 3000 (Step 1) |
| White screen / API errors | Verify server is running on 8080 |

---

## Step 5 — Smoke Test: API Health

Verify each API route responds before clicking through the UI:

```powershell
# Auth — valid login (uses seeded test account from Step 0b)
Invoke-RestMethod -Uri "http://localhost:8080/api/auth" -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"testuser@labinsight.dev","password":"Test@12345"}'
# Expected: { data: "<jwt_token>", message: "logged in successfully" }

# Auth — wrong password sanity check
Invoke-RestMethod -Uri "http://localhost:8080/api/auth" -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"testuser@labinsight.dev","password":"wrongpass"}' -ErrorAction SilentlyContinue
# Expected: 401 { message: "Invalid Email or Password" }

# Users route (no token → should reject, not crash)
Invoke-RestMethod -Uri "http://localhost:8080/api/users/profile/badtoken" -ErrorAction SilentlyContinue
# Expected: 500 or 401 — NOT connection refused
```

If you get `connection refused` on any call, the server is not running. Return to Step 3.

---

## Step 6 — Feature Checklist

Work through each feature area. Mark each ✓ or note the failure.

### Authentication (`/api/auth`, `/api/users`)
- [ ] **Signup** — Navigate to `http://localhost:3000`, go to Signup, create a new account  
  _(or use the seeded account from Step 0b)_
  - Expect: redirect to login or dashboard
- [ ] **Login** — Log in with `testuser@labinsight.dev` / `Test@12345`
  - Expect: JWT stored in localStorage, redirected to main chat view
- [ ] **Invalid login** — Try wrong password
  - Expect: "Invalid Email or Password" error shown

### Chatbot (`/api/conversations`)
- [ ] **Send a message** — Type a message in the chat input and send
  - Expect: bot response appears (streaming or static), no console errors
- [ ] **Conversation history** — Refresh the page and return to chat
  - Expect: previous messages still shown

### Lab Report Upload (`/api/files`, `/api/bloodreport`)
- [ ] **Upload PDF** — Go to Add Reports, upload a lab report PDF
  - Expect: file accepted, processing starts, biomarker extraction runs
- [ ] **View reports** — Navigate to Reports / Lab Reports
  - Expect: uploaded report listed, biomarker cards rendered
- [ ] **Biomarker detail** — Click a biomarker card
  - Expect: expanded view with reference ranges and chart

### Results & Charts
- [ ] **Results page** — View parsed blood results
  - Expect: values rendered with normal/abnormal indicators
- [ ] **Bar chart** — Verify charts render without errors (`recharts` / `chart.js`)

### User Profile (`/api/users/:id`)
- [ ] **Profile page** — Navigate to profile
  - Expect: user info displayed, editable fields work

---

## Step 7 — Console & Network Check

Open browser DevTools (F12):
1. **Console tab**: no red errors (warnings are OK)
2. **Network tab → XHR/Fetch**: all API calls return `200` / `201` (not `401`, `500`, or CORS errors)

CORS errors mean the server's `cors()` config or the client's proxy needs fixing.

---

## Step 8 — Stop Servers

```powershell
# In each terminal, press Ctrl+C to stop nodemon / CRA dev server
```

---

## Decision Points

```
Server won't start
  ├─ Redis error? → Start Redis
  ├─ Missing module? → npm install in server/
  └─ Port busy? → Step 1 (kill processes)

Client shows blank / API errors
  ├─ Server not running? → Step 3
  ├─ CORS error? → Check server cors() config
  └─ Auth error on all routes? → Check JWT_PRIVATE_KEY in .env

Feature broken after code change
  ├─ Server routes: restart server (nodemon auto-reloads)
  └─ Client components: CRA hot-reloads, hard-refresh if stale
```

---

## Key Files Reference

| Area | File |
|------|------|
| Server entry | [server/index.js](../../server/index.js) |
| Redis config | [server/db.js](../../server/db.js) |
| Auth route | [server/routes/auth.js](../../server/routes/auth.js) |
| Blood report controller | [server/controllers/bloodReportController.js](../../server/controllers/bloodReportController.js) |
| Chat UI | [client/src/components/Main/chat.jsx](../../client/src/components/Main/chat.jsx) |
| Reports UI | [client/src/components/Reports/reports.jsx](../../client/src/components/Reports/reports.jsx) |
| Add Reports | [client/src/components/Reports/AddReports.jsx](../../client/src/components/Reports/AddReports.jsx) |
