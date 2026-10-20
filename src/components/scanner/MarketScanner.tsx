import { useState, useMemo } from 'react';
import {
  Search,
  Download,
  Filter,
  ArrowUpDown,
  Plus,
  Eye,
  Info,
  Check,
  X
} from 'lucide-react';
import type { StockQuote, MarketDirection, Watchlist } from '../../types/market.js';

interface MarketScannerProps {
  stocks: StockQuote[];
  watchlists: Watchlist[];
  onSelectStock: (symbol: string) => void;
  onAddToWatchlist: (watchlistId: string, symbol: string) => void;
}

type SortField = 'symbol' | 'lastPrice' | 'changePercent' | 'volume' | 'relativeVolume' | 'score' | 'volatilityPercent';

export function MarketScanner({
  stocks,
  watchlists,
  onSelectStock,
  onAddToWatchlist
}: MarketScannerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [selectedBias, setSelectedBias] = useState<string>('ALL');
  const [minRelVol, setMinRelVol] = useState<number>(0);
  const [preset, setPreset] = useState<'ALL' | 'VOLUME_SURGE' | 'BULL_DEMAND' | 'BEAR_SUPPLY' | 'LIQ_SWEPT'>('ALL');
  const [sortField, setSortField] = useState<SortField>('changePercent');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [selectedStockForDetail, setSelectedStockForDetail] = useState<StockQuote | null>(null);
  const [addedToast, setAddedToast] = useState<string | null>(null);

  // Unique sectors
  const sectors = useMemo(() => {
    return Array.from(new Set(stocks.map(s => s.sector))).sort();
  }, [stocks]);

  // Filtered & sorted stocks
  const filteredStocks = useMemo(() => {
    return stocks.filter((stock) => {
      const matchQuery =
        stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stock.companyName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchSector = selectedSector === 'ALL' || stock.sector === selectedSector;
      const matchBias = selectedBias === 'ALL' || stock.bias === selectedBias;
      const matchRelVol = stock.relativeVolume >= minRelVol;

      // Preset filters
      let matchPreset = true;
      if (preset === 'VOLUME_SURGE') {
        matchPreset = stock.relativeVolume >= 1.4;
      } else if (preset === 'BULL_DEMAND') {
        matchPreset = stock.activeOrderBlocks.some(ob => ob.direction === 'BULLISH_DEMAND' && ob.status === 'FRESH');
      } else if (preset === 'BEAR_SUPPLY') {
        matchPreset = stock.activeOrderBlocks.some(ob => ob.direction === 'BEARISH_SUPPLY');
      } else if (preset === 'LIQ_SWEPT') {
        matchPreset = stock.liquidityLevels.some(l => l.isSwept);
      }

      return matchQuery && matchSector && matchBias && matchRelVol && matchPreset;
    }).sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'score') {
        valA = a.score.totalScore;
        valB = b.score.totalScore;
      }

      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? (valA - valB) : (valB - valA);
    });
  }, [stocks, searchQuery, selectedSector, selectedBias, minRelVol, sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Symbol',
      'Company Name',
      'Sector',
      'Last Price',
      'Change %',
      'Volume',
      'Relative Volume',
      'Trend',
      'Bias',
      'Score (-100 to 100)',
      'Volatility %'
    ];

    const rows = filteredStocks.map(s => [
      s.symbol,
      `"${s.companyName}"`,
      `"${s.sector}"`,
      s.lastPrice,
      s.changePercent,
      s.volume,
      s.relativeVolume,
      s.trend,
      s.bias,
      s.score.totalScore,
      s.volatilityPercent
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `marketpulse_scanner_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddSymbol = (wlId: string, sym: string) => {
    onAddToWatchlist(wlId, sym);
    setAddedToast(`Added ${sym} to watchlist`);
    setTimeout(() => setAddedToast(null), 2500);
  };

  return (
    <div className="space-y-5">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">NSE Market Scanner</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time rule filtering by relative volume, percentage displacement, structural trend & momentum score
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-700 rounded hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Prominent Demo Data Banner */}
      <div className="flex items-center justify-between px-3.5 py-2 rounded bg-amber-950/40 border border-amber-600/40 text-xs text-amber-200">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950 uppercase shrink-0">
            DEMO DATA — NOT LIVE MARKET DATA
          </span>
          <span className="text-slate-300">
            Scanner results evaluate simulated prices and synthetic volume metrics for testing. Not genuine live NSE quotes.
          </span>
        </div>
        <span className="font-mono text-amber-400 text-[10px] hidden sm:inline">DEMO SIMULATION</span>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded p-3.5 space-y-3">
        {/* Preset Quick Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono">
          <span className="text-slate-500 text-[11px] uppercase mr-1 whitespace-nowrap">Presets:</span>
          {[
            { id: 'ALL', label: 'All Equities' },
            { id: 'VOLUME_SURGE', label: 'Volume Surge (≥1.4x)' },
            { id: 'BULL_DEMAND', label: 'Fresh Bull Demand' },
            { id: 'BEAR_SUPPLY', label: 'Supply Zones' },
            { id: 'LIQ_SWEPT', label: 'Liquidity Swept' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPreset(tab.id as any)}
              className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap cursor-pointer ${
                preset === tab.id
                  ? 'bg-sky-600 text-white font-semibold'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Symbol / Name Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search symbol (e.g. RELIANCE)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>

          {/* Sector Filter */}
          <div>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Sectors</option>
              {sectors.map((sec) => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>

          {/* Bias Filter */}
          <div>
            <select
              value={selectedBias}
              onChange={(e) => setSelectedBias(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Bias Signals</option>
              <option value="BULLISH">Bullish Bias (Score &ge; +20)</option>
              <option value="BEARISH">Bearish Bias (Score &le; -20)</option>
              <option value="NEUTRAL">Neutral Bias</option>
            </select>
          </div>

          {/* Relative Volume Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 whitespace-nowrap">Min RelVol:</span>
            <div className="flex items-center gap-1">
              {[0, 1.0, 1.5, 2.0].map((rv) => (
                <button
                  key={rv}
                  onClick={() => setMinRelVol(rv)}
                  className={`px-2 py-1 text-xs font-mono rounded cursor-pointer ${
                    minRelVol === rv
                      ? 'bg-sky-500 text-white font-semibold'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  {rv === 0 ? 'All' : `${rv}x`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Calculation footnote */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>Formula: % Change = ((LastPrice - PrevClose) / PrevClose) × 100</span>
          <span>Showing {filteredStocks.length} of {stocks.length} stocks</span>
        </div>
      </div>

      {/* Added Toast */}
      {addedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-950 border border-emerald-700 text-emerald-200 text-xs px-4 py-2.5 rounded shadow-lg flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{addedToast}</span>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px] font-mono bg-slate-950/60">
                <th
                  onClick={() => handleSort('symbol')}
                  className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Symbol <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-2.5 px-3">Company Name</th>
                <th className="py-2.5 px-3">Sector</th>
                <th
                  onClick={() => handleSort('lastPrice')}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    Last Price (Rs.) <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('changePercent')}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    Change % <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('volume')}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    Volume <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('relativeVolume')}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    Rel Vol <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('score')}
                  className="py-2.5 px-3 text-center cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    Score (-100..+100) <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-2.5 px-3 text-center">Bias</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredStocks.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500 font-sans">
                    No stocks matching the current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredStocks.map((stock) => {
                  const isUp = stock.change >= 0;
                  return (
                    <tr
                      key={stock.symbol}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="py-2 px-3 font-bold text-white">
                        <button
                          onClick={() => setSelectedStockForDetail(stock)}
                          className="hover:text-sky-400 hover:underline cursor-pointer text-left"
                        >
                          {stock.symbol}
                        </button>
                      </td>
                      <td className="py-2 px-3 font-sans text-slate-300 max-w-[180px] truncate">
                        {stock.companyName}
                      </td>
                      <td className="py-2 px-3 font-sans text-slate-400 text-[11px] max-w-[140px] truncate">
                        {stock.sector}
                      </td>
                      <td className="py-2 px-3 text-right text-white font-medium tabular-nums">
                        Rs. {stock.lastPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className={`py-2 px-3 text-right font-semibold tabular-nums ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isUp ? '+' : ''}{stock.changePercent}%
                      </td>
                      <td className="py-2 px-3 text-right text-slate-400 tabular-nums text-[11px]">
                        {(stock.volume / 100000).toFixed(2)}L
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                          stock.relativeVolume >= 1.5 ? 'bg-amber-950/80 text-amber-300 border border-amber-800' : 'text-slate-300'
                        }`}>
                          {stock.relativeVolume}x
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center tabular-nums">
                        <span className={`font-semibold ${
                          stock.score.totalScore > 0 ? 'text-emerald-400' : stock.score.totalScore < 0 ? 'text-rose-400' : 'text-slate-400'
                        }`}>
                          {stock.score.totalScore > 0 ? '+' : ''}{stock.score.totalScore}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          stock.bias === 'BULLISH'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : stock.bias === 'BEARISH'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {stock.bias}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectStock(stock.symbol)}
                            className="p-1 text-sky-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                            title="Open in Stock Chart Workspace"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {watchlists.length > 0 && (
                            <button
                              onClick={() => handleAddSymbol(watchlists[0].id, stock.symbol)}
                              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                              title={`Add to ${watchlists[0].name}`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* Stock Detail Drawer Modal */}
      {selectedStockForDetail && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-lg bg-slate-950 border-l border-slate-800 h-full p-6 overflow-y-auto flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-xl font-bold text-white font-mono">{selectedStockForDetail.symbol}</h2>
                  <p className="text-xs text-slate-400">{selectedStockForDetail.companyName}</p>
                </div>
                <button
                  onClick={() => setSelectedStockForDetail(null)}
                  className="p-1 text-slate-400 hover:text-white rounded"
                  aria-label="Close drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Price & Score Grid */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-slate-900/80 p-3 rounded border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-mono">Last Price</span>
                  <div className="text-lg font-bold text-white font-mono tabular-nums">
                    Rs. {selectedStockForDetail.lastPrice.toFixed(2)}
                  </div>
                  <div className={`text-xs font-semibold font-mono ${selectedStockForDetail.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {selectedStockForDetail.change >= 0 ? '+' : ''}{selectedStockForDetail.changePercent}%
                  </div>
                </div>

                <div className="bg-slate-900/80 p-3 rounded border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-mono">Normalized Strength Score</span>
                  <div className={`text-lg font-bold font-mono tabular-nums ${selectedStockForDetail.score.totalScore >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {selectedStockForDetail.score.totalScore > 0 ? '+' : ''}{selectedStockForDetail.score.totalScore}/100
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    Bias: {selectedStockForDetail.bias}
                  </div>
                </div>
              </div>

              {/* Score Component Breakdown */}
              <div className="mt-5 space-y-2">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Score Components</h3>
                <div className="bg-slate-900/50 p-3 rounded border border-slate-800 space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Momentum (25% weight):</span>
                    <span className="text-white">{selectedStockForDetail.score.momentumComponent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Relative Volume (20% weight):</span>
                    <span className="text-white">{selectedStockForDetail.score.relativeVolumeComponent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Structural Trend (20% weight):</span>
                    <span className="text-white">{selectedStockForDetail.score.trendComponent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Break of Structure (15% weight):</span>
                    <span className="text-white">{selectedStockForDetail.score.bosComponent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Order Block Proximity (10% weight):</span>
                    <span className="text-white">{selectedStockForDetail.score.orderBlockComponent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Liquidity Sweep (10% weight):</span>
                    <span className="text-white">{selectedStockForDetail.score.liquidityComponent}</span>
                  </div>
                </div>
              </div>

              {/* Supporting & Conflicting Signals */}
              <div className="mt-5 space-y-3">
                <div>
                  <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-1.5">
                    Supporting Signals ({selectedStockForDetail.score.supportingSignals.length})
                  </h4>
                  {selectedStockForDetail.score.supportingSignals.length === 0 ? (
                    <div className="text-xs text-slate-500 font-sans">No strong bullish factors identified.</div>
                  ) : (
                    <ul className="space-y-1 text-xs text-slate-300">
                      {selectedStockForDetail.score.supportingSignals.map((sig, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-emerald-400" aria-hidden="true">✓</span>
                          <span>{sig}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-rose-400 uppercase tracking-wide mb-1.5">
                    Conflicting / Bearish Signals ({selectedStockForDetail.score.conflictingSignals.length})
                  </h4>
                  {selectedStockForDetail.score.conflictingSignals.length === 0 ? (
                    <div className="text-xs text-slate-500 font-sans">No contradictory factors detected.</div>
                  ) : (
                    <ul className="space-y-1 text-xs text-slate-300">
                      {selectedStockForDetail.score.conflictingSignals.map((sig, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-rose-400" aria-hidden="true">✕</span>
                          <span>{sig}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800 flex gap-3">
              <button
                onClick={() => {
                  onSelectStock(selectedStockForDetail.symbol);
                  setSelectedStockForDetail(null);
                }}
                className="flex-1 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded transition-colors cursor-pointer"
              >
                Open Full Candlestick Chart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
