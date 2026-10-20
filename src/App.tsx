import { useState, useEffect, useCallback } from 'react';
import type { NavSection } from './components/layout/Sidebar.js';
import { Navbar } from './components/layout/Navbar.js';
import { Sidebar } from './components/layout/Sidebar.js';
import { RiskDisclaimerBanner } from './components/common/RiskDisclaimerBanner.js';
import { OverviewDashboard } from './components/overview/OverviewDashboard.js';
import { MarketScanner } from './components/scanner/MarketScanner.js';
import { OrderBlockScanner } from './components/orderblocks/OrderBlockScanner.js';
import { LiquidityBoard } from './components/liquidity/LiquidityBoard.js';
import { MarketXRay } from './components/xray/MarketXRay.js';
import { StockChartWorkspace } from './components/chart/StockChartWorkspace.js';
import { WatchlistManager } from './components/watchlists/WatchlistManager.js';
import { TradingJournal } from './components/journal/TradingJournal.js';
import { HistoricalAnalysis } from './components/historical/HistoricalAnalysis.js';
import { SettingsDataSources } from './components/settings/SettingsDataSources.js';
import { CsvImporterModal } from './components/importer/CsvImporterModal.js';
import { PublicOverviewModal } from './components/common/PublicOverviewModal.js';
import { AuthModal } from './components/auth/AuthModal.js';

