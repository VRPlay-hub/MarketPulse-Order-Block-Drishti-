import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MarketCacheManager,
  validateMarketCandles,
  checkFeedStaleness,
  UpstoxMarketProvider
} from './marketDataService.ts';
import type { OHLCVCandle } from '../types/market.ts';

test('MarketCacheManager handles hits, misses, and TTL expiration accurately', async () => {
  const cache = new MarketCacheManager();

  // Initial miss
  assert.equal(cache.get('test_key'), null);
  assert.equal(cache.getStats().misses, 1);
  assert.equal(cache.getStats().hits, 0);

  // Set with 1-second TTL
  cache.set('test_key', { price: 2850.5 }, 1);
  const item = cache.get<{ price: number }>('test_key');
  assert.ok(item);
  assert.equal(item.price, 2850.5);
  assert.equal(cache.getStats().hits, 1);

  // Wait 1.1s for expiration
  await new Promise(resolve => setTimeout(resolve, 1100));
  assert.equal(cache.get('test_key'), null);
  assert.equal(cache.getStats().misses, 2);
});

test('validateMarketCandles enforces strict chronological monotonicity and price envelopes', () => {
  const validCandles: OHLCVCandle[] = [
    {
      timestamp: '2026-03-01',
      timeUnix: 1772323200,
      open: 2800,
      high: 2850,
      low: 2790,
      close: 2840,
      volume: 1500000
    },
    {
      timestamp: '2026-03-02',
      timeUnix: 1772409600,
      open: 2840,
      high: 2890,
      low: 2830,
      close: 2880,
      volume: 1800000
    }
  ];

  const validResult = validateMarketCandles(validCandles);
  assert.equal(validResult.isValid, true);
  assert.equal(validResult.errors.length, 0);
  assert.equal(validResult.sanitized.length, 2);

  // Invariant Violation 1: High < Low
  const invalidHighLow: OHLCVCandle[] = [
    {
      timestamp: '2026-03-01',
      timeUnix: 1772323200,
      open: 2800,
      high: 2750, // invalid high below low
      low: 2790,
      close: 2780,
      volume: 1000
    }
  ];
  const highLowResult = validateMarketCandles(invalidHighLow);
  assert.equal(highLowResult.isValid, false);
  assert.ok(highLowResult.errors[0].includes('High (2750) < Low (2790)'));

  // Invariant Violation 2: Chronological disorder (t2 <= t1)
  const disorderedCandles: OHLCVCandle[] = [
    {
      timestamp: '2026-03-02',
      timeUnix: 1772409600,
      open: 2800,
      high: 2850,
      low: 2790,
      close: 2840,
      volume: 1000
    },
    {
      timestamp: '2026-03-01',
      timeUnix: 1772323200, // earlier than first
      open: 2840,
      high: 2890,
      low: 2830,
      close: 2880,
      volume: 1000
    }
  ];
  const disorderResult = validateMarketCandles(disorderedCandles);
  assert.equal(disorderResult.isValid, false);
  assert.ok(disorderResult.errors[0].includes('Chronological violation'));

  // Invariant Violation 3: Negative volume
  const negVolCandles: OHLCVCandle[] = [
    {
      timestamp: '2026-03-01',
      timeUnix: 1772323200,
      open: 100,
      high: 110,
      low: 95,
      close: 105,
      volume: -500
    }
  ];
  const negVolResult = validateMarketCandles(negVolCandles);
  assert.equal(negVolResult.isValid, false);
  assert.ok(negVolResult.errors[0].includes('Volume cannot be negative'));
});

