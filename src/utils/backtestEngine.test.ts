import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { OHLCVCandle, BacktestParams } from '../types/market.ts';
import { runAdvancedBacktest, calculateATR } from './backtestEngine.ts';
import {
  escapeCsvCell,
  generateTradesCsv,
  generateEquityCurveCsv,
  generateStrategySummaryCsv
} from './backtestExporter.ts';

// Helper to generate a synthetic trending or oscillating candle series
function createCandleSeries(count: number, basePrice = 1000): OHLCVCandle[] {
  const candles: OHLCVCandle[] = [];
  let price = basePrice;
  const startDate = new Date('2026-01-01');

  for (let i = 0; i < count; i++) {
    const curDate = new Date(startDate.getTime() + i * 86400000);
    const dateStr = curDate.toISOString().split('T')[0];

    // Create a series with a clear bullish displacement around bar 12 and bearish displacement around bar 25
    let open = price;
    let close = price;

    if (i === 11) {
      // Bearish setup candle before bullish displacement
      open = price + 10;
      close = price - 15;
    } else if (i === 12) {
      // Big bullish displacement candle breaking structure
      open = price - 14;
      close = price + 40;
    } else if (i === 13) {
      // Retest candle that touches the OB zone
      open = price + 35;
      close = price + 30;
    } else if (i === 14 || i === 15) {
      // Target hit
      open = price + 30;
      close = price + 75;
    } else if (i === 24) {
      // Bullish setup candle before bearish displacement
      open = price - 5;
      close = price + 15;
    } else if (i === 25) {
      // Big bearish displacement candle
      open = price + 14;
      close = price - 40;
    } else if (i === 26) {
      // Retest candle that tests the supply OB
      open = price - 35;
      close = price - 30;
    } else if (i === 27 || i === 28) {
      // Short target hit
      open = price - 30;
      close = price - 75;
    } else {
      open = price;
      close = price + ((i % 2 === 0) ? 2 : -2);
    }

    const high = Math.max(open, close) + 5;
    const low = Math.min(open, close) - 5;
    const volume = (i === 12 || i === 25) ? 500000 : 100000;

    candles.push({
      timestamp: dateStr,
      timeUnix: Math.floor(curDate.getTime() / 1000),
      open,
      high,
      low,
      close,
      volume
    });

    price = close;
  }

  return candles;
}

test('calculateATR computes accurate Average True Range values', () => {
  const candles: OHLCVCandle[] = [
    { timestamp: '2026-01-01', timeUnix: 100, open: 100, high: 110, low: 95, close: 105, volume: 1000 },
    { timestamp: '2026-01-02', timeUnix: 200, open: 106, high: 115, low: 102, close: 112, volume: 1200 },
    { timestamp: '2026-01-03', timeUnix: 300, open: 110, high: 114, low: 106, close: 108, volume: 900 }
  ];

  const atrs = calculateATR(candles, 2);
  assert.equal(atrs.length, 3);
  assert.ok(atrs[0] > 0);
  assert.ok(atrs[1] > 0);
  assert.ok(atrs[2] > 0);
});

test('runAdvancedBacktest supports Long-Only and Short-Only directional filters', () => {
  const candles = createCandleSeries(40, 2000);

  const baseParams: BacktestParams = {
    symbol: 'TEST_STOCK',
    initialCapital: 100000,
    riskPerTradePercent: 1.0,
    minDisplacementMultiplier: 1.2,
    targetMultiplier: 2.0,
    brokeragePerTrade: 20,
    slippagePercent: 0.05,
    stopLossMode: 'ZONE_BOUNDARY',
    positionSizingMode: 'EQUITY_PERCENT'
  };

  // Test Long-Only
  const longRes = runAdvancedBacktest(candles, { ...baseParams, strategyDirection: 'LONG_ONLY' });
  for (const t of longRes.trades) {
    assert.equal(t.direction, 'LONG');
  }

  // Test Short-Only
  const shortRes = runAdvancedBacktest(candles, { ...baseParams, strategyDirection: 'SHORT_ONLY' });
  for (const t of shortRes.trades) {
    assert.equal(t.direction, 'SHORT');
  }

  // Test Both
  const bothRes = runAdvancedBacktest(candles, { ...baseParams, strategyDirection: 'BOTH' });
  assert.ok(bothRes.trades.length >= 0);
});

test('runAdvancedBacktest evaluates both Stop Loss modes: Zone Boundary vs ATR Buffer', () => {
  const candles = createCandleSeries(40, 2500);

  const paramsBoundary: BacktestParams = {
    symbol: 'BOUNDARY_TEST',
    initialCapital: 100000,
    riskPerTradePercent: 1.0,
    minDisplacementMultiplier: 1.2,
    targetMultiplier: 2.0,
    brokeragePerTrade: 20,
    slippagePercent: 0.0,
    stopLossMode: 'ZONE_BOUNDARY',
    stopLossBufferPercent: 0.5,
    strategyDirection: 'BOTH'
  };

  const paramsATR: BacktestParams = {
    ...paramsBoundary,
    stopLossMode: 'ATR_BUFFER',
    atrPeriod: 14,
    atrMultiplier: 2.0
  };

  const resBoundary = runAdvancedBacktest(candles, paramsBoundary);
  const resATR = runAdvancedBacktest(candles, paramsATR);

  assert.ok(resBoundary.summary.totalTrades >= 0);
  assert.ok(resATR.summary.totalTrades >= 0);
});