import {
  MOCK_STOCKS,
  MOCK_INDICES,
  MOCK_SECTORS,
  INITIAL_WATCHLISTS,
  INITIAL_JOURNAL_TRADES
} from './data/mockMarketData.js';
import type {
  StockQuote,
  Watchlist,
  JournalTrade,
  DataSourceType,
  OHLCVCandle
} from './types/market.js';
import {
  detectOrderBlocks,
  detectLiquidityLevels,
  calculateMarketScore,
  calculatePercentageChange,
  calculateRelativeVolume
} from './utils/calculations.js';
import {
  initializeAuth,
  subscribeAuth,
  type AppUser
} from './services/authService.ts';
import {
  getUserWatchlists,
  saveUserWatchlists,
  deleteUserWatchlist,
  getUserTrades,
  saveUserTrade,
  deleteUserTrade,
  getUserChartPreferences,
  saveUserChartPreferences,
  type UserChartPreferences
} from './services/persistenceService.ts';
import { testConnection } from './services/firebase.ts';
import { fetchMarketQuotes } from './services/marketDataClient.ts';

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [currentSection, setCurrentSection] = useState<NavSection>('overview');
  const [activeSymbol, setActiveSymbol] = useState<string>('RELIANCE');
  const [stocks, setStocks] = useState<StockQuote[]>(MOCK_STOCKS);
  const [dataSource, setDataSource] = useState<DataSourceType>('DEMO_SYNTHETIC');

  // Authentication & Persistence State
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(true);
  const [watchlists, setWatchlists] = useState<Watchlist[]>(INITIAL_WATCHLISTS);
  const [trades, setTrades] = useState<JournalTrade[]>(INITIAL_JOURNAL_TRADES);
  const [chartPreferences, setChartPreferences] = useState<UserChartPreferences | undefined>(undefined);

  // Modals
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Check Firestore connection and fetch initial market quotes via server proxy
  useEffect(() => {
    testConnection().then(status => {
      setIsCloudConnected(status);
    });
    fetchMarketQuotes().then(latestQuotes => {
      if (latestQuotes && latestQuotes.length > 0) {
        setStocks(latestQuotes);
      }
    });
  }, []);

  // Initialize and subscribe to Auth changes
  useEffect(() => {
    const unsubInit = initializeAuth();
    const unsubSub = subscribeAuth((user) => {
      setCurrentUser(user);
    });
    return () => {
      unsubInit();
      unsubSub();
    };
  }, []);

  // Load user data whenever currentUser changes
  const loadUserData = useCallback(async (user: AppUser | null) => {
    const uid = user ? user.uid : 'guest_default';
    const isCloud = user?.provider === 'firebase-google';

    try {
      const userWls = await getUserWatchlists(uid, isCloud);
      if (userWls && userWls.length > 0) {
        setWatchlists(userWls);
      } else {
        setWatchlists(INITIAL_WATCHLISTS);
      }

      const userTrades = await getUserTrades(uid, isCloud);
      if (userTrades && userTrades.length > 0) {
        setTrades(userTrades);
      } else if (!user) {
        setTrades(INITIAL_JOURNAL_TRADES);
      } else {
        setTrades([]);
      }

      const prefs = await getUserChartPreferences(uid, isCloud);
      if (prefs) {
        setChartPreferences(prefs);
        if (prefs.defaultSymbol && stocks.some(s => s.symbol === prefs.defaultSymbol)) {
          setActiveSymbol(prefs.defaultSymbol);
        }
      }
    } catch (err) {
      console.error('Error loading partitioned user records:', err);
    }
  }, [stocks]);

  useEffect(() => {
    loadUserData(currentUser);
  }, [currentUser, loadUserData]);

  // Sync theme with HTML root class
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Navigate to Stock Chart with selected stock
  const handleSelectStock = (symbol: string) => {
    setActiveSymbol(symbol);
    setCurrentSection('chart');
  };

  // Watchlist handlers with user persistence
  const handleCreateWatchlist = async (name: string) => {
    const newWl: Watchlist = {
      id: `wl-${Date.now()}`,
      name,
      symbols: [],
      createdAt: new Date().toISOString().split('T')[0]
    };
    const updated = [...watchlists, newWl];
    setWatchlists(updated);

    const uid = currentUser ? currentUser.uid : 'guest_default';
    const isCloud = currentUser?.provider === 'firebase-google';
    await saveUserWatchlists(uid, updated, isCloud);
  };

  const handleDeleteWatchlist = async (id: string) => {
    const updated = watchlists.filter(w => w.id !== id);
    setWatchlists(updated);

    const uid = currentUser ? currentUser.uid : 'guest_default';
    const isCloud = currentUser?.provider === 'firebase-google';
    await deleteUserWatchlist(uid, id, isCloud);
  };

  const handleAddSymbolToWatchlist = async (watchlistId: string, symbol: string) => {
    const updated = watchlists.map(w => {
      if (w.id === watchlistId && !w.symbols.includes(symbol)) {
        return { ...w, symbols: [...w.symbols, symbol] };
      }
      return w;
    });
    setWatchlists(updated);

    const uid = currentUser ? currentUser.uid : 'guest_default';
    const isCloud = currentUser?.provider === 'firebase-google';
    await saveUserWatchlists(uid, updated, isCloud);
  };

  const handleRemoveSymbolFromWatchlist = async (watchlistId: string, symbol: string) => {
    const updated = watchlists.map(w => {
      if (w.id === watchlistId) {
        return { ...w, symbols: w.symbols.filter(s => s !== symbol) };
      }
      return w;
    });
    setWatchlists(updated);

    const uid = currentUser ? currentUser.uid : 'guest_default';
    const isCloud = currentUser?.provider === 'firebase-google';
    await saveUserWatchlists(uid, updated, isCloud);
  };

  // Journal handlers with user persistence and calculations
  const handleAddTrade = async (newTrade: JournalTrade) => {
    const uid = currentUser ? currentUser.uid : 'guest_default';
    const isCloud = currentUser?.provider === 'firebase-google';

    try {
      const persisted = await saveUserTrade(uid, newTrade, isCloud);
      setTrades(prev => [persisted, ...prev]);
    } catch (err) {
      console.error('Failed to persist trade:', err);
      setTrades(prev => [newTrade, ...prev]);
    }
  };

  const handleDeleteTrade = async (id: string) => {
    const uid = currentUser ? currentUser.uid : 'guest_default';
    const isCloud = currentUser?.provider === 'firebase-google';

    try {
      await deleteUserTrade(uid, id, isCloud);
    } catch (err) {
      console.error('Failed to delete trade from database:', err);
    }
    setTrades(prev => prev.filter(t => t.id !== id));
  };

  // Chart Preferences persistence
  const handleSavePreferences = async (partialPrefs: Partial<UserChartPreferences>) => {
    const uid = currentUser ? currentUser.uid : 'guest_default';
    const isCloud = currentUser?.provider === 'firebase-google';

    try {
      const saved = await saveUserChartPreferences(uid, partialPrefs, isCloud);
      setChartPreferences(saved);
    } catch (err) {
      console.error('Failed to save chart preferences:', err);
    }
  };

  // CSV Import Success
  const handleImportSuccess = (symbol: string, candles: OHLCVCandle[]) => {
    if (candles.length < 2) return;

    const latest = candles[candles.length - 1];
    const previous = candles[candles.length - 2];
    const change = Number((latest.close - previous.close).toFixed(2));
    const changePercent = calculatePercentageChange(latest.close, previous.close);
    const avgVol = Math.round(candles.slice(-20).reduce((acc, c) => acc + c.volume, 0) / Math.min(20, candles.length));
    const relativeVolume = calculateRelativeVolume(latest.volume, avgVol);

    const detectedOBs = detectOrderBlocks(candles, { symbol });
    const detectedLiq = detectLiquidityLevels(candles, symbol);

    const score = calculateMarketScore({
      changePercent,
      relativeVolume,
      trend: 'MODERATE_UP',
      hasRecentBullishOB: detectedOBs.some(o => o.direction === 'BULLISH_DEMAND'),
      hasRecentBearishOB: detectedOBs.some(o => o.direction === 'BEARISH_SUPPLY'),
      hasBullishSweep: detectedLiq.some(l => l.isSwept && l.levelType.includes('LOW')),
      hasBearishSweep: detectedLiq.some(l => l.isSwept && l.levelType.includes('HIGH')),
      hasBOS: detectedOBs.some(o => o.hasBreakOfStructure)
    });

    const newStock: StockQuote = {
      symbol,
      companyName: `${symbol} (Custom CSV Import)`,
      sector: 'Custom Upload',
      marketCapCr: 50000,
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
      volatilityPercent: 1.5,
      trend: 'MODERATE_UP',
      bias: score.direction,
      score,
      activeOrderBlocks: detectedOBs,
      liquidityLevels: detectedLiq,
      candles1D: candles
    };

    setStocks(prev => [newStock, ...prev.filter(s => s.symbol !== symbol)]);
    setDataSource('CSV_UPLOADED');
    setActiveSymbol(symbol);
    setCurrentSection('chart');
  };

  const handleResetData = () => {
    setStocks(MOCK_STOCKS);
    setDataSource('DEMO_SYNTHETIC');
    setActiveSymbol('RELIANCE');
    setWatchlists(INITIAL_WATCHLISTS);
    setTrades(INITIAL_JOURNAL_TRADES);
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} flex flex-col font-sans selection:bg-sky-500 selection:text-white`}>
      {/* Risk Notice Banner */}
      <RiskDisclaimerBanner />

      {/* Top Navbar */}
      <Navbar
        theme={theme}
        onToggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
        indices={MOCK_INDICES}
        dataSource={dataSource}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenImporter={() => setIsImporterOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentSection={currentSection}
          onSelectSection={(section) => setCurrentSection(section)}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          activeSymbol={activeSymbol}
        />

        {/* Dynamic Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {currentSection === 'overview' && (
              <OverviewDashboard
                indices={MOCK_INDICES}
                stocks={stocks}
                sectors={MOCK_SECTORS}
                watchlists={watchlists}
                recentTrades={trades}
                onSelectStock={handleSelectStock}
                onNavigate={(sec) => setCurrentSection(sec)}
                onOpenImporter={() => setIsImporterOpen(true)}
              />
            )}

            {currentSection === 'scanner' && (
              <MarketScanner
                stocks={stocks}
                watchlists={watchlists}
                onSelectStock={handleSelectStock}
                onAddToWatchlist={handleAddSymbolToWatchlist}
              />
            )}

            {currentSection === 'orderblocks' && (
              <OrderBlockScanner
                stocks={stocks}
                onSelectStock={handleSelectStock}
              />
            )}

            {currentSection === 'liquidity' && (
              <LiquidityBoard
                stocks={stocks}
                onSelectStock={handleSelectStock}
              />
            )}

            {currentSection === 'xray' && (
              <MarketXRay
                sectors={MOCK_SECTORS}
                stocks={stocks}
                onSelectStock={handleSelectStock}
              />
            )}

            {currentSection === 'chart' && (
              <StockChartWorkspace
                stocks={stocks}
                selectedSymbol={activeSymbol}
                onSelectSymbol={(sym) => setActiveSymbol(sym)}
                preferences={chartPreferences}
                onSavePreferences={handleSavePreferences}
              />
            )}

            {currentSection === 'watchlists' && (
              <WatchlistManager
                watchlists={watchlists}
                stocks={stocks}
                currentUser={currentUser}
                onSelectStock={handleSelectStock}
                onCreateWatchlist={handleCreateWatchlist}
                onDeleteWatchlist={handleDeleteWatchlist}
                onRemoveSymbol={handleRemoveSymbolFromWatchlist}
                onAddSymbol={handleAddSymbolToWatchlist}
              />
            )}

            {currentSection === 'journal' && (
              <TradingJournal
                trades={trades}
                stocks={stocks}
                currentUser={currentUser}
                onAddTrade={handleAddTrade}
                onDeleteTrade={handleDeleteTrade}
                onSelectStock={handleSelectStock}
              />
            )}

            {currentSection === 'historical' && (
              <HistoricalAnalysis
                stocks={stocks}
                onSelectStock={handleSelectStock}
              />
            )}

            {currentSection === 'settings' && (
              <SettingsDataSources
                dataSource={dataSource}
                onOpenImporter={() => setIsImporterOpen(true)}
                onResetData={handleResetData}
              />
            )}
          </div>
        </main>
      </div>

      {/* Authentication & User Account Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        isCloudConnected={isCloudConnected}
        onUserChanged={(user) => {
          setCurrentUser(user);
          loadUserData(user);
        }}
      />

      {/* CSV Import Modal */}
      <CsvImporterModal
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        onImportSuccess={handleImportSuccess}
      />

      {/* Public Overview & Platform Guide Modal */}
      <PublicOverviewModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}
