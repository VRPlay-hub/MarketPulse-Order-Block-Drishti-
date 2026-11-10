export type MarketDirection = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

export type TimeFrame = '15M' | '1H' | '4H' | '1D' | '1W';

export interface OHLCVCandle {
  timestamp: string; // ISO string or YYYY-MM-DD
  timeUnix: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type OrderBlockType = 'BULLISH_DEMAND' | 'BEARISH_SUPPLY';

export interface FairValueGap {
  id: string;
  symbol: string;
  direction: 'BULLISH' | 'BEARISH';
  high: number;
  low: number;
  formationTime: string;
  isFilled: boolean;
}

export interface OrderBlockZone {
  id: string;
  symbol: string;
  timeframe: TimeFrame;
  direction: OrderBlockType;
  high: number; // upper boundary
  low: number; // lower boundary
  meanThreshold: number; // 50% midpoint
  formationTime: string;
  confirmationTime: string;
  status: 'FRESH' | 'TESTED' | 'MITIGATED' | 'INVALIDATED';
  retestCount: number;
  displacementPercent: number;
  hasBreakOfStructure: boolean;
  structureType?: 'BOS' | 'CHOCH';
  qualityScore?: number; // 0 to 100
  zoneBasis?: 'BODY_ONLY' | 'FULL_RANGE' | 'FULL_CANDLE';
  fairValueGap?: { high: number; low: number; size: number };
  volumeSpikeRatio: number;
  ruleVersion: string;
  explanation: string;
}

export interface LiquidityLevel {
  id: string;
  symbol: string;
  levelType: 'EQUAL_HIGHS' | 'EQUAL_LOWS' | 'SWING_HIGH' | 'SWING_LOW' | 'PREV_DAY_HIGH' | 'PREV_DAY_LOW' | 'PREV_WEEK_HIGH' | 'PREV_WEEK_LOW';
  price: number;
  timestamp: string;
  isSwept: boolean;
  sweptTimestamp?: string;
  description: string;
  status: 'ACTIVE' | 'SWEPT' | 'RECLAIMED';
}

export interface ScoringWeights {
  momentumWeight: number; // default 0.25
  relativeVolumeWeight: number; // default 0.20
  trendWeight: number; // default 0.20
  bosWeight: number; // default 0.15
  orderBlockProximityWeight: number; // default 0.10
  liquiditySweepWeight: number; // default 0.10
}

export interface StockScoreBreakdown {
  totalScore: number; // -100 to +100
  momentumComponent: number;
  relativeVolumeComponent: number;
  trendComponent: number;
  bosComponent: number;
  orderBlockComponent: number;
  liquidityComponent: number;
  direction: MarketDirection;
  supportingSignals: string[];
  conflictingSignals: string[];
  dataCompleteness: number; // percentage
}

export interface StockQuote {
  symbol: string;
  companyName: string;
  sector: string;
  marketCapCr: number; // in Crores
  lastPrice: number;
  previousClose: number;
  open: number;
  dayHigh: number;
  dayLow: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume20D: number;
  relativeVolume: number;
  volatilityPercent: number;
  trend: 'STRONG_UP' | 'MODERATE_UP' | 'SIDEWAYS' | 'MODERATE_DOWN' | 'STRONG_DOWN';
  bias: MarketDirection;
  score: StockScoreBreakdown;
  activeOrderBlocks: OrderBlockZone[];
  liquidityLevels: LiquidityLevel[];
  candles1D: OHLCVCandle[];
  candles1H?: OHLCVCandle[];
  isDemoData?: boolean;
  demoNotice?: string;
  feedStatus?: 'LIVE' | 'DELAYED' | 'HISTORICAL' | 'STALE' | 'SIMULATED';
  lastUpdated?: string;
  dataSource?: string;
}

export interface SectorSummary {
  name: string;
  symbol: string;
  changePercent: number;
  advancing: number;
  declining: number;
  topGainer: string;
  topGainerChange: number;
  topLoser: string;
  topLoserChange: number;
  avgVolumeMultiplier: number;
  sentiment: MarketDirection;
  weightInNifty: number;
}

export interface MarketIndexSummary {
  name: string;
  symbol: string;
  lastPrice: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  advancingCount: number;
  decliningCount: number;
  unchangedCount: number;
  peRatio?: number;
  isDemoData?: boolean;
  demoNotice?: string;
  feedStatus?: 'LIVE' | 'DELAYED' | 'HISTORICAL' | 'STALE' | 'SIMULATED';
  lastUpdated?: string;
  dataSource?: string;
}

export interface Watchlist {
  id: string;
  name: string;
  isDefault?: boolean;
  symbols: string[];
  createdAt: string;
}

export interface JournalTrade {
  id: string;
  date: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  targetPrice: number;
  quantity: number;
  brokerageFees: number;
  setupCategory: 'ORDER_BLOCK_RETEST' | 'LIQUIDITY_SWEEP' | 'BREAK_OF_STRUCTURE' | 'TREND_CONTINUATION' | 'MEAN_REVERSION';
  notes: string;
  grossPnL: number;
  netPnL: number;
  returnPercent: number;
  riskRewardAchieved: number;
  outcome: 'WIN' | 'LOSS' | 'BREAKEVEN';
}

export type StrategyDirection = 'LONG_ONLY' | 'SHORT_ONLY' | 'BOTH';
export type StopLossMode = 'ZONE_BOUNDARY' | 'ATR_BUFFER';
export type PositionSizingMode = 'EQUITY_PERCENT' | 'FIXED_QUANTITY';
export type CollisionResolution = 'CONSERVATIVE_STOP_FIRST' | 'OPEN_PROXIMITY';

export interface BacktestParams {
  symbol: string;
  timeframe?: TimeFrame;
  startDate?: string;
  endDate?: string;
  initialCapital: number;
  strategyDirection?: StrategyDirection;
  stopLossMode?: StopLossMode;
  stopLossBufferPercent?: number;
  atrPeriod?: number;
  atrMultiplier?: number;
  positionSizingMode?: PositionSizingMode;
  riskPerTradePercent: number;
  fixedQuantity?: number;
  minDisplacementPercent?: number;
  minDisplacementMultiplier?: number;
  requireBOS?: boolean;
  targetMultiplier: number; // e.g. 2 for 1:2 R:R
  brokeragePerTrade: number;
  slippagePercent: number;
  maxHoldingBars?: number;
  collisionResolution?: CollisionResolution;
}

export interface BacktestTradeResult {
  id: string;
  symbol?: string;
  entryDate: string;
  exitDate: string;
  holdingBars?: number;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  stopLoss?: number;
  targetPrice?: number;
  quantity: number;
  grossProfit: number;
  brokerageCosts?: number;
  netProfit: number;
  returnPct: number;
  pnlCumulative: number;
  riskRewardAchieved?: number;
  reason: 'TARGET_HIT' | 'STOP_HIT' | 'MAX_HOLDING_REACHED' | 'INVALIDATED';
  isWin: boolean;
  collisionOccurred?: boolean;
}

export interface BacktestSummary {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades?: number;
  winRate: number;
  grossProfit: number;
  netProfit: number;
  totalBrokerage: number;
  profitFactor: number;
  maxDrawdownPercent: number;
  maxDrawdownAmount?: number;
  averageTradePnL: number;
  averageWin?: number;
  averageLoss?: number;
  winLossRatio?: number;
  averageRiskReward?: number;
  longTradesCount?: number;
  longWinRate?: number;
  longNetProfit?: number;
  shortTradesCount?: number;
  shortWinRate?: number;
  shortNetProfit?: number;
  equityCurve: { date: string; equity: number; drawdown?: number }[];
}

export type DataSourceType = 'DEMO_SYNTHETIC' | 'CSV_UPLOADED' | 'LIVE_UPSTOX' | 'EXTERNAL_API_STUB';
