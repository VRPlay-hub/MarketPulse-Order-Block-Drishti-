import { useState } from 'react';
import { Upload, X, CheckCircle, AlertTriangle, Download, FileText, Sliders, ArrowRight } from 'lucide-react';
import type { OHLCVCandle } from '../../types/market.js';
import { parseAndValidateCsv, type CsvParseSummary } from '../../utils/csvParser.js';

interface CsvImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (symbol: string, candles: OHLCVCandle[]) => void;
}

export function CsvImporterModal({
  isOpen,
  onClose,
  onImportSuccess
}: CsvImporterModalProps) {
  const [targetSymbol, setTargetSymbol] = useState('CUSTOM_STOCK');
  const [csvText, setCsvText] = useState('');
  const [summary, setSummary] = useState<CsvParseSummary | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  if (!isOpen) return null;

  const sampleCsvContent = `Date,Open,High,Low,Close,Volume
2026-02-01,2450.00,2485.50,2440.00,2475.25,1250000
2026-02-02,2476.00,2510.00,2470.00,2502.80,1850000
2026-02-03,2505.00,2540.00,2495.00,2535.10,2400000
2026-02-04,2530.00,2555.00,2515.00,2520.40,1100000
2026-02-05,2518.00,2535.00,2480.00,2485.60,1950000
2026-02-06,2480.00,2495.00,2450.00,2460.00,1650000
2026-02-09,2465.00,2525.00,2460.00,2518.50,2850000
2026-02-10,2520.00,2580.00,2515.00,2572.00,3200000`;

  const handleDownloadSample = () => {
    const blob = new Blob([sampleCsvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_nse_candles.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const processContent = (content: string) => {
    setCsvText(content);
    const result = parseAndValidateCsv(content);
    setSummary(result);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    // Auto-detect symbol from filename (e.g. RELIANCE.csv -> RELIANCE)
    const baseName = file.name.replace(/\.[^/.]+$/, '').toUpperCase();
    if (baseName && baseName.length <= 15) {
      setTargetSymbol(baseName);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processContent(content);
    };
    reader.readAsText(file);
  };

  const fatalErrors = summary?.issues.filter(i => i.isFatal) || [];
  const isValid = summary && fatalErrors.length === 0 && summary.validCandlesCount > 1;

  const handleApply = () => {
    if (!isValid || !summary) return;
    onImportSuccess(targetSymbol.toUpperCase().trim(), summary.candles);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-950 border border-slate-800 rounded max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-sky-400" />
            <h2 className="font-bold text-white text-base">Import Historical OHLCV Dataset</h2>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Upload custom historical candles (NSE/BSE format). The engine validates chronological sequence, checks OHLC boundaries, identifies displacement order blocks, and computes structural levels.
        </p>

        {/* Target Symbol & Sample Download */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 font-mono">Target Symbol:</label>
            <input
              type="text"
              value={targetSymbol}
              onChange={(e) => setTargetSymbol(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white font-mono uppercase focus:outline-none focus:border-sky-500"
            />
          </div>

          <button
            onClick={handleDownloadSample}
            className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 bg-slate-900 border border-slate-800 px-3 py-1 rounded cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Sample CSV</span>
          </button>
        </div>

        {/* File Drag/Drop */}
        <div className="border-2 border-dashed border-slate-800 rounded p-4 text-center hover:border-slate-700 transition-colors">
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            onChange={handleFileUpload}
            id="csv-file-input"
            className="hidden"
          />
          <label htmlFor="csv-file-input" className="cursor-pointer block">
            <FileText className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <span className="text-xs text-slate-300 font-medium block">
              {fileName ? `Selected file: ${fileName}` : 'Click to select CSV file from your computer'}
            </span>
            <span className="text-[11px] text-slate-500 font-mono mt-1 block">
              Flexible mapping: Date/Timestamp, Open, High, Low, Close, Volume
            </span>
          </label>
        </div>

        {/* Or Paste Raw Text */}
        <div>
          <label className="text-xs text-slate-400 block mb-1">Or Paste CSV Content:</label>
          <textarea
            value={csvText}
            onChange={(e) => processContent(e.target.value)}
            placeholder="Date,Open,High,Low,Close,Volume..."
            rows={3}
            className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono p-2.5 rounded focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Validation and Preview Report */}
        {summary && (
          <div className="space-y-3 text-xs">
            {/* Errors */}
            {fatalErrors.length > 0 ? (
              <div className="p-3 bg-rose-950/40 border border-rose-800/80 rounded space-y-1">
                <div className="font-semibold text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Validation Issues ({fatalErrors.length} Errors Found)
                </div>
                <ul className="list-disc pl-4 text-rose-300 space-y-0.5 text-[11px] font-mono">
                  {fatalErrors.slice(0, 5).map((err, i) => (
                    <li key={i}>Row {err.rowNumber}: {err.reason} ({err.column})</li>
                  ))}
                  {fatalErrors.length > 5 && <li>...and {fatalErrors.length - 5} more issues.</li>}
                </ul>
              </div>
            ) : (
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/80 rounded space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Validation Passed! {summary.validCandlesCount} sequential candles verified.</span>
                </div>

                {/* Statistical Overview of Dataset */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-slate-300 pt-1 border-t border-emerald-900/60">
                  <div>
                    <span className="text-slate-500 block">Span:</span>
                    <span>{summary.startDate} → {summary.endDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Price Range:</span>
                    <span>Rs. {summary.lowestPrice} - Rs. {summary.highestPrice}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Avg Volume:</span>
                    <span>{(summary.avgDailyVolume / 100000).toFixed(2)}L / day</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Net Return:</span>
                    <span className={summary.netReturnPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {summary.netReturnPercent >= 0 ? '+' : ''}{summary.netReturnPercent}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Candle Preview Table */}
            {summary.validCandlesCount > 0 && fatalErrors.length === 0 && (
              <div className="border border-slate-800 rounded overflow-hidden">
                <div className="bg-slate-900 px-3 py-1.5 text-[11px] font-mono text-slate-400 flex justify-between">
                  <span>First & Last Candles in Dataset</span>
                  <span>{summary.validCandlesCount} total</span>
                </div>
                <table className="w-full text-left text-[11px] font-mono">
                  <thead className="bg-slate-950 text-slate-500">
                    <tr>
                      <th className="py-1 px-2">Date</th>
                      <th className="py-1 px-2">Open</th>
                      <th className="py-1 px-2">High</th>
                      <th className="py-1 px-2">Low</th>
                      <th className="py-1 px-2">Close</th>
                      <th className="py-1 px-2">Volume</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {summary.candles.slice(0, 2).map((c, i) => (
                      <tr key={`first-${i}`}>
                        <td className="py-1 px-2">{c.timestamp}</td>
                        <td className="py-1 px-2">Rs. {c.open}</td>
                        <td className="py-1 px-2">Rs. {c.high}</td>
                        <td className="py-1 px-2">Rs. {c.low}</td>
                        <td className="py-1 px-2">Rs. {c.close}</td>
                        <td className="py-1 px-2">{c.volume.toLocaleString()}</td>
                      </tr>
                    ))}
                    {summary.candles.length > 2 && (
                      <tr>
                        <td colSpan={6} className="py-1 px-2 text-center text-slate-500 text-[10px]">
                          ... {summary.candles.length - 3} intermediate bars ...
                        </td>
                      </tr>
                    )}
                    {summary.candles.slice(-1).map((c, i) => (
                      <tr key={`last-${i}`}>
                        <td className="py-1 px-2">{c.timestamp}</td>
                        <td className="py-1 px-2">Rs. {c.open}</td>
                        <td className="py-1 px-2">Rs. {c.high}</td>
                        <td className="py-1 px-2">Rs. {c.low}</td>
                        <td className="py-1 px-2">Rs. {c.close}</td>
                        <td className="py-1 px-2">{c.volume.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Modal Actions */}
        <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!isValid}
            className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed rounded cursor-pointer"
          >
            Load Into Scanner & Charts
          </button>
        </div>
      </div>
    </div>
  );
}
