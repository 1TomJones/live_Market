import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import CandleChart from './components/CandleChart';
import StatCard from './components/StatCard';

const symbols = ['BTCUSDT', 'ETHUSDT'];
const socket = io();

async function api(path, opts) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts
  });
  return res.json();
}

export default function App() {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [overview, setOverview] = useState({ points: [], summary: null });
  const [flow, setFlow] = useState({ points: [], imbalance: 0 });
  const [klines, setKlines] = useState([]);
  const [paper, setPaper] = useState(null);
  const [qty, setQty] = useState(0.01);
  const [replay, setReplay] = useState({ start: '', end: '', speed: 1, isPlaying: false, cursor: 0, data: [] });

  const refresh = async () => {
    const [ov, fl, ks, ps] = await Promise.all([
      api(`/analytics/overview?symbol=${symbol}`),
      api(`/analytics/flow?symbol=${symbol}`),
      api(`/klines?symbol=${symbol}&interval=1m&limit=500`),
      api(`/paper/state?symbol=${symbol}`)
    ]);
    setOverview(ov);
    setFlow(fl);
    setKlines(ks);
    setPaper(ps);
  };

  useEffect(() => { refresh(); }, [symbol]);
  useEffect(() => {
    socket.on('market:update', (payload) => {
      if (payload.symbol === symbol) setOverview(payload);
    });
    return () => socket.off('market:update');
  }, [symbol]);

  useEffect(() => {
    if (!replay.isPlaying || replay.data.length === 0) return;
    const timer = setInterval(() => {
      setReplay((prev) => {
        const next = Math.min(prev.cursor + 1, prev.data.length - 1);
        if (next === prev.data.length - 1) return { ...prev, cursor: next, isPlaying: false };
        return { ...prev, cursor: next };
      });
    }, 1000 / replay.speed);
    return () => clearInterval(timer);
  }, [replay.isPlaying, replay.speed, replay.data.length]);

  const replayKlines = useMemo(() => replay.data.slice(0, replay.cursor + 1), [replay]);
  const activeKlines = replay.data.length ? replayKlines : klines;
  const currentPrice = activeKlines.length ? activeKlines.at(-1).close : overview.summary?.currentPrice || 0;

  const doSync = async () => {
    await Promise.all([
      api('/sync/klines', { method: 'POST', body: JSON.stringify({ symbol }) }),
      api('/sync/trades', { method: 'POST', body: JSON.stringify({ symbol }) }),
      api('/sync/bookticker', { method: 'POST', body: JSON.stringify({ symbol }) })
    ]);
    refresh();
  };

  const loadReplay = async () => {
    if (!replay.start || !replay.end) return;
    const data = await api(`/replay?symbol=${symbol}&start=${new Date(replay.start).getTime()}&end=${new Date(replay.end).getTime()}`);
    setReplay((r) => ({ ...r, data: data.klines, cursor: 0, isPlaying: false }));
  };

  const order = async (side) => {
    await api('/paper/order', {
      method: 'POST',
      body: JSON.stringify({ symbol, side, quantity: qty, price: currentPrice, mode: replay.data.length ? 'replay' : 'live' })
    });
    refresh();
  };

  const resetPaper = async () => { await api('/paper/reset', { method: 'POST', body: JSON.stringify({ mode: 'replay' }) }); refresh(); };

  return (
    <div className="app">
      <header>
        <h1>Kent Invest Crypto Market Lab</h1>
        <div className="controls">
          <select value={symbol} onChange={(e) => setSymbol(e.target.value)}>{symbols.map((s) => <option key={s}>{s}</option>)}</select>
          <button onClick={doSync}>Sync Data</button>
        </div>
      </header>

      <div className="grid cards">
        <StatCard label="Current Price" value={overview.summary?.currentPrice?.toFixed(2) || '-'} />
        <StatCard label="Spread" value={overview.summary?.spread?.toFixed(2) || '-'} />
        <StatCard label="Session Return" value={`${((overview.summary?.sessionReturn || 0) * 100).toFixed(2)}%`} positive={(overview.summary?.sessionReturn || 0) >= 0} />
        <StatCard label="Trade Imbalance" value={flow.imbalance?.toFixed(4) || '0'} positive={(flow.imbalance || 0) >= 0} />
      </div>

      <div className="grid main">
        <section className="card">
          <h3>Market Chart</h3>
          <CandleChart klines={activeKlines} />
        </section>
        <section className="card side-panel">
          <h3>Replay</h3>
          <label>Start <input type="datetime-local" value={replay.start} onChange={(e) => setReplay({ ...replay, start: e.target.value })} /></label>
          <label>End <input type="datetime-local" value={replay.end} onChange={(e) => setReplay({ ...replay, end: e.target.value })} /></label>
          <label>Speed
            <select value={replay.speed} onChange={(e) => setReplay({ ...replay, speed: Number(e.target.value) })}>
              <option value={1}>1x</option><option value={5}>5x</option><option value={20}>20x</option>
            </select>
          </label>
          <div className="controls">
            <button onClick={loadReplay}>Load</button>
            <button onClick={() => setReplay({ ...replay, isPlaying: true })}>Play</button>
            <button onClick={() => setReplay({ ...replay, isPlaying: false })}>Pause</button>
            <button onClick={() => setReplay({ ...replay, cursor: 0, isPlaying: false })}>Reset</button>
          </div>

          <h3>Paper Trading</h3>
          <div className="paper-grid">
            <div>Cash: {paper?.cash?.toFixed(2)}</div>
            <div>Position: {paper?.position_qty?.toFixed(4)}</div>
            <div>Avg Entry: {paper?.avg_entry?.toFixed(2)}</div>
            <div>Unrealised: {paper?.unrealizedPnl?.toFixed(2)}</div>
            <div>Realised: {paper?.realized_pnl?.toFixed(2)}</div>
            <div>Equity: {paper?.equity?.toFixed(2)}</div>
          </div>
          <input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} step="0.001" />
          <div className="controls">
            <button className="buy" onClick={() => order('BUY')}>Buy</button>
            <button className="sell" onClick={() => order('SELL')}>Sell</button>
            <button onClick={resetPaper}>Reset Portfolio</button>
          </div>
        </section>
      </div>
    </div>
  );
}
