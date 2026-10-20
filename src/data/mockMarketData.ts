import type {
  StockQuote,
  SectorSummary,
  MarketIndexSummary,
  Watchlist,
  JournalTrade,
  OHLCVCandle
} from '../types/market.ts';
import {
  calculatePercentageChange,
  calculateRelativeVolume,
  detectOrderBlocks,
  detectLiquidityLevels,
  calculateMarketScore
} from '../utils/calculations.ts';

// Deterministic seed candle generator to generate realistic continuous 60-day daily series
function generateCandles(
  basePrice: number,
  volatility: number,
  trendBias: number, // -1 to +1
  baseVolume: number,
  count: number = 60
): OHLCVCandle[] {
  const candles: OHLCVCandle[] = [];
  let price = basePrice;
  const startDate = new Date('2026-01-15T09:15:00Z');

  for (let i = 0; i < count; i++) {
    const curDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    // skip weekends
    const day = curDate.getUTCDay();
    if (day === 0 || day === 6) continue;

    const dateStr = curDate.toISOString().split('T')[0];
    const timeUnix = Math.floor(curDate.getTime() / 1000);

    // pseudo-random pseudo-deterministic walk based on index and seed
    const pseudoRandom = Math.sin(i * 12.9898 + basePrice * 0.05) * 43758.5453;
    const norm = (pseudoRandom - Math.floor(pseudoRandom)) - 0.5; // -0.5 to 0.5

    const deltaPercent = (norm * volatility * 2) + (trendBias * 0.25);
    const open = Number((price * (1 + (norm * 0.003))).toFixed(2));
    const close = Number((price * (1 + (deltaPercent / 100))).toFixed(2));
    const high = Number((Math.max(open, close) * (1 + Math.abs(norm) * 0.008)).toFixed(2));
    const low = Number((Math.min(open, close) * (1 - Math.abs(norm) * 0.008)).toFixed(2));
    const volMultiplier = 0.7 + Math.abs(norm) * 1.5;
    const volume = Math.round(baseVolume * volMultiplier);

    candles.push({
      timestamp: dateStr,
      timeUnix,
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

// Generate realistic synthetic stock data for NSE Universe
interface RawStockDefinition {
  symbol: string;
  name: string;
  sector: string;
  marketCapCr: number;
  basePrice: number;
  volatility: number;
  trendBias: number;
  baseVolume: number;
  trend: 'STRONG_UP' | 'MODERATE_UP' | 'SIDEWAYS' | 'MODERATE_DOWN' | 'STRONG_DOWN';
}

const rawStocks: RawStockDefinition[] = [
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', sector: 'Oil & Gas / Conglomerate', marketCapCr: 1985400, basePrice: 2840, volatility: 1.4, trendBias: 0.6, baseVolume: 6500000, trend: 'STRONG_UP' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.', sector: 'Banking & Financials', marketCapCr: 1280000, basePrice: 1720, volatility: 1.2, trendBias: 0.4, baseVolume: 12400000, trend: 'MODERATE_UP' },
  { symbol: 'TCS', name: 'Tata Consultancy Services', sector: 'Information Technology', marketCapCr: 1420000, basePrice: 4180, volatility: 1.3, trendBias: -0.3, baseVolume: 2100000, trend: 'MODERATE_DOWN' },
  { symbol: 'INFY', name: 'Infosys Ltd.', sector: 'Information Technology', marketCapCr: 785000, basePrice: 1890, volatility: 1.7, trendBias: -0.5, baseVolume: 7800000, trend: 'STRONG_DOWN' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd.', sector: 'Banking & Financials', marketCapCr: 890000, basePrice: 1245, volatility: 1.5, trendBias: 0.8, baseVolume: 14200000, trend: 'STRONG_UP' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd.', sector: 'Telecommunications', marketCapCr: 940000, basePrice: 1650, volatility: 1.6, trendBias: 0.7, baseVolume: 5600000, trend: 'STRONG_UP' },
  { symbol: 'SBIN', name: 'State Bank of India', sector: 'Public Sector Banking', marketCapCr: 720000, basePrice: 815, volatility: 1.8, trendBias: 0.5, baseVolume: 18500000, trend: 'MODERATE_UP' },
  { symbol: 'ITC', name: 'ITC Ltd.', sector: 'FMCG & Cigarettes', marketCapCr: 595000, basePrice: 485, volatility: 0.9, trendBias: 0.1, baseVolume: 9200000, trend: 'SIDEWAYS' },
  { symbol: 'LT', name: 'Larsen & Toubro Ltd.', sector: 'Capital Goods & Infra', marketCapCr: 495000, basePrice: 3620, volatility: 1.5, trendBias: 0.6, baseVolume: 2800000, trend: 'STRONG_UP' },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd.', sector: 'FMCG', marketCapCr: 560000, basePrice: 2380, volatility: 1.1, trendBias: -0.2, baseVolume: 1950000, trend: 'SIDEWAYS' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Passenger Ltd.', sector: 'Automobile', marketCapCr: 335000, basePrice: 915, volatility: 2.2, trendBias: 0.9, baseVolume: 15400000, trend: 'STRONG_UP' },
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical Industries', sector: 'Pharmaceuticals', marketCapCr: 425000, basePrice: 1810, volatility: 1.3, trendBias: 0.5, baseVolume: 2400000, trend: 'MODERATE_UP' },
  { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd.', sector: 'Automobile', marketCapCr: 385000, basePrice: 12250, volatility: 1.4, trendBias: 0.2, baseVolume: 650000, trend: 'SIDEWAYS' },
  { symbol: 'TITAN', name: 'Titan Company Ltd.', sector: 'Consumer Durables / Luxury', marketCapCr: 310000, basePrice: 3480, volatility: 1.6, trendBias: -0.4, baseVolume: 1200000, trend: 'MODERATE_DOWN' },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd.', sector: 'Non-Banking Financials', marketCapCr: 440000, basePrice: 7120, volatility: 1.9, trendBias: -0.6, baseVolume: 1800000, trend: 'STRONG_DOWN' },
  { symbol: 'AXISBANK', name: 'Axis Bank Ltd.', sector: 'Banking & Financials', marketCapCr: 365000, basePrice: 1180, volatility: 1.6, trendBias: 0.4, baseVolume: 8900000, trend: 'MODERATE_UP' },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd.', sector: 'Banking & Financials', marketCapCr: 350000, basePrice: 1775, volatility: 1.2, trendBias: 0.1, baseVolume: 4100000, trend: 'SIDEWAYS' },
  { symbol: 'TATASTEEL', name: 'Tata Steel Ltd.', sector: 'Metals & Mining', marketCapCr: 195000, basePrice: 158, volatility: 2.4, trendBias: 0.7, baseVolume: 42000000, trend: 'STRONG_UP' },
  { symbol: 'NTPC', name: 'NTPC Ltd.', sector: 'Power & Utilities', marketCapCr: 395000, basePrice: 410, volatility: 1.5, trendBias: 0.8, baseVolume: 16000000, trend: 'STRONG_UP' },
  { symbol: 'POWERGRID', name: 'Power Grid Corp. of India', sector: 'Power Transmission', marketCapCr: 315000, basePrice: 335, volatility: 1.2, trendBias: 0.5, baseVolume: 14500000, trend: 'MODERATE_UP' },
  { symbol: 'M&M', name: 'Mahindra & Mahindra Ltd.', sector: 'Automobile & Tractors', marketCapCr: 365000, basePrice: 2950, volatility: 1.8, trendBias: 0.8, baseVolume: 4900000, trend: 'STRONG_UP' },
  { symbol: 'CIPLA', name: 'Cipla Ltd.', sector: 'Pharmaceuticals', marketCapCr: 128000, basePrice: 1590, volatility: 1.3, trendBias: 0.3, baseVolume: 1750000, trend: 'MODERATE_UP' },
  { symbol: 'JSWSTEEL', name: 'JSW Steel Ltd.', sector: 'Metals & Mining', marketCapCr: 235000, basePrice: 965, volatility: 2.1, trendBias: 0.6, baseVolume: 6200000, trend: 'STRONG_UP' },
  { symbol: 'ASIANPAINT', name: 'Asian Paints Ltd.', sector: 'Paints & Coatings', marketCapCr: 260000, basePrice: 2720, volatility: 1.5, trendBias: -0.7, baseVolume: 1650000, trend: 'STRONG_DOWN' }
];

export const MOCK_STOCKS: StockQuote[] = rawStocks.map((def) => {
  const candles = generateCandles(def.basePrice, def.volatility, def.trendBias, def.baseVolume, 55);
  const latest = candles[candles.length - 1];
  const previous = candles[candles.length - 2];

  const change = Number((latest.close - previous.close).toFixed(2));
  const changePercent = calculatePercentageChange(latest.close, previous.close);
  const avgVol = Math.round(candles.slice(-20).reduce((acc, c) => acc + c.volume, 0) / 20);
  const relativeVolume = calculateRelativeVolume(latest.volume, avgVol);

  const detectedOBs = detectOrderBlocks(candles, { symbol: def.symbol });
  const detectedLiq = detectLiquidityLevels(candles, def.symbol);

  const hasBullOB = detectedOBs.some(o => o.direction === 'BULLISH_DEMAND' && o.status !== 'INVALIDATED');
  const hasBearOB = detectedOBs.some(o => o.direction === 'BEARISH_SUPPLY' && o.status !== 'INVALIDATED');
  const hasBullSweep = detectedLiq.some(l => l.isSwept && l.levelType.includes('LOW'));
  const hasBearSweep = detectedLiq.some(l => l.isSwept && l.levelType.includes('HIGH'));
  const hasBOS = detectedOBs.some(o => o.hasBreakOfStructure);

  const score = calculateMarketScore({
    changePercent,
    relativeVolume,
    trend: def.trend,
    hasRecentBullishOB: hasBullOB,
    hasRecentBearishOB: hasBearOB,
    hasBullishSweep: hasBullSweep,
    hasBearishSweep: hasBearSweep,
    hasBOS
  });

  return {
    symbol: def.symbol,
    companyName: def.name,
    sector: def.sector,
    marketCapCr: def.marketCapCr,
    lastPrice: latest.close,
    previousClose: previous.close,
    open: latest.open,
    dayHigh: latest.high,
    dayLow: latest.low,
    change,
    changePercent,
    volume: latest.volume,
    avgVolume20D: avgVol,
    relativeVolume,
    volatilityPercent: def.volatility,
    trend: def.trend,
    bias: score.direction,
    score,
    activeOrderBlocks: detectedOBs,
    liquidityLevels: detectedLiq,
    candles1D: candles,
    isDemoData: true,
    demoNotice: 'DEMO DATA — NOT LIVE MARKET DATA'
  };
});

// Indices Overview
export const MOCK_INDICES: MarketIndexSummary[] = [
  {
    name: 'NIFTY 50',
    symbol: 'NIFTY',
    lastPrice: 24892.45,
    change: 148.80,
    changePercent: 0.60,
    dayHigh: 24945.10,
    dayLow: 24780.20,
    advancingCount: 34,
    decliningCount: 15,
    unchangedCount: 1,
    peRatio: 21.8,
    isDemoData: true,
    demoNotice: 'DEMO DATA — NOT LIVE MARKET DATA'
  },
  {
    name: 'NIFTY BANK',
    symbol: 'BANKNIFTY',
    lastPrice: 52410.60,
    change: 395.25,
    changePercent: 0.76,
    dayHigh: 52580.00,
    dayLow: 52080.50,
    advancingCount: 9,
    decliningCount: 3,
    unchangedCount: 0,
    peRatio: 16.4,
    isDemoData: true,
    demoNotice: 'DEMO DATA — NOT LIVE MARKET DATA'
  },
  {
    name: 'INDIA VIX',
    symbol: 'VIX',
    lastPrice: 13.25,
    change: -0.42,
    changePercent: -3.07,
    dayHigh: 13.90,
    dayLow: 13.10,
    advancingCount: 0,
    decliningCount: 0,
    unchangedCount: 0,
    isDemoData: true,
    demoNotice: 'DEMO DATA — NOT LIVE MARKET DATA'
  }
];

// Sector Performance
export const MOCK_SECTORS: SectorSummary[] = [
  { name: 'Nifty Auto', symbol: 'AUTO', changePercent: 1.84, advancing: 12, declining: 3, topGainer: 'TATAMOTORS', topGainerChange: 3.4, topLoser: 'BAJAJ-AUTO', topLoserChange: -0.4, avgVolumeMultiplier: 1.45, sentiment: 'BULLISH', weightInNifty: 6.8 },
  { name: 'Nifty Metal', symbol: 'METAL', changePercent: 1.62, advancing: 10, declining: 5, topGainer: 'TATASTEEL', topGainerChange: 2.8, topLoser: 'HINDALCO', topLoserChange: -0.6, avgVolumeMultiplier: 1.38, sentiment: 'BULLISH', weightInNifty: 3.9 },
  { name: 'Nifty Bank', symbol: 'BANK', changePercent: 0.76, advancing: 9, declining: 3, topGainer: 'ICICIBANK', topGainerChange: 1.9, topLoser: 'INDUSINDBK', topLoserChange: -0.8, avgVolumeMultiplier: 1.15, sentiment: 'BULLISH', weightInNifty: 33.2 },
  { name: 'Nifty Energy', symbol: 'ENERGY', changePercent: 0.65, advancing: 7, declining: 3, topGainer: 'NTPC', topGainerChange: 2.4, topLoser: 'ONGC', topLoserChange: -0.9, avgVolumeMultiplier: 1.22, sentiment: 'BULLISH', weightInNifty: 12.4 },
  { name: 'Nifty Pharma', symbol: 'PHARMA', changePercent: 0.42, advancing: 11, declining: 9, topGainer: 'SUNPHARMA', topGainerChange: 1.5, topLoser: 'DRREDDY', topLoserChange: -1.1, avgVolumeMultiplier: 0.94, sentiment: 'NEUTRAL', weightInNifty: 4.5 },
  { name: 'Nifty FMCG', symbol: 'FMCG', changePercent: -0.28, advancing: 6, declining: 9, topGainer: 'COLPAL', topGainerChange: 0.8, topLoser: 'HINDUNILVR', topLoserChange: -1.2, avgVolumeMultiplier: 0.88, sentiment: 'NEUTRAL', weightInNifty: 8.6 },
  { name: 'Nifty IT', symbol: 'IT', changePercent: -1.15, advancing: 2, declining: 8, topGainer: 'WIPRO', topGainerChange: 0.3, topLoser: 'INFY', topLoserChange: -2.1, avgVolumeMultiplier: 1.35, sentiment: 'BEARISH', weightInNifty: 13.8 }
];

// Default Watchlists
export const INITIAL_WATCHLISTS: Watchlist[] = [
  {
    id: 'wl-core',
    name: 'Institutional F&O Leaders',
    isDefault: true,
    symbols: ['RELIANCE', 'HDFCBANK', 'ICICIBANK', 'TATAMOTORS', 'BHARTIARTL', 'LT'],
    createdAt: '2026-03-01'
  },
  {
    id: 'wl-ob',
    name: 'Order Block Watchlist',
    symbols: ['TATASTEEL', 'NTPC', 'SUNPHARMA', 'M&M', 'JSWSTEEL'],
    createdAt: '2026-03-05'
  },
  {
    id: 'wl-tech',
    name: 'IT & Defensive Reversals',
    symbols: ['TCS', 'INFY', 'ITC', 'ASIANPAINT'],
    createdAt: '2026-03-10'
  }
];

// Initial Trading Journal entries
export const INITIAL_JOURNAL_TRADES: JournalTrade[] = [
  {
    id: 'TRD-101',
    date: '2026-03-10',
    symbol: 'RELIANCE',
    direction: 'LONG',
    entryPrice: 2810.0,
    exitPrice: 2875.0,
    stopLoss: 2780.0,
    targetPrice: 2870.0,
    quantity: 100,
    brokerageFees: 45.0,
    setupCategory: 'ORDER_BLOCK_RETEST',
    notes: 'Bought retest of 4H bullish demand block after 2.1x volume displacement.',
    grossPnL: 6500.0,
    netPnL: 6455.0,
    returnPercent: 2.3,
    riskRewardAchieved: 2.17,
    outcome: 'WIN'
  },
  {
    id: 'TRD-102',
    date: '2026-03-12',
    symbol: 'INFY',
    direction: 'SHORT',
    entryPrice: 1940.0,
    exitPrice: 1895.0,
    stopLoss: 1965.0,
    targetPrice: 1890.0,
    quantity: 150,
    brokerageFees: 50.0,
    setupCategory: 'LIQUIDITY_SWEEP',
    notes: 'Short following sweep of previous day high + rejection wick.',
    grossPnL: 6750.0,
    netPnL: 6700.0,
    returnPercent: 2.3,
    riskRewardAchieved: 1.8,
    outcome: 'WIN'
  },
  {
    id: 'TRD-103',
    date: '2026-03-14',
    symbol: 'BAJFINANCE',
    direction: 'LONG',
    entryPrice: 7220.0,
    exitPrice: 7140.0,
    stopLoss: 7150.0,
    targetPrice: 7380.0,
    quantity: 30,
    brokerageFees: 40.0,
    setupCategory: 'BREAK_OF_STRUCTURE',
    notes: 'Failed continuation after BOS, stop loss triggered as market declined.',
    grossPnL: -2400.0,
    netPnL: -2440.0,
    returnPercent: -1.13,
    riskRewardAchieved: -1.0,
    outcome: 'LOSS'
  },
  {
    id: 'TRD-104',
    date: '2026-03-18',
    symbol: 'TATAMOTORS',
    direction: 'LONG',
    entryPrice: 885.0,
    exitPrice: 924.0,
    stopLoss: 868.0,
    targetPrice: 920.0,
    quantity: 250,
    brokerageFees: 60.0,
    setupCategory: 'ORDER_BLOCK_RETEST',
    notes: 'Bullish order block mitigation with Auto sector leadership.',
    grossPnL: 9750.0,
    netPnL: 9690.0,
    returnPercent: 4.38,
    riskRewardAchieved: 2.29,
    outcome: 'WIN'
  }
];