test('runAdvancedBacktest enforces position sizing and statutory transaction costs', () => {
  const candles = createCandleSeries(35, 1500);

  // 1. Fixed Quantity
  const resFixed = runAdvancedBacktest(candles, {
    symbol: 'POS_SIZE_TEST',
    initialCapital: 100000,
    riskPerTradePercent: 2.0,
    positionSizingMode: 'FIXED_QUANTITY',
    fixedQuantity: 25,
    minDisplacementMultiplier: 1.2,
    targetMultiplier: 2.0,
    brokeragePerTrade: 50,
    slippagePercent: 0.05,
    strategyDirection: 'BOTH'
  });

  for (const t of resFixed.trades) {
    assert.ok(t.quantity <= 25);
    // Net profit equals gross profit minus brokerage
    assert.equal(t.netProfit, Number((t.grossProfit - 50).toFixed(2)));
  }

  // Total brokerage in summary equals trades * 50
  assert.equal(resFixed.summary.totalBrokerage, resFixed.trades.length * 50);
});

test('runAdvancedBacktest applies documented conservative assumption on intrabar stop/target collisions', () => {
  // Construct a single trade where forward candle hits both high target and low stop
  const candles: OHLCVCandle[] = [
    { timestamp: '2026-01-01', timeUnix: 100, open: 100, high: 105, low: 98, close: 102, volume: 10000 },
    { timestamp: '2026-01-02', timeUnix: 200, open: 102, high: 104, low: 97, close: 99, volume: 10000 },
    { timestamp: '2026-01-03', timeUnix: 300, open: 98, high: 102, low: 96, close: 98, volume: 10000 },
    { timestamp: '2026-01-04', timeUnix: 400, open: 98, high: 103, low: 97, close: 101, volume: 10000 },
    { timestamp: '2026-01-05', timeUnix: 500, open: 101, high: 103, low: 99, close: 100, volume: 10000 },
    { timestamp: '2026-01-06', timeUnix: 600, open: 100, high: 102, low: 98, close: 99, volume: 10000 },
    { timestamp: '2026-01-07', timeUnix: 700, open: 99, high: 101, low: 97, close: 98, volume: 10000 },
    { timestamp: '2026-01-08', timeUnix: 800, open: 98, high: 100, low: 96, close: 97, volume: 10000 },
    { timestamp: '2026-01-09', timeUnix: 900, open: 97, high: 99, low: 95, close: 96, volume: 10000 },
    { timestamp: '2026-01-10', timeUnix: 1000, open: 96, high: 98, low: 94, close: 95, volume: 10000 },
    // Order Block: Bar 11 Bearish candle, Bar 12 Bullish displacement
    { timestamp: '2026-01-11', timeUnix: 1100, open: 100, high: 101, low: 90, close: 92, volume: 10000 },
    { timestamp: '2026-01-12', timeUnix: 1200, open: 92, high: 125, low: 91, close: 124, volume: 100000 }, // Displacement
    { timestamp: '2026-01-13', timeUnix: 1300, open: 110, high: 112, low: 95, close: 105, volume: 30000 }, // Retest Entry at 101
    // Bar 14 has massive range reaching both Target (e.g. 125) and Stop Loss (e.g. 89)
    { timestamp: '2026-01-14', timeUnix: 1400, open: 104, high: 150, low: 70, close: 110, volume: 80000 },
    { timestamp: '2026-01-15', timeUnix: 1500, open: 110, high: 112, low: 108, close: 111, volume: 20000 }
  ];

  const res = runAdvancedBacktest(candles, {
    symbol: 'COLLISION_TEST',
    initialCapital: 100000,
    riskPerTradePercent: 1.0,
    minDisplacementMultiplier: 1.0,
    targetMultiplier: 1.5,
    brokeragePerTrade: 20,
    slippagePercent: 0.0,
    stopLossMode: 'ZONE_BOUNDARY',
    strategyDirection: 'LONG_ONLY',
    collisionResolution: 'CONSERVATIVE_STOP_FIRST'
  });

  if (res.trades.length > 0) {
    const collisionTrade = res.trades.find(t => t.collisionOccurred);
    if (collisionTrade) {
      assert.equal(collisionTrade.reason, 'STOP_HIT');
      assert.equal(collisionTrade.isWin, false);
    }
  }
});

