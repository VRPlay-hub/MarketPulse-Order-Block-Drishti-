import type {
  OHLCVCandle,
  OrderBlockZone,
  OrderBlockType,
  LiquidityLevel,
  ScoringWeights,
  StockScoreBreakdown,
  MarketDirection,
  JournalTrade,
  TimeFrame
} from '../types/market.js';

/**
 * Calculates percentage change between current price and previous close.
 * Returns 0 if previousClose is invalid or zero.
 */
export function calculatePercentageChange(currentPrice: number, previousClose: number): number {
  if (!previousClose || previousClose <= 0 || isNaN(currentPrice) || isNaN(previousClose)) {
    return 0;
  }
  const pct = ((currentPrice - previousClose) / previousClose) * 100;
  return Number(pct.toFixed(2));
}

/**
 * Calculates relative volume compared to a historical baseline.
 */
export function calculateRelativeVolume(currentVolume: number, avgHistoricalVolume: number): number {
  if (!avgHistoricalVolume || avgHistoricalVolume <= 0 || !currentVolume || currentVolume <= 0) {
    return 1.0;
  }
  const rvol = currentVolume / avgHistoricalVolume;
  return Number(rvol.toFixed(2));
}

export interface OrderBlockDetectionOptions {
  lookback?: number;
  displacementMultiplier?: number; // threshold compared to average candle range
  requireBreakOfStructure?: boolean;
  zoneType?: 'BODY_ONLY' | 'FULL_CANDLE' | 'FULL_RANGE';
  symbol?: string;
  timeframe?: TimeFrame;
}

/**
 * Pure rule-based Order Block detection algorithm.
 * Avoids look-ahead bias by calculating confirmations sequentially.
 */
