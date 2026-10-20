import type {
  OHLCVCandle,
  BacktestParams,
  BacktestTradeResult,
  BacktestSummary,
  StrategyDirection,
  StopLossMode,
  PositionSizingMode,
  CollisionResolution
} from '../types/market.ts';
import { detectOrderBlocks } from './calculations.ts';

/**
 * Calculates standard Average True Range (ATR) across historical candles.
 */
export function calculateATR(candles: OHLCVCandle[], period: number = 14): number[] {
  if (!candles || candles.length === 0) return [];
  const safePeriod = Math.max(1, period);
  const atrValues: number[] = new Array(candles.length).fill(0);
  const trueRanges: number[] = [];

  for (let i = 0; i < candles.length; i++) {
    const current = candles[i];
    if (i === 0) {
      trueRanges.push(Math.max(0.01, current.high - current.low));
    } else {
      const prev = candles[i - 1];
      const tr = Math.max(
        current.high - current.low,
        Math.abs(current.high - prev.close),
        Math.abs(current.low - prev.close)
      );
      trueRanges.push(Math.max(0.01, tr));
    }

    if (i + 1 < safePeriod) {
      // Not enough bars yet; use simple running average of available true ranges
      const sum = trueRanges.reduce((acc, v) => acc + v, 0);
      atrValues[i] = Number((sum / (i + 1)).toFixed(2));
    } else if (i + 1 === safePeriod) {
      const sum = trueRanges.slice(0, safePeriod).reduce((acc, v) => acc + v, 0);
      atrValues[i] = Number((sum / safePeriod).toFixed(2));
    } else {
      // Wilder's smoothing: ATR = (prevATR * (period - 1) + currentTR) / period
      const prevATR = atrValues[i - 1];
      const smoothed = (prevATR * (safePeriod - 1) + trueRanges[i]) / safePeriod;
      atrValues[i] = Number(smoothed.toFixed(2));
    }
  }

  return atrValues;
}

/**
 * Advanced institutional backtesting engine with sequential walk-forward integrity.
 * Supports Bi-Directional (Long & Short) setups, dual stop-loss models, and intrabar collision resolution.
 */
