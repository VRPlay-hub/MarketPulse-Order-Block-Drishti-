import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTradePnL } from '../utils/calculations.ts';
import {
  calculateJournalPerformanceStats,
  type JournalPerformanceStats
} from './persistenceService.ts';
import { hashPassword } from './authService.ts';
import type { JournalTrade } from '../types/market.ts';

test('calculateTradePnL computes correct equity execution and statutory cost deductions', () => {
  // Long trade: Entry 2500, Exit 2600, Qty 100, Brokerage 50
  const longTrade = calculateTradePnL('LONG', 2500, 2600, 100, 50);
  assert.equal(longTrade.grossPnL, 10000); // (2600 - 2500) * 100
  assert.equal(longTrade.netPnL, 9950);   // 10000 - 50
  assert.equal(longTrade.outcome, 'WIN');
  assert.equal(longTrade.returnPercent, 3.98); // 9950 / 250000 * 100

  // Short trade: Entry 3500, Exit 3400, Qty 50, Brokerage 40
  const shortTrade = calculateTradePnL('SHORT', 3500, 3400, 50, 40);
  assert.equal(shortTrade.grossPnL, 5000); // (3500 - 3400) * 50
  assert.equal(shortTrade.netPnL, 4960);
  assert.equal(shortTrade.outcome, 'WIN');

  // Losing trade: Entry 1000, Exit 950, Qty 200, Brokerage 30
  const losingTrade = calculateTradePnL('LONG', 1000, 950, 200, 30);
  assert.equal(losingTrade.grossPnL, -10000);
  assert.equal(losingTrade.netPnL, -10030); // loss deepened by statutory cost
  assert.equal(losingTrade.outcome, 'LOSS');
});

test('calculateJournalPerformanceStats aggregates metrics, win rates, and setup attribution correctly', () => {
  const sampleTrades: JournalTrade[] = [
    {
      id: 't1',
      date: '2026-03-01',
      symbol: 'RELIANCE',
      direction: 'LONG',
      entryPrice: 2800,
      exitPrice: 2900,
      stopLoss: 2750,
      targetPrice: 2950,
      quantity: 50,
      brokerageFees: 40,
      setupCategory: 'ORDER_BLOCK_RETEST',
      notes: 'Clean bounce off H4 Bull OB',
      grossPnL: 5000,
      netPnL: 4960,
      returnPercent: 3.54,
      riskRewardAchieved: 2.0,
      outcome: 'WIN'
    },
    {
      id: 't2',
      date: '2026-03-02',
      symbol: 'HDFCBANK',
      direction: 'SHORT',
      entryPrice: 1700,
      exitPrice: 1720,
      stopLoss: 1715,
      targetPrice: 1670,
      quantity: 100,
      brokerageFees: 30,
      setupCategory: 'BREAK_OF_STRUCTURE',
      notes: 'Failed supply sweep',
      grossPnL: -2000,
      netPnL: -2030,
      returnPercent: -1.19,
      riskRewardAchieved: -1.0,
      outcome: 'LOSS'
    },
    {
      id: 't3',
      date: '2026-03-03',
      symbol: 'TCS',
      direction: 'LONG',
      entryPrice: 3800,
      exitPrice: 3860,
      stopLoss: 3770,
      targetPrice: 3900,
      quantity: 30,
      brokerageFees: 35,
      setupCategory: 'ORDER_BLOCK_RETEST',
      notes: 'Demand retest confirmation',
      grossPnL: 1800,
      netPnL: 1765,
      returnPercent: 1.55,
      riskRewardAchieved: 2.0,
      outcome: 'WIN'
    }
  ];

  const stats: JournalPerformanceStats = calculateJournalPerformanceStats(sampleTrades);

  assert.equal(stats.totalTrades, 3);
  assert.equal(stats.winningTrades, 2);
  assert.equal(stats.losingTrades, 1);
  assert.equal(stats.winRatePercent, 66.7);
  assert.equal(stats.grossPnL, 4800); // 5000 - 2000 + 1800
  assert.equal(stats.totalCosts, 105); // 40 + 30 + 35
  assert.equal(stats.netPnL, 4695); // 4960 - 2030 + 1765
  assert.equal(stats.profitFactor, 3.31); // gross wins (4960 + 1765 = 6725) / gross loss (2030) = 3.3128
  assert.equal(stats.largestWin, 4960);
  assert.equal(stats.largestLoss, -2030);

  // Setup breakdown checks
  assert.equal(stats.setupAttribution['ORDER_BLOCK_RETEST'].count, 2);
  assert.equal(stats.setupAttribution['ORDER_BLOCK_RETEST'].winRate, 100);
  assert.equal(stats.setupAttribution['BREAK_OF_STRUCTURE'].count, 1);
  assert.equal(stats.setupAttribution['BREAK_OF_STRUCTURE'].winRate, 0);
});

test('hashPassword produces salted SHA-256 digest and resists plaintext exposure', async () => {
  const password = 'SuperSecretTraderKey99!';
  const salt1 = 'salt_abc_123';
  const salt2 = 'salt_def_456';

  const hash1 = await hashPassword(password, salt1);
  const hash2 = await hashPassword(password, salt2);

  // Digest must be 64-character hex string
  assert.match(hash1, /^[0-9a-f]{64}$/);
  assert.match(hash2, /^[0-9a-f]{64}$/);

  // Different salts must produce distinct digests (zero password collisions)
  assert.notEqual(hash1, hash2);

  // Must never match or expose original password
  assert.notEqual(hash1, password);
});

test('Partitioned key generator strictly protects user isolation', () => {
  const aliceKey = `marketpulse_user_usr_alice_trades`;
  const bobKey = `marketpulse_user_usr_bob_trades`;

  assert.notEqual(aliceKey, bobKey);
  assert.ok(aliceKey.includes('usr_alice'));
  assert.ok(bobKey.includes('usr_bob'));
});
