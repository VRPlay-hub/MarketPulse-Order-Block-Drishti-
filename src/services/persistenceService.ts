import {
  db,
  handleFirestoreError,
  OperationType
} from './firebase.ts';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import type { Watchlist, JournalTrade } from '../types/market.ts';
import { calculateTradePnL } from '../utils/calculations.ts';

export interface UserChartPreferences {
  id: string;
  userId: string;
  defaultSymbol: string;
  timeframe: string;
  showOrderBlocks: boolean;
  showLiquidity: boolean;
  showSMA: boolean;
  showVolume: boolean;
  candleStyle: 'candles' | 'hollow' | 'line';
  updatedAt: string;
}

export interface JournalPerformanceStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  winRatePercent: number;
  grossPnL: number;
  totalCosts: number;
  netPnL: number;
  profitFactor: number;
  averageTradePnL: number;
  largestWin: number;
  largestLoss: number;
  longTradeCount: number;
  shortTradeCount: number;
  setupAttribution: Record<string, { count: number; netPnL: number; winRate: number }>;
}

const DEFAULT_PREFERENCES: (userId: string) => UserChartPreferences = (userId) => ({
  id: 'default',
  userId,
  defaultSymbol: 'RELIANCE',
  timeframe: '1D',
  showOrderBlocks: true,
  showLiquidity: true,
  showSMA: true,
  showVolume: true,
  candleStyle: 'candles',
  updatedAt: new Date().toISOString()
});

/**
 * Storage key partitioning helper guaranteeing zero cross-user pollution
 */
function getStorageKey(userId: string, collectionName: string): string {
  if (!userId || userId.trim() === '') {
    throw new Error('Authorization violation: userId must be specified for partitioned persistence.');
  }
  return `marketpulse_user_${userId}_${collectionName}`;
}

// ==================== WATCHLISTS ====================

export async function getUserWatchlists(userId: string, isCloudAuth = false): Promise<Watchlist[]> {
  if (!userId) return [];

  // Try Firestore if cloud-authenticated
  if (isCloudAuth) {
    const colPath = `users/${userId}/watchlists`;
    try {
      const snap = await getDocs(collection(db, colPath));
      if (!snap.empty) {
        const cloudWatchlists: Watchlist[] = [];
        snap.forEach(d => cloudWatchlists.push(d.data() as Watchlist));
        // Cache locally for offline resilience
        localStorage.setItem(getStorageKey(userId, 'watchlists'), JSON.stringify(cloudWatchlists));
        return cloudWatchlists;
      }
    } catch (err) {
      console.warn('Could not read watchlists from Cloud Firestore, falling back to local store:', err);
      try {
        handleFirestoreError(err, OperationType.LIST, colPath);
      } catch {
        // Continue to local fallback
      }
    }
  }

  // Local partitioned store
  const stored = localStorage.getItem(getStorageKey(userId, 'watchlists'));
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse cached watchlists:', e);
    }
  }

  // Default seed list for new user
  const initial: Watchlist[] = [
    {
      id: 'wl_default_' + userId.slice(0, 8),
      name: 'NIFTY Bluechips',
      isDefault: true,
      symbols: ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK'],
      createdAt: new Date().toISOString()
    }
  ];
  localStorage.setItem(getStorageKey(userId, 'watchlists'), JSON.stringify(initial));
  return initial;
}

export async function saveUserWatchlists(userId: string, watchlists: Watchlist[], isCloudAuth = false): Promise<void> {
  if (!userId) throw new Error('Cannot save watchlist: Unauthenticated user.');

  // Validate every watchlist
  for (const w of watchlists) {
    if (!w.id || !w.name || !Array.isArray(w.symbols)) {
      throw new Error(`Invalid watchlist schema for ${w.id}`);
    }
  }

  // Save partitioned locally
  localStorage.setItem(getStorageKey(userId, 'watchlists'), JSON.stringify(watchlists));

  // Sync to Firestore if cloud authenticated
  if (isCloudAuth) {
    for (const wl of watchlists) {
      const docPath = `users/${userId}/watchlists/${wl.id}`;
      try {
        await setDoc(doc(db, 'users', userId, 'watchlists', wl.id), {
          ...wl,
          userId,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, docPath);
      }
    }
  }
}

export async function deleteUserWatchlist(userId: string, watchlistId: string, isCloudAuth = false): Promise<void> {
  const current = await getUserWatchlists(userId, false);
  const updated = current.filter(w => w.id !== watchlistId);
  localStorage.setItem(getStorageKey(userId, 'watchlists'), JSON.stringify(updated));

  if (isCloudAuth) {
    const docPath = `users/${userId}/watchlists/${watchlistId}`;
    try {
      await deleteDoc(doc(db, 'users', userId, 'watchlists', watchlistId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, docPath);
    }
  }
}

// ==================== TRADING JOURNAL ====================

export async function getUserTrades(userId: string, isCloudAuth = false): Promise<JournalTrade[]> {
  if (!userId) return [];

  if (isCloudAuth) {
    const colPath = `users/${userId}/trades`;
    try {
      const snap = await getDocs(collection(db, colPath));
      if (!snap.empty) {
        const cloudTrades: JournalTrade[] = [];
        snap.forEach(d => cloudTrades.push(d.data() as JournalTrade));
        localStorage.setItem(getStorageKey(userId, 'trades'), JSON.stringify(cloudTrades));
        return cloudTrades;
      }
    } catch (err) {
      console.warn('Could not read trades from Cloud Firestore, falling back to local store:', err);
      try {
        handleFirestoreError(err, OperationType.LIST, colPath);
      } catch {
        // Fallback
      }
    }
  }

  const stored = localStorage.getItem(getStorageKey(userId, 'trades'));
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse cached trades:', e);
    }
  }

  return [];
}

