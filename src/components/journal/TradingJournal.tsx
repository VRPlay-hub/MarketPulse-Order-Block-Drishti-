import { useState } from 'react';
import { BookCheck, Plus, Trash2, TrendingUp, TrendingDown, DollarSign, PieChart, ShieldAlert } from 'lucide-react';
import type { JournalTrade, StockQuote } from '../../types/market.js';
import { calculateJournalMetrics, calculateTradePnL } from '../../utils/calculations.js';
import type { AppUser } from '../../services/authService.ts';

interface TradingJournalProps {
  trades: JournalTrade[];
  stocks: StockQuote[];
  currentUser?: AppUser | null;
  onAddTrade: (trade: JournalTrade) => void;
  onDeleteTrade: (id: string) => void;
  onSelectStock: (symbol: string) => void;
}

export function TradingJournal({
  trades,
  stocks,
  currentUser,
  onAddTrade,
  onDeleteTrade,
  onSelectStock
}: TradingJournalProps) {
  const [showNewTradeModal, setShowNewTradeModal] = useState(false);

  // Form states
  const [symbol, setSymbol] = useState(stocks[0]?.symbol || 'RELIANCE');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [direction, setDirection] = useState<'LONG' | 'SHORT'>('LONG');
  const [entryPrice, setEntryPrice] = useState<number>(2800);
  const [exitPrice, setExitPrice] = useState<number>(2860);
  const [stopLoss, setStopLoss] = useState<number>(2770);
  const [targetPrice, setTargetPrice] = useState<number>(2860);
  const [quantity, setQuantity] = useState<number>(50);
  const [brokerageFees, setBrokerageFees] = useState<number>(40);
  const [setupCategory, setSetupCategory] = useState<JournalTrade['setupCategory']>('ORDER_BLOCK_RETEST');
  const [notes, setNotes] = useState('');

  const metrics = calculateJournalMetrics(trades);

  // Group performance by setup category
  const setupPerformance = trades.reduce((acc, t) => {
    if (!acc[t.setupCategory]) {
      acc[t.setupCategory] = { total: 0, wins: 0, netPnL: 0 };
    }
    acc[t.setupCategory].total++;
    if (t.netPnL > 0) acc[t.setupCategory].wins++;
    acc[t.setupCategory].netPnL += t.netPnL;
    return acc;
  }, {} as Record<string, { total: number; wins: number; netPnL: number }>);

  const handleSubmitNewTrade = (e: React.FormEvent) => {
    e.preventDefault();
    const pnlCalc = calculateTradePnL(direction, entryPrice, exitPrice, quantity, brokerageFees);

    const risk = Math.abs(entryPrice - stopLoss);
    const reward = Math.abs(exitPrice - entryPrice);
    const riskRewardAchieved = risk > 0 ? Number((reward / risk).toFixed(2)) : 1;

    const newTrade: JournalTrade = {
      id: `TRD-${Date.now().toString().slice(-4)}`,
      date,
      symbol,
      direction,
      entryPrice,
      exitPrice,
      stopLoss,
      targetPrice,
      quantity,
      brokerageFees,
      setupCategory,
      notes: notes || `${direction} on ${setupCategory.replace(/_/g, ' ')}`,
      grossPnL: pnlCalc.grossPnL,
      netPnL: pnlCalc.netPnL,
      returnPercent: pnlCalc.returnPercent,
      riskRewardAchieved,
      outcome: pnlCalc.outcome
    };

    onAddTrade(newTrade);
    setShowNewTradeModal(false);
    setNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">Execution Journal & Performance Analytics</h1>
            {currentUser && (
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-mono">
                {currentUser.displayName}&apos;s Private Ledger
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Log order block and liquidity sweep executions, track gross/net P&L with brokerage deductions. Stored in zero-trust partitioned space.
          </p>
        </div>

        <button
          onClick={() => setShowNewTradeModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Log New Trade</span>
        </button>
      </div>

      {/* Live / Demo Notice Callout */}
      {stocks.some(s => s.feedStatus === 'LIVE' || s.isDemoData === false) ? (
        <div className="flex items-center justify-between px-3.5 py-2 rounded bg-emerald-950/40 border border-emerald-600/40 text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-slate-950 uppercase shrink-0">
              LIVE MARKET PRICING ACTIVE
            </span>
            <span className="text-slate-300">
              Journal performance tracking and trade logging with live NSE equity prices via Upstox API v2.
            </span>
          </div>
          <span className="font-mono text-emerald-400 text-[10px] hidden sm:inline flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            ACTIVE FEED
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between px-3.5 py-2 rounded bg-amber-950/40 border border-amber-600/40 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950 uppercase shrink-0">
              DEMO DATA — NOT LIVE MARKET DATA
            </span>
            <span className="text-slate-300">
              Initial demonstration trade records and execution prices are synthetic simulations for journal evaluation. Not real capital transactions.
            </span>
          </div>
          <span className="font-mono text-amber-400 text-[10px] hidden sm:inline">DEMO SIMULATION</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 rounded p-3 font-mono">
          <span className="text-[10px] text-slate-400 block uppercase">Total Trades</span>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">{metrics.totalTrades}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {metrics.winningTrades}W / {metrics.losingTrades}L
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded p-3 font-mono">
          <span className="text-[10px] text-slate-400 block uppercase">Win Rate</span>
          <div className="text-xl font-bold text-sky-400 mt-1 tabular-nums">{metrics.winRate}%</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Strict &gt; Rs. 0 PnL</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded p-3 font-mono">
          <span className="text-[10px] text-slate-400 block uppercase">Net P&L</span>
          <div className={`text-xl font-bold mt-1 tabular-nums ${metrics.netPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {metrics.netPnL >= 0 ? '+' : ''}Rs. {metrics.netPnL.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">After Rs. {metrics.totalBrokerage} fees</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded p-3 font-mono">
          <span className="text-[10px] text-slate-400 block uppercase">Profit Factor</span>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">{metrics.profitFactor}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Gross Wins / Losses</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded p-3 font-mono">
          <span className="text-[10px] text-slate-400 block uppercase">Avg Win / Loss</span>
          <div className="text-sm font-bold text-white mt-1 tabular-nums">
            <span className="text-emerald-400">+Rs. {metrics.averageWin}</span> / <span className="text-rose-400">-Rs. {metrics.averageLoss}</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Ratio: {metrics.winLossRatio}x</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded p-3 font-mono">
          <span className="text-[10px] text-slate-400 block uppercase">Max Drawdown</span>
          <div className="text-xl font-bold text-amber-400 mt-1 tabular-nums">{metrics.maxDrawdownPercent}%</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Peak equity drop</div>
        </div>
      </div>

      {/* Setup Category Performance breakdown */}
      <div className="bg-slate-900/60 border border-slate-800 rounded p-4 space-y-3">
        <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
          Setup Performance Attribution
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          {Object.entries(setupPerformance).map(([cat, perf]) => {
            const winRate = ((perf.wins / perf.total) * 100).toFixed(0);
            return (
              <div key={cat} className="p-3 bg-slate-950/80 border border-slate-800 rounded space-y-1">
                <div className="font-semibold text-slate-200 truncate">{cat.replace(/_/g, ' ')}</div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Trades: {perf.total}</span>
                  <span>Win: {winRate}%</span>
                </div>
                <div className={`font-bold tabular-nums ${perf.netPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {perf.netPnL >= 0 ? '+' : ''}Rs. {perf.netPnL.toLocaleString('en-IN')}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trade Log Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px] bg-slate-950/60">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Symbol</th>
                <th className="py-2.5 px-3">Direction</th>
                <th className="py-2.5 px-3">Setup</th>
                <th className="py-2.5 px-3 text-right">Entry</th>
                <th className="py-2.5 px-3 text-right">Exit</th>
                <th className="py-2.5 px-3 text-right">Qty</th>
                <th className="py-2.5 px-3 text-right">Gross P&L</th>
                <th className="py-2.5 px-3 text-right">Net P&L</th>
                <th className="py-2.5 px-3 text-center">Outcome</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {trades.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-500 font-sans">
                    No trades logged yet. Click "Log New Trade" to start your journal.
                  </td>
                </tr>
              ) : (
                trades.map(trade => {
                  const isWin = trade.netPnL > 0;
                  return (
                    <tr key={trade.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 text-slate-400">{trade.date}</td>
                      <td className="py-2.5 px-3 font-bold text-white">
                        <button
                          onClick={() => onSelectStock(trade.symbol)}
                          className="hover:text-sky-400 hover:underline cursor-pointer"
                        >
                          {trade.symbol}
                        </button>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                          trade.direction === 'LONG' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                        }`}>
                          {trade.direction}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 text-[11px]">
                        {trade.setupCategory.replace(/_/g, ' ')}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-300 tabular-nums">
                        Rs. {trade.entryPrice.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-300 tabular-nums">
                        Rs. {trade.exitPrice.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-400 tabular-nums">
                        {trade.quantity}
                      </td>
                      <td className={`py-2.5 px-3 text-right tabular-nums ${trade.grossPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {trade.grossPnL >= 0 ? '+' : ''}Rs. {trade.grossPnL.toLocaleString('en-IN')}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-bold tabular-nums ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isWin ? '+' : ''}Rs. {trade.netPnL.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                          trade.outcome === 'WIN'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : trade.outcome === 'LOSS'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {trade.outcome}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => onDeleteTrade(trade.id)}
                          className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                          title="Delete trade"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Log Trade Modal */}
      {showNewTradeModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Record Execution in Trading Journal</h3>
              <button
                onClick={() => setShowNewTradeModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-900 border border-slate-800"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSubmitNewTrade} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Symbol:</label>
                  <select
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded p-2 focus:outline-none focus:border-sky-500 font-mono"
                  >
                    {stocks.map(s => (
                      <option key={s.symbol} value={s.symbol}>{s.symbol}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Direction:</label>
                  <select
                    value={direction}
                    onChange={(e) => setDirection(e.target.value as 'LONG' | 'SHORT')}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded p-2 focus:outline-none focus:border-sky-500 font-mono"
                  >
                    <option value="LONG">LONG (Buy)</option>
                    <option value="SHORT">SHORT (Sell)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Entry Price (Rs.):</label>
                  <input
                    type="number"
                    step="0.05"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded p-2 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Exit Price (Rs.):</label>
                  <input
                    type="number"
                    step="0.05"
                    value={exitPrice}
                    onChange={(e) => setExitPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded p-2 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Quantity:</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded p-2 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Stop Loss (Rs.):</label>
                  <input
                    type="number"
                    step="0.05"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Target Price (Rs.):</label>
                  <input
                    type="number"
                    step="0.05"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Brokerage & Taxes (Rs.):</label>
                  <input
                    type="number"
                    step="1"
                    value={brokerageFees}
                    onChange={(e) => setBrokerageFees(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded p-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Setup Category:</label>
                <select
                  value={setupCategory}
                  onChange={(e) => setSetupCategory(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded p-2 font-mono"
                >
                  <option value="ORDER_BLOCK_RETEST">Order Block Retest / Demand Mitigation</option>
                  <option value="LIQUIDITY_SWEEP">Liquidity Sweep & Reclaim</option>
                  <option value="BREAK_OF_STRUCTURE">Break of Structure (BOS) Expansion</option>
                  <option value="TREND_CONTINUATION">Trend Continuation Following 20 EMA</option>
                  <option value="MEAN_REVERSION">Mean Reversion from High Extremes</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Notes / Trade Context:</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reason for trade, execution timeframe, mental state..."
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded p-2 font-sans"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewTradeModal(false)}
                  className="px-3 py-1.5 text-slate-400 hover:text-white rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded cursor-pointer"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
