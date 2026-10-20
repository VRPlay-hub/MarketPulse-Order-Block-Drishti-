import type {
  BacktestTradeResult,
  BacktestSummary,
  BacktestParams
} from '../types/market.ts';

/**
 * Escapes CSV cell values according to RFC 4180 standards.
 */
export function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates RFC 4180 compliant CSV string for trade-by-trade execution log.
 */
export function generateTradesCsv(trades: BacktestTradeResult[], symbol: string): string {
  const headers = [
    'Trade ID',
    'Symbol',
    'Direction',
    'Entry Date',
    'Exit Date',
    'Holding Bars',
    'Entry Price (Rs.)',
    'Exit Price (Rs.)',
    'Stop Loss (Rs.)',
    'Target Price (Rs.)',
    'Quantity',
    'Capital Deployed (Rs.)',
    'Gross PnL (Rs.)',
    'Brokerage Fees (Rs.)',
    'Net PnL (Rs.)',
    'Return %',
    'Cumulative Equity (Rs.)',
    'Risk:Reward Achieved',
    'Exit Reason',
    'Outcome',
    'Intrabar Collision'
  ];

  const rows = trades.map(t => [
    escapeCsvCell(t.id),
    escapeCsvCell(t.symbol || symbol),
    escapeCsvCell(t.direction),
    escapeCsvCell(t.entryDate),
    escapeCsvCell(t.exitDate),
    escapeCsvCell(t.holdingBars || 1),
    escapeCsvCell(t.entryPrice.toFixed(2)),
    escapeCsvCell(t.exitPrice.toFixed(2)),
    escapeCsvCell((t.stopLoss || 0).toFixed(2)),
    escapeCsvCell((t.targetPrice || 0).toFixed(2)),
    escapeCsvCell(t.quantity),
    escapeCsvCell((t.entryPrice * t.quantity).toFixed(2)),
    escapeCsvCell(t.grossProfit.toFixed(2)),
    escapeCsvCell((t.brokerageCosts || 40).toFixed(2)),
    escapeCsvCell(t.netProfit.toFixed(2)),
    escapeCsvCell(t.returnPct.toFixed(2)),
    escapeCsvCell(t.pnlCumulative.toFixed(2)),
    escapeCsvCell((t.riskRewardAchieved || 1).toFixed(2)),
    escapeCsvCell(t.reason),
    escapeCsvCell(t.isWin ? 'WIN' : (t.netProfit === 0 ? 'BREAKEVEN' : 'LOSS')),
    escapeCsvCell(t.collisionOccurred ? 'YES' : 'NO')
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
}

/**
 * Generates RFC 4180 compliant CSV string for equity curve time series.
 */
export function generateEquityCurveCsv(
  curve: { date: string; equity: number; drawdown?: number }[],
  symbol: string
): string {
  const headers = [
    'Date',
    'Symbol',
    'Portfolio Equity (Rs.)',
    'Drawdown %',
    'Cumulative Return %'
  ];

  const initialEquity = curve[0]?.equity || 1;

  const rows = curve.map(pt => {
    const cumReturn = ((pt.equity - initialEquity) / initialEquity) * 100;
    return [
      escapeCsvCell(pt.date),
      escapeCsvCell(symbol),
      escapeCsvCell(pt.equity.toFixed(2)),
      escapeCsvCell((pt.drawdown || 0).toFixed(2)),
      escapeCsvCell(cumReturn.toFixed(2))
    ];
  });

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
}

/**
 * Generates RFC 4180 compliant CSV string for strategy configuration & performance summary.
 */
export function generateStrategySummaryCsv(
  summary: BacktestSummary,
  params: BacktestParams
): string {
  const headers = ['Configuration & Performance Field', 'Value', 'Category'];

  const rows: [string, string | number, string][] = [
    // Strategy Parameters
    ['Security Symbol', params.symbol, 'Strategy Setup'],
    ['Strategy Direction', params.strategyDirection || 'BOTH', 'Strategy Setup'],
    ['Stop Loss Mode', params.stopLossMode || 'ZONE_BOUNDARY', 'Risk Management'],
    ['Stop Loss Buffer %', params.stopLossBufferPercent ?? 0.2, 'Risk Management'],
    ['ATR Period', params.atrPeriod ?? 14, 'Risk Management'],
    ['ATR Multiplier', params.atrMultiplier ?? 1.5, 'Risk Management'],
    ['Position Sizing Mode', params.positionSizingMode || 'EQUITY_PERCENT', 'Risk Management'],
    ['Risk Per Trade %', params.riskPerTradePercent, 'Risk Management'],
    ['Fixed Quantity', params.fixedQuantity ?? 50, 'Risk Management'],
    ['Target Multiplier (R:R)', `1:${params.targetMultiplier}`, 'Risk Management'],
    ['Displacement Threshold', `${params.minDisplacementMultiplier ?? 1.5}x ATR`, 'Detection Rules'],
    ['Brokerage & Taxes per Trade', `Rs. ${params.brokeragePerTrade}`, 'Execution Frictions'],
    ['Slippage Buffer %', `${params.slippagePercent}%`, 'Execution Frictions'],
    ['Collision Resolution', params.collisionResolution || 'CONSERVATIVE_STOP_FIRST', 'Execution Frictions'],
    ['Starting Capital', `Rs. ${params.initialCapital}`, 'Portfolio Capital'],

    // Overall Results
    ['Final Portfolio Equity', `Rs. ${(params.initialCapital + summary.netProfit).toFixed(2)}`, 'Portfolio Performance'],
    ['Net PnL', `Rs. ${summary.netProfit}`, 'Portfolio Performance'],
    ['Gross PnL', `Rs. ${summary.grossProfit}`, 'Portfolio Performance'],
    ['Total Statutory & Brokerage Fees', `Rs. ${summary.totalBrokerage}`, 'Portfolio Performance'],
    ['Net Return %', `${(((summary.netProfit) / params.initialCapital) * 100).toFixed(2)}%`, 'Portfolio Performance'],
    ['Total Trades Executed', summary.totalTrades, 'Trade Statistics'],
    ['Winning Trades', summary.winningTrades, 'Trade Statistics'],
    ['Losing Trades', summary.losingTrades, 'Trade Statistics'],
    ['Breakeven Trades', summary.breakevenTrades || 0, 'Trade Statistics'],
    ['Win Rate %', `${summary.winRate}%`, 'Trade Statistics'],
    ['Profit Factor', summary.profitFactor, 'Trade Statistics'],
    ['Average Trade Net PnL', `Rs. ${summary.averageTradePnL}`, 'Expectancy'],
    ['Average Win', `Rs. ${summary.averageWin || 0}`, 'Expectancy'],
    ['Average Loss', `Rs. ${summary.averageLoss || 0}`, 'Expectancy'],
    ['Win / Loss Ratio', summary.winLossRatio || 0, 'Expectancy'],
    ['Average Risk:Reward Achieved', summary.averageRiskReward || 0, 'Expectancy'],
    ['Maximum Drawdown %', `${summary.maxDrawdownPercent}%`, 'Risk Statistics'],
    ['Maximum Drawdown Amount', `Rs. ${summary.maxDrawdownAmount || 0}`, 'Risk Statistics'],

    // Long vs Short Breakdowns
    ['Long Trades Count', summary.longTradesCount || 0, 'Directional Breakdown'],
    ['Long Win Rate %', `${summary.longWinRate || 0}%`, 'Directional Breakdown'],
    ['Long Net Profit', `Rs. ${summary.longNetProfit || 0}`, 'Directional Breakdown'],
    ['Short Trades Count', summary.shortTradesCount || 0, 'Directional Breakdown'],
    ['Short Win Rate %', `${summary.shortWinRate || 0}%`, 'Directional Breakdown'],
    ['Short Net Profit', `Rs. ${summary.shortNetProfit || 0}`, 'Directional Breakdown'],
    ['Report Generation Timestamp', new Date().toISOString(), 'Audit Information'],
    ['Simulation Notice', 'HISTORICAL SIMULATION — NOT PREDICTIVE OF FUTURE REALIZED PERFORMANCE', 'Compliance']
  ];

  const lines = rows.map(([field, val, cat]) =>
    `${escapeCsvCell(field)},${escapeCsvCell(val)},${escapeCsvCell(cat)}`
  );

  return [headers.join(','), ...lines].join('\r\n');
}

/**
 * Triggers client-side download without transmitting data externally.
 */
export function downloadCsvFile(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
