import { useEffect, useRef, useState, useMemo } from 'react';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  ColorType,
  LineStyle,
  type IChartApi,
  type ISeriesApi
} from 'lightweight-charts';
import {
  Box,
  Layers,
  Search,
  Camera,
  Maximize2,
  Sliders,
  TrendingUp,
  TrendingDown,
  Info,
  Clock
} from 'lucide-react';
import type { StockQuote, TimeFrame, OrderBlockZone, LiquidityLevel, OHLCVCandle } from '../../types/market.js';
import { aggregateCandlesToTimeframe, detectOrderBlocks } from '../../utils/calculations.js';
import type { UserChartPreferences } from '../../services/persistenceService.ts';
import { fetchMarketCandles } from '../../services/marketDataClient.ts';

interface StockChartWorkspaceProps {
  stocks: StockQuote[];
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  preferences?: UserChartPreferences;
  onSavePreferences?: (prefs: Partial<UserChartPreferences>) => void;
}

export function StockChartWorkspace({
  stocks,
  selectedSymbol,
  onSelectSymbol,
  preferences,
  onSavePreferences
}: StockChartWorkspaceProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);

  const [timeframe, setTimeframe] = useState<TimeFrame>((preferences?.timeframe as TimeFrame) || '1D');
  const [showOrderBlocks, setShowOrderBlocks] = useState(preferences?.showOrderBlocks ?? true);
  const [showLiquidityLevels, setShowLiquidityLevels] = useState(preferences?.showLiquidity ?? true);
  const [showFVG, setShowFVG] = useState(true);
  const [zoneBasis, setZoneBasis] = useState<'FULL_RANGE' | 'BODY_ONLY'>('FULL_RANGE');
  const [showSMA20, setShowSMA20] = useState(preferences?.showSMA ?? true);
  const [showSMA50, setShowSMA50] = useState(false);
  const [showVolume, setShowVolume] = useState(preferences?.showVolume ?? true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [symbolSearchText, setSymbolSearchText] = useState('');

  // Sync preferences if updated externally (e.g., when user signs in or switches)
  useEffect(() => {
    if (preferences) {
      if (preferences.timeframe) setTimeframe(preferences.timeframe as TimeFrame);
      if (preferences.showOrderBlocks !== undefined) setShowOrderBlocks(preferences.showOrderBlocks);
      if (preferences.showLiquidity !== undefined) setShowLiquidityLevels(preferences.showLiquidity);
      if (preferences.showSMA !== undefined) setShowSMA20(preferences.showSMA);
      if (preferences.showVolume !== undefined) setShowVolume(preferences.showVolume);
    }
  }, [preferences]);

  const handleToggleOrderBlocks = () => {
    const nextVal = !showOrderBlocks;
    setShowOrderBlocks(nextVal);
    onSavePreferences?.({ showOrderBlocks: nextVal });
  };

  const handleToggleLiquidity = () => {
    const nextVal = !showLiquidityLevels;
    setShowLiquidityLevels(nextVal);
    onSavePreferences?.({ showLiquidity: nextVal });
  };

  const handleToggleSMA = () => {
    const nextVal = !showSMA20;
    setShowSMA20(nextVal);
    onSavePreferences?.({ showSMA: nextVal });
  };

  const handleToggleVolume = () => {
    const nextVal = !showVolume;
    setShowVolume(nextVal);
    onSavePreferences?.({ showVolume: nextVal });
  };

  const handleTimeframeChange = (tf: TimeFrame) => {
    setTimeframe(tf);
    onSavePreferences?.({ timeframe: tf });
  };

  const currentStock = useMemo(() => {
    return stocks.find(s => s.symbol === selectedSymbol) || stocks[0];
  }, [stocks, selectedSymbol]);

  const [liveCandles, setLiveCandles] = useState<OHLCVCandle[] | null>(null);

  useEffect(() => {
    let isCancelled = false;
    if (currentStock && (currentStock.feedStatus === 'LIVE' || currentStock.isDemoData === false)) {
      fetchMarketCandles(currentStock.symbol, timeframe, 80)
        .then((fetched) => {
          if (!isCancelled && fetched && fetched.length > 0) {
            setLiveCandles(fetched);
          }
        })
        .catch((err) => {
          console.warn('Live candle fetch failed, using stock fallback:', err);
        });
    } else {
      setLiveCandles(null);
    }
    return () => {
      isCancelled = true;
    };
  }, [currentStock?.symbol, currentStock?.feedStatus, currentStock?.isDemoData, timeframe]);

  // Aggregate candles to chosen timeframe (prefer live candles when available)
  const activeCandles = useMemo(() => {
    const baseCandles = liveCandles || currentStock.candles1D;
    if (liveCandles && (timeframe === '1D' || timeframe === '1W')) {
      return baseCandles;
    }
    return aggregateCandlesToTimeframe(baseCandles, timeframe);
  }, [liveCandles, currentStock.candles1D, timeframe]);

  // Dynamically compute Order Blocks on the active timeframe
  const activeOBs = useMemo(() => {
    return detectOrderBlocks(activeCandles, {
      symbol: currentStock.symbol,
      timeframe,
      zoneType: zoneBasis,
      displacementMultiplier: 1.4,
      requireBreakOfStructure: true
    });
  }, [activeCandles, currentStock.symbol, timeframe, zoneBasis]);

  // Compute SMA series on activeCandles
  const computeSMA = (period: number) => {
    const candles = activeCandles;
    const result: { time: string; value: number }[] = [];
    for (let i = period - 1; i < candles.length; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += candles[i - j].close;
      }
      result.push({
        time: candles[i].timestamp,
        value: Number((sum / period).toFixed(2))
      });
    }
    return result;
  };

  // Mount lightweight-chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clear previous chart container children
    chartContainerRef.current.innerHTML = '';

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 480,
      layout: {
        background: { type: ColorType.Solid, color: '#090d16' },
        textColor: '#94a3b8',
        fontSize: 12,
        fontFamily: 'JetBrains Mono, monospace'
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.4)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.4)' },
      },
      crosshair: {
        vertLine: { color: '#38bdf8', width: 1, style: LineStyle.Dashed },
        horzLine: { color: '#38bdf8', width: 1, style: LineStyle.Dashed },
      },
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        autoScale: true,
      }
    });

    chartInstanceRef.current = chart;

    // 1. Candlestick Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e',
    });

    // Format candle data for lightweight-charts
    const candleData = activeCandles.map(c => ({
      time: c.timestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    candleSeries.setData(candleData);

    // 2. Volume Histogram Series
    if (showVolume) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: '', // overlay
      });
      volumeSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.82, bottom: 0 },
      });

      const volumeData = activeCandles.map(c => ({
        time: c.timestamp,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)',
      }));
      volumeSeries.setData(volumeData);
    }

    // 3. SMA 20
    if (showSMA20) {
      const sma20Series = chart.addSeries(LineSeries, {
        color: '#38bdf8',
        lineWidth: 2,
        title: 'SMA 20',
      });
      sma20Series.setData(computeSMA(20));
    }

    // 4. SMA 50
    if (showSMA50) {
      const sma50Series = chart.addSeries(LineSeries, {
        color: '#f59e0b',
        lineWidth: 2,
        title: 'SMA 50',
      });
      sma50Series.setData(computeSMA(50));
    }

    // 5. Order Block Zone Price Lines (Upper, Mean 50%, Lower)
    if (showOrderBlocks && activeOBs.length > 0) {
      activeOBs.slice(0, 4).forEach(ob => {
        const isBull = ob.direction === 'BULLISH_DEMAND';
        const color = isBull ? '#10b981' : '#f43f5e';

        candleSeries.createPriceLine({
          price: ob.high,
          color,
          lineWidth: 1,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: `${isBull ? 'Bull OB' : 'Bear OB'} High Rs.${ob.high}`,
        });

        candleSeries.createPriceLine({
          price: ob.meanThreshold,
          color: isBull ? '#34d399' : '#fb7185',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: false,
          title: `50% MT Rs.${ob.meanThreshold}`,
        });

        candleSeries.createPriceLine({
          price: ob.low,
          color,
          lineWidth: 1,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: `${isBull ? 'Bull OB' : 'Bear OB'} Low Rs.${ob.low}`,
        });
      });
    }

    // 6. Fair Value Gap (FVG) Imbalance Lines
    if (showFVG && activeOBs.length > 0) {
      activeOBs.slice(0, 3).forEach(ob => {
        if (ob.fairValueGap) {
          candleSeries.createPriceLine({
            price: ob.fairValueGap.high,
            color: '#eab308',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `FVG High Rs.${ob.fairValueGap.high}`,
          });
          candleSeries.createPriceLine({
            price: ob.fairValueGap.low,
            color: '#ca8a04',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `FVG Low Rs.${ob.fairValueGap.low}`,
          });
        }
      });
    }

    // 7. Liquidity Levels (PDH, PDL)
    if (showLiquidityLevels && currentStock.liquidityLevels.length > 0) {
      currentStock.liquidityLevels.slice(0, 3).forEach(liq => {
        candleSeries.createPriceLine({
          price: liq.price,
          color: liq.isSwept ? '#fbbf24' : '#94a3b8',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `${liq.levelType === 'PREV_DAY_HIGH' ? 'PDH' : liq.levelType === 'PREV_DAY_LOW' ? 'PDL' : 'SWING'} Rs.${liq.price.toFixed(2)}${liq.isSwept ? ' (SWEPT)' : ''}`,
        });
      });
    }

    // Fit content
    chart.timeScale().fitContent();

    // Resize handler
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [currentStock, activeCandles, activeOBs, showOrderBlocks, showLiquidityLevels, showFVG, showSMA20, showSMA50, showVolume, timeframe, zoneBasis]);

  const handleCaptureChart = () => {
    if (!chartContainerRef.current) return;
    const canvas = chartContainerRef.current.querySelector('canvas');
    if (canvas) {
      const imgUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = imgUrl;
      a.download = `${currentStock.symbol}_chart_${new Date().toISOString().split('T')[0]}.png`;
      a.click();
    }
  };

  return (
    <div className="space-y-4">
      {/* Workspace Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-4">
          {/* Symbol Selector Pill */}
          <div className="relative">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-white font-mono font-bold text-sm cursor-pointer transition-colors"
            >
              <span>{currentStock.symbol}</span>
              <span className="text-slate-400 font-sans text-xs">({currentStock.companyName})</span>
              <Search className="w-3.5 h-3.5 text-sky-400 ml-1" />
            </button>

            {/* Quick Switch Dropdown */}
            {searchOpen && (
              <div className="absolute left-0 top-full mt-1.5 z-50 w-72 bg-slate-950 border border-slate-800 rounded shadow-2xl p-2 space-y-2">
                <input
                  type="text"
                  placeholder="Filter symbol..."
                  value={symbolSearchText}
                  onChange={(e) => setSymbolSearchText(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                  autoFocus
                />
                <div className="max-h-56 overflow-y-auto divide-y divide-slate-800/60 font-mono text-xs">
                  {stocks
                    .filter(s => s.symbol.toLowerCase().includes(symbolSearchText.toLowerCase()) || s.companyName.toLowerCase().includes(symbolSearchText.toLowerCase()))
                    .map(s => (
                      <button
                        key={s.symbol}
                        onClick={() => {
                          onSelectSymbol(s.symbol);
                          setSearchOpen(false);
                          setSymbolSearchText('');
                        }}
                        className="w-full py-1.5 px-2 text-left hover:bg-slate-800 flex justify-between items-center rounded transition-colors cursor-pointer"
                      >
                        <span className="font-bold text-white">{s.symbol}</span>
                        <span className={`text-[11px] tabular-nums ${s.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {s.change >= 0 ? '+' : ''}{s.changePercent}%
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Metrics */}
          <div className="hidden sm:flex items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-500">{currentStock.isDemoData ? 'Simulated LTP: ' : 'LTP: '}</span>
              <span className="font-bold text-white tabular-nums">Rs. {currentStock.lastPrice.toFixed(2)}</span>
              {!currentStock.isDemoData && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  LIVE
                </span>
              )}
            </div>
            <div>
              <span className="text-slate-500">Chg: </span>
              <span className={`font-semibold tabular-nums ${currentStock.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {currentStock.change >= 0 ? '+' : ''}{currentStock.changePercent}%
              </span>
            </div>
            <div>
              <span className="text-slate-500">RelVol: </span>
              <span className="text-sky-400 font-semibold">{currentStock.relativeVolume}x</span>
            </div>
          </div>
        </div>

        {/* Chart Actions & Timeframe */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframes */}
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800 text-xs font-mono">
            {(['15M', '1H', '4H', '1D', '1W'] as TimeFrame[]).map(tf => (
              <button
                key={tf}
                onClick={() => handleTimeframeChange(tf)}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  timeframe === tf ? 'bg-sky-500 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <span className="text-slate-700" aria-hidden="true">|</span>

          {/* Overlays Toggles */}
          <button
            onClick={handleToggleOrderBlocks}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border transition-colors cursor-pointer ${
              showOrderBlocks
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>Order Blocks</span>
          </button>

          <button
            onClick={handleToggleLiquidity}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border transition-colors cursor-pointer ${
              showLiquidityLevels
                ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Liquidity Levels</span>
          </button>

          <button
            onClick={handleToggleSMA}
            className={`px-2 py-1 text-xs font-mono rounded border transition-colors cursor-pointer ${
              showSMA20
                ? 'bg-sky-950/80 text-sky-300 border-sky-800'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            SMA 20
          </button>

          <button
            onClick={() => setShowSMA50(!showSMA50)}
            className={`px-2 py-1 text-xs font-mono rounded border transition-colors cursor-pointer ${
              showSMA50
                ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            SMA 50
          </button>

          <button
            onClick={() => setShowFVG(!showFVG)}
            className={`flex items-center gap-1 px-2 py-1 text-xs font-mono rounded border transition-colors cursor-pointer ${
              showFVG
                ? 'bg-yellow-950/70 text-yellow-300 border-yellow-700'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
            title="Toggle Fair Value Gap (FVG) Imbalance lines"
          >
            FVG
          </button>

          <button
            onClick={() => setZoneBasis(prev => prev === 'FULL_RANGE' ? 'BODY_ONLY' : 'FULL_RANGE')}
            className="px-2 py-1 text-xs font-mono rounded border border-slate-700 bg-slate-900 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Switch zone calculation between Full Wick range and Candle Body only"
          >
            {zoneBasis === 'FULL_RANGE' ? 'Zones: Full Wick' : 'Zones: Body Only'}
          </button>

          <button
            onClick={handleCaptureChart}
            className="p-1.5 text-slate-400 hover:text-white rounded bg-slate-900 border border-slate-800 transition-colors cursor-pointer"
            title="Download Chart Screenshot (PNG)"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Prominent Live / Demo Notice Callout */}
      {!currentStock.isDemoData ? (
        <div className="flex items-center justify-between px-3 py-1.5 rounded bg-emerald-950/40 border border-emerald-600/40 text-[11px] text-emerald-200">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-slate-950 uppercase shrink-0">
              LIVE UPSTOX DATA (NSE)
            </span>
            <span className="text-slate-300">
              Genuine candlestick bars, volume data, and order blocks computed for {currentStock.symbol} via Upstox API v2.
            </span>
          </div>
          <span className="font-mono text-emerald-400 hidden sm:inline text-[10px] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            LIVE BROKER FEED
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between px-3 py-1.5 rounded bg-amber-950/40 border border-amber-600/40 text-[11px] text-amber-200">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950 uppercase shrink-0">
              DEMO DATA — NOT LIVE MARKET DATA
            </span>
            <span className="text-slate-300">
              Candlestick bars and indicators for {currentStock.symbol} are simulated demonstration values. Not genuine NSE execution prices.
            </span>
          </div>
          <span className="font-mono text-amber-400 hidden sm:inline text-[10px]">DEMO MODE</span>
        </div>
      )}

      {/* Chart Canvas Area */}
      <div className="bg-slate-950 border border-slate-800 rounded p-2 relative">
        <div ref={chartContainerRef} className="w-full h-[480px] rounded" />

        {timeframe !== '1D' && (
          <div className="absolute top-4 left-4 bg-slate-900/90 border border-slate-800 px-2.5 py-1 rounded text-[11px] font-mono text-slate-400 backdrop-blur-sm">
            Note: Intraday {timeframe} view approximated from daily OHLCV dataset
          </div>
        )}
      </div>

      {/* Active Symbol Analytical Drawer / Overlays Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Detected Order Block Details for this symbol */}
        <div className="bg-slate-900/60 border border-slate-800 rounded p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
              <Box className="w-4 h-4 text-sky-400" />
              Detected Order Block Zones ({currentStock.activeOrderBlocks.length})
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Rule Engine v1.2</span>
          </div>

          {currentStock.activeOrderBlocks.length === 0 ? (
            <div className="text-xs text-slate-500 py-4 font-sans">
              No qualifying order blocks currently identified within this lookback window.
            </div>
          ) : (
            <div className="space-y-2.5">
              {currentStock.activeOrderBlocks.map(ob => {
                const isBull = ob.direction === 'BULLISH_DEMAND';
                return (
                  <div key={ob.id} className="p-2.5 bg-slate-950/80 border border-slate-800 rounded text-xs space-y-1 font-mono">
                    <div className="flex justify-between items-center">
                      <span className={`font-bold ${isBull ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isBull ? 'Bullish Demand Zone' : 'Bearish Supply Zone'}
                      </span>
                      <span className="text-slate-400 text-[11px]">Formed: {ob.formationTime}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Range: Rs. {ob.low} - Rs. {ob.high}</span>
                      <span className="text-sky-400">50% MT: Rs. {ob.meanThreshold}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-900 flex justify-between">
                      <span>Displacement: +{ob.displacementPercent}%</span>
                      <span>Retests: {ob.retestCount}</span>
                      <span>Status: {ob.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Liquidity Reference Levels for this symbol */}
        <div className="bg-slate-900/60 border border-slate-800 rounded p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-400" />
              Key Liquidity Levels & Sweeps
            </h3>
            <span className="text-[11px] font-mono text-slate-400">PDH / PDL / Swings</span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            {currentStock.liquidityLevels.slice(0, 4).map(liq => (
              <div key={liq.id} className="p-2.5 bg-slate-950/80 border border-slate-800 rounded flex justify-between items-center">
                <div>
                  <span className="font-semibold text-slate-200">{liq.levelType.replace(/_/g, ' ')}</span>
                  <div className="text-[11px] text-slate-400">{liq.description}</div>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold tabular-nums">Rs. {liq.price.toFixed(2)}</div>
                  <div className={`text-[10px] font-semibold ${liq.isSwept ? 'text-amber-400' : 'text-slate-500'}`}>
                    {liq.isSwept ? 'SWEPT' : 'UNSWEPT'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