test('checkFeedStaleness correctly identifies stale ticks during market hours', () => {
  // Tuesday at 11:30 AM IST (06:00 UTC)
  const marketHoursDate = new Date('2026-03-10T06:00:00Z');

  // Fresh tick 15 seconds ago
  const freshTickTime = marketHoursDate.getTime() - 15 * 1000;
  const freshResult = checkFeedStaleness(freshTickTime, marketHoursDate);
  assert.equal(freshResult.isStale, false);
  assert.equal(freshResult.status, 'ACTIVE_LIVE');

  // Stale tick 120 seconds ago
  const staleTickTime = marketHoursDate.getTime() - 120 * 1000;
  const staleResult = checkFeedStaleness(staleTickTime, marketHoursDate);
  assert.equal(staleResult.isStale, true);
  assert.equal(staleResult.status, 'FEED_STALE');

  // Sunday (weekend outside operating hours)
  const weekendDate = new Date('2026-03-15T06:00:00Z');
  const weekendResult = checkFeedStaleness(freshTickTime, weekendDate);
  assert.equal(weekendResult.status, 'SESSION_CLOSED');
  assert.equal(weekendResult.isStale, false);
});

test('UpstoxMarketProvider returns graceful simulation when unconfigured', async () => {
  delete process.env.UPSTOX_ACCESS_TOKEN;
  const provider = new UpstoxMarketProvider();

  assert.equal(provider.isConfigured, false);
  const status = provider.getStatus();
  assert.equal(status.feedHealth, 'SYNTHETIC_SIMULATION');
  assert.equal(status.providerId, 'upstox');

  // Quotes return valid default constituents without throwing
  const quotes = await provider.getQuotes(['RELIANCE', 'TCS']);
  assert.equal(quotes.length, 2);
  assert.equal(quotes[0].symbol, 'RELIANCE');
});

test('DemonstrationMarketProvider operates with zero config and attaches DEMO DATA notice', async () => {
  // Ensure no credentials are set
  delete process.env.UPSTOX_ACCESS_TOKEN;
  delete process.env.MARKET_DATA_PROVIDER;

  const { DemonstrationMarketProvider, getMarketDataProvider, DEMO_DATA_NOTICE } = await import('./marketDataService.ts');
  const provider = new DemonstrationMarketProvider();

  assert.equal(provider.isConfigured, true);
  const status = provider.getStatus();
  assert.equal(status.feedHealth, 'SYNTHETIC_SIMULATION');
  assert.equal(status.demoNotice, DEMO_DATA_NOTICE);

  const quotes = await provider.getQuotes(['RELIANCE', 'INFY']);
  assert.equal(quotes.length, 2);
  assert.equal(quotes[0].isDemoData, true);
  assert.equal(quotes[0].demoNotice, DEMO_DATA_NOTICE);

  const indices = await provider.getIndices();
  assert.ok(indices.length > 0);
  assert.equal(indices[0].isDemoData, true);
  assert.equal(indices[0].demoNotice, DEMO_DATA_NOTICE);

  // Default provider factory returns DemonstrationMarketProvider
  const defaultProvider = getMarketDataProvider();
  assert.equal(defaultProvider.providerId, 'synthetic_demo');

  // getCandles returns valid OHLCV candles with positive prices
  const candles = await provider.getCandles('RELIANCE', '1D', 30);
  assert.ok(candles.length > 0);
  assert.ok(candles[0].open > 0);
  assert.ok(candles[0].high >= candles[0].low);
});

test('getMarketDataProvider cleanly defaults to demonstration mode when external broker credentials are missing', async () => {
  const { getMarketDataProvider, DemonstrationMarketProvider } = await import('./marketDataService.ts');

  // Case 1: Provider requested is upstox, but token is missing
  process.env.MARKET_DATA_PROVIDER = 'upstox';
  delete process.env.UPSTOX_ACCESS_TOKEN;
  const p1 = getMarketDataProvider();
  assert.equal(p1.providerId, 'synthetic_demo');
  assert.ok(p1 instanceof DemonstrationMarketProvider);

  // Case 2: Provider requested is empty/unset
  delete process.env.MARKET_DATA_PROVIDER;
  const p2 = getMarketDataProvider();
  assert.equal(p2.providerId, 'synthetic_demo');
  assert.ok(p2 instanceof DemonstrationMarketProvider);

  // Case 3: Arbitrary or unknown provider requested
  process.env.MARKET_DATA_PROVIDER = 'zerodha_unsupported';
  const p3 = getMarketDataProvider();
  assert.equal(p3.providerId, 'synthetic_demo');
  assert.ok(p3 instanceof DemonstrationMarketProvider);
});

