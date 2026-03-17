import path from 'path';

export const PORT = process.env.PORT || 3000;
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const BINANCE_BASE_URL = process.env.BINANCE_BASE_URL || 'https://api.binance.com';
export const DEFAULT_SYMBOL = process.env.DEFAULT_SYMBOL || 'BTCUSDT';
export const DEFAULT_INTERVAL = process.env.DEFAULT_INTERVAL || '1m';
export const DB_PATH = process.env.DB_PATH || path.resolve(process.cwd(), 'server', 'data', 'market_lab.db');
export const BOOK_TICKER_POLL_MS = Number(process.env.BOOK_TICKER_POLL_MS || 5000);
export const AUTO_SYNC_MS = Number(process.env.AUTO_SYNC_MS || 60000);
export const PAPER_INITIAL_CASH = Number(process.env.PAPER_INITIAL_CASH || 100000);
