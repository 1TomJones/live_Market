# Kent Invest Crypto Market Lab

Full-stack Binance market-data lab with replay and paper trading, built for a single Render Web Service deployment.

## Stack
- Backend: Node.js + Express + Socket.IO + SQLite (`better-sqlite3`)
- Frontend: React + Vite + TradingView Lightweight Charts
- Data: Binance public endpoints (no API key)

## Features
- Sync Binance spot data for BTCUSDT/ETHUSDT: 1m klines, aggregate trades, and book ticker snapshots.
- SQLite auto-schema bootstrap on first start.
- Analytics: returns, rolling volatility, rolling volume, volume spike, spread/mid, signed flow imbalance, cumulative signed flow.
- Replay dataset endpoint and frontend controls (load/play/pause/reset with speed control).
- Paper trading in live/replay mode with position tracking and PnL.
- Socket.IO push channel (`market:update`) from periodic background sync.

## Project Structure
- `server/`: Express API, SQLite schema/services/routes, Socket.IO, production static serving
- `client/`: React dashboard app
- `render.yaml`: One-click Render service definition

## Local Run
```bash
npm install
npm run install:all
npm run dev
```
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`

## Production-like local run
```bash
npm install
npm run install:all
npm run build
NODE_ENV=production npm start
```
Then open `http://localhost:3000`.

## Key Environment Variables
- `PORT` (default `3000`)
- `NODE_ENV` (`development` or `production`)
- `DB_PATH` (default `server/data/market_lab.db`)
- `DEFAULT_SYMBOL` (default `BTCUSDT`)
- `DEFAULT_INTERVAL` (default `1m`)
- `BOOK_TICKER_POLL_MS` (default `5000`)
- `AUTO_SYNC_MS` (default `60000`)
- `PAPER_INITIAL_CASH` (default `100000`)

## Render Deployment (single web service)
1. Push repository to GitHub.
2. In Render, create **Web Service** from the repo.
3. Use these commands:
   - Build command: `npm install && npm run install:all && npm run build`
   - Start command: `NODE_ENV=production npm start`
4. Set environment variables as needed (`DB_PATH` recommended as `/opt/render/project/src/server/data/market_lab.db`).
5. Deploy.

## API Endpoints
- `GET /api/health`
- `POST /api/sync/klines`
- `POST /api/sync/trades`
- `POST /api/sync/bookticker`
- `GET /api/klines?symbol=BTCUSDT&interval=1m&limit=500`
- `GET /api/trades?symbol=BTCUSDT&limit=1000`
- `GET /api/bookticker?symbol=BTCUSDT&limit=500`
- `GET /api/analytics/overview?symbol=BTCUSDT`
- `GET /api/analytics/volatility?symbol=BTCUSDT`
- `GET /api/analytics/flow?symbol=BTCUSDT`
- `GET /api/replay?symbol=BTCUSDT&start=<ms>&end=<ms>`
- `POST /api/paper/reset`
- `POST /api/paper/order`
- `GET /api/paper/state?symbol=BTCUSDT`

## Recommended Future Improvements
- Binance WebSocket ingestion for lower-latency live mode.
- Multi-user paper accounts and auth.
- More symbols/timeframes and derived strategy signals.
- CSV export + strategy backtest module.
- Persistent disk (Render disk) for non-ephemeral database retention.