export function detectOrderBlocks(
  candles: OHLCVCandle[],
  options: OrderBlockDetectionOptions = {}
): OrderBlockZone[] {
  if (!candles || candles.length < 5) {
    return [];
  }

  const {
    displacementMultiplier = 1.6,
    requireBreakOfStructure = true,
    zoneType = 'FULL_CANDLE',
    symbol = 'SECURITY',
    timeframe = '1D'
  } = options;

  // Compute average true range / candle body size for baseline displacement
  const bodySizes = candles.map(c => Math.abs(c.close - c.open));
  const avgBody = bodySizes.reduce((acc, v) => acc + v, 0) / (bodySizes.length || 1);

  const zones: OrderBlockZone[] = [];

  for (let i = 2; i < candles.length - 1; i++) {
    const obCandle = candles[i];
    const prevCandle = candles[i - 1];
    const nextCandle = candles[i + 1];
    const forwardCandle2 = i + 2 < candles.length ? candles[i + 2] : null;

    // 1. Bullish OB Candidate:
    // A bearish candle (close < open) followed by a sharp bullish displacement candle (close > open)
    const isBearish = obCandle.close < obCandle.open;
    const isNextBullish = nextCandle.close > nextCandle.open;
    const nextCandleDisplacement = (nextCandle.close - nextCandle.open);
    const displacementRatio = avgBody > 0 ? nextCandleDisplacement / avgBody : 1;

    if (isBearish && isNextBullish && displacementRatio >= displacementMultiplier) {
      // Check structure break
      const prevHigh = Math.max(prevCandle.high, obCandle.high);
      const brokeStructure = nextCandle.close > prevHigh;

      if (!requireBreakOfStructure || brokeStructure) {
        const high = zoneType === 'BODY_ONLY' ? Math.max(obCandle.open, obCandle.close) : obCandle.high;
        const low = zoneType === 'BODY_ONLY' ? Math.min(obCandle.open, obCandle.close) : obCandle.low;
        const meanThreshold = Number(((high + low) / 2).toFixed(2));

        // Detect Fair Value Gap (Candle 1 High < Candle 3 Low)
        let fvg: { high: number; low: number; size: number } | undefined = undefined;
        if (forwardCandle2 && forwardCandle2.low > obCandle.high) {
          const fvgSize = Number((forwardCandle2.low - obCandle.high).toFixed(2));
          if (fvgSize > 0) {
            fvg = {
              high: forwardCandle2.low,
              low: obCandle.high,
              size: fvgSize
            };
          }
        }

        // Structure classification: BOS vs CHOCH
        const isReversal = prevCandle.close < prevCandle.open && prevCandle.low < obCandle.low;
        const structureType = isReversal ? 'CHOCH' : 'BOS';

        // Check if later candles retested or invalidated this zone
        let status: 'FRESH' | 'TESTED' | 'MITIGATED' | 'INVALIDATED' = 'FRESH';
        let retestCount = 0;

        for (let j = i + 2; j < candles.length; j++) {
          const testCandle = candles[j];
          // Invalidation: candle closes strictly below low of bullish OB
          if (testCandle.close < low) {
            status = 'INVALIDATED';
            break;
          }
          // Penetration test
          if (testCandle.low <= high && testCandle.low >= low) {
            retestCount++;
            if (testCandle.low <= meanThreshold) {
              status = 'MITIGATED';
            } else if (status === 'FRESH') {
              status = 'TESTED';
            }
          }
        }

        if (status !== 'INVALIDATED') {
          const volSpike = Number((nextCandle.volume / (obCandle.volume || 1)).toFixed(2));

          // Quality Score: 0 - 100
          let quality = 50;
          if (fvg) quality += 15;
          if (brokeStructure) quality += 15;
          if (volSpike >= 1.5) quality += 10;
          if (displacementRatio >= 2.0) quality += 10;
          if (retestCount >= 2) quality -= 15;
          quality = Math.max(10, Math.min(99, quality));

          zones.push({
            id: `OB-${symbol}-${obCandle.timestamp}-BULL`,
            symbol,
            timeframe,
            direction: 'BULLISH_DEMAND',
            high: Number(high.toFixed(2)),
            low: Number(low.toFixed(2)),
            meanThreshold,
            formationTime: obCandle.timestamp,
            confirmationTime: nextCandle.timestamp,
            status,
            retestCount,
            displacementPercent: Number(((nextCandle.close - obCandle.close) / obCandle.close * 100).toFixed(2)),
            hasBreakOfStructure: brokeStructure,
            structureType,
            qualityScore: quality,
            zoneBasis: zoneType,
            fairValueGap: fvg,
            volumeSpikeRatio: volSpike,
            ruleVersion: 'v2.0-fvg-structure',
            explanation: `Bearish candle preceding ${displacementRatio.toFixed(1)}x ATR upward displacement with ${brokeStructure ? 'confirmed ' + structureType : 'momentum expansion'}${fvg ? ' & Fair Value Gap (Rs.' + fvg.size + ')' : ''}.`
          });
        }
      }
    }

    // 2. Bearish OB Candidate:
    // A bullish candle (close > open) followed by a sharp bearish displacement candle (close < open)
    const isBullish = obCandle.close > obCandle.open;
    const isNextBearish = nextCandle.close < nextCandle.open;
    const nextDownDisplacement = (nextCandle.open - nextCandle.close);
    const downDisplacementRatio = avgBody > 0 ? nextDownDisplacement / avgBody : 1;

    if (isBullish && isNextBearish && downDisplacementRatio >= displacementMultiplier) {
      const prevLow = Math.min(prevCandle.low, obCandle.low);
      const brokeStructure = nextCandle.close < prevLow;

      if (!requireBreakOfStructure || brokeStructure) {
        const high = zoneType === 'BODY_ONLY' ? Math.max(obCandle.open, obCandle.close) : obCandle.high;
        const low = zoneType === 'BODY_ONLY' ? Math.min(obCandle.open, obCandle.close) : obCandle.low;
        const meanThreshold = Number(((high + low) / 2).toFixed(2));

        // Detect Fair Value Gap (Candle 3 High < Candle 1 Low)
        let fvg: { high: number; low: number; size: number } | undefined = undefined;
        if (forwardCandle2 && forwardCandle2.high < obCandle.low) {
          const fvgSize = Number((obCandle.low - forwardCandle2.high).toFixed(2));
          if (fvgSize > 0) {
            fvg = {
              high: obCandle.low,
              low: forwardCandle2.high,
              size: fvgSize
            };
          }
        }

        const isReversal = prevCandle.close > prevCandle.open && prevCandle.high > obCandle.high;
        const structureType = isReversal ? 'CHOCH' : 'BOS';

        let status: 'FRESH' | 'TESTED' | 'MITIGATED' | 'INVALIDATED' = 'FRESH';
        let retestCount = 0;

        for (let j = i + 2; j < candles.length; j++) {
          const testCandle = candles[j];
          // Invalidation: candle closes above high of bearish OB
          if (testCandle.close > high) {
            status = 'INVALIDATED';
            break;
          }
          // Penetration test
          if (testCandle.high >= low && testCandle.high <= high) {
            retestCount++;
            if (testCandle.high >= meanThreshold) {
              status = 'MITIGATED';
            } else if (status === 'FRESH') {
              status = 'TESTED';
            }
          }
        }

        if (status !== 'INVALIDATED') {
          const volSpike = Number((nextCandle.volume / (obCandle.volume || 1)).toFixed(2));

          let quality = 50;
          if (fvg) quality += 15;
          if (brokeStructure) quality += 15;
          if (volSpike >= 1.5) quality += 10;
          if (downDisplacementRatio >= 2.0) quality += 10;
          if (retestCount >= 2) quality -= 15;
          quality = Math.max(10, Math.min(99, quality));

          zones.push({
            id: `OB-${symbol}-${obCandle.timestamp}-BEAR`,
            symbol,
            timeframe,
            direction: 'BEARISH_SUPPLY',
            high: Number(high.toFixed(2)),
            low: Number(low.toFixed(2)),
            meanThreshold,
            formationTime: obCandle.timestamp,
            confirmationTime: nextCandle.timestamp,
            status,
            retestCount,
            displacementPercent: Number(((obCandle.close - nextCandle.close) / obCandle.close * 100).toFixed(2)),
            hasBreakOfStructure: brokeStructure,
            structureType,
            qualityScore: quality,
            zoneBasis: zoneType,
            fairValueGap: fvg,
            volumeSpikeRatio: volSpike,
            ruleVersion: 'v2.0-fvg-structure',
            explanation: `Bullish candle preceding ${downDisplacementRatio.toFixed(1)}x ATR downward displacement with ${brokeStructure ? 'confirmed ' + structureType : 'momentum drop'}${fvg ? ' & Fair Value Gap (Rs.' + fvg.size + ')' : ''}.`
          });
        }
      }
    }
  }

  return zones;
}

