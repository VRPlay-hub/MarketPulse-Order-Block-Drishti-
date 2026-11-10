import { useState, useMemo } from 'react';
import {
  Download,
  AlertTriangle,
  Sliders,
  CheckCircle2,
  Filter,
  FileSpreadsheet
} from 'lucide-react';
import type {
  StockQuote,
  BacktestParams,
  StrategyDirection,
  StopLossMode,
  PositionSizingMode,
  CollisionResolution
} from '../../types/market.ts';
import { runAdvancedBacktest } from '../../utils/backtestEngine.ts';
import {
  generateTradesCsv,
  generateEquityCurveCsv,
  generateStrategySummaryCsv,
  downloadCsvFile
} from '../../utils/backtestExporter.ts';

interface HistoricalAnalysisProps {
  stocks: StockQuote[];
  onSelectStock: (symbol: string) => void;
}

export function HistoricalAnalysis({ stocks, onSelectStock }: HistoricalAnalysisProps) {
  const [selectedSymbol, setSelectedSymbol] = useState<string>(stocks[0]?.symbol || 'RELIANCE');
  const [capital, setCapital] = useState<number>(200000); // 2 Lakhs
  const [strategyDirection, setStrategyDirection] = useState<StrategyDirection>('BOTH');
  const [stopLossMode, setStopLossMode] = useState<StopLossMode>('ZONE_BOUNDARY');
  const [stopLossBufferPercent, setStopLossBufferPercent] = useState<number>(0.2);
  const [atrPeriod, setAtrPeriod] = useState<number>(14);
  const [atrMultiplier, setAtrMultiplier] = useState<number>(1.5);
  const [positionSizingMode, setPositionSizingMode] = useState<PositionSizingMode>('EQUITY_PERCENT');
  const [riskPercent, setRiskPercent] = useState<number>(1.5);
  const [fixedQuantity, setFixedQuantity] = useState<number>(50);
  const [minDisplacement, setMinDisplacement] = useState<number>(1.4);
  const [targetMultiplier, setTargetMultiplier] = useState<number>(2.0); // 1:2 R:R
  const [brokeragePerTrade, setBrokeragePerTrade] = useState<number>(40);
  const [slippagePercent, setSlippagePercent] = useState<number>(0.05);
  const [maxHoldingBars, setMaxHoldingBars] = useState<number>(10);
  const [collisionResolution, setCollisionResolution] = useState<CollisionResolution>('CONSERVATIVE_STOP_FIRST');
  const [showAdvancedParams, setShowAdvancedParams] = useState<boolean>(false);
  const [tradeFilter, setTradeFilter] = useState<'ALL' | 'LONG' | 'SHORT' | 'WINS' | 'LOSSES'>('ALL');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const currentStock = useMemo(() => {
    return stocks.find(s => s.symbol === selectedSymbol) || stocks[0];
  }, [stocks, selectedSymbol]);

  // Construct structured params
  const backtestParams = useMemo<BacktestParams>(() => ({
    symbol: currentStock?.symbol || selectedSymbol,
    initialCapital: Math.max(1000, capital),
    strategyDirection,
    stopLossMode,
    stopLossBufferPercent: Math.max(0, stopLossBufferPercent),
    atrPeriod: Math.max(2, atrPeriod),
    atrMultiplier: Math.max(0.5, atrMultiplier),
    positionSizingMode,
    riskPerTradePercent: Math.max(0.1, riskPercent),
    fixedQuantity: Math.max(1, fixedQuantity),
    minDisplacementMultiplier: Math.max(0.5, minDisplacement),
    targetMultiplier: Math.max(0.5, targetMultiplier),
    brokeragePerTrade: Math.max(0, brokeragePerTrade),
    slippagePercent: Math.max(0, slippagePercent),
    maxHoldingBars: Math.max(2, maxHoldingBars),
    collisionResolution
  }), [
    currentStock?.symbol,
    selectedSymbol,
    capital,
    strategyDirection,
    stopLossMode,
    stopLossBufferPercent,
    atrPeriod,
    atrMultiplier,
    positionSizingMode,
    riskPercent,
    fixedQuantity,
    minDisplacement,
    targetMultiplier,
    brokeragePerTrade,
    slippagePercent,
    maxHoldingBars,
    collisionResolution
  ]);

  // Execute advanced backtest
  const { summary: simulationResult, trades } = useMemo(() => {
    const candles = currentStock?.candles1D || [];
    return runAdvancedBacktest(candles, backtestParams);
  }, [currentStock?.candles1D, backtestParams]);

  // Filtered trades for the execution log table
  const displayedTrades = useMemo(() => {
    if (tradeFilter === 'LONG') return trades.filter(t => t.direction === 'LONG');
    if (tradeFilter === 'SHORT') return trades.filter(t => t.direction === 'SHORT');
    if (tradeFilter === 'WINS') return trades.filter(t => t.isWin);
    if (tradeFilter === 'LOSSES') return trades.filter(t => !t.isWin);
    return trades;
  }, [trades, tradeFilter]);

  // CSV Export Handlers
  const handleExportTradesCsv = () => {
    const csv = generateTradesCsv(trades, currentStock?.symbol || selectedSymbol);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadCsvFile(`backtest_trades_${currentStock?.symbol || selectedSymbol}_${dateStr}.csv`, csv);
    showToast('Downloaded Trade-by-Trade Execution Log (.csv)');
  };

  const handleExportEquityCsv = () => {
    const csv = generateEquityCurveCsv(simulationResult.equityCurve, currentStock?.symbol || selectedSymbol);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadCsvFile(`backtest_equity_${currentStock?.symbol || selectedSymbol}_${dateStr}.csv`, csv);
    showToast('Downloaded Equity Curve Time Series (.csv)');
  };

  const handleExportSummaryCsv = () => {
    const csv = generateStrategySummaryCsv(simulationResult, backtestParams);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadCsvFile(`backtest_summary_${currentStock?.symbol || selectedSymbol}_${dateStr}.csv`, csv);
    showToast('Downloaded Strategy Configuration & Performance Summary (.csv)');
  };

  const handleExportAllReports = () => {
    handleExportTradesCsv();
    setTimeout(handleExportEquityCsv, 300);
    setTimeout(handleExportSummaryCsv, 600);
    showToast('Exported All 3 Comprehensive Backtest Reports (.csv)');
  };

  const showToast = (msg: string) => {
    setExportNotice(msg);
    setTimeout(() => setExportNotice(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Header & Symbol Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Historical Analysis & Institutional Backtesting
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Bi-directional walk-forward simulation with realistic order fill assumptions, friction modeling & RFC 4180 reporting
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-white text-xs font-mono rounded px-3 py-1.5 focus:outline-none focus:border-sky-500"
            >
              {stocks.map(s => (
                <option key={s.symbol} value={s.symbol}>
                  {s.symbol} — {s.companyName}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onSelectStock(selectedSymbol)}
              className="text-[11px] text-sky-400 hover:text-sky-300 font-mono px-2 py-1 bg-slate-900 border border-slate-800 rounded cursor-pointer transition"
              title="Open this security in the Candlestick Chart Workspace"
            >
              Open in Chart →
            </button>
          </div>

          {/* Export Action Menu */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExportAllReports}
              disabled={trades.length === 0}
              title="Download Trades, Equity Curve & Summary CSVs"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Backtest Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Export Toast Notification */}
      {exportNotice && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-slate-900 border border-sky-500/80 px-4 py-2.5 rounded-lg shadow-xl text-xs text-white">
          <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Live / Demo Notice Callout */}
      {stocks.some(s => s.feedStatus === 'LIVE' || s.isDemoData === false) ? (
        <div className="flex items-center justify-between px-3.5 py-2 rounded bg-emerald-950/40 border border-emerald-600/40 text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-slate-950 uppercase shrink-0">
              LIVE UPSTOX MARKET DATA (NSE)
            </span>
            <span className="text-slate-300">
              Backtesting engine executing against genuine historical OHLCV candles retrieved via Upstox API v2.
            </span>
          </div>
          <span className="font-mono text-emerald-400 text-[10px] hidden sm:inline flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            AUTHENTICATED DATASET
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between px-3.5 py-2 rounded bg-amber-950/40 border border-amber-600/40 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950 uppercase shrink-0">
              DEMO DATA — NOT LIVE MARKET DATA
            </span>
            <span className="text-slate-300">
              Backtest equity curves, win rates, and order block fills are generated from synthetic historical candles. Not genuine NSE execution records.
            </span>
          </div>
          <span className="font-mono text-amber-400 text-[10px] hidden sm:inline">DEMO SIMULATION</span>
        </div>
      )}

      {/* Legal & Methodological safeguard */}
      <div className="bg-amber-950/30 border border-amber-900/50 rounded p-3 text-xs text-amber-200/90 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-amber-300">Methodological Note:</strong> Backtest engine simulates order block mitigations sequentially bar-by-bar with strictly no future data leakage. Intrabar collision assumption: if a bar reaches both Stop-Loss and Target, conservative execution assumes the stop loss triggered first.
        </div>
      </div>

      {/* Primary Simulation Controls */}
      <div className="bg-slate-900/60 border border-slate-800 rounded p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
            Strategy Rules & Risk Management Configuration
          </h2>
          <button
            onClick={() => setShowAdvancedParams(!showAdvancedParams)}
            className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{showAdvancedParams ? 'Hide Advanced Settings' : 'Show Advanced Settings (ATR, Sizing, Frictions)'}</span>
          </button>
        </div>

        {/* Row 1: Strategy Direction, Stop Loss Mode, Target R:R, Capital */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          <div>
            <label className="text-slate-400 block mb-1">Strategy Direction:</label>
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 border border-slate-800 rounded">
              <button
                type="button"
                onClick={() => setStrategyDirection('BOTH')}
                className={`py-1 rounded text-center text-[11px] font-semibold transition cursor-pointer ${
                  strategyDirection === 'BOTH' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Both
              </button>
              <button
                type="button"
                onClick={() => setStrategyDirection('LONG_ONLY')}
                className={`py-1 rounded text-center text-[11px] font-semibold transition cursor-pointer ${
                  strategyDirection === 'LONG_ONLY' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Long
              </button>
              <button
                type="button"
                onClick={() => setStrategyDirection('SHORT_ONLY')}
                className={`py-1 rounded text-center text-[11px] font-semibold transition cursor-pointer ${
                  strategyDirection === 'SHORT_ONLY' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Short
              </button>
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Stop Loss Model:</label>
            <select
              value={stopLossMode}
              onChange={(e) => setStopLossMode(e.target.value as StopLossMode)}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs"
            >
              <option value="ZONE_BOUNDARY">Order Block Zone Boundary</option>
              <option value="ATR_BUFFER">ATR Dynamic Volatility Buffer</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Target Multiplier (R:R Ratio):</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.25"
                min="0.5"
                max="10"
                value={targetMultiplier}
                onChange={(e) => setTargetMultiplier(parseFloat(e.target.value) || 2.0)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
              />
              <span className="text-slate-400 text-xs shrink-0">1:{targetMultiplier}</span>
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Starting Capital (Rs.):</label>
            <input
              type="number"
              step="10000"
              min="10000"
              value={capital}
              onChange={(e) => setCapital(parseFloat(e.target.value) || 200000)}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
            />
          </div>
        </div>

        {/* Row 2: Advanced Parameters (when open) */}
        {showAdvancedParams && (
          <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
            {stopLossMode === 'ATR_BUFFER' ? (
              <>
                <div>
                  <label className="text-slate-400 block mb-1">ATR Period:</label>
                  <input
                    type="number"
                    min="2"
                    max="50"
                    value={atrPeriod}
                    onChange={(e) => setAtrPeriod(parseInt(e.target.value, 10) || 14)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">ATR Multiplier (Buffer):</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0.5"
                    max="5"
                    value={atrMultiplier}
                    onChange={(e) => setAtrMultiplier(parseFloat(e.target.value) || 1.5)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="text-slate-400 block mb-1">Boundary Buffer (%):</label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="2"
                  value={stopLossBufferPercent}
                  onChange={(e) => setStopLossBufferPercent(parseFloat(e.target.value) || 0.2)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                />
              </div>
            )}

            <div>
              <label className="text-slate-400 block mb-1">Position Sizing Mode:</label>
              <select
                value={positionSizingMode}
                onChange={(e) => setPositionSizingMode(e.target.value as PositionSizingMode)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs"
              >
                <option value="EQUITY_PERCENT">% of Equity Risk</option>
                <option value="FIXED_QUANTITY">Fixed Share Quantity</option>
              </select>
            </div>

            {positionSizingMode === 'EQUITY_PERCENT' ? (
              <div>
                <label className="text-slate-400 block mb-1">Risk Per Trade (%):</label>
                <input
                  type="number"
                  step="0.25"
                  min="0.1"
                  max="10"
                  value={riskPercent}
                  onChange={(e) => setRiskPercent(parseFloat(e.target.value) || 1.5)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                />
              </div>
            ) : (
              <div>
                <label className="text-slate-400 block mb-1">Fixed Quantity (Shares):</label>
                <input
                  type="number"
                  step="10"
                  min="1"
                  max="10000"
                  value={fixedQuantity}
                  onChange={(e) => setFixedQuantity(parseInt(e.target.value, 10) || 50)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                />
              </div>
            )}

            <div>
              <label className="text-slate-400 block mb-1">OB Displacement (x ATR):</label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="4"
                value={minDisplacement}
                onChange={(e) => setMinDisplacement(parseFloat(e.target.value) || 1.4)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Brokerage & STT (Rs./Trade):</label>
              <input
                type="number"
                step="5"
                min="0"
                max="500"
                value={brokeragePerTrade}
                onChange={(e) => setBrokeragePerTrade(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Slippage Buffer (%):</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="2"
                value={slippagePercent}
                onChange={(e) => setSlippagePercent(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Max Holding Bars:</label>
              <input
                type="number"
                min="2"
                max="60"
                value={maxHoldingBars}
                onChange={(e) => setMaxHoldingBars(parseInt(e.target.value, 10) || 10)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Intrabar Collision Rule:</label>
              <select
                value={collisionResolution}
                onChange={(e) => setCollisionResolution(e.target.value as CollisionResolution)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs"
              >
                <option value="CONSERVATIVE_STOP_FIRST">Conservative (Stop-Loss First)</option>
                <option value="OPEN_PROXIMITY">Open Price Proximity</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 rounded p-3 font-mono">
          <span className="text-[10px] text-slate-400 uppercase block">Trades Executed</span>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">{simulationResult.totalTrades}</div>
          <div className="text-[10px] text-slate-500">
            {simulationResult.winningTrades}W / {simulationResult.losingTrades}L
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded p-3 font-mono">
          <span className="text-[10px] text-slate-400 uppercase block">Simulated Win Rate</span>
          <div className="text-xl font-bold text-sky-400 mt-1 tabular-nums">{simulationResult.winRate}%</div>
          <div className="text-[10px] text-slate-500">Target 1:{targetMultiplier} R:R</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded p-3 font-mono">
          <span className="text-[10px] text-slate-400 uppercase block">Net P&L</span>
          <div className={`text-xl font-bold mt-1 tabular-nums ${simulationResult.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {simulationResult.netProfit >= 0 ? '+' : ''}Rs. {simulationResult.netProfit.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-500">Net of Rs. {simulationResult.totalBrokerage} fees</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded p-3 font-mono">
          <span className="text-[10px] text-slate-400 uppercase block">Profit Factor</span>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">{simulationResult.profitFactor}</div>
          <div className="text-[10px] text-slate-500">Gross Win/Loss ratio</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded p-3 font-mono">
          <span className="text-[10px] text-slate-400 uppercase block">Avg Trade P&L</span>
          <div className={`text-xl font-bold mt-1 tabular-nums ${simulationResult.averageTradePnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {simulationResult.averageTradePnL >= 0 ? '+' : ''}Rs. {simulationResult.averageTradePnL}
          </div>
          <div className="text-[10px] text-slate-500">Mathematical expectancy</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded p-3 font-mono">
          <span className="text-[10px] text-slate-400 uppercase block">Max Drawdown</span>
          <div className="text-xl font-bold text-amber-400 mt-1 tabular-nums">{simulationResult.maxDrawdownPercent}%</div>
          <div className="text-[10px] text-slate-500">Rs. {simulationResult.maxDrawdownAmount?.toLocaleString('en-IN') || 0}</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded p-3 font-mono">
          <span className="text-[10px] text-slate-400 uppercase block">Avg R:R Achieved</span>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">{simulationResult.averageRiskReward || 1.0}x</div>
          <div className="text-[10px] text-slate-500">Realized R multiple</div>
        </div>
      </div>

      {/* Directional Performance Comparison: Long vs Short */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-slate-900/50 border border-slate-800 rounded p-3.5 flex items-center justify-between font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <div>
              <span className="text-xs font-semibold text-emerald-300 block">Long Demand Strategy</span>
              <span className="text-[11px] text-slate-400">
                {simulationResult.longTradesCount || 0} Trades · {simulationResult.longWinRate || 0}% Win Rate
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase block">Long Net Profit</span>
            <span className={`text-sm font-bold ${(simulationResult.longNetProfit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {(simulationResult.longNetProfit || 0) >= 0 ? '+' : ''}Rs. {(simulationResult.longNetProfit || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded p-3.5 flex items-center justify-between font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
            <div>
              <span className="text-xs font-semibold text-rose-300 block">Short Supply Strategy</span>
              <span className="text-[11px] text-slate-400">
                {simulationResult.shortTradesCount || 0} Trades · {simulationResult.shortWinRate || 0}% Win Rate
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase block">Short Net Profit</span>
            <span className={`text-sm font-bold ${(simulationResult.shortNetProfit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {(simulationResult.shortNetProfit || 0) >= 0 ? '+' : ''}Rs. {(simulationResult.shortNetProfit || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Simulated Equity Curve */}
      <div className="bg-slate-900/60 border border-slate-800 rounded p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
              Simulated Account Equity Curve (Walk-Forward)
            </h2>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-sky-950 text-sky-300 border border-sky-800/60">
              {simulationResult.equityCurve.length} checkpoints
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-slate-400">
              Starting: Rs. {capital.toLocaleString('en-IN')}
            </span>
            <span className="text-slate-600">→</span>
            <span className={`font-bold ${(capital + simulationResult.netProfit) >= capital ? 'text-emerald-400' : 'text-rose-400'}`}>
              End: Rs. {(capital + simulationResult.netProfit).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="h-44 w-full flex items-end gap-1.5 pt-6 pb-2 px-2 border-b border-slate-800 font-mono overflow-x-auto">
          {simulationResult.equityCurve.map((pt, i) => {
            const minEq = capital * 0.90;
            const maxEq = Math.max(capital * 1.15, ...simulationResult.equityCurve.map(e => e.equity));
            const pct = Math.max(6, Math.min(100, ((pt.equity - minEq) / (maxEq - minEq)) * 100));
            const isGain = pt.equity >= capital;

            return (
              <div key={i} className="flex-1 min-w-[12px] flex flex-col items-center gap-1 group relative">
                <div
                  style={{ height: `${pct}%` }}
                  className={`w-full rounded-t transition-all cursor-pointer ${
                    isGain ? 'bg-sky-500/80 hover:bg-sky-400' : 'bg-rose-500/80 hover:bg-rose-400'
                  }`}
                />
                <span className="text-[8px] text-slate-500 truncate w-full text-center hidden md:inline">
                  {pt.date.slice(5)}
                </span>
                {/* Tooltip on hover */}
                <div className="hidden group-hover:block absolute bottom-full mb-1 z-30 bg-slate-950 border border-slate-700 p-2 rounded shadow-xl text-[10px] whitespace-nowrap text-white font-mono pointer-events-none">
                  <div className="font-bold text-sky-300">{pt.date}</div>
                  <div>Equity: Rs. {Math.round(pt.equity).toLocaleString('en-IN')}</div>
                  <div className="text-amber-400">Drawdown: {pt.drawdown ?? 0}%</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trade-by-Trade Execution Log & Export Toolbar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-sky-400" />
            <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
              Trade Execution Log ({displayedTrades.length} of {trades.length} Trades)
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 border border-slate-800 rounded text-[11px] font-mono">
              <Filter className="w-3 h-3 text-slate-500 ml-1" />
              {(['ALL', 'LONG', 'SHORT', 'WINS', 'LOSSES'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setTradeFilter(f)}
                  className={`px-2 py-0.5 rounded cursor-pointer transition ${
                    tradeFilter === f ? 'bg-sky-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Individual CSV Export Buttons */}
            <button
              onClick={handleExportTradesCsv}
              disabled={trades.length === 0}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition cursor-pointer disabled:opacity-40"
            >
              <Download className="w-3 h-3 text-sky-400" />
              <span>Trades CSV</span>
            </button>
            <button
              onClick={handleExportEquityCsv}
              disabled={trades.length === 0}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition cursor-pointer disabled:opacity-40"
            >
              <Download className="w-3 h-3 text-sky-400" />
              <span>Equity CSV</span>
            </button>
            <button
              onClick={handleExportSummaryCsv}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition cursor-pointer"
            >
              <Download className="w-3 h-3 text-sky-400" />
              <span>Summary CSV</span>
            </button>
          </div>
        </div>

        {/* Trade Table */}
        {displayedTrades.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500 font-mono">
            {trades.length === 0
              ? 'No trade signals met the displacement & retest thresholds for this security. Try adjusting displacement or R:R parameters.'
              : `No trades match the active filter (${tradeFilter}).`}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono text-left">
              <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Trade ID</th>
                  <th className="py-2.5 px-3">Dir</th>
                  <th className="py-2.5 px-3">Entry Date</th>
                  <th className="py-2.5 px-3">Exit Date</th>
                  <th className="py-2.5 px-3">Entry (Rs.)</th>
                  <th className="py-2.5 px-3">Exit (Rs.)</th>
                  <th className="py-2.5 px-3">SL (Rs.)</th>
                  <th className="py-2.5 px-3">Target (Rs.)</th>
                  <th className="py-2.5 px-3">Qty</th>
                  <th className="py-2.5 px-3">Gross P&L</th>
                  <th className="py-2.5 px-3">Net P&L</th>
                  <th className="py-2.5 px-3">Return</th>
                  <th className="py-2.5 px-3">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {displayedTrades.map(t => (
                  <tr key={t.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2 px-3 text-white font-semibold whitespace-nowrap">{t.id}</td>
                    <td className="py-2 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        t.direction === 'LONG'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                          : 'bg-rose-950 text-rose-300 border border-rose-800/60'
                      }`}>
                        {t.direction}
                      </span>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">{t.entryDate}</td>
                    <td className="py-2 px-3 whitespace-nowrap">{t.exitDate}</td>
                    <td className="py-2 px-3 tabular-nums">Rs. {t.entryPrice.toFixed(2)}</td>
                    <td className="py-2 px-3 tabular-nums">Rs. {t.exitPrice.toFixed(2)}</td>
                    <td className="py-2 px-3 tabular-nums text-rose-400">Rs. {(t.stopLoss || 0).toFixed(2)}</td>
                    <td className="py-2 px-3 tabular-nums text-emerald-400">Rs. {(t.targetPrice || 0).toFixed(2)}</td>
                    <td className="py-2 px-3 tabular-nums">{t.quantity}</td>
                    <td className={`py-2 px-3 tabular-nums ${t.grossProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {t.grossProfit >= 0 ? '+' : ''}Rs. {t.grossProfit.toFixed(2)}
                    </td>
                    <td className={`py-2 px-3 tabular-nums font-bold ${t.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {t.netProfit >= 0 ? '+' : ''}Rs. {t.netProfit.toFixed(2)}
                    </td>
                    <td className={`py-2 px-3 tabular-nums ${t.returnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {t.returnPct >= 0 ? '+' : ''}{t.returnPct.toFixed(2)}%
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        t.reason === 'TARGET_HIT'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                          : t.reason === 'STOP_HIT'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800/60'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {t.reason.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
