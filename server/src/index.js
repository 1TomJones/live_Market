import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { AUTO_SYNC_MS, BOOK_TICKER_POLL_MS, DEFAULT_INTERVAL, DEFAULT_SYMBOL, NODE_ENV, PORT } from './config.js';
import apiRouter from './routes/api.js';
import { syncBookTicker, syncKlines, syncTrades } from './services/syncService.js';
import { getOverview } from './services/analyticsService.js';


const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use('/api', apiRouter);

io.on('connection', (socket) => {
  socket.emit('connected', { message: 'Socket connected' });
});

async function seedAndSync() {
  try {
    await syncKlines(DEFAULT_SYMBOL, DEFAULT_INTERVAL, 1000);
    await syncTrades(DEFAULT_SYMBOL, 1000);
    await syncBookTicker(DEFAULT_SYMBOL);
    io.emit('market:update', getOverview(DEFAULT_SYMBOL));
  } catch (error) {
    console.error('sync error', error.message);
  }
}

setInterval(async () => {
  try {
    await syncBookTicker(DEFAULT_SYMBOL);
  } catch (error) {
    console.error('book ticker poll failed', error.message);
  }
}, BOOK_TICKER_POLL_MS);

setInterval(seedAndSync, AUTO_SYNC_MS);
seedAndSync();

if (NODE_ENV === 'production') {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const clientDist = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

server.listen(PORT, () => console.log(`Server on ${PORT}`));