export function runAdvancedBacktest(
  candles: OHLCVCandle[],
  params: BacktestParams
): { summary: BacktestSummary; trades: BacktestTradeResult[] } {
  const {
    symbol = 'SECURITY',
    initialCapital = 200000,
    strategyDirection = 'BOTH',
    stopLossMode = 'ZONE_BOUNDARY',
    stopLossBufferPercent = 0.2,
    atrPeriod = 14,
    atrMultiplier = 1.5,
    positionSizingMode = 'EQUITY_PERCENT',
    riskPerTradePercent = 1.5,
    fixedQuantity = 50,
    minDisplacementMultiplier = 1.5,
    targetMultiplier = 2.0,
    brokeragePerTrade = 40,
    slippagePercent = 0.05,
    maxHoldingBars = 10,
    collisionResolution = 'CONSERVATIVE_STOP_FIRST'
  } = params;

  // Validation & empty guard
  if (!candles || candles.length < 12 || initialCapital <= 0) {
    return {
      summary: createEmptySummary(initialCapital),
      trades: []
    };
  }

  const atrSeries = calculateATR(candles, atrPeriod);
  const trades: BacktestTradeResult[] = [];
  let currentEquity = initialCapital;
  let peakEquity = initialCapital;
  let maxDrawdownAmount = 0;

  const equityCurve: { date: string; equity: number; drawdown: number }[] = [
    { date: candles[0]?.timestamp || '2026-01-01', equity: initialCapital, drawdown: 0 }
  ];

  let lastExitIndex = -1;

  for (let i = 10; i < candles.length - 2; i++) {
    // Strictly prevent overlapping positions
    if (i <= lastExitIndex) continue;

    // Slice only past candles up to candle i to prevent look-ahead bias
    const pastCandles = candles.slice(0, i + 1);
    const obs = detectOrderBlocks(pastCandles, {
      symbol,
      displacementMultiplier: minDisplacementMultiplier,
      requireBreakOfStructure: true
    });

    const currentCandle = candles[i];
    const nextCandle = candles[i + 1];
    const currentATR = atrSeries[i] || Math.max(1, currentCandle.high - currentCandle.low);

    // Evaluate Long candidate (Bullish Demand OB)
    let triggeredTrade: {
      direction: 'LONG' | 'SHORT';
      entryPrice: number;
      stopLoss: number;
      targetPrice: number;
      riskPerShare: number;
    } | null = null;

    const canTradeLong = strategyDirection === 'LONG_ONLY' || strategyDirection === 'BOTH';
    const canTradeShort = strategyDirection === 'SHORT_ONLY' || strategyDirection === 'BOTH';

    if (canTradeLong) {
      const freshBullOB = obs.filter(o => o.direction === 'BULLISH_DEMAND' && o.status === 'FRESH').pop();
      if (freshBullOB) {
        // Entry condition: next candle tests or touches the fresh OB zone
        const testsDemandZone = nextCandle.low <= freshBullOB.high && nextCandle.high >= freshBullOB.low;
        if (testsDemandZone) {
          // Account for gap openings
          const idealEntry = freshBullOB.high;
          const rawEntry = nextCandle.open > idealEntry ? nextCandle.open : idealEntry;
          const entryPrice = Number((rawEntry * (1 + slippagePercent / 100)).toFixed(2));

          // Calculate Stop Loss
          let stopLoss = 0;
          if (stopLossMode === 'ATR_BUFFER') {
            stopLoss = Number((entryPrice - (currentATR * atrMultiplier)).toFixed(2));
          } else {
            stopLoss = Number((freshBullOB.low * (1 - stopLossBufferPercent / 100)).toFixed(2));
          }

          const riskPerShare = entryPrice - stopLoss;
          if (riskPerShare > 0.05) {
            const targetPrice = Number((entryPrice + (riskPerShare * targetMultiplier)).toFixed(2));
            triggeredTrade = {
              direction: 'LONG',
              entryPrice,
              stopLoss,
              targetPrice,
              riskPerShare
            };
          }
        }
      }
    }

    // Evaluate Short candidate if Long was not triggered and Short is enabled
    if (!triggeredTrade && canTradeShort) {
      const freshBearOB = obs.filter(o => o.direction === 'BEARISH_SUPPLY' && o.status === 'FRESH').pop();
      if (freshBearOB) {
        // Entry condition: next candle tests or touches the fresh supply zone
        const testsSupplyZone = nextCandle.high >= freshBearOB.low && nextCandle.low <= freshBearOB.high;
        if (testsSupplyZone) {
          const idealEntry = freshBearOB.low;
          const rawEntry = nextCandle.open < idealEntry ? nextCandle.open : idealEntry;
          const entryPrice = Number((rawEntry * (1 - slippagePercent / 100)).toFixed(2));

          // Calculate Stop Loss
          let stopLoss = 0;
          if (stopLossMode === 'ATR_BUFFER') {
            stopLoss = Number((entryPrice + (currentATR * atrMultiplier)).toFixed(2));
          } else {
            stopLoss = Number((freshBearOB.high * (1 + stopLossBufferPercent / 100)).toFixed(2));
          }

          const riskPerShare = stopLoss - entryPrice;
          if (riskPerShare > 0.05) {
            const targetPrice = Number((entryPrice - (riskPerShare * targetMultiplier)).toFixed(2));
            triggeredTrade = {
              direction: 'SHORT',
              entryPrice,
              stopLoss,
              targetPrice,
              riskPerShare
            };
          }
        }
      }
    }

    if (!triggeredTrade) continue;

    // Position sizing
    let quantity = 0;
    if (positionSizingMode === 'FIXED_QUANTITY') {
      quantity = Math.floor(fixedQuantity);
    } else {
      const maxRiskCapital = currentEquity * (riskPerTradePercent / 100);
      quantity = Math.floor(maxRiskCapital / triggeredTrade.riskPerShare);
    }

    // Cap quantity by available equity
    const maxAffordableQty = Math.floor(currentEquity / triggeredTrade.entryPrice);
    quantity = Math.min(quantity, maxAffordableQty);

    if (quantity <= 0) continue; // Skip if capital cannot afford even 1 share

    // Forward walk to find exit (up to maxHoldingBars)
    let exitPrice = nextCandle.close;
    let exitDate = nextCandle.timestamp;
    let exitIndex = i + 1;
    let reason: 'TARGET_HIT' | 'STOP_HIT' | 'MAX_HOLDING_REACHED' | 'INVALIDATED' = 'MAX_HOLDING_REACHED';
    let isWin = false;
    let collisionOccurred = false;

    const maxBarLimit = Math.min(candles.length, i + 1 + Math.max(2, maxHoldingBars));

    for (let j = i + 2; j < maxBarLimit; j++) {
      const forwardCandle = candles[j];

      if (triggeredTrade.direction === 'LONG') {
        const hitTarget = forwardCandle.high >= triggeredTrade.targetPrice;
        const hitStop = forwardCandle.low <= triggeredTrade.stopLoss;

        if (hitTarget && hitStop) {
          // Both target and stop hit in the same candle
          collisionOccurred = true;
          if (collisionResolution === 'OPEN_PROXIMITY') {
            const distToStop = Math.abs(forwardCandle.open - triggeredTrade.stopLoss);
            const distToTarget = Math.abs(forwardCandle.open - triggeredTrade.targetPrice);
            if (distToTarget < distToStop) {
              exitPrice = Number((triggeredTrade.targetPrice * (1 - slippagePercent / 100)).toFixed(2));
              reason = 'TARGET_HIT';
              isWin = true;
            } else {
              exitPrice = Number((triggeredTrade.stopLoss * (1 - slippagePercent / 100)).toFixed(2));
              reason = 'STOP_HIT';
              isWin = false;
            }
          } else {
            // Conservative standard: assume stop hit first
            exitPrice = Number((triggeredTrade.stopLoss * (1 - slippagePercent / 100)).toFixed(2));
            reason = 'STOP_HIT';
            isWin = false;
          }
          exitDate = forwardCandle.timestamp;
          exitIndex = j;
          break;
        } else if (hitTarget) {
          exitPrice = Number((triggeredTrade.targetPrice * (1 - slippagePercent / 100)).toFixed(2));
          exitDate = forwardCandle.timestamp;
          exitIndex = j;
          reason = 'TARGET_HIT';
          isWin = true;
          break;
        } else if (hitStop) {
          exitPrice = Number((triggeredTrade.stopLoss * (1 - slippagePercent / 100)).toFixed(2));
          exitDate = forwardCandle.timestamp;
          exitIndex = j;
          reason = 'STOP_HIT';
          isWin = false;
          break;
        }
      } else {
        // SHORT trade exit logic
        const hitTarget = forwardCandle.low <= triggeredTrade.targetPrice;
        const hitStop = forwardCandle.high >= triggeredTrade.stopLoss;

        if (hitTarget && hitStop) {
          collisionOccurred = true;
          if (collisionResolution === 'OPEN_PROXIMITY') {
            const distToStop = Math.abs(forwardCandle.open - triggeredTrade.stopLoss);
            const distToTarget = Math.abs(forwardCandle.open - triggeredTrade.targetPrice);
            if (distToTarget < distToStop) {
              exitPrice = Number((triggeredTrade.targetPrice * (1 + slippagePercent / 100)).toFixed(2));
              reason = 'TARGET_HIT';
              isWin = true;
            } else {
              exitPrice = Number((triggeredTrade.stopLoss * (1 + slippagePercent / 100)).toFixed(2));
              reason = 'STOP_HIT';
              isWin = false;
            }
          } else {
            // Conservative standard: assume stop hit first
            exitPrice = Number((triggeredTrade.stopLoss * (1 + slippagePercent / 100)).toFixed(2));
            reason = 'STOP_HIT';
            isWin = false;
          }
          exitDate = forwardCandle.timestamp;
          exitIndex = j;
          break;
        } else if (hitTarget) {
          exitPrice = Number((triggeredTrade.targetPrice * (1 + slippagePercent / 100)).toFixed(2));
          exitDate = forwardCandle.timestamp;
          exitIndex = j;
          reason = 'TARGET_HIT';
          isWin = true;
          break;
        } else if (hitStop) {
          exitPrice = Number((triggeredTrade.stopLoss * (1 + slippagePercent / 100)).toFixed(2));
          exitDate = forwardCandle.timestamp;
          exitIndex = j;
          reason = 'STOP_HIT';
          isWin = false;
          break;
        }
      }

      // If last holding bar reached
      if (j === maxBarLimit - 1) {
        exitPrice = forwardCandle.close;
        exitDate = forwardCandle.timestamp;
        exitIndex = j;
        reason = 'MAX_HOLDING_REACHED';
        isWin = triggeredTrade.direction === 'LONG'
          ? exitPrice > triggeredTrade.entryPrice
          : exitPrice < triggeredTrade.entryPrice;
      }
    }

    lastExitIndex = exitIndex;

    // Calculate PnL
    const priceDiff = triggeredTrade.direction === 'LONG'
      ? (exitPrice - triggeredTrade.entryPrice)
      : (triggeredTrade.entryPrice - exitPrice);

    const grossProfit = Number((priceDiff * quantity).toFixed(2));
    const netProfit = Number((grossProfit - brokeragePerTrade).toFixed(2));
    const capitalDeployed = triggeredTrade.entryPrice * quantity;
    const returnPct = capitalDeployed > 0 ? Number(((netProfit / capitalDeployed) * 100).toFixed(2)) : 0;

    const actualRisk = triggeredTrade.riskPerShare;
    const actualReward = Math.abs(exitPrice - triggeredTrade.entryPrice);
    const riskRewardAchieved = actualRisk > 0 ? Number((actualReward / actualRisk).toFixed(2)) : 1;

    currentEquity = Number((currentEquity + netProfit).toFixed(2));

    if (currentEquity > peakEquity) {
      peakEquity = currentEquity;
    }
    const currentDrawdown = peakEquity - currentEquity;
    if (currentDrawdown > maxDrawdownAmount) {
      maxDrawdownAmount = currentDrawdown;
    }
    const currentDdPercent = peakEquity > 0 ? Number(((currentDrawdown / peakEquity) * 100).toFixed(2)) : 0;

    trades.push({
      id: `BT-${symbol}-${trades.length + 1}`,
      symbol,
      entryDate: nextCandle.timestamp,
      exitDate,
      holdingBars: Math.max(1, exitIndex - (i + 1)),
      direction: triggeredTrade.direction,
      entryPrice: triggeredTrade.entryPrice,
      exitPrice,
      stopLoss: triggeredTrade.stopLoss,
      targetPrice: triggeredTrade.targetPrice,
      quantity,
      grossProfit,
      brokerageCosts: brokeragePerTrade,
      netProfit,
      returnPct,
      pnlCumulative: currentEquity,
      riskRewardAchieved,
      reason,
      isWin,
      collisionOccurred
    });

    equityCurve.push({
      date: exitDate,
      equity: currentEquity,
      drawdown: currentDdPercent
    });
  }

  // Aggregate metrics
  const winningTrades = trades.filter(t => t.netProfit > 0).length;
  const losingTrades = trades.filter(t => t.netProfit < 0).length;
  const breakevenTrades = trades.filter(t => t.netProfit === 0).length;
  const winRate = trades.length > 0 ? Number(((winningTrades / trades.length) * 100).toFixed(1)) : 0;

  const grossProfit = Number(trades.reduce((acc, t) => acc + t.grossProfit, 0).toFixed(2));
  const netProfit = Number(trades.reduce((acc, t) => acc + t.netProfit, 0).toFixed(2));
  const totalBrokerage = Number((trades.length * brokeragePerTrade).toFixed(2));

  const winSum = trades.filter(t => t.netProfit > 0).reduce((acc, t) => acc + t.netProfit, 0);
  const lossSum = Math.abs(trades.filter(t => t.netProfit < 0).reduce((acc, t) => acc + t.netProfit, 0));
  const profitFactor = lossSum > 0 ? Number((winSum / lossSum).toFixed(2)) : (winSum > 0 ? 999 : 0);

  const averageWin = winningTrades > 0 ? Number((winSum / winningTrades).toFixed(2)) : 0;
  const averageLoss = losingTrades > 0 ? Number((lossSum / losingTrades).toFixed(2)) : 0;
  const winLossRatio = averageLoss > 0 ? Number((averageWin / averageLoss).toFixed(2)) : (averageWin > 0 ? 999 : 0);

  const avgRR = trades.length > 0
    ? Number((trades.reduce((acc, t) => acc + (t.riskRewardAchieved || 1), 0) / trades.length).toFixed(2))
    : 0;

  const maxDrawdownPercent = peakEquity > 0 ? Number(((maxDrawdownAmount / peakEquity) * 100).toFixed(2)) : 0;

  // Long vs Short breakdowns
  const longTrades = trades.filter(t => t.direction === 'LONG');
  const shortTrades = trades.filter(t => t.direction === 'SHORT');

  const longWins = longTrades.filter(t => t.netProfit > 0).length;
  const shortWins = shortTrades.filter(t => t.netProfit > 0).length;

  const longWinRate = longTrades.length > 0 ? Number(((longWins / longTrades.length) * 100).toFixed(1)) : 0;
  const shortWinRate = shortTrades.length > 0 ? Number(((shortWins / shortTrades.length) * 100).toFixed(1)) : 0;

  const longNetProfit = Number(longTrades.reduce((acc, t) => acc + t.netProfit, 0).toFixed(2));
  const shortNetProfit = Number(shortTrades.reduce((acc, t) => acc + t.netProfit, 0).toFixed(2));

  const summary: BacktestSummary = {
    totalTrades: trades.length,
    winningTrades,
    losingTrades,
    breakevenTrades,
    winRate,
    grossProfit,
    netProfit,
    totalBrokerage,
    profitFactor,
    maxDrawdownPercent,
    maxDrawdownAmount: Number(maxDrawdownAmount.toFixed(2)),
    averageTradePnL: trades.length > 0 ? Number((netProfit / trades.length).toFixed(2)) : 0,
    averageWin,
    averageLoss,
    winLossRatio,
    averageRiskReward: avgRR,
    longTradesCount: longTrades.length,
    longWinRate,
    longNetProfit,
    shortTradesCount: shortTrades.length,
    shortWinRate,
    shortNetProfit,
    equityCurve
  };

  return { summary, trades };
}

function createEmptySummary(initialCapital: number): BacktestSummary {
  return {
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    breakevenTrades: 0,
    winRate: 0,
    grossProfit: 0,
    netProfit: 0,
    totalBrokerage: 0,
    profitFactor: 0,
    maxDrawdownPercent: 0,
    maxDrawdownAmount: 0,
    averageTradePnL: 0,
    averageWin: 0,
    averageLoss: 0,
    winLossRatio: 0,
    averageRiskReward: 0,
    longTradesCount: 0,
    longWinRate: 0,
    longNetProfit: 0,
    shortTradesCount: 0,
    shortWinRate: 0,
    shortNetProfit: 0,
    equityCurve: [{ date: new Date().toISOString().split('T')[0], equity: initialCapital, drawdown: 0 }]
  };
}
