import express from 'express';
import { db } from '../db.js';
import { DEFAULT_INTERVAL, DEFAULT_SYMBOL } from '../config.js';
import { syncBookTicker, syncKlines, syncTrades } from '../services/syncService.js';
import { getFlow, getOverview, getReplay } from '../services/analyticsService.js';
import { getState, placeOrder, resetSession } from '../services/paperService.js';

const router = express.Router();

router.get('/health', (_req, res) => res.json({ ok: true, now: Date.now() }));

router.post('/sync/klines', async (req, res, next) => {
  try {
    const { symbol = DEFAULT_SYMBOL, interval = DEFAULT_INTERVAL, limit = 500 } = req.body || {};
    res.json(await syncKlines(symbol, interval, limit));
  } catch (e) { next(e); }
});

router.post('/sync/trades', async (req, res, next) => {
  try {
    const { symbol = DEFAULT_SYMBOL, limit = 1000 } = req.body || {};
    res.json(await syncTrades(symbol, limit));
  } catch (e) { next(e); }
});

router.post('/sync/bookticker', async (req, res, next) => {
  try {
    const { symbol = DEFAULT_SYMBOL } = req.body || {};
    res.json(await syncBookTicker(symbol));
  } catch (e) { next(e); }
});

router.get('/klines', (req, res) => {
  const { symbol = DEFAULT_SYMBOL, interval = DEFAULT_INTERVAL, limit = 500 } = req.query;
  const rows = db.prepare('SELECT * FROM klines WHERE symbol=? AND interval=? ORDER BY open_time DESC LIMIT ?').all(symbol, interval, Number(limit)).reverse();
  res.json(rows);
});

router.get('/trades', (req, res) => {
  const { symbol = DEFAULT_SYMBOL, limit = 1000 } = req.query;
  const rows = db.prepare('SELECT * FROM agg_trades WHERE symbol=? ORDER BY trade_time DESC LIMIT ?').all(symbol, Number(limit));
  res.json(rows);
});

router.get('/bookticker', (req, res) => {
  const { symbol = DEFAULT_SYMBOL, limit = 500 } = req.query;
  const rows = db.prepare('SELECT * FROM book_ticker_snapshots WHERE symbol=? ORDER BY fetch_time DESC LIMIT ?').all(symbol, Number(limit));
  res.json(rows);
});

router.get('/analytics/overview', (req, res) => res.json(getOverview(req.query.symbol || DEFAULT_SYMBOL)));
router.get('/analytics/flow', (req, res) => res.json(getFlow(req.query.symbol || DEFAULT_SYMBOL, Number(req.query.limit || 500))));
router.get('/analytics/volatility', (req, res) => {
  const o = getOverview(req.query.symbol || DEFAULT_SYMBOL);
  res.json(o.points.map((p) => ({ time: p.time, rollingVolatility: p.rollingVolatility })));
});

router.get('/replay', (req, res) => {
  const { symbol = DEFAULT_SYMBOL, start, end } = req.query;
  res.json(getReplay(symbol, Number(start), Number(end)));
});

router.post('/paper/reset', (req, res) => {
  const mode = req.body?.mode || 'replay';
  res.json(resetSession(mode));
});

router.post('/paper/order', (req, res) => {
  const { symbol = DEFAULT_SYMBOL, side, quantity, price, mode = 'replay' } = req.body;
  const session = placeOrder({ symbol, side, quantity, price, mode });
  res.json(session);
});

router.get('/paper/state', (req, res) => {
  const symbol = req.query.symbol || DEFAULT_SYMBOL;
  const latest = db.prepare('SELECT close FROM klines WHERE symbol=? ORDER BY open_time DESC LIMIT 1').get(symbol);
  res.json(getState(latest?.close || 0));
});

export default router;
