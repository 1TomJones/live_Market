import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { DB_PATH } from './config.js';

const dataDir = path.dirname(DB_PATH);
fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS klines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      interval TEXT NOT NULL,
      open_time INTEGER NOT NULL,
      close_time INTEGER NOT NULL,
      open REAL NOT NULL,
      high REAL NOT NULL,
      low REAL NOT NULL,
      close REAL NOT NULL,
      volume REAL NOT NULL,
      quote_asset_volume REAL NOT NULL,
      num_trades INTEGER NOT NULL,
      taker_buy_base REAL NOT NULL,
      taker_buy_quote REAL NOT NULL,
      UNIQUE(symbol, interval, open_time)
    );
    CREATE INDEX IF NOT EXISTS idx_klines_symbol_interval_time ON klines(symbol, interval, open_time);

    CREATE TABLE IF NOT EXISTS agg_trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      agg_trade_id INTEGER NOT NULL,
      price REAL NOT NULL,
      quantity REAL NOT NULL,
      first_trade_id INTEGER NOT NULL,
      last_trade_id INTEGER NOT NULL,
      trade_time INTEGER NOT NULL,
      is_buyer_maker INTEGER NOT NULL,
      best_match INTEGER NOT NULL,
      UNIQUE(symbol, agg_trade_id)
    );
    CREATE INDEX IF NOT EXISTS idx_agg_trades_symbol_time ON agg_trades(symbol, trade_time);

    CREATE TABLE IF NOT EXISTS book_ticker_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      fetch_time INTEGER NOT NULL,
      bid_price REAL NOT NULL,
      bid_qty REAL NOT NULL,
      ask_price REAL NOT NULL,
      ask_qty REAL NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_book_symbol_time ON book_ticker_snapshots(symbol, fetch_time);

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      mode TEXT NOT NULL,
      cash REAL NOT NULL,
      position_qty REAL NOT NULL,
      avg_entry REAL NOT NULL,
      realized_pnl REAL NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS paper_trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      quantity REAL NOT NULL,
      price REAL NOT NULL,
      timestamp INTEGER NOT NULL,
      mode TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_paper_trades_session ON paper_trades(session_id, timestamp);
  `);
}
