# Helper4U — Maid, Nanny & Babysitter Platform

A complete Phase-1 full-stack academic project:

- Frontend: HTML5, CSS3, Vanilla JavaScript
- Frontend tooling: Vite
- Backend: Node.js + Express
- Database: MongoDB (via Mongoose)
- Authentication: JWT + bcryptjs

## Project structure

```text
helper4u_project/
├── client/                 # Vite frontend
│   ├── index.html
│   ├── helpers.html
│   ├── maids.html
│   ├── babysitters.html
│   ├── nannies.html
│   ├── helper.html
│   ├── booking.html
│   ├── login.html
│   ├── register.html
│   ├── bookings.html
│   ├── helper-dashboard.html
│   ├── admin-dashboard.html
│   ├── services.html
│   ├── pricing.html
│   ├── how-it-works.html
│   ├── about.html
│   ├── contact.html
│   ├── app.js
│   ├── styles.css
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── src/server.js
│   ├── src/db.js           # MongoDB (Mongoose) connection
│   ├── src/models/         # Mongoose schemas (User, Helper, Booking, Review, Contact)
│   ├── package.json
│   └── .env.example
├── docker-compose.yml       # runs MongoDB + backend together
└── MONGODB_SETUP.md         # required: MongoDB setup instructions
```

## How to run

**MongoDB must be running before you start the backend** — see `MONGODB_SETUP.md`
for local install or free Atlas cloud setup.

### 1. Start backend

```powershell
cd server
npm install
copy .env.example .env
npm run dev
```

The API will run at `http://localhost:5000` and connect to MongoDB using the
`MONGODB_URI` in `server/.env`. All data (users, helpers, bookings, contact
messages, reviews) is saved in MongoDB. The server also creates a demo admin
and sample verified helpers on first run.

### 2. Start frontend in a second PowerShell

```powershell
cd client
npm install
npm run dev
```

Open the Local URL printed by Vite, normally `http://localhost:5173/`.

### Important

Do **not** run:

```powershell
npx vite --root .
```

The `client` directory is already configured as the Vite root.

## Demo admin

Email: `admin@helper4u.com`
Password: `Admin@123`

## Resetting all data

Drop the `helper4u` database in MongoDB (e.g. using `mongosh`: `use helper4u` then
`db.dropDatabase()`), or connect to a fresh database. The demo admin and sample
helpers will be re-created automatically the next time you run `npm run dev`.

## Docker option

`docker-compose.yml` starts **both MongoDB and the backend** together. From the
project root:

```powershell
docker compose up --build
```

Then start the client separately:

```powershell
cd client
npm install
npm run dev
```

---

## Auth update (login + register fix)

**What the bug was:** `register.html` was using `name.value`. In the browser, `window.name`
is a built-in string property, so `name` never actually pointed to the input element —
the server received `name: undefined` and returned a 400. That's why
"Create new account" never worked.

**New / changed files**

| File | What it is |
|---|---|
| `client/auth.js` | Full login + register logic (validation, API call, session save) |
| `client/auth.css` | New UI for the auth pages |
| `client/login.html` | Rewrite — split panel layout |
| `client/register.html` | Rewrite — 2-step form |
| `server/src/server.js` | Register/login routes hardened, `/api/auth/me` added |

**How to run it**

```bash
cd server && npm install && cp .env.example .env
npm run dev          # http://localhost:5000
cd ../client && npm install && npm run dev
```

To check: `http://localhost:5000/api/health` — should return `{"ok":true}`.
To view data in the database: `mongosh` → `use helper4u` → `db.users.find().pretty()`


## Deployment
See `DEPLOYMENT.md` for the Vercel + Render + MongoDB Atlas deployment steps.
