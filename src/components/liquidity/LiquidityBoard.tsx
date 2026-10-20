import { useState, useMemo, Fragment } from 'react';
import { Layers, Sliders, Check, AlertCircle, ArrowRight, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import type { StockQuote, ScoringWeights } from '../../types/market.js';
import { calculateMarketScore } from '../../utils/calculations.js';

interface LiquidityBoardProps {
  stocks: StockQuote[];
  onSelectStock: (symbol: string) => void;
}

export function LiquidityBoard({ stocks, onSelectStock }: LiquidityBoardProps) {
  const [showWeightSettings, setShowWeightSettings] = useState(false);
  const [weights, setWeights] = useState<ScoringWeights>({
    momentumWeight: 0.25,
    relativeVolumeWeight: 0.20,
    trendWeight: 0.20,
    bosWeight: 0.15,
    orderBlockProximityWeight: 0.10,
    liquiditySweepWeight: 0.10,
  });

  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);

  // Recalculate scores with active weights
  const scoredStocks = useMemo(() => {
    return stocks.map((stock) => {
      const hasBullOB = stock.activeOrderBlocks.some(o => o.direction === 'BULLISH_DEMAND' && o.status !== 'INVALIDATED');
      const hasBearOB = stock.activeOrderBlocks.some(o => o.direction === 'BEARISH_SUPPLY' && o.status !== 'INVALIDATED');
      const hasBullSweep = stock.liquidityLevels.some(l => l.isSwept && l.levelType.includes('LOW'));
      const hasBearSweep = stock.liquidityLevels.some(l => l.isSwept && l.levelType.includes('HIGH'));
      const hasBOS = stock.activeOrderBlocks.some(o => o.hasBreakOfStructure);

      const dynamicScore = calculateMarketScore({
        changePercent: stock.changePercent,
        relativeVolume: stock.relativeVolume,
        trend: stock.trend,
        hasRecentBullishOB: hasBullOB,
        hasRecentBearishOB: hasBearOB,
        hasBullishSweep: hasBullSweep,
        hasBearishSweep: hasBearSweep,
        hasBOS
      }, weights);

      return {
        ...stock,
        dynamicScore
      };
    }).sort((a, b) => b.dynamicScore.totalScore - a.dynamicScore.totalScore);
  }, [stocks, weights]);

  const handleWeightChange = (key: keyof ScoringWeights, val: number) => {
    setWeights(prev => ({
      ...prev,
      [key]: val
    }));
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Liquidity Board & Strength Ranking</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Explainable institutional scoring model (-100 to +100) combining liquidity sweeps, volume baselines & order block proximity
          </p>
        </div>

        <button
          onClick={() => setShowWeightSettings(!showWeightSettings)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-700 rounded transition-colors cursor-pointer"
        >
          <Sliders className="w-3.5 h-3.5 text-sky-400" />
          <span>{showWeightSettings ? 'Hide Scoring Weights' : 'Configure Scoring Weights'}</span>
        </button>
      </div>

      {/* Prominent Demo Notice Callout */}
      <div className="flex items-center justify-between px-3.5 py-2 rounded bg-amber-950/40 border border-amber-600/40 text-xs text-amber-200">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950 uppercase shrink-0">
            DEMO DATA — NOT LIVE MARKET DATA
          </span>
          <span className="text-slate-300">
            Liquidity rankings, relative volume multipliers, and scoring weights evaluate simulated equity metrics for testing. Not genuine live NSE quotes.
          </span>
        </div>
        <span className="font-mono text-amber-400 text-[10px] hidden sm:inline">DEMO SIMULATION</span>
      </div>

      {/* Configurable Weight Sliders (when open) */}
      {showWeightSettings && (
        <div className="bg-slate-900/80 border border-slate-800 rounded p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
              Scoring Model Weight Distribution (Normalized Sum: 1.0)
            </h3>
            <button
              onClick={() => setWeights({
                momentumWeight: 0.25,
                relativeVolumeWeight: 0.20,
                trendWeight: 0.20,
                bosWeight: 0.15,
                orderBlockProximityWeight: 0.10,
                liquiditySweepWeight: 0.10,
              })}
              className="text-[11px] text-sky-400 hover:underline cursor-pointer"
            >
              Reset to Recommended Weights
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Price Momentum:</span>
                <span className="text-sky-400 font-semibold">{(weights.momentumWeight * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.50"
                step="0.05"
                value={weights.momentumWeight}
                onChange={(e) => handleWeightChange('momentumWeight', parseFloat(e.target.value))}
                className="w-full accent-sky-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Relative Volume:</span>
                <span className="text-sky-400 font-semibold">{(weights.relativeVolumeWeight * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.50"
                step="0.05"
                value={weights.relativeVolumeWeight}
                onChange={(e) => handleWeightChange('relativeVolumeWeight', parseFloat(e.target.value))}
                className="w-full accent-sky-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Trend Direction:</span>
                <span className="text-sky-400 font-semibold">{(weights.trendWeight * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.50"
                step="0.05"
                value={weights.trendWeight}
                onChange={(e) => handleWeightChange('trendWeight', parseFloat(e.target.value))}
                className="w-full accent-sky-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Break of Structure (BOS):</span>
                <span className="text-sky-400 font-semibold">{(weights.bosWeight * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.50"
                step="0.05"
                value={weights.bosWeight}
                onChange={(e) => handleWeightChange('bosWeight', parseFloat(e.target.value))}
                className="w-full accent-sky-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Order Block Proximity:</span>
                <span className="text-sky-400 font-semibold">{(weights.orderBlockProximityWeight * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.50"
                step="0.05"
                value={weights.orderBlockProximityWeight}
                onChange={(e) => handleWeightChange('orderBlockProximityWeight', parseFloat(e.target.value))}
                className="w-full accent-sky-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Liquidity Sweep:</span>
                <span className="text-sky-400 font-semibold">{(weights.liquiditySweepWeight * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.50"
                step="0.05"
                value={weights.liquiditySweepWeight}
                onChange={(e) => handleWeightChange('liquiditySweepWeight', parseFloat(e.target.value))}
                className="w-full accent-sky-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Ranking Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px] bg-slate-950/60">
                <th className="py-2.5 px-3">Rank</th>
                <th className="py-2.5 px-3">Symbol</th>
                <th className="py-2.5 px-3">Normalized Score</th>
                <th className="py-2.5 px-3">Score Bar (-100 to +100)</th>
                <th className="py-2.5 px-3 text-right">Price (Rs.)</th>
                <th className="py-2.5 px-3 text-right">Change %</th>
                <th className="py-2.5 px-3 text-right">RelVol</th>
                <th className="py-2.5 px-3">Liquidity Sweeps</th>
                <th className="py-2.5 px-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {scoredStocks.map((stock, idx) => {
                const score = stock.dynamicScore;
                const isExpanded = expandedSymbol === stock.symbol;
                const sweeps = stock.liquidityLevels.filter(l => l.isSwept);

                return (
                  <Fragment key={stock.symbol}>
                    <tr
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                      onClick={() => setExpandedSymbol(isExpanded ? null : stock.symbol)}
                    >
                      <td className="py-2.5 px-3 text-slate-400 font-bold">#{idx + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-white">
                        <div className="flex items-center gap-1.5">
                          <span>{stock.symbol}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded ${
                            score.direction === 'BULLISH'
                              ? 'bg-emerald-950 text-emerald-400'
                              : score.direction === 'BEARISH'
                              ? 'bg-rose-950 text-rose-400'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {score.direction}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-bold tabular-nums">
                        <span className={score.totalScore > 0 ? 'text-emerald-400' : score.totalScore < 0 ? 'text-rose-400' : 'text-slate-400'}>
                          {score.totalScore > 0 ? '+' : ''}{score.totalScore}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 min-w-[140px]">
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex relative">
                          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-700 z-10" />
                          {score.totalScore >= 0 ? (
                            <div
                              style={{
                                marginLeft: '50%',
                                width: `${(score.totalScore / 100) * 50}%`
                              }}
                              className="bg-emerald-500 h-full"
                            />
                          ) : (
                            <div
                              style={{
                                marginLeft: `${50 - (Math.abs(score.totalScore) / 100) * 50}%`,
                                width: `${(Math.abs(score.totalScore) / 100) * 50}%`
                              }}
                              className="bg-rose-500 h-full"
                            />
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right text-white tabular-nums font-medium">
                        Rs. {stock.lastPrice.toFixed(2)}
                      </td>
                      <td className={`py-2.5 px-3 text-right tabular-nums font-semibold ${stock.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {stock.change >= 0 ? '+' : ''}{stock.changePercent}%
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        {stock.relativeVolume}x
                      </td>
                      <td className="py-2.5 px-3">
                        {sweeps.length > 0 ? (
                          <span className="text-[11px] text-amber-400 font-medium">
                            {sweeps.length} Level{sweeps.length > 1 ? 's' : ''} Swept
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">None</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectStock(stock.symbol);
                            }}
                            className="text-sky-400 hover:text-white"
                            title="Open Chart"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Breakdown Drawer */}
                    {isExpanded && (
                      <tr className="bg-slate-950/90">
                        <td colSpan={9} className="p-4 border-b border-slate-800">
                          <div className="space-y-3 font-sans">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs font-mono">
                              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                                <span className="text-slate-500 block text-[10px]">MOMENTUM</span>
                                <span className="text-white font-semibold">{score.momentumComponent}</span>
                              </div>
                              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                                <span className="text-slate-500 block text-[10px]">REL VOLUME</span>
                                <span className="text-white font-semibold">{score.relativeVolumeComponent}</span>
                              </div>
                              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                                <span className="text-slate-500 block text-[10px]">TREND BIAS</span>
                                <span className="text-white font-semibold">{score.trendComponent}</span>
                              </div>
                              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                                <span className="text-slate-500 block text-[10px]">BOS CONFIRM</span>
                                <span className="text-white font-semibold">{score.bosComponent}</span>
                              </div>
                              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                                <span className="text-slate-500 block text-[10px]">OB PROXIMITY</span>
                                <span className="text-white font-semibold">{score.orderBlockComponent}</span>
                              </div>
                              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                                <span className="text-slate-500 block text-[10px]">LIQ SWEEP</span>
                                <span className="text-white font-semibold">{score.liquidityComponent}</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                              <div className="bg-emerald-950/20 border border-emerald-900/40 p-3 rounded">
                                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wide block mb-1">
                                  Supporting Factors
                                </span>
                                {score.supportingSignals.length > 0 ? (
                                  <ul className="space-y-1 text-slate-300">
                                    {score.supportingSignals.map((s, i) => (
                                      <li key={i} className="flex items-center gap-1.5">
                                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                        <span>{s}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <span className="text-slate-500">None identified.</span>
                                )}
                              </div>

                              <div className="bg-rose-950/20 border border-rose-900/40 p-3 rounded">
                                <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wide block mb-1">
                                  Conflicting / Headwinds
                                </span>
                                {score.conflictingSignals.length > 0 ? (
                                  <ul className="space-y-1 text-slate-300">
                                    {score.conflictingSignals.map((c, i) => (
                                      <li key={i} className="flex items-center gap-1.5">
                                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                        <span>{c}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <span className="text-slate-500">None identified.</span>
                                )}
                              </div>
                            </div>

                            <div className="flex justify-end">
                              <button
                                onClick={() => onSelectStock(stock.symbol)}
                                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold cursor-pointer"
                              >
                                View Detailed Candlestick Chart
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
