import { Database, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { DataSourceType } from '../../types/market.js';

interface DataSourceStatusProps {
  dataSource: DataSourceType;
  lastUpdated: string;
  onOpenImporter?: () => void;
}

export function DataSourceStatus({ dataSource, lastUpdated, onOpenImporter }: DataSourceStatusProps) {
  const isDemo = dataSource === 'DEMO_SYNTHETIC';

  return (
    <div className="flex items-center gap-3 text-xs bg-slate-900/80 border border-slate-800 rounded px-3 py-1.5 text-slate-300">
      <div className="flex items-center gap-1.5">
        <Database className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-medium text-slate-200">Source:</span>
        {dataSource === 'LIVE_UPSTOX' ? (
          <span className="text-emerald-400 font-bold flex items-center gap-1.5 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            LIVE UPSTOX DATA (NSE)
          </span>
        ) : dataSource === 'CSV_UPLOADED' ? (
          <span className="text-sky-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 inline" />
            Uploaded Custom CSV
          </span>
        ) : (
          <span className="text-amber-400 font-bold flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 inline text-amber-400 shrink-0" />
            DEMO DATA — NOT LIVE MARKET DATA
          </span>
        )}
      </div>

      <span className="text-slate-600 hidden sm:inline" aria-hidden="true">·</span>

      <div className="hidden sm:flex items-center gap-1 text-slate-400 font-mono text-[11px] tabular-nums">
        <span>As of: {lastUpdated}</span>
      </div>

      {onOpenImporter && (
        <>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <button
            onClick={onOpenImporter}
            className="text-xs text-sky-400 hover:text-sky-300 hover:underline transition-colors whitespace-nowrap cursor-pointer"
          >
            Import Historical CSV
          </button>
        </>
      )}
    </div>
  );
}
