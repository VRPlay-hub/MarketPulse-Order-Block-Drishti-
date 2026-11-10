import { ShieldAlert, Radio } from 'lucide-react';
import type { DataSourceType } from '../../types/market.js';

interface RiskDisclaimerBannerProps {
  dataSource?: DataSourceType;
  lastTickTime?: string;
}

export function RiskDisclaimerBanner({ dataSource = 'DEMO_SYNTHETIC', lastTickTime }: RiskDisclaimerBannerProps) {
  if (dataSource === 'LIVE_UPSTOX') {
    return (
      <div className="bg-emerald-950/70 border-b border-emerald-600/60 px-4 py-2 text-xs text-emerald-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500 text-slate-950 uppercase tracking-wide shrink-0">
            LIVE UPSTOX BROKER FEED (NSE)
          </span>
          <div className="flex items-center gap-1.5 text-slate-200">
            <Radio className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              Real-time quotes, index levels & institutional market data streaming via Upstox API v2.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-emerald-300 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>MODE: LIVE BROKER STREAMING {lastTickTime ? `(${lastTickTime})` : '(IST)'}</span>
        </div>
      </div>
    );
  }

  if (dataSource === 'CSV_UPLOADED') {
    return (
      <div className="bg-sky-950/70 border-b border-sky-600/60 px-4 py-2 text-xs text-sky-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-sky-500 text-slate-950 uppercase tracking-wide shrink-0">
            CUSTOM CSV DATASET
          </span>
          <div className="flex items-center gap-1.5 text-slate-200">
            <ShieldAlert className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>
              User-uploaded historical OHLCV dataset loaded. Technical order blocks and liquidity analysis computed locally.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-sky-300 shrink-0">
          <span className="w-2 h-2 rounded-full bg-sky-400"></span>
          <span>MODE: CUSTOM DATASET ANALYSIS</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-950/60 border-b border-amber-600/60 px-4 py-2 text-xs text-amber-200 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500 text-slate-950 uppercase tracking-wide shrink-0">
          DEMO DATA — NOT LIVE MARKET DATA
        </span>
        <div className="flex items-center gap-1.5 text-slate-200">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            Prices and volumes are synthetic simulations for educational research. Not genuine NSE quotes or SEBI investment advice.
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 font-mono text-[11px] text-amber-300 shrink-0">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
        <span>MODE: DEMO SIMULATION (NO API KEYS REQUIRED)</span>
      </div>
    </div>
  );
}
