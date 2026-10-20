import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getMarketDataProvider } from './src/server/marketDataService.ts';
import type { TimeFrame } from './src/types/market.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getPort(): number {
  const portArgIdx = process.argv.indexOf('--port');
  if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
    return parseInt(process.argv[portArgIdx + 1], 10);
  }
  if (process.env.APP_PORT) {
    return parseInt(process.env.APP_PORT, 10);
  }
  // Port 8080 is reserved by nginx in Cloud Run environment; app must listen on 3000
  if (process.env.PORT && process.env.PORT !== '8080') {
    return parseInt(process.env.PORT, 10);
  }
  return 3000;
}

const app = express();
const port = getPort();
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

// Market Data Provider instance
const provider = getMarketDataProvider();

// ==================== API ROUTES ====================

// GET /api/market/status - Current provider status, cache metrics, and feed health
app.get('/api/market/status', (_req: Request, res: Response) => {
  try {
    const status = provider.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to retrieve provider status';
    res.status(500).json({ success: false, error: msg });
  }
});

// GET /api/market/quotes - Batched quotes with caching
app.get('/api/market/quotes', async (req: Request, res: Response) => {
  try {
    const symbolsParam = req.query.symbols as string;
    const symbols = symbolsParam
      ? symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
      : [];

    const quotes = await provider.getQuotes(symbols);
    res.json({
      success: true,
      count: quotes.length,
      data: quotes
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch quotes';
    res.status(500).json({ success: false, error: msg });
  }
});

// GET /api/market/candles - Time-series OHLCV candles
app.get('/api/market/candles', async (req: Request, res: Response) => {
  try {
    const symbol = (req.query.symbol as string || 'RELIANCE').toUpperCase();
    const timeframe = (req.query.timeframe as TimeFrame) || '1D';
    const count = parseInt(req.query.count as string || '60', 10);

    const candles = await provider.getCandles(symbol, timeframe, count);
    res.json({
      success: true,
      symbol,
      timeframe,
      count: candles.length,
      data: candles
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch candles';
    res.status(500).json({ success: false, error: msg });
  }
});

// GET /api/market/indices - Benchmark indices snapshot
app.get('/api/market/indices', async (_req: Request, res: Response) => {
  try {
    const indices = await provider.getIndices();
    res.json({
      success: true,
      data: indices
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch indices';
    res.status(500).json({ success: false, error: msg });
  }
});

// ==================== FRONTEND SERVER MOUNT ====================

async function startServer() {
  if (!isProduction) {
    // Development: mount Vite middlewares
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve built static assets from dist
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[MarketPulse Server] Running on http://0.0.0.0:${port} (${isProduction ? 'production' : 'development'})`);
  });
}

startServer().catch(err => {
  console.error('Failed to start MarketPulse Server:', err);
  process.exit(1);
});
