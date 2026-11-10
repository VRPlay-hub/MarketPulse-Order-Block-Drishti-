import {
  TrendingUp,
  TrendingDown,
  Layers,
  Box,
  ArrowRight,
  Filter,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import type {
  StockQuote,
  MarketIndexSummary,
  SectorSummary,
  Watchlist,
  JournalTrade,
  DataSourceType
} from '../../types/market.js';
import { DataSourceStatus } from '../common/DataSourceStatus.js';

interface OverviewDashboardProps {
  indices: MarketIndexSummary[];
  stocks: StockQuote[];
  sectors: SectorSummary[];
  watchlists: Watchlist[];
  recentTrades: JournalTrade[];
  dataSource?: DataSourceType;
  onSelectStock: (symbol: string) => void;
  onNavigate: (section: any) => void;
  onOpenImporter: () => void;
}

export function OverviewDashboard({
  indices,
  stocks,
  sectors,
  watchlists,
  recentTrades,
  dataSource = 'DEMO_SYNTHETIC',
  onSelectStock,
  onNavigate,
  onOpenImporter
}: OverviewDashboardProps) {
  const isLive = dataSource === 'LIVE_UPSTOX' || stocks.some(s => s.feedStatus === 'LIVE') || indices.some(i => i.feedStatus === 'LIVE');
  const effectiveDataSource: DataSourceType = isLive ? 'LIVE_UPSTOX' : dataSource;
  const lastUpdatedTime = stocks.find(s => s.lastUpdated)?.lastUpdated || indices.find(i => i.lastUpdated)?.lastUpdated || '15:30 IST';

  const bullishStocks = stocks.filter(s => s.bias === 'BULLISH').sort((a, b) => b.score.totalScore - a.score.totalScore);
  const bearishStocks = stocks.filter(s => s.bias === 'BEARISH').sort((a, b) => a.score.totalScore - b.score.totalScore);
  const neutralCount = stocks.length - bullishStocks.length - bearishStocks.length;

  // Advancing vs Declining
  const advancingStocks = stocks.filter(s => s.change > 0).length;
  const decliningStocks = stocks.filter(s => s.change < 0).length;
  const unchangedStocks = stocks.length - advancingStocks - decliningStocks;

  // Flatten recent order blocks from stocks
  const allOrderBlocks = stocks.flatMap(s => s.activeOrderBlocks).sort((a, b) => b.formationTime.localeCompare(a.formationTime)).slice(0, 6);

  // Strongest and weakest sectors
  const sortedSectors = [...sectors].sort((a, b) => b.changePercent - a.changePercent);
  const topSectors = sortedSectors.slice(0, 3);
  const bottomSectors = [...sortedSectors].reverse().slice(0, 3);

  const defaultWatchlist = watchlists.find(w => w.isDefault) || watchlists[0];
  const watchlistQuotes = defaultWatchlist ? stocks.filter(s => defaultWatchlist.symbols.includes(s.symbol)) : [];

  return (
    <div className="space-y-6">
      {/* Header and Filter strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Indian Market Intelligence Dashboard</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Institutional order flow approximations, liquidity levels & market structure for NSE
          </p>
        </div>

        <div className="flex items-center gap-3">
          <DataSourceStatus dataSource={effectiveDataSource} lastUpdated={lastUpdatedTime} onOpenImporter={onOpenImporter} />
        </div>
      </div>

      {/* Prominent Live / Demo Notice Callout */}
      {effectiveDataSource === 'LIVE_UPSTOX' ? (
        <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-950/40 border border-emerald-600/40 text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-slate-950 uppercase shrink-0">
              LIVE UPSTOX DATA (NSE)
            </span>
            <span className="text-slate-300">
              Connected to Upstox API v2. Real-time institutional quotes, index levels, and order blocks computed from genuine market data.
            </span>
          </div>
          <span className="hidden sm:inline font-mono text-[10px] text-emerald-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            AUTHENTICATED BROKER FEED
          </span>
        </div>
      ) : effectiveDataSource === 'CSV_UPLOADED' ? (
        <div className="flex items-center justify-between p-3 rounded-lg bg-sky-950/40 border border-sky-600/40 text-xs text-sky-200">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500 text-slate-950 uppercase shrink-0">
              CUSTOM CSV DATASET
            </span>
            <span className="text-slate-300">
              Displaying user-uploaded historical OHLCV data. Order block levels and liquidity zones computed locally.
            </span>
          </div>
          <span className="hidden sm:inline font-mono text-[10px] text-sky-400">
            CUSTOM DATASET
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 rounded-lg bg-amber-950/40 border border-amber-600/40 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950 uppercase shrink-0">
              DEMO DATA — NOT LIVE MARKET DATA
            </span>
            <span className="text-slate-300">
              All index levels, quotes, and order block boundaries displayed are synthetic simulations for application testing.
            </span>
          </div>
          <span className="hidden sm:inline font-mono text-[10px] text-amber-400">
            PROD CONNECTIONS OPTIONAL
          </span>
        </div>
      )}

      {/* Index Summary Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {indices.map((idx) => {
          const isUp = idx.change >= 0;
          return (
            <div key={idx.symbol} className="bg-slate-900/60 border border-slate-800 rounded p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{idx.name}</span>
                {idx.isDemoData ? (
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/60">
                    SIMULATED DEMO
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    LIVE FEED
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-white font-mono tabular-nums">
                  Rs. {idx.lastPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className={`text-sm font-semibold font-mono tabular-nums ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isUp ? '+' : ''}{idx.change.toFixed(2)} ({isUp ? '+' : ''}{idx.changePercent}%)
                </span>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Range: Rs. {idx.dayLow.toFixed(0)} - Rs. {idx.dayHigh.toFixed(0)}</span>
                {idx.advancingCount > 0 && (
                  <span>A/D: {idx.advancingCount}/{idx.decliningCount}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Market Breadth & Sentiment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Advance / Decline & Structural Bias */}
        <div className="bg-slate-900/60 border border-slate-800 rounded p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Market Breadth (NSE 50 Universe)</h2>
              <span className="text-[11px] text-slate-400 font-mono">{stocks.length} Tracked</span>
            </div>

            {/* Advance / Decline Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-emerald-400 font-medium">Advances: {advancingStocks}</span>
                <span className="text-slate-400">Unch: {unchangedStocks}</span>
                <span className="text-rose-400 font-medium">Declines: {decliningStocks}</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                <div style={{ width: `${(advancingStocks / stocks.length) * 100}%` }} className="bg-emerald-500 h-full" />
                <div style={{ width: `${(unchangedStocks / stocks.length) * 100}%` }} className="bg-slate-600 h-full" />
                <div style={{ width: `${(decliningStocks / stocks.length) * 100}%` }} className="bg-rose-500 h-full" />
              </div>
            </div>

            {/* Order Block Structural Bias */}
            <div className="mt-5 space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-sky-400 font-medium">Bullish Bias: {bullishStocks.length}</span>
                <span className="text-slate-400">Neutral: {neutralCount}</span>
                <span className="text-amber-400 font-medium">Bearish Bias: {bearishStocks.length}</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                <div style={{ width: `${(bullishStocks.length / stocks.length) * 100}%` }} className="bg-sky-500 h-full" />
                <div style={{ width: `${(neutralCount / stocks.length) * 100}%` }} className="bg-slate-600 h-full" />
                <div style={{ width: `${(bearishStocks.length / stocks.length) * 100}%` }} className="bg-amber-500 h-full" />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Overall Session Tone:</span>
            <span className="text-emerald-400 font-semibold font-mono">MODERATELY BULLISH (+0.60%)</span>
          </div>
        </div>

        {/* Top Bullish Setups */}
        <div className="bg-slate-900/60 border border-slate-800 rounded p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Top Bullish Candidates
            </h2>
            <button
              onClick={() => onNavigate('liquidity')}
              className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
            >
              Liquidity Board <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2">
            {bullishStocks.slice(0, 4).map((s) => (
              <div
                key={s.symbol}
                onClick={() => onSelectStock(s.symbol)}
                className="flex items-center justify-between p-2 rounded hover:bg-slate-800/80 transition-colors cursor-pointer text-xs"
              >
                <div>
                  <div className="font-semibold text-white font-mono">{s.symbol}</div>
                  <div className="text-[11px] text-slate-400">{s.sector}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-emerald-400 font-semibold tabular-nums">+{s.changePercent}%</div>
                  <div className="text-[11px] font-mono text-slate-400">Score: +{s.score.totalScore}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Bearish Setups */}
        <div className="bg-slate-900/60 border border-slate-800 rounded p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-rose-400 uppercase tracking-wide flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" />
              Top Bearish Candidates
            </h2>
            <button
              onClick={() => onNavigate('scanner')}
              className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
            >
              Scanner <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2">
            {bearishStocks.slice(0, 4).map((s) => (
              <div
                key={s.symbol}
                onClick={() => onSelectStock(s.symbol)}
                className="flex items-center justify-between p-2 rounded hover:bg-slate-800/80 transition-colors cursor-pointer text-xs"
              >
                <div>
                  <div className="font-semibold text-white font-mono">{s.symbol}</div>
                  <div className="text-[11px] text-slate-400">{s.sector}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-rose-400 font-semibold tabular-nums">{s.changePercent}%</div>
                  <div className="text-[11px] font-mono text-slate-400">Score: {s.score.totalScore}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sector Relative Strength & Recently Detected Order Blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sector Strength */}
        <div className="bg-slate-900/60 border border-slate-800 rounded p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Sector Dynamics</h2>
            <button
              onClick={() => onNavigate('xray')}
              className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
            >
              Full X-Ray Heatmap <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {sectors.map((sec) => (
              <div key={sec.symbol} className="text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-slate-200">{sec.name}</span>
                  <span className={`font-mono font-semibold tabular-nums ${sec.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {sec.changePercent >= 0 ? '+' : ''}{sec.changePercent}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, Math.max(10, Math.abs(sec.changePercent) * 35))}%` }}
                    className={`h-full ${sec.changePercent >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recently Detected Order Blocks */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Box className="w-4 h-4 text-sky-400" />
              <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
                Recently Detected Order Block Candidates
              </h2>
            </div>
            <button
              onClick={() => onNavigate('orderblocks')}
              className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
            >
              OB Scanner <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] font-mono">
                  <th className="py-2 px-2">Symbol</th>
                  <th className="py-2 px-2">Type</th>
                  <th className="py-2 px-2">Zone Bounds</th>
                  <th className="py-2 px-2">Displacement</th>
                  <th className="py-2 px-2">BOS</th>
                  <th className="py-2 px-2">Status</th>
                  <th className="py-2 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {allOrderBlocks.map((ob) => {
                  const isBull = ob.direction === 'BULLISH_DEMAND';
                  return (
                    <tr key={ob.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-2 font-bold text-white">{ob.symbol}</td>
                      <td className="py-2 px-2">
                        <span className={`text-[11px] font-semibold ${isBull ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isBull ? 'Bull Demand' : 'Bear Supply'}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-slate-300 tabular-nums">
                        Rs. {ob.low} - Rs. {ob.high}
                      </td>
                      <td className="py-2 px-2 text-slate-300 tabular-nums">
                        {ob.displacementPercent}%
                      </td>
                      <td className="py-2 px-2">
                        {ob.hasBreakOfStructure ? (
                          <span className="text-sky-400 font-semibold">Yes</span>
                        ) : (
                          <span className="text-slate-400">No</span>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        <span className={`text-[11px] ${ob.status === 'FRESH' ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                          {ob.status}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <button
                          onClick={() => onSelectStock(ob.symbol)}
                          className="text-[11px] text-sky-400 hover:text-sky-300 hover:underline cursor-pointer"
                        >
                          View Chart
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Watchlist & Journal Activity row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Default Watchlist Quick View */}
        <div className="bg-slate-900/60 border border-slate-800 rounded p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                {defaultWatchlist?.name || 'Watchlist'}
              </h2>
              <span className="text-[11px] text-slate-400">Primary Core Watchlist</span>
            </div>
            <button
              onClick={() => onNavigate('watchlists')}
              className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
            >
              Manage Watchlists <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-800/60">
            {watchlistQuotes.slice(0, 5).map((stock) => (
              <div
                key={stock.symbol}
                onClick={() => onSelectStock(stock.symbol)}
                className="py-2 flex items-center justify-between hover:bg-slate-800/40 px-2 rounded cursor-pointer transition-colors text-xs"
              >
                <div>
                  <span className="font-semibold text-white font-mono">{stock.symbol}</span>
                  <span className="text-slate-400 text-[11px] ml-2">{stock.companyName}</span>
                </div>
                <div className="text-right font-mono tabular-nums">
                  <div className="text-white font-medium">Rs. {stock.lastPrice.toFixed(2)}</div>
                  <div className={`text-[11px] font-semibold ${stock.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {stock.change >= 0 ? '+' : ''}{stock.changePercent}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Journal Activity */}
        <div className="bg-slate-900/60 border border-slate-800 rounded p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                Recent Trading Journal Activity
              </h2>
              <span className="text-[11px] text-slate-400">Performance Log</span>
            </div>
            <button
              onClick={() => onNavigate('journal')}
              className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
            >
              Full Journal <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-800/60">
            {recentTrades.slice(0, 4).map((trade) => {
              const isWin = trade.netPnL > 0;
              return (
                <div key={trade.id} className="py-2 px-2 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white">{trade.symbol}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${trade.direction === 'LONG' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'}`}>
                        {trade.direction}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">{trade.date}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate max-w-xs">{trade.notes}</div>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <div className={`font-semibold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isWin ? '+' : ''}Rs. {trade.netPnL.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      R:R {trade.riskRewardAchieved}x
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