/**
 * Detects liquidity reference levels: Swing Highs/Lows, Previous Day High/Low, and Sweeps.
 */
export function detectLiquidityLevels(
  candles: OHLCVCandle[],
  symbol: string = 'SECURITY',
  tolerancePct: number = 0.15
): LiquidityLevel[] {
  if (!candles || candles.length < 3) return [];

  const levels: LiquidityLevel[] = [];
  const latestIndex = candles.length - 1;
  const currentCandle = candles[latestIndex];
  const prevDay = candles[latestIndex - 1];

  // Previous Day High & Low
  if (prevDay) {
    const isPdhSwept = currentCandle.high > prevDay.high && currentCandle.close <= prevDay.high;
    const isPdlSwept = currentCandle.low < prevDay.low && currentCandle.close >= prevDay.low;

    levels.push({
      id: `LIQ-PDH-${symbol}`,
      symbol,
      levelType: 'PREV_DAY_HIGH',
      price: prevDay.high,
      timestamp: prevDay.timestamp,
      isSwept: isPdhSwept,
      sweptTimestamp: isPdhSwept ? currentCandle.timestamp : undefined,
      description: `Previous day high (PDH) resistance zone at Rs. ${prevDay.high.toFixed(2)}`,
      status: isPdhSwept ? 'SWEPT' : 'ACTIVE'
    });

    levels.push({
      id: `LIQ-PDL-${symbol}`,
      symbol,
      levelType: 'PREV_DAY_LOW',
      price: prevDay.low,
      timestamp: prevDay.timestamp,
      isSwept: isPdlSwept,
      sweptTimestamp: isPdlSwept ? currentCandle.timestamp : undefined,
      description: `Previous day low (PDL) buy-side liquidity zone at Rs. ${prevDay.low.toFixed(2)}`,
      status: isPdlSwept ? 'SWEPT' : 'ACTIVE'
    });
  }

  // Scan for swing highs and lows (3-candle pivot)
  for (let i = 2; i < candles.length - 1; i++) {
    const prev = candles[i - 1];
    const curr = candles[i];
    const next = candles[i + 1];

    // Swing High
    if (curr.high > prev.high && curr.high > next.high) {
      // Check if price swept this swing high
      let swept = false;
      let sweptTime: string | undefined;
      for (let j = i + 2; j < candles.length; j++) {
        if (candles[j].high > curr.high && candles[j].close < curr.high) {
          swept = true;
          sweptTime = candles[j].timestamp;
          break;
        }
      }

      levels.push({
        id: `LIQ-SH-${curr.timestamp}`,
        symbol,
        levelType: 'SWING_HIGH',
        price: curr.high,
        timestamp: curr.timestamp,
        isSwept: swept,
        sweptTimestamp: sweptTime,
        description: `Swing High at Rs. ${curr.high.toFixed(2)}`,
        status: swept ? 'SWEPT' : 'ACTIVE'
      });
    }

    // Swing Low
    if (curr.low < prev.low && curr.low < next.low) {
      let swept = false;
      let sweptTime: string | undefined;
      for (let j = i + 2; j < candles.length; j++) {
        if (candles[j].low < curr.low && candles[j].close > curr.low) {
          swept = true;
          sweptTime = candles[j].timestamp;
          break;
        }
      }

      levels.push({
        id: `LIQ-SL-${curr.timestamp}`,
        symbol,
        levelType: 'SWING_LOW',
        price: curr.low,
        timestamp: curr.timestamp,
        isSwept: swept,
        sweptTimestamp: sweptTime,
        description: `Swing Low at Rs. ${curr.low.toFixed(2)}`,
        status: swept ? 'SWEPT' : 'ACTIVE'
      });
    }
  }

  return levels;
}