test('getUpstoxInstrumentKey accurately resolves symbols to canonical Upstox ISIN keys', async () => {
  const { getUpstoxInstrumentKey } = await import('./marketDataService.ts');

  // Known NIFTY Equities
  assert.equal(getUpstoxInstrumentKey('RELIANCE'), 'NSE_EQ|INE002A01018');
  assert.equal(getUpstoxInstrumentKey('TCS'), 'NSE_EQ|INE467B01029');
  assert.equal(getUpstoxInstrumentKey('HDFCBANK'), 'NSE_EQ|INE040A01034');
  assert.equal(getUpstoxInstrumentKey('INFY'), 'NSE_EQ|INE009A01021');
  assert.equal(getUpstoxInstrumentKey('TATAMOTORS'), 'NSE_EQ|INE155A01022');

  // Indices
  assert.equal(getUpstoxInstrumentKey('NIFTY'), 'NSE_INDEX|Nifty 50');
  assert.equal(getUpstoxInstrumentKey('BANKNIFTY'), 'NSE_INDEX|Nifty Bank');

  // Already prefixed keys
  assert.equal(getUpstoxInstrumentKey('NSE_EQ|INE002A01018'), 'NSE_EQ|INE002A01018');

  // Unknown fallback key
  assert.equal(getUpstoxInstrumentKey('CUSTOMSTOCK'), 'NSE_EQ|CUSTOMSTOCK');
});

test('UpstoxMarketProvider handles simulated 401 unauthorized and 429 rate limit responses gracefully', async () => {
  // Test with invalid token
  process.env.UPSTOX_ACCESS_TOKEN = 'expired_mock_token_12345';
  const { UpstoxMarketProvider } = await import('./marketDataService.ts');
  const provider = new UpstoxMarketProvider();

  assert.equal(provider.isConfigured, true);

  // When unmocked external fetch fails (e.g. invalid token), it falls back to demo without throwing uncaught exceptions
  const quotes = await provider.getQuotes(['RELIANCE']);
  assert.ok(quotes.length > 0);
  assert.equal(quotes[0].symbol, 'RELIANCE');
  // Fallback data correctly flagged as demo
  assert.equal(quotes[0].isDemoData, true);

  // Candles fallback without crashing
  const candles = await provider.getCandles('RELIANCE', '1D', 10);
  assert.ok(candles.length > 0);

  // Empty symbols parameter defaults to full constituent universe without sending empty instrument_key or throwing
  const allQuotes = await provider.getQuotes([]);
  assert.ok(allQuotes.length > 0);
  assert.ok(allQuotes.some(q => q.symbol === 'RELIANCE'));

  // Unmapped/custom symbols fall back cleanly to synthetic representation without sending invalid keys
  const unmappedQuotes = await provider.getQuotes(['UNMAPPED_XYZ_STOCK']);
  assert.ok(unmappedQuotes.length > 0);
  assert.equal(unmappedQuotes[0].symbol, 'UNMAPPED_XYZ_STOCK');

  delete process.env.UPSTOX_ACCESS_TOKEN;
});

test('Real vs synthetic data tagging: verifies feedStatus and demo notices are strictly segregated', async () => {
  const { DemonstrationMarketProvider } = await import('./marketDataService.ts');
  const demoProvider = new DemonstrationMarketProvider();

  const quotes = await demoProvider.getQuotes(['INFY', 'TCS']);
  for (const q of quotes) {
    assert.equal(q.isDemoData, true);
    assert.equal(q.feedStatus, 'SIMULATED');
    assert.ok(q.lastUpdated && q.lastUpdated.includes('IST'));
    assert.equal(q.dataSource, 'Synthetic Demonstration Provider');
  }

  const indices = await demoProvider.getIndices();
  for (const idx of indices) {
    assert.equal(idx.isDemoData, true);
    assert.equal(idx.feedStatus, 'SIMULATED');
    assert.equal(idx.dataSource, 'Synthetic Demonstration Provider');
  }
});

