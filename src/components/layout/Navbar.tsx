import { Sun, Moon, Upload, BookOpen, Menu, UserCheck, LogIn } from 'lucide-react';
import type { MarketIndexSummary, DataSourceType } from '../../types/market.ts';
import type { AppUser } from '../../services/authService.ts';

interface NavbarProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  indices: MarketIndexSummary[];
  dataSource: DataSourceType;
  currentUser: AppUser | null;
  onOpenAuth: () => void;
  onOpenImporter: () => void;
  onOpenGuide: () => void;
  onToggleMobileMenu: () => void;
}

export function Navbar({
  theme,
  onToggleTheme,
  indices,
  dataSource,
  currentUser,
  onOpenAuth,
  onOpenImporter,
  onOpenGuide,
  onToggleMobileMenu
}: NavbarProps) {
  const nifty = indices.find(i => i.symbol === 'NIFTY') || indices[0];
  const bankNifty = indices.find(i => i.symbol === 'BANKNIFTY') || indices[1];
  const vix = indices.find(i => i.symbol === 'VIX') || indices[2];

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-5 py-3 border-b border-slate-800 bg-slate-950/95 backdrop-blur-sm">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-1.5 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <a href="#overview" className="flex items-center gap-2 group text-white">
          <div className="w-6 h-6 rounded bg-sky-500/20 border border-sky-400/40 flex items-center justify-center font-bold text-sky-400 text-xs font-mono">
            MP
          </div>
          <span className="text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0 group-hover:text-sky-400 transition-colors">
            MarketPulse India
          </span>
        </a>
      </div>

      {/* Zone 2: Index Ticker with Prominent Feed Status Label */}
      <div className="hidden md:flex items-center gap-4 text-xs text-slate-300 overflow-x-auto no-scrollbar">
        {dataSource === 'CSV_UPLOADED' ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 font-mono tracking-tight whitespace-nowrap shrink-0 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
            CUSTOM CSV DATASET
          </span>
        ) : nifty?.isDemoData === false ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono tracking-tight whitespace-nowrap shrink-0 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            LIVE UPSTOX BROKER FEED (NSE)
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono tracking-tight whitespace-nowrap shrink-0">
            DEMO DATA — NOT LIVE MARKET DATA
          </span>
        )}

        {nifty && (
          <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0 font-mono">
            <span className="font-semibold text-slate-400">
              {nifty.name} {nifty.isDemoData ? '(Simulated)' : '(Live)'}
            </span>
            <span className="font-medium text-slate-100 tabular-nums">Rs. {nifty.lastPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            <span className={`tabular-nums font-semibold ${nifty.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {nifty.change >= 0 ? '+' : ''}{nifty.changePercent}%
            </span>
          </div>
        )}

        <span className="text-slate-700" aria-hidden="true">|</span>

        {bankNifty && (
          <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0 font-mono">
            <span className="font-semibold text-slate-400">{bankNifty.name}</span>
            <span className="font-medium text-slate-100 tabular-nums">Rs. {bankNifty.lastPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            <span className={`tabular-nums font-semibold ${bankNifty.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {bankNifty.change >= 0 ? '+' : ''}{bankNifty.changePercent}%
            </span>
          </div>
        )}

        {vix && (
          <>
            <span className="text-slate-700" aria-hidden="true">|</span>
            <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0 font-mono">
              <span className="font-semibold text-slate-400">INDIA VIX</span>
              <span className="font-medium text-slate-100 tabular-nums">{vix.lastPrice.toFixed(2)}</span>
              <span className={`tabular-nums font-semibold ${vix.change <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {vix.change >= 0 ? '+' : ''}{vix.changePercent}%
              </span>
            </div>
          </>
        )}
      </div>

      {/* Zone 3: Primary Action + Controls */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenGuide}
          className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded transition-colors whitespace-nowrap cursor-pointer"
          title="Methodology, calculations & risk disclaimer"
          aria-label="Platform Guide"
        >
          <BookOpen className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden md:inline">Platform Guide</span>
        </button>

        <button
          onClick={onOpenImporter}
          className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 rounded transition-colors whitespace-nowrap cursor-pointer shadow-sm"
          title="Import historical OHLCV CSV file"
          aria-label="Import CSV"
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Import CSV</span>
        </button>

        <button
          onClick={onOpenAuth}
          className={`flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer border ${
            currentUser
              ? 'bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border-emerald-700/60'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
          }`}
          title={currentUser ? `Logged in: ${currentUser.displayName}` : 'Sign In / Switch Trader'}
          aria-label="Account & Persistence"
        >
          {currentUser ? (
            <>
              <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-[10px] text-emerald-400 font-bold">
                {currentUser.displayName.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline font-mono">{currentUser.displayName.split(' ')[0]}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </>
          ) : (
            <>
              <LogIn className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Sign In</span>
            </>
          )}
        </button>

        <button
          onClick={onToggleTheme}
          className="p-1.5 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-400" />}
        </button>
      </div>
    </header>
  );
}