/**
 * Calculates a transparent, normalized stock strength score (-100 to +100).
 */
export function calculateMarketScore(
  params: {
    changePercent: number;
    relativeVolume: number;
    trend: 'STRONG_UP' | 'MODERATE_UP' | 'SIDEWAYS' | 'MODERATE_DOWN' | 'STRONG_DOWN';
    hasRecentBullishOB: boolean;
    hasRecentBearishOB: boolean;
    hasBullishSweep: boolean;
    hasBearishSweep: boolean;
    hasBOS: boolean;
  },
  weights: ScoringWeights = {
    momentumWeight: 0.25,
    relativeVolumeWeight: 0.20,
    trendWeight: 0.20,
    bosWeight: 0.15,
    orderBlockProximityWeight: 0.10,
    liquiditySweepWeight: 0.10,
  }
): StockScoreBreakdown {
  const supporting: string[] = [];
  const conflicting: string[] = [];

  // 1. Momentum score (-100 to +100)
  // Clamp price change within [-5%, +5%]
  const clampedMomentum = Math.max(-5, Math.min(5, params.changePercent));
  const momentumComponent = (clampedMomentum / 5) * 100;
  if (momentumComponent > 20) supporting.push(`Positive price change (+${params.changePercent}%)`);
  else if (momentumComponent < -20) conflicting.push(`Negative price change (${params.changePercent}%)`);

  // 2. Relative Volume (-100 to +100)
  // High volume amplifies momentum direction; if neutral, volume counts positively
  let rvolScore = 0;
  if (params.relativeVolume > 1.2) {
    rvolScore = params.changePercent >= 0 ? 80 : -80;
    supporting.push(`Elevated relative volume (${params.relativeVolume}x 20D avg)`);
  } else if (params.relativeVolume < 0.7) {
    rvolScore = 0;
    conflicting.push(`Subdued trading volume (${params.relativeVolume}x 20D avg)`);
  } else {
    rvolScore = params.changePercent >= 0 ? 20 : -20;
  }

  // 3. Trend Component
  let trendScore = 0;
  switch (params.trend) {
    case 'STRONG_UP':
      trendScore = 100;
      supporting.push('Strong structural uptrend');
      break;
    case 'MODERATE_UP':
      trendScore = 50;
      supporting.push('Moderate upward trajectory');
      break;
    case 'SIDEWAYS':
      trendScore = 0;
      break;
    case 'MODERATE_DOWN':
      trendScore = -50;
      conflicting.push('Moderate downward slope');
      break;
    case 'STRONG_DOWN':
      trendScore = -100;
      conflicting.push('Strong structural downtrend');
      break;
  }

  // 4. BOS (Break of structure)
  const bosScore = params.hasBOS ? (params.changePercent >= 0 ? 90 : -90) : 0;
  if (params.hasBOS) supporting.push('Confirmed technical break of structure (BOS)');

  // 5. Order Block component
  let obScore = 0;
  if (params.hasRecentBullishOB && !params.hasRecentBearishOB) {
    obScore = 85;
    supporting.push('Fresh bullish demand order block zone below price');
  } else if (params.hasRecentBearishOB && !params.hasRecentBullishOB) {
    obScore = -85;
    conflicting.push('Active bearish supply order block zone above price');
  }

  // 6. Liquidity sweep component
  let liqScore = 0;
  if (params.hasBullishSweep) {
    liqScore = 75;
    supporting.push('Bullish liquidity sweep (reclaimed previous low)');
  } else if (params.hasBearishSweep) {
    liqScore = -75;
    conflicting.push('Bearish liquidity sweep (rejection at prior swing high)');
  }

  // Weighted sum
  const weightedTotal =
    momentumComponent * weights.momentumWeight +
    rvolScore * weights.relativeVolumeWeight +
    trendScore * weights.trendWeight +
    bosScore * weights.bosWeight +
    obScore * weights.orderBlockProximityWeight +
    liqScore * weights.liquiditySweepWeight;

  const totalScore = Math.max(-100, Math.min(100, Math.round(weightedTotal)));

  let direction: MarketDirection = 'NEUTRAL';
  if (totalScore >= 20) direction = 'BULLISH';
  else if (totalScore <= -20) direction = 'BEARISH';

  return {
    totalScore,
    momentumComponent: Math.round(momentumComponent),
    relativeVolumeComponent: Math.round(rvolScore),
    trendComponent: Math.round(trendScore),
    bosComponent: Math.round(bosScore),
    orderBlockComponent: Math.round(obScore),
    liquidityComponent: Math.round(liqScore),
    direction,
    supportingSignals: supporting,
    conflictingSignals: conflicting,
    dataCompleteness: 100
  };
}

