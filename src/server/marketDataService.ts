import type {
  OHLCVCandle,
  StockQuote,
  MarketIndexSummary,
  TimeFrame
} from '../types/market.ts';
import { MOCK_STOCKS, MOCK_INDICES } from '../data/mockMarketData.ts';

export const DEMO_DATA_NOTICE = 'DEMO DATA — NOT LIVE MARKET DATA';

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
}

export class MarketCacheManager {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private hits: number = 0;
  private misses: number = 0;

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds: number): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000
    });
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats(): CacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size
    };
  }
}

export const globalMarketCache = new MarketCacheManager();

/**
 * Validates candlestick series invariants and strict chronological order
 */
export function validateMarketCandles(candles: OHLCVCandle[]): {
  isValid: boolean;
  errors: string[];
  sanitized: OHLCVCandle[];
} {
  const errors: string[] = [];
  if (!candles || candles.length === 0) {
    return { isValid: false, errors: ['Candle array is empty.'], sanitized: [] };
  }

  const sanitized: OHLCVCandle[] = [];
  let previousTimeUnix = -Infinity;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const indexPrefix = `Candle[${i}] (${c.timestamp || 'unknown'}):`;

    if (isNaN(c.open) || isNaN(c.high) || isNaN(c.low) || isNaN(c.close)) {
      errors.push(`${indexPrefix} Contains NaN prices.`);
      continue;
    }

    if (c.open <= 0 || c.high <= 0 || c.low <= 0 || c.close <= 0) {
      errors.push(`${indexPrefix} Prices must be strictly positive.`);
      continue;
    }

    if (c.high < c.low) {
      errors.push(`${indexPrefix} Invariant violation: High (${c.high}) < Low (${c.low}).`);
      continue;
    }

    const maxBody = Math.max(c.open, c.close);
    const minBody = Math.min(c.open, c.close);

    if (c.high < maxBody - 0.001) {
      errors.push(`${indexPrefix} High (${c.high}) is lower than max(Open, Close) (${maxBody}).`);
      continue;
    }

    if (c.low > minBody + 0.001) {
      errors.push(`${indexPrefix} Low (${c.low}) is higher than min(Open, Close) (${minBody}).`);
      continue;
    }

    if (c.volume < 0 || isNaN(c.volume)) {
      errors.push(`${indexPrefix} Volume cannot be negative or NaN.`);
      continue;
    }

    // Chronological order check
    if (c.timeUnix <= previousTimeUnix) {
      errors.push(`${indexPrefix} Chronological violation: Unix timestamp (${c.timeUnix}) is not strictly greater than previous (${previousTimeUnix}).`);
      continue;
    }

    previousTimeUnix = c.timeUnix;
    sanitized.push(c);
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
}

/**
 * Checks feed staleness considering Indian Standard Time (IST) market sessions
 */
export function checkFeedStaleness(
  lastTimestampMs: number,
  currentDate: Date = new Date()
): {
  isStale: boolean;
  status: 'ACTIVE_LIVE' | 'SESSION_CLOSED' | 'FEED_STALE';
  latencyMs: number;
  lastTickTimeIST: string;
} {
  // Convert current time to IST (UTC + 5:30)
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(currentDate.getTime() + istOffsetMs);
  const dayOfWeek = istNow.getUTCDay(); // 0 is Sunday, 6 is Saturday
  const hours = istNow.getUTCHours();
  const minutes = istNow.getUTCMinutes();
  const currentMinuteOfDay = hours * 60 + minutes;

  // NSE Market Operating Hours: 09:15 to 15:30 IST (555 to 930 minutes) on Mon-Fri
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const isDuringMarketHours = isWeekday && currentMinuteOfDay >= 555 && currentMinuteOfDay <= 930;

  const latencyMs = Math.max(0, currentDate.getTime() - lastTimestampMs);
  const lastTickTimeIST = new Date(lastTimestampMs + istOffsetMs).toISOString().replace('T', ' ').slice(0, 19) + ' IST';

  if (!isDuringMarketHours) {
    return {
      isStale: false,
      status: 'SESSION_CLOSED',
      latencyMs,
      lastTickTimeIST
    };
  }

  // During market hours, any tick older than 60 seconds is flagged as stale
  const isStale = latencyMs > 60 * 1000;
  return {
    isStale,
    status: isStale ? 'FEED_STALE' : 'ACTIVE_LIVE',
    latencyMs,
    lastTickTimeIST
  };
}