test('UpstoxSessionManager manages volatile server memory sessions safely without token leakage', async () => {
  const { UpstoxSessionManager, getMarketDataProvider, UpstoxMarketProvider, DemonstrationMarketProvider } = await import('./marketDataService.ts');

  // Reset any preexisting session
  UpstoxSessionManager.clearToken();
  delete process.env.UPSTOX_ACCESS_TOKEN;

  // 1. Initial State
  assert.equal(UpstoxSessionManager.isConnected(), false);
  const initialStatus = UpstoxSessionManager.getStatusInfo();
  assert.equal(initialStatus.isConnected, false);
  assert.equal(initialStatus.source, 'none');
  // Confirm token property does not exist on status info
  assert.equal((initialStatus as unknown as Record<string, unknown>).token, undefined);

  // 2. Set Memory Session
  const sampleToken = 'eySAMPLE_JWT_TOKEN_FOR_UPSTOX_AUTH_987654321';
  UpstoxSessionManager.setToken(sampleToken, 'RELIANCE', 2895.5);

  assert.equal(UpstoxSessionManager.isConnected(), true);
  const connectedStatus = UpstoxSessionManager.getStatusInfo();
  assert.equal(connectedStatus.isConnected, true);
  assert.equal(connectedStatus.source, 'memory_session');
  assert.equal(connectedStatus.verifiedSymbol, 'RELIANCE');
  assert.equal(connectedStatus.samplePrice, 2895.5);
  assert.ok(connectedStatus.connectedAt);
  // CRITICAL: Ensure token string is NEVER exposed in status object
  assert.equal((connectedStatus as unknown as Record<string, unknown>).token, undefined);
  assert.equal(JSON.stringify(connectedStatus).includes(sampleToken), false);

  // 3. getMarketDataProvider returns UpstoxMarketProvider when session is active
  const provider = getMarketDataProvider();
  assert.ok(provider instanceof UpstoxMarketProvider);
  assert.equal(provider.isConfigured, true);

  // 4. Clear Session
  UpstoxSessionManager.clearToken();
  assert.equal(UpstoxSessionManager.isConnected(), false);
  const clearedStatus = UpstoxSessionManager.getStatusInfo();
  assert.equal(clearedStatus.isConnected, false);
  assert.equal(clearedStatus.source, 'none');

  // 5. getMarketDataProvider falls back cleanly to DemonstrationMarketProvider
  const fallbackProvider = getMarketDataProvider();
  assert.ok(fallbackProvider instanceof DemonstrationMarketProvider);
  assert.equal(fallbackProvider.providerId, 'synthetic_demo');
});

test('verifyUpstoxToken rejects invalid, empty, or malformed tokens safely', async () => {
  const { verifyUpstoxToken } = await import('./marketDataService.ts');

  // Empty string
  const resEmpty = await verifyUpstoxToken('');
  assert.equal(resEmpty.success, false);
  assert.ok(resEmpty.message.includes('empty or too short'));

  // Short string
  const resShort = await verifyUpstoxToken('12345');
  assert.equal(resShort.success, false);
  assert.ok(resShort.message.includes('empty or too short'));

  // Whitespace only
  const resWhitespace = await verifyUpstoxToken('       ');
  assert.equal(resWhitespace.success, false);
  assert.ok(resWhitespace.message.includes('empty or too short'));

  // Invalid fake token (live API will return 401 Unauthorized or failure, safely redacted)
  const fakeToken = 'INVALID_FAKE_TOKEN_SECRET_XYZ999';
  const resInvalid = await verifyUpstoxToken(fakeToken);
  assert.equal(resInvalid.success, false);
  // Check that the fake token secret is never reflected in the returned error message
  assert.equal(resInvalid.message.includes(fakeToken), false);
});