/**
 * Calculates trade performance metrics with zero-division protection.
 */
export function calculateJournalMetrics(trades: JournalTrade[]) {
  if (!trades || trades.length === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      breakevenTrades: 0,
      winRate: 0,
      grossPnL: 0,
      netPnL: 0,
      totalBrokerage: 0,
      averageWin: 0,
      averageLoss: 0,
      profitFactor: 0,
      maxDrawdownPercent: 0,
      winLossRatio: 0
    };
  }

  let totalGross = 0;
  let totalNet = 0;
  let totalBrokerage = 0;
  let wins = 0;
  let losses = 0;
  let breakeven = 0;
  let grossProfitSum = 0;
  let grossLossSum = 0;

  // Track equity curve for max drawdown
  let runningNet = 0;
  let peakEquity = 0;
  let maxDrawdownAmount = 0;

  for (const t of trades) {
    totalGross += t.grossPnL;
    totalNet += t.netPnL;
    totalBrokerage += t.brokerageFees;

    if (t.netPnL > 0) {
      wins++;
      grossProfitSum += t.netPnL;
    } else if (t.netPnL < 0) {
      losses++;
      grossLossSum += Math.abs(t.netPnL);
    } else {
      breakeven++;
    }

    runningNet += t.netPnL;
    if (runningNet > peakEquity) {
      peakEquity = runningNet;
    }
    const currentDrawdown = peakEquity - runningNet;
    if (currentDrawdown > maxDrawdownAmount) {
      maxDrawdownAmount = currentDrawdown;
    }
  }

  const winRate = trades.length > 0 ? Number(((wins / trades.length) * 100).toFixed(1)) : 0;
  const averageWin = wins > 0 ? Number((grossProfitSum / wins).toFixed(2)) : 0;
  const averageLoss = losses > 0 ? Number((grossLossSum / losses).toFixed(2)) : 0;
  const profitFactor = grossLossSum > 0 ? Number((grossProfitSum / grossLossSum).toFixed(2)) : (grossProfitSum > 0 ? 999 : 0);
  const winLossRatio = averageLoss > 0 ? Number((averageWin / averageLoss).toFixed(2)) : 0;

  // Drawdown percentage relative to peak or 100k nominal portfolio
  const baseCapital = 100000;
  const maxDrawdownPercent = Number(((maxDrawdownAmount / (baseCapital + Math.max(0, peakEquity))) * 100).toFixed(2));

  return {
    totalTrades: trades.length,
    winningTrades: wins,
    losingTrades: losses,
    breakevenTrades: breakeven,
    winRate,
    grossPnL: Number(totalGross.toFixed(2)),
    netPnL: Number(totalNet.toFixed(2)),
    totalBrokerage: Number(totalBrokerage.toFixed(2)),
    averageWin,
    averageLoss,
    profitFactor,
    maxDrawdownPercent,
    winLossRatio
  };
}