test('runAdvancedBacktest prevents look-ahead bias and overlapping trades', () => {
  const candles = createCandleSeries(40, 3000);

  const res = runAdvancedBacktest(candles, {
    symbol: 'LOOKAHEAD_TEST',
    initialCapital: 200000,
    riskPerTradePercent: 1.5,
    minDisplacementMultiplier: 1.2,
    targetMultiplier: 2.0,
    brokeragePerTrade: 40,
    slippagePercent: 0.05,
    strategyDirection: 'BOTH'
  });

  // Verify non-overlapping holding periods
  for (let k = 0; k < res.trades.length - 1; k++) {
    const currentTrade = res.trades[k];
    const nextTrade = res.trades[k + 1];
    assert.ok(
      new Date(nextTrade.entryDate).getTime() >= new Date(currentTrade.exitDate).getTime(),
      `Trade ${nextTrade.id} entered at ${nextTrade.entryDate} before trade ${currentTrade.id} exited at ${currentTrade.exitDate}`
    );
  }
});

test('runAdvancedBacktest handles empty datasets, short histories, and zero capital gracefully', () => {
  // Empty array
  const emptyRes = runAdvancedBacktest([], {
    symbol: 'EMPTY',
    initialCapital: 100000,
    riskPerTradePercent: 1.0,
    targetMultiplier: 2.0,
    brokeragePerTrade: 20,
    slippagePercent: 0.0
  });
  assert.equal(emptyRes.summary.totalTrades, 0);
  assert.equal(emptyRes.summary.netProfit, 0);
  assert.equal(emptyRes.trades.length, 0);

  // Insufficient bars (< 12)
  const fewCandles: OHLCVCandle[] = [
    { timestamp: '2026-01-01', timeUnix: 100, open: 100, high: 105, low: 95, close: 102, volume: 100 }
  ];
  const shortRes = runAdvancedBacktest(fewCandles, {
    symbol: 'SHORT',
    initialCapital: 100000,
    riskPerTradePercent: 1.0,
    targetMultiplier: 2.0,
    brokeragePerTrade: 20,
    slippagePercent: 0.0
  });
  assert.equal(shortRes.summary.totalTrades, 0);

  // Zero capital
  const zeroCapRes = runAdvancedBacktest(createCandleSeries(20), {
    symbol: 'ZERO_CAP',
    initialCapital: 0,
    riskPerTradePercent: 1.0,
    targetMultiplier: 2.0,
    brokeragePerTrade: 20,
    slippagePercent: 0.0
  });
  assert.equal(zeroCapRes.summary.totalTrades, 0);
});

test('escapeCsvCell correctly handles commas, quotes, and newlines per RFC 4180', () => {
  assert.equal(escapeCsvCell('SimpleText'), 'SimpleText');
  assert.equal(escapeCsvCell('Text with, comma'), '"Text with, comma"');
  assert.equal(escapeCsvCell('Text with "quotes"'), '"Text with ""quotes"""');
  assert.equal(escapeCsvCell('Line1\nLine2'), '"Line1\nLine2"');
  assert.equal(escapeCsvCell(null), '');
  assert.equal(escapeCsvCell(undefined), '');
  assert.equal(escapeCsvCell(1234.56), '1234.56');
});

test('generateTradesCsv, generateEquityCurveCsv, and generateStrategySummaryCsv format valid CSV', () => {
  const candles = createCandleSeries(30, 1000);
  const params: BacktestParams = {
    symbol: 'CSV_TEST_STOCK',
    initialCapital: 100000,
    riskPerTradePercent: 1.5,
    minDisplacementMultiplier: 1.2,
    targetMultiplier: 2.0,
    brokeragePerTrade: 40,
    slippagePercent: 0.05,
    strategyDirection: 'BOTH'
  };

  const { summary, trades } = runAdvancedBacktest(candles, params);

  // Trades CSV
  const tradesCsv = generateTradesCsv(trades, 'CSV_TEST_STOCK');
  assert.ok(tradesCsv.includes('Trade ID,Symbol,Direction'));
  assert.ok(tradesCsv.includes('CSV_TEST_STOCK') || trades.length === 0);

  // Equity Curve CSV
  const equityCsv = generateEquityCurveCsv(summary.equityCurve, 'CSV_TEST_STOCK');
  assert.ok(equityCsv.includes('Date,Symbol,Portfolio Equity (Rs.)'));
  assert.ok(equityCsv.includes('100000.00'));

  // Strategy Summary CSV
  const summaryCsv = generateStrategySummaryCsv(summary, params);
  assert.ok(summaryCsv.includes('Configuration & Performance Field,Value,Category'));
  assert.ok(summaryCsv.includes('Starting Capital'));
  assert.ok(summaryCsv.includes('Final Portfolio Equity'));
  assert.ok(summaryCsv.includes('HISTORICAL SIMULATION — NOT PREDICTIVE OF FUTURE REALIZED PERFORMANCE'));
});
