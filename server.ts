import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getMarketDataProvider,
  UpstoxSessionManager,
  verifyUpstoxToken
} from './src/server/marketDataService.ts';
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

// ==================== API ROUTES ====================

// GET /api/market/status - Current provider status, cache metrics, and feed health
app.get('/api/market/status', (_req: Request, res: Response) => {
  try {
    const provider = getMarketDataProvider();
    const status = provider.getStatus();
    const upstoxStatus = UpstoxSessionManager.getStatusInfo();

    res.json({
      success: true,
      data: {
        ...status,
        upstoxConnection: upstoxStatus
      }
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to retrieve provider status';
    res.status(500).json({ success: false, error: msg });
  }
});

// GET /api/market/quotes - Batched quotes with caching
app.get('/api/market/quotes', async (req: Request, res: Response) => {
  try {
    const provider = getMarketDataProvider();
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
    const provider = getMarketDataProvider();
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
    const provider = getMarketDataProvider();
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

// Simple in-memory sliding window rate limiter for connect requests (per client IP)
const connectRateLimitMap = new Map<string, number[]>();
function isConnectRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 60 seconds
  const maxAttempts = 5;
  const history = (connectRateLimitMap.get(ip) || []).filter(t => now - t < windowMs);
  if (history.length >= maxAttempts) {
    return true;
  }
  history.push(now);
  connectRateLimitMap.set(ip, history);
  return false;
}

// POST /api/market/upstox/connect - Connect & verify Upstox Analytics Token in server memory
app.post('/api/market/upstox/connect', async (req: Request, res: Response) => {
  try {
    // 1. Abuse / brute-force protection
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (isConnectRateLimited(clientIp)) {
      return res.status(429).json({
        success: false,
        error: 'Too many connection attempts. Please wait 1 minute before trying again.'
      });
    }

    // 2. CSRF & Content-Type validation
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.toLowerCase().includes('application/json')) {
      return res.status(415).json({
        success: false,
        error: 'Unsupported Media Type: Request must be application/json.'
      });
    }

    const { token } = req.body;
    if (!token || typeof token !== 'string' || token.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token: Upstox access token must be a non-empty string of at least 10 characters.'
      });
    }

    const cleanToken = token.trim();

    // 3. Structure & character validation (standard JWT/OAuth alphanumeric + safe characters)
    const TOKEN_FORMAT = /^[A-Za-z0-9_\-+=./]{10,2048}$/;
    if (!TOKEN_FORMAT.test(cleanToken)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token format: Token contains unsupported characters or exceeds safe length.'
      });
    }

    // 4. Verify token against live Upstox API
    const verification = await verifyUpstoxToken(cleanToken);
    if (!verification.success) {
      UpstoxSessionManager.setVerificationError(verification.message);
      return res.status(400).json({
        success: false,
        error: verification.message
      });
    }

    // 5. Save in server-side memory session (NEVER written to disk, database, or client storage)
    const samplePrice = verification.sampleData?.lastPrice;
    UpstoxSessionManager.setToken(cleanToken, 'RELIANCE', samplePrice);

    // 6. Return sanitized confirmation without exposing token
    res.json({
      success: true,
      message: verification.message,
      verifiedSymbol: 'RELIANCE',
      samplePrice,
      connectedAt: new Date().toISOString()
    });
  } catch (error) {
    const rawError = error instanceof Error ? error.message : 'Failed to connect Upstox account';
    // Ensure token is never included in error responses
    const sanitized = req.body?.token ? rawError.split(String(req.body.token)).join('[REDACTED]') : rawError;
    res.status(500).json({ success: false, error: sanitized });
  }
});

// POST /api/market/upstox/disconnect - Discard in-memory token and return to Demonstration Mode
app.post('/api/market/upstox/disconnect', (_req: Request, res: Response) => {
  try {
    UpstoxSessionManager.clearToken();
    res.json({
      success: true,
      message: 'Upstox session disconnected successfully. Reverted to Demonstration Mode.'
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to disconnect Upstox account';
    res.status(500).json({ success: false, error: msg });
  }
});

// GET /api/market/upstox/status - Get current Upstox session status (Never returns token)
app.get('/api/market/upstox/status', (_req: Request, res: Response) => {
  try {
    const info = UpstoxSessionManager.getStatusInfo();
    res.json({
      success: true,
      data: info
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to retrieve connection status';
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
