import {
  getMarketDataProvider,
  UpstoxSessionManager,
  verifyUpstoxToken
} from './server/marketDataService.ts';
import type { TimeFrame } from './types/market.ts';

export interface Env {
  UPSTOX_ACCESS_TOKEN?: string;
  MARKET_DATA_PROVIDER?: string;
  ASSETS?: {
    fetch: (request: Request | string) => Promise<Response>;
  };
}

// In-memory sliding window rate limiter for connect requests (per client IP in worker isolate)
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

function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
      ...extraHeaders
    }
  });
}

function corsPreflightResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
      'Access-Control-Max-Age': '86400'
    }
  });
}

export default {
  async fetch(request: Request, env: Env, _ctx?: unknown): Promise<Response> {
    const url = new URL(request.url);
    const { pathname, searchParams } = url;

    // Handle CORS preflight options request
    if (request.method === 'OPTIONS') {
      return corsPreflightResponse();
    }

    // ==================== MARKET DATA API ROUTES ====================

    // GET /api/market/status - Current provider status, cache metrics, and feed health
    if (pathname === '/api/market/status' && request.method === 'GET') {
      try {
        const provider = getMarketDataProvider(env);
        const status = provider.getStatus();
        const upstoxStatus = UpstoxSessionManager.getStatusInfo(env.UPSTOX_ACCESS_TOKEN);

        return jsonResponse({
          success: true,
          data: {
            ...status,
            upstoxConnection: upstoxStatus
          }
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to retrieve provider status';
        return jsonResponse({ success: false, error: msg }, 500);
      }
    }

    // GET /api/market/quotes - Batched quotes with caching
    if (pathname === '/api/market/quotes' && request.method === 'GET') {
      try {
        const provider = getMarketDataProvider(env);
        const symbolsParam = searchParams.get('symbols');
        const symbols = symbolsParam
          ? symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
          : [];

        const quotes = await provider.getQuotes(symbols);
        return jsonResponse({
          success: true,
          count: quotes.length,
          data: quotes
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to fetch quotes';
        return jsonResponse({ success: false, error: msg }, 500);
      }
    }

    // GET /api/market/candles - Time-series OHLCV candles
    if (pathname === '/api/market/candles' && request.method === 'GET') {
      try {
        const provider = getMarketDataProvider(env);
        const symbol = (searchParams.get('symbol') || 'RELIANCE').toUpperCase();
        const timeframe = (searchParams.get('timeframe') as TimeFrame) || '1D';
        const count = parseInt(searchParams.get('count') || '60', 10);

        const candles = await provider.getCandles(symbol, timeframe, count);
        return jsonResponse({
          success: true,
          symbol,
          timeframe,
          count: candles.length,
          data: candles
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to fetch candles';
        return jsonResponse({ success: false, error: msg }, 500);
      }
    }

    // GET /api/market/indices - Benchmark indices snapshot
    if (pathname === '/api/market/indices' && request.method === 'GET') {
      try {
        const provider = getMarketDataProvider(env);
        const indices = await provider.getIndices();
        return jsonResponse({
          success: true,
          data: indices
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to fetch indices';
        return jsonResponse({ success: false, error: msg }, 500);
      }
    }

    // POST /api/market/upstox/connect - Connect & verify Upstox Analytics Token in server memory
    if (pathname === '/api/market/upstox/connect' && request.method === 'POST') {
      try {
        // 1. Abuse / brute-force protection
        const clientIp = request.headers.get('cf-connecting-ip')
          || request.headers.get('x-forwarded-for')
          || 'unknown';

        if (isConnectRateLimited(clientIp)) {
          return jsonResponse({
            success: false,
            error: 'Too many connection attempts. Please wait 1 minute before trying again.'
          }, 429);
        }

        // 2. Content-Type validation
        const contentType = request.headers.get('content-type') || '';
        if (!contentType.toLowerCase().includes('application/json')) {
          return jsonResponse({
            success: false,
            error: 'Unsupported Media Type: Request must be application/json.'
          }, 415);
        }

        let body: { token?: string } = {};
        try {
          body = await request.json() as { token?: string };
        } catch {
          return jsonResponse({
            success: false,
            error: 'Invalid JSON payload received.'
          }, 400);
        }

        const { token } = body;
        if (!token || typeof token !== 'string' || token.trim().length < 10) {
          return jsonResponse({
            success: false,
            error: 'Invalid token: Upstox access token must be a non-empty string of at least 10 characters.'
          }, 400);
        }

        const cleanToken = token.trim();

        // 3. Structure & character validation
        const TOKEN_FORMAT = /^[A-Za-z0-9_\-+=./]{10,2048}$/;
        if (!TOKEN_FORMAT.test(cleanToken)) {
          return jsonResponse({
            success: false,
            error: 'Invalid token format: Token contains unsupported characters or exceeds safe length.'
          }, 400);
        }

        // 4. Verify token against live Upstox API
        const verification = await verifyUpstoxToken(cleanToken);
        if (!verification.success) {
          UpstoxSessionManager.setVerificationError(verification.message);
          return jsonResponse({
            success: false,
            error: verification.message
          }, 400);
        }

        // 5. Save in server-side memory session (NEVER written to disk, database, or client storage)
        const samplePrice = verification.sampleData?.lastPrice;
        UpstoxSessionManager.setToken(cleanToken, 'RELIANCE', samplePrice);

        // 6. Return sanitized confirmation without exposing token
        return jsonResponse({
          success: true,
          message: verification.message,
          verifiedSymbol: 'RELIANCE',
          samplePrice,
          connectedAt: new Date().toISOString()
        });
      } catch (error) {
        const rawError = error instanceof Error ? error.message : 'Failed to connect Upstox account';
        return jsonResponse({ success: false, error: rawError }, 500);
      }
    }

    // POST /api/market/upstox/disconnect - Discard in-memory token and return to Demonstration Mode
    if (pathname === '/api/market/upstox/disconnect' && request.method === 'POST') {
      try {
        UpstoxSessionManager.clearToken();
        return jsonResponse({
          success: true,
          message: 'Upstox session disconnected successfully. Reverted to Demonstration Mode.'
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to disconnect Upstox account';
        return jsonResponse({ success: false, error: msg }, 500);
      }
    }

    // GET /api/market/upstox/status - Get current Upstox session status (Never returns token)
    if (pathname === '/api/market/upstox/status' && request.method === 'GET') {
      try {
        const info = UpstoxSessionManager.getStatusInfo(env.UPSTOX_ACCESS_TOKEN);
        return jsonResponse({
          success: true,
          data: info
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to retrieve connection status';
        return jsonResponse({ success: false, error: msg }, 500);
      }
    }

    // ==================== STATIC ASSETS / SPA FALLBACK ====================
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  }
};
