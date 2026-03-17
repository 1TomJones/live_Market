import { db } from '../db.js';
import { BinanceService } from './binanceService.js';

const insertKline = db.prepare(`
INSERT INTO klines (symbol, interval, open_time, close_time, open, high, low, close, volume, quote_asset_volume, num_trades, taker_buy_base, taker_buy_quote)
VALUES (@symbol, @interval, @open_time, @close_time, @open, @high, @low, @close, @volume, @quote_asset_volume, @num_trades, @taker_buy_base, @taker_buy_quote)
ON CONFLICT(symbol, interval, open_time) DO UPDATE SET
close=excluded.close, high=excluded.high, low=excluded.low, volume=excluded.volume, quote_asset_volume=excluded.quote_asset_volume,
num_trades=excluded.num_trades, taker_buy_base=excluded.taker_buy_base, taker_buy_quote=excluded.taker_buy_quote
`);

const insertTrade = db.prepare(`
INSERT INTO agg_trades (symbol, agg_trade_id, price, quantity, first_trade_id, last_trade_id, trade_time, is_buyer_maker, best_match)
VALUES (@symbol, @agg_trade_id, @price, @quantity, @first_trade_id, @last_trade_id, @trade_time, @is_buyer_maker, @best_match)
ON CONFLICT(symbol, agg_trade_id) DO NOTHING
`);

const insertBookTicker = db.prepare(`
INSERT INTO book_ticker_snapshots (symbol, fetch_time, bid_price, bid_qty, ask_price, ask_qty)
VALUES (@symbol, @fetch_time, @bid_price, @bid_qty, @ask_price, @ask_qty)
`);

export async function syncKlines(symbol, interval, limit = 500) {
  const last = db.prepare('SELECT MAX(open_time) AS last_open FROM klines WHERE symbol=? AND interval=?').get(symbol, interval);
  const startTime = last?.last_open ? last.last_open + 60_000 : undefined;
  const klines = await BinanceService.fetchKlines(symbol, interval, limit, startTime);
  const tx = db.transaction((rows) => {
    rows.forEach((k) => {
      insertKline.run({
        symbol,
        interval,
        open_time: k[0],
        close_time: k[6],
        open: Number(k[1]),
        high: Number(k[2]),
        low: Number(k[3]),
        close: Number(k[4]),
        volume: Number(k[5]),
        quote_asset_volume: Number(k[7]),
        num_trades: Number(k[8]),
        taker_buy_base: Number(k[9]),
        taker_buy_quote: Number(k[10])
      });
    });
  });
  tx(klines);
  return { inserted: klines.length };
}

export async function syncTrades(symbol, limit = 1000) {
  const last = db.prepare('SELECT MAX(agg_trade_id) AS last_id FROM agg_trades WHERE symbol=?').get(symbol);
  const trades = await BinanceService.fetchAggTrades(symbol, limit, last?.last_id ? last.last_id + 1 : undefined);
  const tx = db.transaction((rows) => {
    rows.forEach((t) => {
      insertTrade.run({
        symbol,
        agg_trade_id: t.a,
        price: Number(t.p),
        quantity: Number(t.q),
        first_trade_id: t.f,
        last_trade_id: t.l,
        trade_time: t.T,
        is_buyer_maker: t.m ? 1 : 0,
        best_match: t.M ? 1 : 0
      });
    });
  });
  tx(trades);
  return { inserted: trades.length };
}

export async function syncBookTicker(symbol) {
  const ticker = await BinanceService.fetchBookTicker(symbol);
  insertBookTicker.run({
    symbol,
    fetch_time: Date.now(),
    bid_price: Number(ticker.bidPrice),
    bid_qty: Number(ticker.bidQty),
    ask_price: Number(ticker.askPrice),
    ask_qty: Number(ticker.askQty)
  });
  return { symbol, bid: ticker.bidPrice, ask: ticker.askPrice };
}
