import axios from 'axios';
import { BINANCE_BASE_URL } from '../config.js';

const client = axios.create({
  baseURL: BINANCE_BASE_URL,
  timeout: 10000
});

async function safeGet(url, params = {}, retries = 2) {
  try {
    const res = await client.get(url, { params });
    return res.data;
  } catch (error) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return safeGet(url, params, retries - 1);
    }
    throw error;
  }
}

export const BinanceService = {
  fetchKlines: (symbol, interval, limit = 1000, startTime, endTime) =>
    safeGet('/api/v3/klines', { symbol, interval, limit, startTime, endTime }),
  fetchAggTrades: (symbol, limit = 1000, fromId, startTime, endTime) =>
    safeGet('/api/v3/aggTrades', { symbol, limit, fromId, startTime, endTime }),
  fetchBookTicker: (symbol) => safeGet('/api/v3/ticker/bookTicker', { symbol })
};
