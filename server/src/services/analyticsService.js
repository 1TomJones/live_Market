import { db } from '../db.js';

function rolling(values, window, reducer) {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    return reducer(slice);
  });
}

export function getOverview(symbol = 'BTCUSDT') {
  const klines = db.prepare('SELECT * FROM klines WHERE symbol=? AND interval=? ORDER BY open_time DESC LIMIT 300').all(symbol, '1m').reverse();
  const books = db.prepare('SELECT * FROM book_ticker_snapshots WHERE symbol=? ORDER BY fetch_time DESC LIMIT 1').get(symbol);
  if (!klines.length) return { symbol, points: [], summary: null };

  const closes = klines.map((k) => k.close);
  const volumes = klines.map((k) => k.volume);
  const returns = closes.map((c, i) => (i === 0 ? 0 : (c - closes[i - 1]) / closes[i - 1]));
  const volatility = rolling(returns, 20, (slice) => {
    const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
    return Math.sqrt(slice.reduce((sum, x) => sum + (x - mean) ** 2, 0) / slice.length);
  });
  const avgVolume = rolling(volumes, 20, (slice) => slice.reduce((a, b) => a + b, 0) / slice.length);

  const points = klines.map((k, i) => ({
    time: k.open_time,
    close: k.close,
    return1m: returns[i],
    rollingVolatility: volatility[i],
    rollingVolume: avgVolume[i],
    volumeSpike: avgVolume[i] ? k.volume / avgVolume[i] : 0
  }));

  const high = Math.max(...closes);
  const low = Math.min(...closes);
  const sessionReturn = (closes.at(-1) - closes[0]) / closes[0];
  const spread = books ? books.ask_price - books.bid_price : null;

  return {
    symbol,
    points,
    summary: {
      currentPrice: closes.at(-1),
      high,
      low,
      sessionReturn,
      spread,
      midPrice: books ? (books.ask_price + books.bid_price) / 2 : null
    }
  };
}

export function getFlow(symbol = 'BTCUSDT', limit = 500) {
  const trades = db.prepare('SELECT * FROM agg_trades WHERE symbol=? ORDER BY trade_time DESC LIMIT ?').all(symbol, limit).reverse();
  let cumulative = 0;
  const points = trades.map((t) => {
    const signedQty = t.is_buyer_maker ? -t.quantity : t.quantity;
    cumulative += signedQty;
    return {
      time: t.trade_time,
      price: t.price,
      quantity: t.quantity,
      signedQty,
      cumulativeSignedVolume: cumulative
    };
  });
  const imbalance = points.reduce((a, b) => a + b.signedQty, 0);
  return { symbol, imbalance, points };
}

export function getReplay(symbol, start, end) {
  const klines = db.prepare('SELECT * FROM klines WHERE symbol=? AND interval=? AND open_time BETWEEN ? AND ? ORDER BY open_time').all(symbol, '1m', start, end);
  const trades = db.prepare('SELECT * FROM agg_trades WHERE symbol=? AND trade_time BETWEEN ? AND ? ORDER BY trade_time').all(symbol, start, end);
  const book = db.prepare('SELECT * FROM book_ticker_snapshots WHERE symbol=? AND fetch_time BETWEEN ? AND ? ORDER BY fetch_time').all(symbol, start, end);

  return { symbol, start, end, klines, trades, book };
}