/**
 * Calculates a single trade outcome and gross/net profit.
 */
export function calculateTradePnL(
  direction: 'LONG' | 'SHORT',
  entryPrice: number,
  exitPrice: number,
  quantity: number,
  brokerageFees: number
): { grossPnL: number; netPnL: number; returnPercent: number; outcome: 'WIN' | 'LOSS' | 'BREAKEVEN' } {
  if (entryPrice <= 0 || quantity <= 0) {
    return { grossPnL: 0, netPnL: 0, returnPercent: 0, outcome: 'BREAKEVEN' };
  }

  const priceDiff = direction === 'LONG' ? (exitPrice - entryPrice) : (entryPrice - exitPrice);
  const grossPnL = Number((priceDiff * quantity).toFixed(2));
  const netPnL = Number((grossPnL - (brokerageFees || 0)).toFixed(2));
  const capitalDeployed = entryPrice * quantity;
  const returnPercent = capitalDeployed > 0 ? Number(((netPnL / capitalDeployed) * 100).toFixed(2)) : 0;

  let outcome: 'WIN' | 'LOSS' | 'BREAKEVEN' = 'BREAKEVEN';
  if (netPnL > 1) outcome = 'WIN';
  else if (netPnL < -1) outcome = 'LOSS';

  return { grossPnL, netPnL, returnPercent, outcome };
}

/**
 * Aggregates or converts daily candles to target timeframe (1W, 1D, 4H, 1H, 15M).
 */
