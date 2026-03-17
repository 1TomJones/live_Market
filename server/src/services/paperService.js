import { db } from '../db.js';
import { PAPER_INITIAL_CASH } from '../config.js';

const SESSION_ID = 'default';

function upsertSession(session) {
  db.prepare(`
    INSERT INTO sessions (id, mode, cash, position_qty, avg_entry, realized_pnl, updated_at)
    VALUES (@id, @mode, @cash, @position_qty, @avg_entry, @realized_pnl, @updated_at)
    ON CONFLICT(id) DO UPDATE SET mode=excluded.mode, cash=excluded.cash, position_qty=excluded.position_qty,
      avg_entry=excluded.avg_entry, realized_pnl=excluded.realized_pnl, updated_at=excluded.updated_at
  `).run(session);
}

export function ensureSession(mode = 'replay') {
  let row = db.prepare('SELECT * FROM sessions WHERE id=?').get(SESSION_ID);
  if (!row) {
    row = { id: SESSION_ID, mode, cash: PAPER_INITIAL_CASH, position_qty: 0, avg_entry: 0, realized_pnl: 0, updated_at: Date.now() };
    upsertSession(row);
  }
  return row;
}

export function resetSession(mode = 'replay') {
  db.prepare('DELETE FROM paper_trades WHERE session_id=?').run(SESSION_ID);
  const session = { id: SESSION_ID, mode, cash: PAPER_INITIAL_CASH, position_qty: 0, avg_entry: 0, realized_pnl: 0, updated_at: Date.now() };
  upsertSession(session);
  return session;
}

export function placeOrder({ symbol, side, quantity, price, mode = 'replay' }) {
  const session = ensureSession(mode);
  const qty = Number(quantity);
  const px = Number(price);
  let { cash, position_qty: posQty, avg_entry: avgEntry, realized_pnl: realizedPnl } = session;

  if (side === 'BUY') {
    const cost = qty * px;
    cash -= cost;
    const newPos = posQty + qty;
    avgEntry = newPos === 0 ? 0 : ((posQty * avgEntry) + (qty * px)) / newPos;
    posQty = newPos;
  } else {
    const sellQty = Math.min(qty, posQty);
    cash += sellQty * px;
    realizedPnl += (px - avgEntry) * sellQty;
    posQty -= sellQty;
    if (posQty === 0) avgEntry = 0;
  }

  db.prepare('INSERT INTO paper_trades (session_id, symbol, side, quantity, price, timestamp, mode) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(SESSION_ID, symbol, side, qty, px, Date.now(), mode);

  const updated = { id: SESSION_ID, mode, cash, position_qty: posQty, avg_entry: avgEntry, realized_pnl: realizedPnl, updated_at: Date.now() };
  upsertSession(updated);
  return updated;
}

export function getState(markPrice = 0) {
  const session = ensureSession();
  const trades = db.prepare('SELECT * FROM paper_trades WHERE session_id=? ORDER BY timestamp DESC LIMIT 100').all(SESSION_ID);
  const unrealizedPnl = (markPrice - session.avg_entry) * session.position_qty;
  const equity = session.cash + session.position_qty * markPrice;
  return { ...session, markPrice, unrealizedPnl, equity, trades };
}