export interface ProviderStatus {
  providerId: string;
  providerName: string;
  isConfigured: boolean;
  isRealTime: boolean;
  rateLimitRemaining: number;
  cacheHitRatePercent: number;
  feedHealth: 'HEALTHY' | 'STALE' | 'OFFLINE' | 'SYNTHETIC_SIMULATION';
  demoNotice: string;
  lastTickTime: string;
  latencyMs: number;
}

/**
 * Canonical Upstox Instrument Key mapping for NSE Equities and Benchmarks.
 * Upstox API v2 requires 'EXCHANGE|ISIN' format for equities and 'NSE_INDEX|IndexName' for indices.
 */
export const NSE_INSTRUMENT_MAP: Record<string, string> = {
  RELIANCE: 'NSE_EQ|INE002A01018',
  TCS: 'NSE_EQ|INE467B01029',
  HDFCBANK: 'NSE_EQ|INE040A01034',
  INFY: 'NSE_EQ|INE009A01021',
  ICICIBANK: 'NSE_EQ|INE090A01021',
  BHARTIARTL: 'NSE_EQ|INE397D01024',
  SBIN: 'NSE_EQ|INE062A01020',
  ITC: 'NSE_EQ|INE154A01025',
  LT: 'NSE_EQ|INE018A01030',
  HINDUNILVR: 'NSE_EQ|INE030A01027',
  TATAMOTORS: 'NSE_EQ|INE155A01022',
  SUNPHARMA: 'NSE_EQ|INE044A01036',
  MARUTI: 'NSE_EQ|INE585B01010',
  TITAN: 'NSE_EQ|INE280A01028',
  BAJFINANCE: 'NSE_EQ|INE296A01024',
  AXISBANK: 'NSE_EQ|INE238A01034',
  KOTAKBANK: 'NSE_EQ|INE237A01028',
  TATASTEEL: 'NSE_EQ|INE081A01020',
  NTPC: 'NSE_EQ|INE733E01010',
  POWERGRID: 'NSE_EQ|INE752E01010',
  'M&M': 'NSE_EQ|INE101A01026',
  MM: 'NSE_EQ|INE101A01026',
  CIPLA: 'NSE_EQ|INE059A01026',
  JSWSTEEL: 'NSE_EQ|INE019A01038',
  ASIANPAINT: 'NSE_EQ|INE021A01026',
  NIFTY: 'NSE_INDEX|Nifty 50',
  BANKNIFTY: 'NSE_INDEX|Nifty Bank'
};

export function getUpstoxInstrumentKey(symbol: string): string {
  const clean = symbol.toUpperCase().trim();
  if (clean.startsWith('NSE_EQ|') || clean.startsWith('NSE_INDEX|')) {
    return clean;
  }
  return NSE_INSTRUMENT_MAP[clean] || `NSE_EQ|${clean}`;
}

export interface IMarketDataProvider {
  readonly providerId: string;
  readonly providerName: string;
  readonly isConfigured: boolean;
  getStatus(): ProviderStatus;
  getQuotes(symbols: string[]): Promise<StockQuote[]>;
  getCandles(symbol: string, timeframe: TimeFrame, count?: number): Promise<OHLCVCandle[]>;
  getIndices(): Promise<MarketIndexSummary[]>;
}

/**
 * Synthetic Demonstration Provider
 * Default zero-config provider running locally with clearly labelled synthetic data.
 * Does not require any external broker credentials or paid subscriptions.
 */
export class DemonstrationMarketProvider implements IMarketDataProvider {
  readonly providerId = 'synthetic_demo';
  readonly providerName = 'Synthetic Demonstration Provider';
  readonly isConfigured = true;

