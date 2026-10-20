import { BookOpen, X, Check, ShieldAlert, Layers, Box, Activity, History } from 'lucide-react';

interface PublicOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PublicOverviewModal({ isOpen, onClose }: PublicOverviewModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-950 border border-slate-800 rounded max-w-3xl w-full p-6 space-y-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-sky-500/20 border border-sky-400/40 flex items-center justify-center font-bold text-sky-400 text-xs font-mono">
              MP
            </div>
            <div>
              <h2 className="text-base font-bold text-white">MarketPulse India — Platform Architecture & Methodology</h2>
              <p className="text-xs text-slate-400">Institutional Market Intelligence Workstation for Indian Equities</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feature Categories Grid */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Core Analytical Engines</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded space-y-1.5">
              <div className="flex items-center gap-1.5 text-sky-400 font-semibold font-mono">
                <Box className="w-4 h-4" />
                <span>1. Rule-Based Order Block Engine</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Detects the last contrary candle preceding qualifying upward/downward displacement (&gt;1.6x ATR) with structural breaks (BOS) and retest tracking.
              </p>
            </div>

            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded space-y-1.5">
              <div className="flex items-center gap-1.5 text-amber-400 font-semibold font-mono">
                <Layers className="w-4 h-4" />
                <span>2. Liquidity Board & Sweeps</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Scans for equal-highs, equal-lows, swing extremes, and previous-day high/low (PDH/PDL) wicks to identify liquidity absorption zones.
              </p>
            </div>

            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold font-mono">
                <Activity className="w-4 h-4" />
                <span>3. Market X-Ray & Heatmaps</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Visualizes sector rotation across Nifty Auto, Bank, IT, Pharma, Energy and Metals with advance/decline distribution.
              </p>
            </div>

            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded space-y-1.5">
              <div className="flex items-center gap-1.5 text-violet-400 font-semibold font-mono">
                <History className="w-4 h-4" />
                <span>4. Walk-Forward Backtester</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Evaluates algorithmic order block mitigation signals strictly sequentially to prevent look-ahead bias, accounting for STT, brokerage and slippage.
              </p>
            </div>
          </div>
        </div>

        {/* Explainable Scoring Model */}
        <div className="space-y-2 text-xs">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Explainable Technical Scoring</h3>
          <div className="p-3 bg-slate-900/50 border border-slate-800 rounded space-y-2 text-slate-300 font-sans text-[11px] leading-relaxed">
            <p>
              Each stock receives an explainable normalized score from <strong>-100 (Extremely Bearish)</strong> to <strong>+100 (Extremely Bullish)</strong>, calculated as a weighted sum of:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400 font-mono">
              <li>Momentum (25%): Direction and velocity of percentage change</li>
              <li>Relative Volume (20%): Current session volume compared to 20-day historical baseline</li>
              <li>Trend (20%): Structural multi-day moving average alignment</li>
              <li>Break of Structure (15%): Confirmed technical breakout past previous pivot</li>
              <li>Order Block Proximity (10%): Distance to fresh demand or supply candidates</li>
              <li>Liquidity Sweep (10%): Detection of sweep and reclaim of key swing extremes</li>
            </ul>
          </div>
        </div>

        {/* Legal & Regulatory Safeguards */}
        <div className="p-4 bg-amber-950/30 border border-amber-900/50 rounded space-y-2 text-xs">
          <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
            <ShieldAlert className="w-4 h-4" />
            <span>Financial & Legal Safeguards</span>
          </div>
          <p className="text-amber-200/80 text-[11px] leading-relaxed font-sans">
            MarketPulse India does not offer investment advisory services, portfolio management, or trade execution. All technical signals, order block candidates, and backtesting metrics are computational heuristics for educational exploration. Trading Indian equities and derivatives involves substantial risk of capital loss.
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold cursor-pointer"
          >
            Enter Workstation
          </button>
        </div>
      </div>
    </div>
  );
}
