import type { OHLCVCandle } from '../types/market.js';

export interface CsvColumnMapping {
  dateCol: string;
  openCol: string;
  highCol: string;
  lowCol: string;
  closeCol: string;
  volumeCol?: string;
}

export interface CsvValidationIssue {
  rowNumber: number;
  column: string;
  value: string;
  reason: string;
  isFatal: boolean;
}

export interface CsvParseSummary {
  totalRows: number;
  validCandlesCount: number;
  startDate: string;
  endDate: string;
  highestPrice: number;
  lowestPrice: number;
  avgDailyVolume: number;
  netReturnPercent: number;
  issues: CsvValidationIssue[];
  candles: OHLCVCandle[];
  detectedMapping: CsvColumnMapping;
}

/**
 * Normalizes different date formats to YYYY-MM-DD and computes unix timestamp.
 */
export function normalizeDateString(dateStr: string): { formattedDate: string; timeUnix: number } | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const cleanStr = dateStr.trim().replace(/"/g, '');

  // 1. Try ISO date (YYYY-MM-DD or YYYY/MM/DD)
  const isoMatch = cleanStr.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const formatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const d = new Date(Date.UTC(year, month - 1, day));
      return { formattedDate: formatted, timeUnix: Math.floor(d.getTime() / 1000) };
    }
  }

  // 2. Try Indian/UK format (DD-MM-YYYY or DD/MM/YYYY)
  const ukMatch = cleanStr.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (ukMatch) {
    const day = parseInt(ukMatch[1], 10);
    const month = parseInt(ukMatch[2], 10);
    const year = parseInt(ukMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const formatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const d = new Date(Date.UTC(year, month - 1, day));
      return { formattedDate: formatted, timeUnix: Math.floor(d.getTime() / 1000) };
    }
  }

  // 3. Fallback to native Date parser
  const parsed = new Date(cleanStr);
  if (!isNaN(parsed.getTime())) {
    const formatted = parsed.toISOString().slice(0, 10);
    return { formattedDate: formatted, timeUnix: Math.floor(parsed.getTime() / 1000) };
  }

  return null;
}

/**
 * Automatically detects column indexes for Date, Open, High, Low, Close, Volume.
 */