  getStatus(): ProviderStatus {
    const cacheStats = globalMarketCache.getStats();
    const totalReq = cacheStats.hits + cacheStats.misses;
    const hitRate = totalReq > 0 ? Number(((cacheStats.hits / totalReq) * 100).toFixed(1)) : 100;

    return {
      providerId: this.providerId,
      providerName: this.providerName,
      isConfigured: true,
      isRealTime: false,
      rateLimitRemaining: 99999,
      cacheHitRatePercent: hitRate,
      feedHealth: 'SYNTHETIC_SIMULATION',
      demoNotice: DEMO_DATA_NOTICE,
      lastTickTime: new Date().toLocaleTimeString('en-IN') + ' IST (Simulated)',
      latencyMs: 1
    };
  }

  async getQuotes(symbols: string[]): Promise<StockQuote[]> {
    const nowTime = new Date().toLocaleTimeString('en-IN') + ' IST (Simulated)';
    if (!symbols || symbols.length === 0) {
      return MOCK_STOCKS.map(q => ({
        ...q,
        isDemoData: true,
        demoNotice: DEMO_DATA_NOTICE,
        feedStatus: 'SIMULATED' as const,
        lastUpdated: nowTime,
        dataSource: 'Synthetic Demonstration Provider'
      }));
    }

    return symbols.map(sym => {
      const existing = MOCK_STOCKS.find(s => s.symbol === sym);
      const base = existing || MOCK_STOCKS[0];
      return {
        ...base,
        symbol: sym,
        companyName: existing ? existing.companyName : `${sym} (Demonstration)`,
        isDemoData: true,
        demoNotice: DEMO_DATA_NOTICE,
        feedStatus: 'SIMULATED' as const,
        lastUpdated: nowTime,
        dataSource: 'Synthetic Demonstration Provider'
      };
    });
  }

  async getCandles(symbol: string, _timeframe: TimeFrame, count = 60): Promise<OHLCVCandle[]> {
    const stock = MOCK_STOCKS.find(s => s.symbol === symbol) || MOCK_STOCKS[0];
    return stock.candles1D.slice(-count);
  }

  async getIndices(): Promise<MarketIndexSummary[]> {
    const nowTime = new Date().toLocaleTimeString('en-IN') + ' IST (Simulated)';
    return MOCK_INDICES.map(i => ({
      ...i,
      isDemoData: true,
      demoNotice: DEMO_DATA_NOTICE,
      feedStatus: 'SIMULATED' as const,
      lastUpdated: nowTime,
      dataSource: 'Synthetic Demonstration Provider'
    }));
  }
}

/**
 * Upstox Developer API v2 Provider Implementation (Optional)
 * Activated ONLY when legitimate UPSTOX_ACCESS_TOKEN is configured in server environment.
 */
export class UpstoxMarketProvider implements IMarketDataProvider {
  readonly providerId = 'upstox';
  readonly providerName = 'Upstox Developer API v2';
  private accessToken: string | undefined;
  private lastTickMs: number = Date.now();
  private lastError: string | null = null;

  constructor(token?: string) {
    this.accessToken = token || UpstoxSessionManager.getToken() || (typeof process !== 'undefined' ? process.env?.UPSTOX_ACCESS_TOKEN : undefined);
  }

  get isConfigured(): boolean {
    return Boolean(this.accessToken && this.accessToken.trim() !== '');
  }

  getStatus(): ProviderStatus {
    const cacheStats = globalMarketCache.getStats();
    const totalReq = cacheStats.hits + cacheStats.misses;
    const hitRate = totalReq > 0 ? Number(((cacheStats.hits / totalReq) * 100).toFixed(1)) : 0;
    const staleness = checkFeedStaleness(this.lastTickMs);

    let feedHealth: 'HEALTHY' | 'STALE' | 'OFFLINE' | 'SYNTHETIC_SIMULATION' = 'HEALTHY';
    if (!this.isConfigured) {
      feedHealth = 'SYNTHETIC_SIMULATION';
    } else if (this.lastError) {
      feedHealth = 'OFFLINE';
    } else if (staleness.isStale) {
      feedHealth = 'STALE';
    }

    return {
      providerId: this.providerId,
      providerName: this.providerName,
      isConfigured: this.isConfigured,
      isRealTime: this.isConfigured && !this.lastError,
      rateLimitRemaining: this.isConfigured ? 50 : 0,
      cacheHitRatePercent: hitRate,
      feedHealth,
      demoNotice: this.isConfigured ? 'LIVE AUTHENTICATED BROKER FEED' : DEMO_DATA_NOTICE,
      lastTickTime: staleness.lastTickTimeIST,
      latencyMs: staleness.latencyMs
    };
  }