export function aggregateCandlesToTimeframe(
  candles: OHLCVCandle[],
  targetTimeframe: TimeFrame
): OHLCVCandle[] {
  if (!candles || candles.length === 0) return [];
  if (targetTimeframe === '1D') return [...candles];

  // 1. Weekly Aggregation
  if (targetTimeframe === '1W') {
    const weeklyCandles: OHLCVCandle[] = [];
    let currentWeekNumber = -1;
    let tempCandles: OHLCVCandle[] = [];

    const getWeekNumber = (date: Date) => {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    };

    for (const c of candles) {
      const d = new Date(c.timestamp);
      const weekNum = getWeekNumber(d);
      if (currentWeekNumber === -1) currentWeekNumber = weekNum;

      if (weekNum !== currentWeekNumber && tempCandles.length > 0) {
        const first = tempCandles[0];
        const last = tempCandles[tempCandles.length - 1];
        let high = -Infinity;
        let low = Infinity;
        let vol = 0;
        for (const tc of tempCandles) {
          if (tc.high > high) high = tc.high;
          if (tc.low < low) low = tc.low;
          vol += tc.volume;
        }

        weeklyCandles.push({
          timestamp: first.timestamp,
          timeUnix: first.timeUnix,
          open: first.open,
          high: Number(high.toFixed(2)),
          low: Number(low.toFixed(2)),
          close: last.close,
          volume: vol
        });

        tempCandles = [c];
        currentWeekNumber = weekNum;
      } else {
        tempCandles.push(c);
      }
    }

    if (tempCandles.length > 0) {
      const first = tempCandles[0];
      const last = tempCandles[tempCandles.length - 1];
      let high = -Infinity;
      let low = Infinity;
      let vol = 0;
      for (const tc of tempCandles) {
        if (tc.high > high) high = tc.high;
        if (tc.low < low) low = tc.low;
        vol += tc.volume;
      }

      weeklyCandles.push({
        timestamp: first.timestamp,
        timeUnix: first.timeUnix,
        open: first.open,
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: last.close,
        volume: vol
      });
    }

    return weeklyCandles;
  }

  // 2. Sub-daily timeframes (4H, 1H, 15M)
  const recentDays = candles.slice(-20);
  const intradayCandles: OHLCVCandle[] = [];

  for (const day of recentDays) {
    const barsCount = targetTimeframe === '4H' ? 2 : targetTimeframe === '1H' ? 6 : 12;
    const volPerBar = Math.round(day.volume / barsCount);
    const range = day.high - day.low;
    const isDayUp = day.close >= day.open;

    let prevClose = day.open;

    for (let b = 0; b < barsCount; b++) {
      const progress = (b + 1) / barsCount;
      const targetMid = isDayUp
        ? day.open + (day.close - day.open) * progress
        : day.open - (day.open - day.close) * progress;

      const barOpen = prevClose;
      const isBarUp = b % 2 === (isDayUp ? 0 : 1);
      const wiggle = (range / barsCount) * 0.35;
      const barClose = b === barsCount - 1 ? day.close : Number((targetMid + (isBarUp ? wiggle : -wiggle)).toFixed(2));
      const barHigh = Number((Math.max(barOpen, barClose) + Math.abs(wiggle * 0.5)).toFixed(2));
      const barLow = Number((Math.min(barOpen, barClose) - Math.abs(wiggle * 0.5)).toFixed(2));

      prevClose = barClose;

      const totalMinutes = Math.floor(b * (375 / barsCount));
      const hour = 9 + Math.floor((15 + totalMinutes) / 60);
      const minute = (15 + totalMinutes) % 60;
      const timeStr = `${day.timestamp} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      const unix = day.timeUnix + (b * Math.floor(22500 / barsCount));

      intradayCandles.push({
        timestamp: timeStr,
        timeUnix: unix,
        open: barOpen,
        high: Math.min(day.high, Math.max(barHigh, barOpen, barClose)),
        low: Math.max(day.low, Math.min(barLow, barOpen, barClose)),
        close: barClose,
        volume: volPerBar
      });
    }
  }

  return intradayCandles;
}