export async function saveUserTrade(
  userId: string,
  trade: Omit<JournalTrade, 'grossPnL' | 'netPnL' | 'returnPercent' | 'riskRewardAchieved' | 'outcome'>,
  isCloudAuth = false
): Promise<JournalTrade> {
  if (!userId) throw new Error('Authorization violation: userId required to record a trade.');

  // Validate parameters
  if (trade.entryPrice <= 0 || trade.exitPrice <= 0 || trade.quantity <= 0) {
    throw new Error('Trade prices and quantity must be greater than zero.');
  }

  // Calculate calculations rigorously
  const pnl = calculateTradePnL(
    trade.direction,
    trade.entryPrice,
    trade.exitPrice,
    trade.quantity,
    trade.brokerageFees || 0
  );

  const riskPerShare = Math.abs(trade.entryPrice - (trade.stopLoss || trade.entryPrice * 0.98));
  const rewardPerShare = Math.abs(trade.exitPrice - trade.entryPrice);
  const riskRewardAchieved = riskPerShare > 0 ? Number((rewardPerShare / riskPerShare).toFixed(2)) : 1;

  const fullTrade: JournalTrade = {
    ...trade,
    brokerageFees: trade.brokerageFees || 0,
    grossPnL: pnl.grossPnL,
    netPnL: pnl.netPnL,
    returnPercent: pnl.returnPercent,
    riskRewardAchieved,
    outcome: pnl.outcome
  };

  // Update local partitioned store
  const existing = await getUserTrades(userId, false);
  const index = existing.findIndex(t => t.id === fullTrade.id);
  const updated = index >= 0
    ? [...existing.slice(0, index), fullTrade, ...existing.slice(index + 1)]
    : [fullTrade, ...existing];

  localStorage.setItem(getStorageKey(userId, 'trades'), JSON.stringify(updated));

  // Sync to Firestore if cloud auth
  if (isCloudAuth) {
    const docPath = `users/${userId}/trades/${fullTrade.id}`;
    try {
      await setDoc(doc(db, 'users', userId, 'trades', fullTrade.id), {
        ...fullTrade,
        userId,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, docPath);
    }
  }

  return fullTrade;
}

export async function deleteUserTrade(userId: string, tradeId: string, isCloudAuth = false): Promise<void> {
  const current = await getUserTrades(userId, false);
  const updated = current.filter(t => t.id !== tradeId);
  localStorage.setItem(getStorageKey(userId, 'trades'), JSON.stringify(updated));

  if (isCloudAuth) {
    const docPath = `users/${userId}/trades/${tradeId}`;
    try {
      await deleteDoc(doc(db, 'users', userId, 'trades', tradeId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, docPath);
    }
  }
}

// ==================== CHART PREFERENCES ====================

export async function getUserChartPreferences(userId: string, isCloudAuth = false): Promise<UserChartPreferences> {
  if (!userId) return DEFAULT_PREFERENCES('guest');

  if (isCloudAuth) {
    const docPath = `users/${userId}/preferences/chart`;
    try {
      const snap = await getDocs(collection(db, `users/${userId}/preferences`));
      if (!snap.empty) {
        const found = snap.docs.find(d => d.id === 'chart');
        if (found) {
          const pref = found.data() as UserChartPreferences;
          localStorage.setItem(getStorageKey(userId, 'preferences'), JSON.stringify(pref));
          return pref;
        }
      }
    } catch (err) {
      console.warn('Could not fetch preferences from Firestore, falling back to local store:', err);
    }
  }

  const stored = localStorage.getItem(getStorageKey(userId, 'preferences'));
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse cached preferences:', e);
    }
  }

  const defaultPref = DEFAULT_PREFERENCES(userId);
  localStorage.setItem(getStorageKey(userId, 'preferences'), JSON.stringify(defaultPref));
  return defaultPref;
}