export function detectColumnMapping(headers: string[]): CsvColumnMapping | null {
  const norm = headers.map(h => h.toLowerCase().trim().replace(/['"_]/g, ''));

  const findIdx = (patterns: string[]) => {
    return norm.findIndex(h => patterns.some(p => h.includes(p)));
  };

  const dateIdx = findIdx(['timestamp', 'date', 'time', 'datetime', 'tradedate']);
  const openIdx = findIdx(['open', 'openprice', 'opening']);
  const highIdx = findIdx(['high', 'highprice', 'dayhigh']);
  const lowIdx = findIdx(['low', 'lowprice', 'daylow']);
  const closeIdx = findIdx(['close', 'closeprice', 'closing', 'adjclose', 'ltp']);
  const volIdx = findIdx(['volume', 'vol', 'qty', 'shares', 'tradedqty']);

  if (dateIdx === -1 || openIdx === -1 || highIdx === -1 || lowIdx === -1 || closeIdx === -1) {
    return null;
  }

  return {
    dateCol: headers[dateIdx],
    openCol: headers[openIdx],
    highCol: headers[highIdx],
    lowCol: headers[lowIdx],
    closeCol: headers[closeIdx],
    volumeCol: volIdx !== -1 ? headers[volIdx] : undefined
  };
}

/**
 * Production-grade parser for CSV OHLCV files.
 */
export function parseAndValidateCsv(
  csvContent: string,
  customMapping?: Partial<CsvColumnMapping>
): CsvParseSummary {
  const issues: CsvValidationIssue[] = [];
  const candles: OHLCVCandle[] = [];

  const rawLines = csvContent.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
  if (rawLines.length < 2) {
    return {
      totalRows: 0,
      validCandlesCount: 0,
      startDate: '',
      endDate: '',
      highestPrice: 0,
      lowestPrice: 0,
      avgDailyVolume: 0,
      netReturnPercent: 0,
      issues: [{
        rowNumber: 0,
        column: 'FILE',
        value: '',
        reason: 'File must contain a header row and at least 1 data row.',
        isFatal: true
      }],
      candles: [],
      detectedMapping: { dateCol: '', openCol: '', highCol: '', lowCol: '', closeCol: '' }
    };
  }

  // Detect delimiter: comma, semicolon, tab
  const firstLine = rawLines[0];
  let delimiter = ',';
  if (firstLine.includes('\t') && firstLine.split('\t').length > 3) delimiter = '\t';
  else if (firstLine.includes(';') && firstLine.split(';').length > 3) delimiter = ';';

  const rawHeaders = firstLine.split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));
  const detected = detectColumnMapping(rawHeaders);

  if (!detected && !customMapping) {
    return {
      totalRows: rawLines.length - 1,
      validCandlesCount: 0,
      startDate: '',
      endDate: '',
      highestPrice: 0,
      lowestPrice: 0,
      avgDailyVolume: 0,
      netReturnPercent: 0,
      issues: [{
        rowNumber: 1,
        column: 'HEADER',
        value: firstLine,
        reason: `Could not identify required columns (Date, Open, High, Low, Close). Found: [${rawHeaders.join(', ')}]`,
        isFatal: true
      }],
      candles: [],
      detectedMapping: { dateCol: '', openCol: '', highCol: '', lowCol: '', closeCol: '' }
    };
  }

  const mapping: CsvColumnMapping = {
    dateCol: customMapping?.dateCol || detected?.dateCol || rawHeaders[0],
    openCol: customMapping?.openCol || detected?.openCol || rawHeaders[1],
    highCol: customMapping?.highCol || detected?.highCol || rawHeaders[2],
    lowCol: customMapping?.lowCol || detected?.lowCol || rawHeaders[3],
    closeCol: customMapping?.closeCol || detected?.closeCol || rawHeaders[4],
    volumeCol: customMapping?.volumeCol || detected?.volumeCol
  };

  const dateIdx = rawHeaders.indexOf(mapping.dateCol);
  const openIdx = rawHeaders.indexOf(mapping.openCol);
  const highIdx = rawHeaders.indexOf(mapping.highCol);
  const lowIdx = rawHeaders.indexOf(mapping.lowCol);
  const closeIdx = rawHeaders.indexOf(mapping.closeCol);
  const volIdx = mapping.volumeCol ? rawHeaders.indexOf(mapping.volumeCol) : -1;

  const seenTimestamps = new Set<string>();

  for (let i = 1; i < rawLines.length; i++) {
    const rowNum = i + 1;
    const line = rawLines[i].trim();
    if (!line) continue;

    const parts = line.split(delimiter).map(p => p.trim().replace(/^["']|["']$/g, ''));
    if (parts.length < Math.max(dateIdx, openIdx, highIdx, lowIdx, closeIdx) + 1) {
      issues.push({
        rowNumber: rowNum,
        column: 'ROW',
        value: line,
        reason: 'Incomplete row with missing column cells.',
        isFatal: true
      });
      continue;
    }

    const rawDate = parts[dateIdx];
    const dateParsed = normalizeDateString(rawDate);
    if (!dateParsed) {
      issues.push({
        rowNumber: rowNum,
        column: mapping.dateCol,
        value: rawDate,
        reason: 'Unrecognized date format. Supported: YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY.',
        isFatal: true
      });
      continue;
    }

    if (seenTimestamps.has(dateParsed.formattedDate)) {
      issues.push({
        rowNumber: rowNum,
        column: mapping.dateCol,
        value: rawDate,
        reason: `Duplicate date entry: ${dateParsed.formattedDate}`,
        isFatal: true
      });
      continue;
    }
    seenTimestamps.add(dateParsed.formattedDate);

    // Parse prices
    const open = parseFloat(parts[openIdx]?.replace(/,/g, ''));
    const high = parseFloat(parts[highIdx]?.replace(/,/g, ''));
    const low = parseFloat(parts[lowIdx]?.replace(/,/g, ''));
    const close = parseFloat(parts[closeIdx]?.replace(/,/g, ''));
    const volume = volIdx !== -1 && parts[volIdx] ? parseFloat(parts[volIdx]?.replace(/,/g, '')) : 100000;

    let hasPriceError = false;

    if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) {
      issues.push({
        rowNumber: rowNum,
        column: 'PRICES',
        value: `O:${parts[openIdx]}, H:${parts[highIdx]}, L:${parts[lowIdx]}, C:${parts[closeIdx]}`,
        reason: 'Non-numeric price character values detected.',
        isFatal: true
      });
      hasPriceError = true;
    }

    if (open <= 0 || high <= 0 || low <= 0 || close <= 0) {
      issues.push({
        rowNumber: rowNum,
        column: 'PRICES',
        value: `O:${open}, H:${high}, L:${low}, C:${close}`,
        reason: 'Prices must be strictly positive values.',
        isFatal: true
      });
      hasPriceError = true;
    }

    // Mathematical integrity of OHLC
    if (high < low) {
      issues.push({
        rowNumber: rowNum,
        column: 'HIGH/LOW',
        value: `High: ${high}, Low: ${low}`,
        reason: 'High price cannot be strictly lower than Low price.',
        isFatal: true
      });
      hasPriceError = true;
    }

    if (high < Math.max(open, close)) {
      issues.push({
        rowNumber: rowNum,
        column: 'HIGH',
        value: `High: ${high}, Open: ${open}, Close: ${close}`,
        reason: 'High price must be greater than or equal to both Open and Close.',
        isFatal: true
      });
      hasPriceError = true;
    }

    if (low > Math.min(open, close)) {
      issues.push({
        rowNumber: rowNum,
        column: 'LOW',
        value: `Low: ${low}, Open: ${open}, Close: ${close}`,
        reason: 'Low price must be less than or equal to both Open and Close.',
        isFatal: true
      });
      hasPriceError = true;
    }

    if (!hasPriceError) {
      candles.push({
        timestamp: dateParsed.formattedDate,
        timeUnix: dateParsed.timeUnix,
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume: Math.max(1, Math.round(volume || 100000))
      });
    }
  }

  // Ensure chronological order (oldest first)
  candles.sort((a, b) => a.timeUnix - b.timeUnix);

  // Compute metrics
  let highestPrice = 0;
  let lowestPrice = Infinity;
  let totalVol = 0;

  for (const c of candles) {
    if (c.high > highestPrice) highestPrice = c.high;
    if (c.low < lowestPrice) lowestPrice = c.low;
    totalVol += c.volume;
  }

  const validCount = candles.length;
  const avgDailyVolume = validCount > 0 ? Math.round(totalVol / validCount) : 0;
  const startDate = candles[0]?.timestamp || '';
  const endDate = candles[validCount - 1]?.timestamp || '';
  const firstClose = candles[0]?.close || 1;
  const lastClose = candles[validCount - 1]?.close || 1;
  const netReturnPercent = validCount > 1
    ? Number((((lastClose - firstClose) / firstClose) * 100).toFixed(2))
    : 0;

  return {
    totalRows: rawLines.length - 1,
    validCandlesCount: validCount,
    startDate,
    endDate,
    highestPrice: highestPrice > 0 ? highestPrice : 0,
    lowestPrice: lowestPrice !== Infinity ? lowestPrice : 0,
    avgDailyVolume,
    netReturnPercent,
    issues,
    candles,
    detectedMapping: mapping
  };
}
