import { ShieldAlert } from 'lucide-react';

export function RiskDisclaimerBanner() {
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
