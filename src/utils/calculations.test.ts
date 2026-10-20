import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePercentageChange,
  calculateRelativeVolume,
  detectOrderBlocks,
  detectLiquidityLevels,
  calculateMarketScore,
  calculateJournalMetrics,
  calculateTradePnL
} from './calculations.ts';
import type { OHLCVCandle, JournalTrade } from '../types/market.ts';

test('calculatePercentageChange computes correct NSE percentage change', () => {
  // Reliance 2500 -> 2550 is +2.00%
  assert.equal(calculatePercentageChange(2550, 2500), 2.0);
  // TCS 3500 -> 3430 is -2.00%
  assert.equal(calculatePercentageChange(3430, 3500), -2.0);
  // Zero previous close protection
  assert.equal(calculatePercentageChange(100, 0), 0);
  assert.equal(calculatePercentageChange(100, -50), 0);
});

test('calculateRelativeVolume handles zero and normal cases', () => {
  assert.equal(calculateRelativeVolume(2000000, 1000000), 2.0);
  assert.equal(calculateRelativeVolume(500000, 1000000), 0.5);
  assert.equal(calculateRelativeVolume(0, 0), 1.0);
});

test('calculateTradePnL calculates correct Long and Short Gross & Net PnL', () => {
  // Long trade: Buy 100 shares @ 2000, sell @ 2050, brokerage 40
  const longTrade = calculateTradePnL('LONG', 2000, 2050, 100, 40);
  assert.equal(longTrade.grossPnL, 5000);
  assert.equal(longTrade.netPnL, 4960);
  assert.equal(longTrade.outcome, 'WIN');
  assert.equal(longTrade.returnPercent, 2.48);

  // Short trade: Sell 50 shares @ 1500, buy back @ 1520 (loss), brokerage 30
  const shortTrade = calculateTradePnL('SHORT', 1500, 1520, 50, 30);
  assert.equal(shortTrade.grossPnL, -1000);
  assert.equal(shortTrade.netPnL, -1030);
  assert.equal(shortTrade.outcome, 'LOSS');
});

test('calculateJournalMetrics handles empty and populated trade arrays', () => {
  const emptyMetrics = calculateJournalMetrics([]);
  assert.equal(emptyMetrics.totalTrades, 0);
  assert.equal(emptyMetrics.winRate, 0);
  assert.equal(emptyMetrics.profitFactor, 0);

  const sampleTrades: JournalTrade[] = [
    {
      id: '1',
      date: '2026-03-01',
      symbol: 'RELIANCE',
      direction: 'LONG',
      entryPrice: 2400,
      exitPrice: 2460,
      stopLoss: 2370,
      targetPrice: 2460,
      quantity: 50,
      brokerageFees: 40,
      setupCategory: 'ORDER_BLOCK_RETEST',
      notes: 'Clean demand zone test',
      grossPnL: 3000,
      netPnL: 2960,
      returnPercent: 2.47,
      riskRewardAchieved: 2.0,
      outcome: 'WIN'
    },
    {
      id: '2',
      date: '2026-03-02',
      symbol: 'INFY',
      direction: 'SHORT',
      entryPrice: 1600,
      exitPrice: 1620,
      stopLoss: 1615,
      targetPrice: 1560,
      quantity: 100,
      brokerageFees: 30,
      setupCategory: 'LIQUIDITY_SWEEP',
      notes: 'Stop hit on breakout',
      grossPnL: -2000,
      netPnL: -2030,
      returnPercent: -1.27,
      riskRewardAchieved: -1.0,
      outcome: 'LOSS'
    }
  ];

  const metrics = calculateJournalMetrics(sampleTrades);
  assert.equal(metrics.totalTrades, 2);
  assert.equal(metrics.winningTrades, 1);
  assert.equal(metrics.losingTrades, 1);
  assert.equal(metrics.winRate, 50.0);
  assert.equal(metrics.grossPnL, 1000);
  assert.equal(metrics.netPnL, 930);
  assert.equal(metrics.totalBrokerage, 70);
  assert.equal(metrics.profitFactor, 1.46); // 2960 / 2030
});

test('detectOrderBlocks detects bullish displacement candidate', () => {
  const candles: OHLCVCandle[] = [
    { timestamp: '2026-03-01', timeUnix: 1772323200, open: 100, high: 102, low: 98, close: 101, volume: 1000 },
    { timestamp: '2026-03-02', timeUnix: 1772409600, open: 101, high: 103, low: 99, close: 100, volume: 1000 },
    // Candle 2: Bearish candle (open 100, close 95)
    { timestamp: '2026-03-03', timeUnix: 1772496000, open: 100, high: 101, low: 94, close: 95, volume: 1200 },
    // Candle 3: Massive bullish displacement breaking structure (open 95, close 110)
    { timestamp: '2026-03-04', timeUnix: 1772582400, open: 95, high: 112, low: 94, close: 110, volume: 3500 },
    // Candle 4: Continuation
    { timestamp: '2026-03-05', timeUnix: 1772668800, open: 110, high: 115, low: 109, close: 114, volume: 2000 }
  ];

  const obZones = detectOrderBlocks(candles, {
    symbol: 'TEST_STOCK',
    displacementMultiplier: 1.5,
    requireBreakOfStructure: true
  });

  assert.ok(obZones.length >= 1, 'Should find at least 1 bullish order block');
  const bullOB = obZones.find(z => z.direction === 'BULLISH_DEMAND');
  assert.ok(bullOB, 'Bullish OB exists');
  assert.equal(bullOB?.symbol, 'TEST_STOCK');
  assert.equal(bullOB?.formationTime, '2026-03-03');
  assert.equal(bullOB?.status, 'FRESH');
});

test('calculateMarketScore computes explainable score within -100 to +100', () => {
  const bullishScore = calculateMarketScore({
    changePercent: 2.8,
    relativeVolume: 1.8,
    trend: 'STRONG_UP',
    hasRecentBullishOB: true,
    hasRecentBearishOB: false,
    hasBullishSweep: true,
    hasBearishSweep: false,
    hasBOS: true
  });

  assert.ok(bullishScore.totalScore > 50, 'Strong bullish parameters yield high positive score');
  assert.equal(bullishScore.direction, 'BULLISH');
  assert.ok(bullishScore.supportingSignals.length >= 3);

  const bearishScore = calculateMarketScore({
    changePercent: -3.5,
    relativeVolume: 1.5,
    trend: 'STRONG_DOWN',
    hasRecentBullishOB: false,
    hasRecentBearishOB: true,
    hasBullishSweep: false,
    hasBearishSweep: true,
    hasBOS: false
  });

  assert.ok(bearishScore.totalScore < -50, 'Bearish parameters yield negative score');
  assert.equal(bearishScore.direction, 'BEARISH');
  assert.ok(bearishScore.conflictingSignals.length >= 3);
});
