import { useState } from 'react';
import { Bookmark, Plus, Trash2, Eye, ExternalLink, X, Check } from 'lucide-react';
import type { Watchlist, StockQuote } from '../../types/market.js';
import type { AppUser } from '../../services/authService.ts';

interface WatchlistManagerProps {
  watchlists: Watchlist[];
  stocks: StockQuote[];
  currentUser?: AppUser | null;
  onSelectStock: (symbol: string) => void;
  onCreateWatchlist: (name: string) => void;
  onDeleteWatchlist: (id: string) => void;
  onRemoveSymbol: (watchlistId: string, symbol: string) => void;
  onAddSymbol: (watchlistId: string, symbol: string) => void;
}

export function WatchlistManager({
  watchlists,
  stocks,
  currentUser,
  onSelectStock,
  onCreateWatchlist,
  onDeleteWatchlist,
  onRemoveSymbol,
  onAddSymbol
}: WatchlistManagerProps) {
  const [activeWatchlistId, setActiveWatchlistId] = useState<string>(watchlists[0]?.id || '');
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [addSymbolInput, setAddSymbolInput] = useState('');

  const currentWl = watchlists.find(w => w.id === activeWatchlistId) || watchlists[0];
  const wlStocks = currentWl ? stocks.filter(s => currentWl.symbols.includes(s.symbol)) : [];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatchlistName.trim()) return;
    onCreateWatchlist(newWatchlistName.trim());
    setNewWatchlistName('');
    setIsCreating(false);
  };

  const handleAddStock = (symbolToAdd: string) => {
    if (!currentWl || !symbolToAdd) return;
    onAddSymbol(currentWl.id, symbolToAdd);
    setAddSymbolInput('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">Watchlist Manager</h1>
            {currentUser && (
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-mono">
                {currentUser.displayName}&apos;s Watchlists
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Organize institutional equities, monitor real-time rule signals & track priority order block setups
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Watchlist</span>
        </button>
      </div>

      {/* Live / Demo Notice Callout */}
      {stocks.some(s => s.feedStatus === 'LIVE' || s.isDemoData === false) ? (
        <div className="flex items-center justify-between px-3.5 py-2 rounded bg-emerald-950/40 border border-emerald-600/40 text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-slate-950 uppercase shrink-0">
              LIVE UPSTOX MARKET DATA (NSE)
            </span>
            <span className="text-slate-300">
              Watchlist constituent prices, volume statistics, and algorithmic scores calculated from live Upstox data.
            </span>
          </div>
          <span className="font-mono text-emerald-400 text-[10px] hidden sm:inline flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            LIVE BROKER STREAM
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between px-3.5 py-2 rounded bg-amber-950/40 border border-amber-600/40 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950 uppercase shrink-0">
              DEMO DATA — NOT LIVE MARKET DATA
            </span>
            <span className="text-slate-300">
              Watchlist constituent prices, volume baselines, and institutional scoring are simulated demonstration values. Not live NSE market quotes.
            </span>
          </div>
          <span className="font-mono text-amber-400 text-[10px] hidden sm:inline">DEMO SIMULATION</span>
        </div>
      )}

      {/* Watchlist Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-1">
        {watchlists.map(wl => (
          <button
            key={wl.id}
            onClick={() => setActiveWatchlistId(wl.id)}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeWatchlistId === wl.id
                ? 'border-sky-400 text-sky-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {wl.name} ({wl.symbols.length})
          </button>
        ))}
      </div>

      {/* New Watchlist Inline Form */}
      {isCreating && (
        <form onSubmit={handleCreate} className="bg-slate-900 border border-slate-800 p-4 rounded flex items-center gap-3">
          <input
            type="text"
            placeholder="Watchlist name (e.g. Breakout Candidates)..."
            value={newWatchlistName}
            onChange={(e) => setNewWatchlistName(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            autoFocus
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-sky-600 text-white rounded text-xs font-semibold cursor-pointer"
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => setIsCreating(false)}
            className="px-3 py-1.5 text-slate-400 hover:text-white text-xs cursor-pointer"
          >
            Cancel
          </button>
        </form>
      )}

      {/* Current Watchlist Controls */}
      {currentWl && (
        <div className="bg-slate-900/60 border border-slate-800 rounded p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white">{currentWl.name}</h2>
              <span className="text-[11px] text-slate-400 font-mono">
                {currentWl.symbols.length} Constituents · Created {currentWl.createdAt}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Quick Add Symbol */}
              <select
                value={addSymbolInput}
                onChange={(e) => handleAddStock(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-white rounded px-3 py-1.5 focus:outline-none focus:border-sky-500"
              >
                <option value="">+ Add stock to list...</option>
                {stocks
                  .filter(s => !currentWl.symbols.includes(s.symbol))
                  .map(s => (
                    <option key={s.symbol} value={s.symbol}>
                      {s.symbol} ({s.companyName})
                    </option>
                  ))}
              </select>

              {!currentWl.isDefault && (
                <button
                  onClick={() => onDeleteWatchlist(currentWl.id)}
                  className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-slate-800 rounded cursor-pointer"
                  title="Delete Watchlist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Table of stocks in this watchlist */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                  <th className="py-2.5 px-3">Symbol</th>
                  <th className="py-2.5 px-3">Sector</th>
                  <th className="py-2.5 px-3 text-right">Price (Rs.)</th>
                  <th className="py-2.5 px-3 text-right">Change %</th>
                  <th className="py-2.5 px-3 text-right">RelVol</th>
                  <th className="py-2.5 px-3 text-center">Score</th>
                  <th className="py-2.5 px-3 text-center">Bias</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {wlStocks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500 font-sans">
                      This watchlist is empty. Add symbols using the dropdown above.
                    </td>
                  </tr>
                ) : (
                  wlStocks.map(stock => {
                    const isUp = stock.change >= 0;
                    return (
                      <tr key={stock.symbol} className="hover:bg-slate-800/40">
                        <td className="py-2 px-3 font-bold text-white">
                          <button
                            onClick={() => onSelectStock(stock.symbol)}
                            className="hover:text-sky-400 hover:underline cursor-pointer"
                          >
                            {stock.symbol}
                          </button>
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-400">{stock.sector}</td>
                        <td className="py-2 px-3 text-right text-white tabular-nums">
                          Rs. {stock.lastPrice.toFixed(2)}
                        </td>
                        <td className={`py-2 px-3 text-right font-semibold tabular-nums ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isUp ? '+' : ''}{stock.changePercent}%
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">{stock.relativeVolume}x</td>
                        <td className="py-2 px-3 text-center tabular-nums font-semibold">
                          <span className={stock.score.totalScore > 0 ? 'text-emerald-400' : stock.score.totalScore < 0 ? 'text-rose-400' : 'text-slate-400'}>
                            {stock.score.totalScore > 0 ? '+' : ''}{stock.score.totalScore}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                            stock.bias === 'BULLISH'
                              ? 'bg-emerald-950 text-emerald-400'
                              : stock.bias === 'BEARISH'
                              ? 'bg-rose-950 text-rose-400'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {stock.bias}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => onSelectStock(stock.symbol)}
                              className="text-sky-400 hover:text-white"
                              title="Open Chart"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onRemoveSymbol(currentWl.id, stock.symbol)}
                              className="text-slate-500 hover:text-rose-400"
                              title="Remove from watchlist"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
