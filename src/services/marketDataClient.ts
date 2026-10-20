import type {
  StockQuote,
  MarketIndexSummary,
  OHLCVCandle,
  TimeFrame
} from '../types/market.ts';
import { MOCK_STOCKS, MOCK_INDICES } from '../data/mockMarketData.ts';

export interface ProviderClientStatus {
  providerId: string;
  providerName: string;
  isConfigured: boolean;
  isRealTime: boolean;
  rateLimitRemaining: number;
  cacheHitRatePercent: number;
  feedHealth: 'HEALTHY' | 'STALE' | 'OFFLINE' | 'SYNTHETIC_SIMULATION';
  demoNotice?: string;
  lastTickTime: string;
  latencyMs: number;
}

/**
 * Client service requesting server-side /api/market routes without exposing API keys
 */
export async function fetchProviderStatus(): Promise<ProviderClientStatus> {
  try {
    const res = await fetch('/api/market/status');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.warn('Could not fetch server market status, using demonstration status:', err);
    return {
      providerId: 'synthetic_demo',
      providerName: 'Synthetic Demonstration Provider',
      isConfigured: true,
      isRealTime: false,
      rateLimitRemaining: 99999,
      cacheHitRatePercent: 100,
      feedHealth: 'SYNTHETIC_SIMULATION',
      demoNotice: 'DEMO DATA — NOT LIVE MARKET DATA',
      lastTickTime: new Date().toLocaleTimeString('en-IN') + ' IST (Simulated)',
      latencyMs: 1
    };
  }
}

export async function fetchMarketQuotes(symbols?: string[]): Promise<StockQuote[]> {
  try {
    const query = symbols && symbols.length > 0 ? `?symbols=${symbols.join(',')}` : '';
    const res = await fetch(`/api/market/quotes${query}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.warn('Market quotes API failed, falling back to local dataset:', err);
    return MOCK_STOCKS;
  }
}

export async function fetchMarketCandles(
  symbol: string,
  timeframe: TimeFrame = '1D',
  count = 60
): Promise<OHLCVCandle[]> {
  try {
    const res = await fetch(`/api/market/candles?symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}&count=${count}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.warn(`Candles API failed for ${symbol}, using local simulation:`, err);
    const stock = MOCK_STOCKS.find(s => s.symbol === symbol) || MOCK_STOCKS[0];
    return stock.candles1D.slice(-count);
  }
}

export async function fetchMarketIndices(): Promise<MarketIndexSummary[]> {
  try {
    const res = await fetch('/api/market/indices');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.data;
  } catch (err) {
    return MOCK_INDICES;
  }
}
