import { useState } from 'react';
import { Activity, TrendingUp, TrendingDown, Eye, Filter } from 'lucide-react';
import type { SectorSummary, StockQuote } from '../../types/market.js';

interface MarketXRayProps {
  sectors: SectorSummary[];
  stocks: StockQuote[];
  onSelectStock: (symbol: string) => void;
}

export function MarketXRay({ sectors, stocks, onSelectStock }: MarketXRayProps) {
  const [selectedSectorName, setSelectedSectorName] = useState<string | null>(null);

  // Filter stocks by selected sector if any
  const displayedStocks = selectedSectorName
    ? stocks.filter(s => s.sector.toLowerCase().includes(selectedSectorName.toLowerCase()))
    : stocks;

  const sortedSectors = [...sectors].sort((a, b) => b.changePercent - a.changePercent);

  // Distribution buckets for change %: < -2%, -2 to -1%, -1 to 0%, 0 to 1%, 1 to 2%, > 2%
  const distribution = [
    { label: '< -2%', count: stocks.filter(s => s.changePercent < -2).length, color: 'bg-rose-600' },
    { label: '-2% to -1%', count: stocks.filter(s => s.changePercent >= -2 && s.changePercent < -1).length, color: 'bg-rose-500/80' },
    { label: '-1% to 0%', count: stocks.filter(s => s.changePercent >= -1 && s.changePercent < 0).length, color: 'bg-rose-400/60' },
    { label: '0% to +1%', count: stocks.filter(s => s.changePercent >= 0 && s.changePercent < 1).length, color: 'bg-emerald-400/60' },
    { label: '+1% to +2%', count: stocks.filter(s => s.changePercent >= 1 && s.changePercent < 2).length, color: 'bg-emerald-500/80' },
    { label: '> +2%', count: stocks.filter(s => s.changePercent >= 2).length, color: 'bg-emerald-600' },
  ];

  const maxDistCount = Math.max(...distribution.map(d => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Market X-Ray & Sector Intelligence</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Inter-market sector rotation, advance/decline distribution & institutional liquidity allocation
          </p>
        </div>

        {selectedSectorName && (
          <button
            onClick={() => setSelectedSectorName(null)}
            className="text-xs text-sky-400 hover:text-white bg-slate-900 border border-slate-800 px-3 py-1.5 rounded cursor-pointer"
          >
            Clear Sector Filter ({selectedSectorName})
          </button>
        )}
      </div>

      {/* Prominent Demo Notice Callout */}
      <div className="flex items-center justify-between px-3.5 py-2 rounded bg-amber-950/40 border border-amber-600/40 text-xs text-amber-200">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950 uppercase shrink-0">
            DEMO DATA — NOT LIVE MARKET DATA
          </span>
          <span className="text-slate-300">
            Sector heatmaps, advance/decline ratios, and constituent quotes are synthetic demonstration simulations. Not genuine NSE prices or official index feeds.
          </span>
        </div>
        <span className="font-mono text-amber-400 text-[10px] hidden sm:inline">DEMO SIMULATION</span>
      </div>

      {/* Sector Heatmap Grid */}
      <div className="bg-slate-900/60 border border-slate-800 rounded p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
            NSE Sector Performance Heatmap (Click to Filter Constituents)
          </h2>
          <span className="text-[11px] font-mono text-slate-400">Weighted by Index Representation</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {sortedSectors.map((sec) => {
            const isUp = sec.changePercent >= 0;
            const isSelected = selectedSectorName?.toLowerCase() === sec.name.toLowerCase();
            return (
              <div
                key={sec.symbol}
                onClick={() => setSelectedSectorName(isSelected ? null : sec.name.replace('Nifty ', ''))}
                className={`p-3 rounded border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'ring-2 ring-sky-400 bg-slate-800'
                    : isUp
                    ? 'bg-emerald-950/40 border-emerald-800/60 hover:bg-emerald-900/40'
                    : 'bg-rose-950/40 border-rose-800/60 hover:bg-rose-900/40'
                }`}
              >
                <div>
                  <div className="font-semibold text-xs text-white truncate">{sec.name}</div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Weight: {sec.weightInNifty}%
                  </div>
                </div>

                <div className="mt-4 pt-2 border-t border-slate-800/60">
                  <div className={`text-base font-bold font-mono tabular-nums ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isUp ? '+' : ''}{sec.changePercent}%
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex justify-between">
                    <span>A/D: {sec.advancing}/{sec.declining}</span>
                    <span className="text-slate-400">{sec.avgVolumeMultiplier}x Vol</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Return Distribution Histogram & Volume Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Percentage-Change Distribution */}
        <div className="bg-slate-900/60 border border-slate-800 rounded p-4 space-y-3">
          <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
            NSE 50 Percentage Change Distribution
          </h2>
          <div className="space-y-2 pt-2">
            {distribution.map((bucket) => (
              <div key={bucket.label} className="text-xs font-mono flex items-center gap-3">
                <span className="w-24 text-slate-400 shrink-0">{bucket.label}</span>
                <div className="flex-1 h-4 bg-slate-950 rounded overflow-hidden">
                  <div
                    style={{ width: `${(bucket.count / maxDistCount) * 100}%` }}
                    className={`h-full ${bucket.color} transition-all duration-300`}
                  />
                </div>
                <span className="w-8 text-right text-white font-semibold tabular-nums">{bucket.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Leading vs Lagging Sectors Leaders */}
        <div className="bg-slate-900/60 border border-slate-800 rounded p-4 space-y-3">
          <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
            Sector Gainers & Drags Breakdown
          </h2>
          <div className="divide-y divide-slate-800/60 text-xs">
            {sortedSectors.slice(0, 5).map((sec) => (
              <div key={sec.symbol} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-white font-mono">{sec.name}</span>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>Top: <strong className="text-emerald-400 font-mono">{sec.topGainer} (+{sec.topGainerChange}%)</strong></span>
                    <span>·</span>
                    <span>Drag: <strong className="text-rose-400 font-mono">{sec.topLoser} ({sec.topLoserChange}%)</strong></span>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <span className={`font-bold tabular-nums ${sec.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {sec.changePercent >= 0 ? '+' : ''}{sec.changePercent}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filtered Constituent Stocks Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
            {selectedSectorName ? `Constituents in ${selectedSectorName}` : 'All NSE Constituents'} ({displayedStocks.length})
          </h2>
          {selectedSectorName && (
            <span className="text-[11px] font-mono text-sky-400">Sector Focus Active</span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                <th className="py-2 px-3">Symbol</th>
                <th className="py-2 px-3">Sector</th>
                <th className="py-2 px-3 text-right">Price (Rs.)</th>
                <th className="py-2 px-3 text-right">Change %</th>
                <th className="py-2 px-3 text-right">RelVol</th>
                <th className="py-2 px-3 text-center">Bias</th>
                <th className="py-2 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {displayedStocks.map((stock) => (
                <tr key={stock.symbol} className="hover:bg-slate-800/40">
                  <td className="py-2 px-3 font-bold text-white">{stock.symbol}</td>
                  <td className="py-2 px-3 font-sans text-slate-400">{stock.sector}</td>
                  <td className="py-2 px-3 text-right text-white tabular-nums">Rs. {stock.lastPrice.toFixed(2)}</td>
                  <td className={`py-2 px-3 text-right tabular-nums font-semibold ${stock.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {stock.change >= 0 ? '+' : ''}{stock.changePercent}%
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">{stock.relativeVolume}x</td>
                  <td className="py-2 px-3 text-center">
                    <span className={`text-[10px] px-1.5 py-0.2 rounded ${
                      stock.bias === 'BULLISH' ? 'bg-emerald-950 text-emerald-400' : stock.bias === 'BEARISH' ? 'bg-rose-950 text-rose-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {stock.bias}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button
                      onClick={() => onSelectStock(stock.symbol)}
                      className="text-sky-400 hover:text-sky-300 hover:underline cursor-pointer"
                    >
                      Open Chart
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
