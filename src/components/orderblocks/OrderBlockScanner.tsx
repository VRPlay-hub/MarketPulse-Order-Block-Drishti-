import { useState, useMemo } from 'react';
import { Box, Filter, Eye, ArrowUpDown, Info, ShieldAlert } from 'lucide-react';
import type { StockQuote, OrderBlockZone, OrderBlockType } from '../../types/market.js';

interface OrderBlockScannerProps {
  stocks: StockQuote[];
  onSelectStock: (symbol: string) => void;
}

export function OrderBlockScanner({ stocks, onSelectStock }: OrderBlockScannerProps) {
  const [directionFilter, setDirectionFilter] = useState<'ALL' | OrderBlockType>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [requireBOS, setRequireBOS] = useState<boolean>(false);
  const [minDisplacement, setMinDisplacement] = useState<number>(0);
  const [selectedOBDetail, setSelectedOBDetail] = useState<OrderBlockZone | null>(null);

  // Aggregate all order blocks from the stocks
  const allOrderBlocks = useMemo(() => {
    return stocks.flatMap(s => s.activeOrderBlocks);
  }, [stocks]);

  // Filtered order blocks
  const filteredOBs = useMemo(() => {
    return allOrderBlocks.filter(ob => {
      const matchDir = directionFilter === 'ALL' || ob.direction === directionFilter;
      const matchStatus = statusFilter === 'ALL' || ob.status === statusFilter;
      const matchBOS = !requireBOS || ob.hasBreakOfStructure;
      const matchDisp = Math.abs(ob.displacementPercent) >= minDisplacement;
      return matchDir && matchStatus && matchBOS && matchDisp;
    }).sort((a, b) => b.formationTime.localeCompare(a.formationTime));
  }, [allOrderBlocks, directionFilter, statusFilter, requireBOS, minDisplacement]);

  const freshBullishCount = allOrderBlocks.filter(ob => ob.direction === 'BULLISH_DEMAND' && ob.status === 'FRESH').length;
  const freshBearishCount = allOrderBlocks.filter(ob => ob.direction === 'BEARISH_SUPPLY' && ob.status === 'FRESH').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">Rule-Based Order Block Scanner</h1>
            <span className="text-[11px] font-mono bg-sky-950 text-sky-400 border border-sky-800 px-2 py-0.5 rounded">
              Engine v1.2
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Algorithmic identification of qualifying displacement clusters & structural imbalances across Indian equities
          </p>
        </div>

        {/* Quick count chips */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded flex items-center gap-2">
            <span className="text-emerald-400 font-semibold">{freshBullishCount} Fresh Bullish Demand</span>
            <span className="text-slate-600">|</span>
            <span className="text-rose-400 font-semibold">{freshBearishCount} Fresh Bearish Supply</span>
          </div>
        </div>
      </div>

      {/* Live / Demo Data Banner */}
      {stocks.some(s => s.feedStatus === 'LIVE' || s.isDemoData === false) ? (
        <div className="flex items-center justify-between px-3.5 py-2 rounded bg-emerald-950/40 border border-emerald-600/40 text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-slate-950 uppercase shrink-0">
              LIVE UPSTOX MARKET DATA (NSE)
            </span>
            <span className="text-slate-300">
              Order block zones, displacement metrics, and mitigation states calculated from live NSE market data.
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
              Order block boundaries, mitigation statuses, and retests are calculated from simulated historical candles.
            </span>
          </div>
          <span className="font-mono text-amber-400 text-[10px] hidden sm:inline">DEMO SIMULATION</span>
        </div>
      )}

      {/* Explanatory callout (Anti-slop, clean hairline) */}
      <div className="bg-slate-900/50 border border-slate-800 rounded p-3 text-xs text-slate-300 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-200">Algorithmic Methodology Note:</p>
          <p className="text-slate-400">
            Order blocks are analytical approximations identifying the last contrary candle prior to an aggressive price displacement exceeding 1.6x ATR. They represent structural areas of interest and possible liquidity imbalances rather than confirmed institutional orders.
          </p>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded p-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Direction Filter */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded border border-slate-800">
            <button
              onClick={() => setDirectionFilter('ALL')}
              className={`px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
                directionFilter === 'ALL' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setDirectionFilter('BULLISH_DEMAND')}
              className={`px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
                directionFilter === 'BULLISH_DEMAND' ? 'bg-emerald-950 text-emerald-400 font-medium border border-emerald-800' : 'text-slate-400 hover:text-emerald-300'
              }`}
            >
              Bullish Demand
            </button>
            <button
              onClick={() => setDirectionFilter('BEARISH_SUPPLY')}
              className={`px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
                directionFilter === 'BEARISH_SUPPLY' ? 'bg-rose-950 text-rose-400 font-medium border border-rose-800' : 'text-slate-400 hover:text-rose-300'
              }`}
            >
              Bearish Supply
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-white rounded px-3 py-1.5 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="FRESH">Fresh (Untested)</option>
            <option value="TESTED">Tested (Active)</option>
            <option value="MITIGATED">Mitigated</option>
          </select>

          {/* BOS Toggle */}
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={requireBOS}
              onChange={(e) => setRequireBOS(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-sky-600 focus:ring-0"
            />
            <span>Require Confirmed BOS</span>
          </label>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Showing {filteredOBs.length} zones
        </div>
      </div>

      {/* Order Block Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px] font-mono bg-slate-950/60">
                <th className="py-2.5 px-3">Symbol</th>
                <th className="py-2.5 px-3">Direction</th>
                <th className="py-2.5 px-3">TF</th>
                <th className="py-2.5 px-3">Zone Range (Low - High)</th>
                <th className="py-2.5 px-3">Mean Threshold (50%)</th>
                <th className="py-2.5 px-3">Displacement</th>
                <th className="py-2.5 px-3">BOS</th>
                <th className="py-2.5 px-3">Formation</th>
                <th className="py-2.5 px-3">Retests</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredOBs.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-500 font-sans">
                    No order block candidates found matching current criteria.
                  </td>
                </tr>
              ) : (
                filteredOBs.map((ob) => {
                  const isBull = ob.direction === 'BULLISH_DEMAND';
                  return (
                    <tr
                      key={ob.id}
                      onClick={() => setSelectedOBDetail(ob)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 px-3 font-bold text-white">
                        {ob.symbol}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[11px] font-semibold ${isBull ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isBull ? 'Demand Zone' : 'Supply Zone'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {ob.timeframe}
                      </td>
                      <td className="py-2.5 px-3 text-slate-200 tabular-nums">
                        Rs. {ob.low.toFixed(2)} - Rs. {ob.high.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-sky-400 tabular-nums">
                        Rs. {ob.meanThreshold.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 tabular-nums">
                        {ob.displacementPercent}%
                      </td>
                      <td className="py-2.5 px-3">
                        {ob.hasBreakOfStructure ? (
                          <span className="text-emerald-400 font-semibold">Yes</span>
                        ) : (
                          <span className="text-slate-500">No</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {ob.formationTime}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 tabular-nums">
                        {ob.retestCount}x
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[11px] px-2 py-0.5 rounded font-semibold ${
                          ob.status === 'FRESH'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          {ob.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectStock(ob.symbol);
                          }}
                          className="text-sky-400 hover:text-sky-300 hover:underline flex items-center justify-end gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Chart</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Popover Modal if clicked */}
      {selectedOBDetail && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-white font-mono">{selectedOBDetail.symbol} {selectedOBDetail.direction}</h3>
              </div>
              <button
                onClick={() => setSelectedOBDetail(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-900 border border-slate-800"
              >
                Close
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="bg-slate-900/60 p-3 rounded space-y-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Zone High (Upper Band):</span>
                  <span className="text-white font-semibold">Rs. {selectedOBDetail.high}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Mean Threshold (50% Revisit):</span>
                  <span className="text-sky-400 font-semibold">Rs. {selectedOBDetail.meanThreshold}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Zone Low (Lower Band):</span>
                  <span className="text-white font-semibold">Rs. {selectedOBDetail.low}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Formation Candle Date:</span>
                  <span className="text-slate-300">{selectedOBDetail.formationTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Displacement Expansion:</span>
                  <span className="text-emerald-400">+{selectedOBDetail.displacementPercent}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Rule Engine Version:</span>
                  <span className="text-slate-400">{selectedOBDetail.ruleVersion}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-900/40 rounded border border-slate-800/80">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Detection Logic:</span>
                <p className="mt-1 text-slate-300 font-sans leading-relaxed">{selectedOBDetail.explanation}</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => {
                  onSelectStock(selectedOBDetail.symbol);
                  setSelectedOBDetail(null);
                }}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold cursor-pointer"
              >
                Open in Chart Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