  async getQuotes(symbols: string[]): Promise<StockQuote[]> {
    if (!this.isConfigured) {
      const demoProvider = new DemonstrationMarketProvider();
      return demoProvider.getQuotes(symbols);
    }

    // Default to the standard constituent universe if no symbols were specified
    const targetSymbols = symbols && symbols.length > 0
      ? symbols
      : MOCK_STOCKS.map(s => s.symbol);

    const cacheKey = `upstox_quotes_${targetSymbols.slice().sort().join('_')}`;
    const cached = globalMarketCache.get<StockQuote[]>(cacheKey);
    if (cached) return cached;

    // Filter target symbols to valid Upstox instruments
    const validSymbols: string[] = [];
    const validEncodedKeys: string[] = [];

    for (const sym of targetSymbols) {
      const key = getUpstoxInstrumentKey(sym);
      // Valid Upstox key must be from our verified map or standard ISIN/Index format
      if (NSE_INSTRUMENT_MAP[sym] || /^NSE_(EQ\|INE[A-Z0-9]{9}|INDEX\|.+)$/.test(key)) {
        validSymbols.push(sym);
        validEncodedKeys.push(encodeURIComponent(key));
      }
    }

    // If no valid Upstox keys exist, fall back to demonstration/fallback quotes directly without an invalid network call
    if (validEncodedKeys.length === 0) {
      const demoProvider = new DemonstrationMarketProvider();
      return demoProvider.getQuotes(targetSymbols);
    }

    try {
      // Upstox API v2 requires comma-separated keys with special characters like '|' encoded as '%7C' (not encoding the comma)
      const instrumentParam = validEncodedKeys.join(',');
      const res = await fetch(`https://api.upstox.com/v2/market-quote/quotes?instrument_key=${instrumentParam}`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (res.status === 401) {
        this.lastError = 'HTTP 401: Invalid or expired Upstox access token';
        throw new Error(this.lastError);
      }

      if (res.status === 429) {
        this.lastError = 'HTTP 429: Upstox API rate limit reached (50 requests/sec)';
        throw new Error(this.lastError);
      }

      if (!res.ok) {
        let details = '';
        try {
          const errBody = await res.json();
          details = errBody.message || (errBody.errors && JSON.stringify(errBody.errors)) || '';
        } catch {
          details = res.statusText;
        }
        this.lastError = `Upstox API returned status ${res.status}: ${details || res.statusText}`;
        throw new Error(this.lastError);
      }

      const json = await res.json();
      this.lastTickMs = Date.now();
      this.lastError = null;

      const results: StockQuote[] = [];
      const dataObj = json.data || {};

      for (const symbol of targetSymbols) {
        const isinKey = getUpstoxInstrumentKey(symbol).replace('|', ':');
        const symKey = `NSE_EQ:${symbol}`;
        const item = dataObj[isinKey] || dataObj[symKey];
        const fallback = MOCK_STOCKS.find(s => s.symbol === symbol) || MOCK_STOCKS[0];

        if (item) {
          const lastPrice = item.last_price || fallback.lastPrice;
          const netChange = typeof item.net_change === 'number' ? item.net_change : null;
          const prevClose = netChange !== null
            ? Number((lastPrice - netChange).toFixed(2))
            : item.ohlc?.close || fallback.previousClose;
          const change = netChange !== null ? Number(netChange.toFixed(2)) : Number((lastPrice - prevClose).toFixed(2));
          const changePercent = prevClose > 0 ? Number(((change / prevClose) * 100).toFixed(2)) : 0;
          const open = item.ohlc?.open || fallback.open;
          const dayHigh = item.ohlc?.high || fallback.dayHigh;
          const dayLow = item.ohlc?.low || fallback.dayLow;
          const volume = item.volume || fallback.volume;

          results.push({
            ...fallback,
            symbol,
            lastPrice,
            previousClose: prevClose,
            open,
            dayHigh,
            dayLow,
            change,
            changePercent,
            volume,
            isDemoData: false,
            demoNotice: undefined,
            feedStatus: 'LIVE',
            lastUpdated: new Date().toLocaleTimeString('en-IN') + ' IST',
            dataSource: 'Upstox Developer API v2 (NSE Live)'
          });
        } else {
          // If a particular symbol wasn't returned in the Upstox response
          results.push({
            ...fallback,
            symbol,
            isDemoData: true,
            demoNotice: DEMO_DATA_NOTICE,
            feedStatus: 'SIMULATED',
            dataSource: 'Synthetic Demonstration Feed'
          });
        }
      }

      globalMarketCache.set(cacheKey, results, 5); // 5-second quote cache
      return results;
    } catch (err) {
      console.warn('Upstox quote retrieval failed, falling back to demonstration provider:', err);
      const demoProvider = new DemonstrationMarketProvider();
      return demoProvider.getQuotes(targetSymbols);
    }
  }

  async getCandles(symbol: string, timeframe: TimeFrame, count = 60): Promise<OHLCVCandle[]> {
    if (!this.isConfigured) {
      const demoProvider = new DemonstrationMarketProvider();
      return demoProvider.getCandles(symbol, timeframe, count);
    }

    const cacheKey = `upstox_candles_${symbol}_${timeframe}_${count}`;
    const cached = globalMarketCache.get<OHLCVCandle[]>(cacheKey);
    if (cached) return cached;

    const fallbackStock = MOCK_STOCKS.find(s => s.symbol === symbol) || MOCK_STOCKS[0];
    const defaultCandles = fallbackStock.candles1D.slice(-count);

    try {
      const instrumentKey = getUpstoxInstrumentKey(symbol);
      const interval = timeframe === '1D' ? 'day' : timeframe === '1W' ? 'week' : '30minute';
      const toDate = new Date().toISOString().split('T')[0];
      const fromDate = new Date(Date.now() - count * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const url = `https://api.upstox.com/v2/historical-candle/${encodeURIComponent(instrumentKey)}/${interval}/${toDate}/${fromDate}`;
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (res.status === 401) {
        this.lastError = 'HTTP 401: Invalid or expired Upstox access token';
        throw new Error(this.lastError);
      }

      if (!res.ok) {
        throw new Error(`Upstox Historical API status ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      const rawCandles = json.data?.candles || [];

      // Upstox returns candles descending (most recent first); reverse to chronological ascending
      const formatted: OHLCVCandle[] = rawCandles.map((c: [string, number, number, number, number, number]) => {
        const d = new Date(c[0]);
        const dateStr = d.toISOString().split('T')[0];
        return {
          timestamp: dateStr,
          timeUnix: Math.floor(d.getTime() / 1000),
          open: Number(c[1].toFixed(2)),
          high: Number(c[2].toFixed(2)),
          low: Number(c[3].toFixed(2)),
          close: Number(c[4].toFixed(2)),
          volume: Math.round(c[5])
        };
      }).reverse();

      const validation = validateMarketCandles(formatted);
      if (validation.isValid && validation.sanitized.length > 0) {
        globalMarketCache.set(cacheKey, validation.sanitized, 60);
        return validation.sanitized;
      }

      return defaultCandles;
    } catch (err) {
      console.warn(`Upstox candle fetch failed for ${symbol}, using demo candles:`, err);
      return defaultCandles;
    }
  }

  async getIndices(): Promise<MarketIndexSummary[]> {
    if (!this.isConfigured) {
      const demoProvider = new DemonstrationMarketProvider();
      return demoProvider.getIndices();
    }

    try {
      const niftyKey = encodeURIComponent(getUpstoxInstrumentKey('NIFTY'));
      const bankKey = encodeURIComponent(getUpstoxInstrumentKey('BANKNIFTY'));
      const res = await fetch(`https://api.upstox.com/v2/market-quote/quotes?instrument_key=${niftyKey},${bankKey}`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const dataObj = json.data || {};

      const niftyData = dataObj['NSE_INDEX:Nifty 50'];
      const bankData = dataObj['NSE_INDEX:Nifty Bank'];

      const fallbackIndices = new DemonstrationMarketProvider();
      const defaultList = await fallbackIndices.getIndices();

      if (niftyData || bankData) {
        return defaultList.map(idx => {
          const item = idx.symbol === 'NIFTY' ? niftyData : idx.symbol === 'BANKNIFTY' ? bankData : null;
          if (item) {
            const lastPrice = item.last_price || idx.lastPrice;
            const netChange = typeof item.net_change === 'number' ? item.net_change : null;
            const prevClose = item.ohlc?.close && item.ohlc.close > 0
              ? item.ohlc.close
              : netChange !== null
              ? Number((lastPrice - netChange).toFixed(2))
              : (lastPrice - idx.change);
            const change = netChange !== null ? Number(netChange.toFixed(2)) : Number((lastPrice - prevClose).toFixed(2));
            const changePercent = prevClose > 0 ? Number(((change / prevClose) * 100).toFixed(2)) : 0;

            return {
              ...idx,
              lastPrice,
              change,
              changePercent,
              dayHigh: item.ohlc?.high || idx.dayHigh,
              dayLow: item.ohlc?.low || idx.dayLow,
              isDemoData: false,
              demoNotice: undefined,
              feedStatus: 'LIVE' as const,
              dataSource: 'Upstox Developer API v2 (NSE)',
              lastUpdated: new Date().toLocaleTimeString('en-IN') + ' IST'
            };
          }
          return idx;
        });
      }

      return defaultList;
    } catch (_err) {
      const demoProvider = new DemonstrationMarketProvider();
      return demoProvider.getIndices();
    }
  }
}

export interface UpstoxSessionStatus {
  isConnected: boolean;
  source: 'memory_session' | 'env_variable' | 'none';
  connectedAt: string | null;
  error: string | null;
  verifiedSymbol?: string;
  samplePrice?: number;
}

/**
 * Server-side volatile memory session manager for Upstox Access Token.
 * Held strictly in server process memory — never written to disk, database, or client storage.
 */
export class UpstoxSessionManager {
  private static memoryToken: string | null = null;
  private static tokenConnectedAt: string | null = null;
  private static lastVerificationError: string | null = null;
  private static verifiedSymbol: string | null = null;
  private static samplePrice: number | null = null;

  static setToken(token: string, verifiedSymbol = 'RELIANCE', samplePrice?: number): void {
    UpstoxSessionManager.memoryToken = token.trim();
    UpstoxSessionManager.tokenConnectedAt = new Date().toISOString();
    UpstoxSessionManager.lastVerificationError = null;
    UpstoxSessionManager.verifiedSymbol = verifiedSymbol;
    UpstoxSessionManager.samplePrice = samplePrice ?? null;
    globalMarketCache.clear();
  }

  static clearToken(): void {
    UpstoxSessionManager.memoryToken = null;
    UpstoxSessionManager.tokenConnectedAt = null;
    UpstoxSessionManager.lastVerificationError = null;
    UpstoxSessionManager.verifiedSymbol = null;
    UpstoxSessionManager.samplePrice = null;
    globalMarketCache.clear();
  }

  static getToken(fallbackToken?: string): string | null {
    if (UpstoxSessionManager.memoryToken && UpstoxSessionManager.memoryToken.trim() !== '') {
      return UpstoxSessionManager.memoryToken;
    }
    const token = fallbackToken || (typeof process !== 'undefined' ? process.env?.UPSTOX_ACCESS_TOKEN : undefined);
    if (token && token.trim() !== '') {
      return token.trim();
    }
    return null;
  }

  static isConnected(fallbackToken?: string): boolean {
    const token = UpstoxSessionManager.getToken(fallbackToken);
    return Boolean(token && token.length >= 10);
  }

  static getStatusInfo(fallbackToken?: string): UpstoxSessionStatus {
    if (UpstoxSessionManager.memoryToken) {
      return {
        isConnected: true,
        source: 'memory_session',
        connectedAt: UpstoxSessionManager.tokenConnectedAt,
        error: UpstoxSessionManager.lastVerificationError,
        verifiedSymbol: UpstoxSessionManager.verifiedSymbol || undefined,
        samplePrice: UpstoxSessionManager.samplePrice || undefined
      };
    }
    const token = fallbackToken || (typeof process !== 'undefined' ? process.env?.UPSTOX_ACCESS_TOKEN : undefined);
    if (token && token.trim() !== '') {
      return {
        isConnected: true,
        source: 'env_variable',
        connectedAt: null,
        error: null,
        verifiedSymbol: 'RELIANCE'
      };
    }
    return {
      isConnected: false,
      source: 'none',
      connectedAt: null,
      error: UpstoxSessionManager.lastVerificationError
    };
  }

  static setVerificationError(err: string): void {
    UpstoxSessionManager.lastVerificationError = err;
  }
}

/**
 * Validates and verifies an Upstox access token against the live Upstox API v2.
 * Redacts tokens from all error messages and diagnostics.
 */
export async function verifyUpstoxToken(token: string): Promise<{
  success: boolean;
  message: string;
  sampleData?: { symbol: string; lastPrice: number; dayHigh: number; dayLow: number };
}> {
  if (!token || typeof token !== 'string' || token.trim().length < 10) {
    return {
      success: false,
      message: 'Token verification failed: Token is empty or too short to be a valid Upstox Access Token.'
    };
  }

  const cleanToken = token.trim();

  try {
    const instrumentKey = getUpstoxInstrumentKey('RELIANCE');
    const res = await fetch(`https://api.upstox.com/v2/market-quote/quotes?instrument_key=${encodeURIComponent(instrumentKey)}`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${cleanToken}`
      }
    });

    if (res.status === 401) {
      return {
        success: false,
        message: 'Upstox verification failed (HTTP 401 Unauthorized): Invalid, expired, or revoked access token.'
      };
    }

    if (res.status === 429) {
      return {
        success: false,
        message: 'Upstox rate limit reached (HTTP 429). Please wait a few seconds and retry.'
      };
    }

    if (!res.ok) {
      return {
        success: false,
        message: `Upstox API responded with HTTP status ${res.status}: ${res.statusText}`
      };
    }

    const json = await res.json();
    const dataObj = json.data || {};
    const item = dataObj['NSE_EQ:INE002A01018'] || dataObj['NSE_EQ:RELIANCE'];

    if (!item || typeof item.last_price !== 'number') {
      return {
        success: false,
        message: 'Upstox API responded, but quote data format was invalid or missing expected price fields.'
      };
    }

    return {
      success: true,
      message: 'Verified successfully! Active connection established to Upstox Developer API v2 (NSE).',
      sampleData: {
        symbol: 'RELIANCE',
        lastPrice: item.last_price,
        dayHigh: item.ohlc?.high || item.last_price,
        dayLow: item.ohlc?.low || item.last_price
      }
    };
  } catch (err) {
    const rawError = err instanceof Error ? err.message : String(err);
    // Strict redaction of token from any error string
    const sanitizedError = rawError.split(cleanToken).join('[REDACTED_TOKEN]');
    return {
      success: false,
      message: `Connection test failed: ${sanitizedError}`
    };
  }
}

export interface ServerEnvironmentConfig {
  UPSTOX_ACCESS_TOKEN?: string;
  MARKET_DATA_PROVIDER?: string;
}

/**
 * Returns market data provider instance.
 * Dynamically prioritizes in-memory Upstox session, then environment variable, defaulting to Demonstration Provider.
 */
export function getMarketDataProvider(env?: ServerEnvironmentConfig): IMarketDataProvider {
  const token = UpstoxSessionManager.getToken(env?.UPSTOX_ACCESS_TOKEN);

  if (token && token.trim() !== '') {
    return new UpstoxMarketProvider(token);
  }

  // Default: Demonstration mode with synthetic demonstration data
  return new DemonstrationMarketProvider();
}