export async function saveUserChartPreferences(
  userId: string,
  prefs: Partial<UserChartPreferences>,
  isCloudAuth = false
): Promise<UserChartPreferences> {
  const current = await getUserChartPreferences(userId, false);
  const updated: UserChartPreferences = {
    ...current,
    ...prefs,
    userId,
    updatedAt: new Date().toISOString()
  };

  localStorage.setItem(getStorageKey(userId, 'preferences'), JSON.stringify(updated));

  if (isCloudAuth) {
    const docPath = `users/${userId}/preferences/chart`;
    try {
      await setDoc(doc(db, 'users', userId, 'preferences', 'chart'), updated);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, docPath);
    }
  }

  return updated;
}

// ==================== STATS CALCULATION ====================

export function calculateJournalPerformanceStats(trades: JournalTrade[]): JournalPerformanceStats {
  if (!trades || trades.length === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      breakevenTrades: 0,
      winRatePercent: 0,
      grossPnL: 0,
      totalCosts: 0,
      netPnL: 0,
      profitFactor: 0,
      averageTradePnL: 0,
      largestWin: 0,
      largestLoss: 0,
      longTradeCount: 0,
      shortTradeCount: 0,
      setupAttribution: {}
    };
  }

  let winning = 0;
  let losing = 0;
  let breakeven = 0;
  let grossPnL = 0;
  let totalCosts = 0;
  let netPnL = 0;
  let grossWins = 0;
  let grossLosses = 0;
  let largestWin = 0;
  let largestLoss = 0;
  let longCount = 0;
  let shortCount = 0;
  const setupAttribution: Record<string, { count: number; netPnL: number; wins: number; winRate: number }> = {};

  trades.forEach(t => {
    grossPnL += t.grossPnL;
    totalCosts += t.brokerageFees || 0;
    netPnL += t.netPnL;

    if (t.direction === 'LONG') longCount++;
    if (t.direction === 'SHORT') shortCount++;

    if (t.netPnL > 0) {
      winning++;
      grossWins += t.netPnL;
      if (t.netPnL > largestWin) largestWin = t.netPnL;
    } else if (t.netPnL < 0) {
      losing++;
      grossLosses += Math.abs(t.netPnL);
      if (t.netPnL < largestLoss) largestLoss = t.netPnL;
    } else {
      breakeven++;
    }

    // Setup breakdown
    const setup = t.setupCategory || 'OTHER';
    if (!setupAttribution[setup]) {
      setupAttribution[setup] = { count: 0, netPnL: 0, wins: 0, winRate: 0 };
    }
    setupAttribution[setup].count++;
    setupAttribution[setup].netPnL += t.netPnL;
    if (t.netPnL > 0) setupAttribution[setup].wins++;
  });

  // Calculate rates
  const winRatePercent = trades.length > 0 ? Number(((winning / trades.length) * 100).toFixed(1)) : 0;
  const profitFactor = grossLosses > 0 ? Number((grossWins / grossLosses).toFixed(2)) : (grossWins > 0 ? 99.99 : 0);
  const averageTradePnL = Number((netPnL / trades.length).toFixed(2));

  const finalAttribution: Record<string, { count: number; netPnL: number; winRate: number }> = {};
  Object.keys(setupAttribution).forEach(key => {
    const item = setupAttribution[key];
    finalAttribution[key] = {
      count: item.count,
      netPnL: Number(item.netPnL.toFixed(2)),
      winRate: Number(((item.wins / item.count) * 100).toFixed(1))
    };
  });

  return {
    totalTrades: trades.length,
    winningTrades: winning,
    losingTrades: losing,
    breakevenTrades: breakeven,
    winRatePercent,
    grossPnL: Number(grossPnL.toFixed(2)),
    totalCosts: Number(totalCosts.toFixed(2)),
    netPnL: Number(netPnL.toFixed(2)),
    profitFactor,
    averageTradePnL,
    largestWin: Number(largestWin.toFixed(2)),
    largestLoss: Number(largestLoss.toFixed(2)),
    longTradeCount: longCount,
    shortTradeCount: shortCount,
    setupAttribution: finalAttribution
  };
}
