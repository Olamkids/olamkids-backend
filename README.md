# OLAM Kids Backend

Backend API + Dashboard for the OLAM Kids baby shop management system.

## Stack
- **Runtime:** Node.js 20
- **Framework:** Express.js
- **Database:** SQLite (via better-sqlite3)
- **Deployment:** Railway (Docker)

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Serves the dashboard HTML |
| GET | `/health` | Health check |
| GET | `/api/products` | List all products |
| POST | `/api/products` | Create a product |
| PUT | `/api/products/:id` | Update a product |
| DELETE | `/api/products/:id` | Delete a product |
| POST | `/api/products/:id/restock` | Restock with weighted avg cost |
| POST | `/api/products/:id/deduct` | Deduct stock |
| GET | `/api/sales` | List all sales |
| POST | `/api/sales` | Create a sale (auto-deducts stock) |
| DELETE | `/api/sales/:id` | Delete a sale |
| GET | `/api/expenses` | List all expenses |
| POST | `/api/expenses` | Create an expense |
| PUT | `/api/expenses/:id` | Update an expense |
| DELETE | `/api/expenses/:id` | Delete an expense |
| GET | `/api/export` | Export all data as JSON |
| POST | `/api/import` | Import data (replaces all) |

## Auto-Refresh
The frontend automatically pulls fresh data from the backend every **30 seconds**. A green/red dot in the status bar shows connection status.

## Deploy to Railway

### Option 1: From GitHub
1. Push this folder to a GitHub repository
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your repo
4. Railway will auto-detect the Dockerfile and deploy
5. **Add a Volume** mount at `/app/data` for persistent SQLite storage

### Option 2: Railway CLI
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### Important: Add a Volume!
SQLite data is stored at `/app/data/olamkids.db`. Without a Railway volume mounted at `/app/data`, your data will be lost on every redeploy.

**Steps:**
1. Railway Dashboard → Your service → Settings
2. Scroll to "Volumes" → Add Volume
3. Mount Path: `/app/data`
4. Redeploy

## Environment Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port (Railway sets this automatically) |
| `DB_PATH` | `/app/data/olamkids.db` | SQLite database path |

## Local Development
```bash
npm install
node server.js
# Open http://localhost:3000
```

## First Run
On first startup, if the database is empty, the server automatically seeds it with the 83-product OLAM Kids catalogue.
