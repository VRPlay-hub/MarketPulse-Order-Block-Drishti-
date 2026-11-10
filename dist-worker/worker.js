var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
if (!("__unenv__" in performance)) {
  const proto = Performance.prototype;
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key !== "constructor" && !(key in performance)) {
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (desc) {
        Object.defineProperty(performance, key, desc);
      }
    }
  }
}
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
  static {
    __name(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};

// node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
  static {
    __name(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};

// node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process extends EventEmitter {
  static {
    __name(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION}`;
  }
  get versions() {
    return { node: NODE_VERSION };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
  _channel,
  _debugEnd,
  _debugProcess,
  _disconnect,
  _events,
  _eventsCount,
  _exiting,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _handleQueue,
  _kill,
  _linkedBinding,
  _maxListeners,
  _pendingMessage,
  _preload_modules,
  _rawDebug,
  _send,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  assert: assert2,
  availableMemory,
  binding,
  channel,
  chdir,
  config,
  connected,
  constrainedMemory,
  cpuUsage,
  cwd,
  debugPort,
  disconnect,
  dlopen,
  domain,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exitCode,
  finalization,
  getActiveResourcesInfo,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getMaxListeners,
  getuid,
  hasUncaughtExceptionCaptureCallback,
  hrtime: hrtime3,
  initgroups,
  kill,
  listenerCount,
  listeners,
  loadEnvFile,
  mainModule,
  memoryUsage,
  moduleLoadList,
  nextTick,
  off,
  on,
  once,
  openStdin,
  permission,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  reallyExit,
  ref,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  send,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setMaxListeners,
  setSourceMapsEnabled,
  setuid,
  setUncaughtExceptionCaptureCallback,
  sourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  throwDeprecation,
  title,
  traceDeprecation,
  umask,
  unref,
  uptime,
  version,
  versions
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// src/utils/calculations.ts
function calculatePercentageChange(currentPrice, previousClose) {
  if (!previousClose || previousClose <= 0 || isNaN(currentPrice) || isNaN(previousClose)) {
    return 0;
  }
  const pct = (currentPrice - previousClose) / previousClose * 100;
  return Number(pct.toFixed(2));
}
__name(calculatePercentageChange, "calculatePercentageChange");
function calculateRelativeVolume(currentVolume, avgHistoricalVolume) {
  if (!avgHistoricalVolume || avgHistoricalVolume <= 0 || !currentVolume || currentVolume <= 0) {
    return 1;
  }
  const rvol = currentVolume / avgHistoricalVolume;
  return Number(rvol.toFixed(2));
}
__name(calculateRelativeVolume, "calculateRelativeVolume");
function detectOrderBlocks(candles, options = {}) {
  if (!candles || candles.length < 5) {
    return [];
  }
  const {
    displacementMultiplier = 1.6,
    requireBreakOfStructure = true,
    zoneType = "FULL_CANDLE",
    symbol = "SECURITY",
    timeframe = "1D"
  } = options;
  const bodySizes = candles.map((c) => Math.abs(c.close - c.open));
  const avgBody = bodySizes.reduce((acc, v) => acc + v, 0) / (bodySizes.length || 1);
  const zones = [];
  for (let i = 2; i < candles.length - 1; i++) {
    const obCandle = candles[i];
    const prevCandle = candles[i - 1];
    const nextCandle = candles[i + 1];
    const forwardCandle2 = i + 2 < candles.length ? candles[i + 2] : null;
    const isBearish = obCandle.close < obCandle.open;
    const isNextBullish = nextCandle.close > nextCandle.open;
    const nextCandleDisplacement = nextCandle.close - nextCandle.open;
    const displacementRatio = avgBody > 0 ? nextCandleDisplacement / avgBody : 1;
    if (isBearish && isNextBullish && displacementRatio >= displacementMultiplier) {
      const prevHigh = Math.max(prevCandle.high, obCandle.high);
      const brokeStructure = nextCandle.close > prevHigh;
      if (!requireBreakOfStructure || brokeStructure) {
        const high = zoneType === "BODY_ONLY" ? Math.max(obCandle.open, obCandle.close) : obCandle.high;
        const low = zoneType === "BODY_ONLY" ? Math.min(obCandle.open, obCandle.close) : obCandle.low;
        const meanThreshold = Number(((high + low) / 2).toFixed(2));
        let fvg = void 0;
        if (forwardCandle2 && forwardCandle2.low > obCandle.high) {
          const fvgSize = Number((forwardCandle2.low - obCandle.high).toFixed(2));
          if (fvgSize > 0) {
            fvg = {
              high: forwardCandle2.low,
              low: obCandle.high,
              size: fvgSize
            };
          }
        }
        const isReversal = prevCandle.close < prevCandle.open && prevCandle.low < obCandle.low;
        const structureType = isReversal ? "CHOCH" : "BOS";
        let status = "FRESH";
        let retestCount = 0;
        for (let j = i + 2; j < candles.length; j++) {
          const testCandle = candles[j];
          if (testCandle.close < low) {
            status = "INVALIDATED";
            break;
          }
          if (testCandle.low <= high && testCandle.low >= low) {
            retestCount++;
            if (testCandle.low <= meanThreshold) {
              status = "MITIGATED";
            } else if (status === "FRESH") {
              status = "TESTED";
            }
          }
        }
        if (status !== "INVALIDATED") {
          const volSpike = Number((nextCandle.volume / (obCandle.volume || 1)).toFixed(2));
          let quality = 50;
          if (fvg) quality += 15;
          if (brokeStructure) quality += 15;
          if (volSpike >= 1.5) quality += 10;
          if (displacementRatio >= 2) quality += 10;
          if (retestCount >= 2) quality -= 15;
          quality = Math.max(10, Math.min(99, quality));
          zones.push({
            id: `OB-${symbol}-${obCandle.timestamp}-BULL`,
            symbol,
            timeframe,
            direction: "BULLISH_DEMAND",
            high: Number(high.toFixed(2)),
            low: Number(low.toFixed(2)),
            meanThreshold,
            formationTime: obCandle.timestamp,
            confirmationTime: nextCandle.timestamp,
            status,
            retestCount,
            displacementPercent: Number(((nextCandle.close - obCandle.close) / obCandle.close * 100).toFixed(2)),
            hasBreakOfStructure: brokeStructure,
            structureType,
            qualityScore: quality,
            zoneBasis: zoneType,
            fairValueGap: fvg,
            volumeSpikeRatio: volSpike,
            ruleVersion: "v2.0-fvg-structure",
            explanation: `Bearish candle preceding ${displacementRatio.toFixed(1)}x ATR upward displacement with ${brokeStructure ? "confirmed " + structureType : "momentum expansion"}${fvg ? " & Fair Value Gap (Rs." + fvg.size + ")" : ""}.`
          });
        }
      }
    }
    const isBullish = obCandle.close > obCandle.open;
    const isNextBearish = nextCandle.close < nextCandle.open;
    const nextDownDisplacement = nextCandle.open - nextCandle.close;
    const downDisplacementRatio = avgBody > 0 ? nextDownDisplacement / avgBody : 1;
    if (isBullish && isNextBearish && downDisplacementRatio >= displacementMultiplier) {
      const prevLow = Math.min(prevCandle.low, obCandle.low);
      const brokeStructure = nextCandle.close < prevLow;
      if (!requireBreakOfStructure || brokeStructure) {
        const high = zoneType === "BODY_ONLY" ? Math.max(obCandle.open, obCandle.close) : obCandle.high;
        const low = zoneType === "BODY_ONLY" ? Math.min(obCandle.open, obCandle.close) : obCandle.low;
        const meanThreshold = Number(((high + low) / 2).toFixed(2));
        let fvg = void 0;
        if (forwardCandle2 && forwardCandle2.high < obCandle.low) {
          const fvgSize = Number((obCandle.low - forwardCandle2.high).toFixed(2));
          if (fvgSize > 0) {
            fvg = {
              high: obCandle.low,
              low: forwardCandle2.high,
              size: fvgSize
            };
          }
        }
        const isReversal = prevCandle.close > prevCandle.open && prevCandle.high > obCandle.high;
        const structureType = isReversal ? "CHOCH" : "BOS";
        let status = "FRESH";
        let retestCount = 0;
        for (let j = i + 2; j < candles.length; j++) {
          const testCandle = candles[j];
          if (testCandle.close > high) {
            status = "INVALIDATED";
            break;
          }
          if (testCandle.high >= low && testCandle.high <= high) {
            retestCount++;
            if (testCandle.high >= meanThreshold) {
              status = "MITIGATED";
            } else if (status === "FRESH") {
              status = "TESTED";
            }
          }
        }
        if (status !== "INVALIDATED") {
          const volSpike = Number((nextCandle.volume / (obCandle.volume || 1)).toFixed(2));
          let quality = 50;
          if (fvg) quality += 15;
          if (brokeStructure) quality += 15;
          if (volSpike >= 1.5) quality += 10;
          if (downDisplacementRatio >= 2) quality += 10;
          if (retestCount >= 2) quality -= 15;
          quality = Math.max(10, Math.min(99, quality));
          zones.push({
            id: `OB-${symbol}-${obCandle.timestamp}-BEAR`,
            symbol,
            timeframe,
            direction: "BEARISH_SUPPLY",
            high: Number(high.toFixed(2)),
            low: Number(low.toFixed(2)),
            meanThreshold,
            formationTime: obCandle.timestamp,
            confirmationTime: nextCandle.timestamp,
            status,
            retestCount,
            displacementPercent: Number(((obCandle.close - nextCandle.close) / obCandle.close * 100).toFixed(2)),
            hasBreakOfStructure: brokeStructure,
            structureType,
            qualityScore: quality,
            zoneBasis: zoneType,
            fairValueGap: fvg,
            volumeSpikeRatio: volSpike,
            ruleVersion: "v2.0-fvg-structure",
            explanation: `Bullish candle preceding ${downDisplacementRatio.toFixed(1)}x ATR downward displacement with ${brokeStructure ? "confirmed " + structureType : "momentum drop"}${fvg ? " & Fair Value Gap (Rs." + fvg.size + ")" : ""}.`
          });
        }
      }
    }
  }
  return zones;
}
__name(detectOrderBlocks, "detectOrderBlocks");
function detectLiquidityLevels(candles, symbol = "SECURITY", tolerancePct = 0.15) {
  if (!candles || candles.length < 3) return [];
  const levels = [];
  const latestIndex = candles.length - 1;
  const currentCandle = candles[latestIndex];
  const prevDay = candles[latestIndex - 1];
  if (prevDay) {
    const isPdhSwept = currentCandle.high > prevDay.high && currentCandle.close <= prevDay.high;
    const isPdlSwept = currentCandle.low < prevDay.low && currentCandle.close >= prevDay.low;
    levels.push({
      id: `LIQ-PDH-${symbol}`,
      symbol,
      levelType: "PREV_DAY_HIGH",
      price: prevDay.high,
      timestamp: prevDay.timestamp,
      isSwept: isPdhSwept,
      sweptTimestamp: isPdhSwept ? currentCandle.timestamp : void 0,
      description: `Previous day high (PDH) resistance zone at Rs. ${prevDay.high.toFixed(2)}`,
      status: isPdhSwept ? "SWEPT" : "ACTIVE"
    });
    levels.push({
      id: `LIQ-PDL-${symbol}`,
      symbol,
      levelType: "PREV_DAY_LOW",
      price: prevDay.low,
      timestamp: prevDay.timestamp,
      isSwept: isPdlSwept,
      sweptTimestamp: isPdlSwept ? currentCandle.timestamp : void 0,
      description: `Previous day low (PDL) buy-side liquidity zone at Rs. ${prevDay.low.toFixed(2)}`,
      status: isPdlSwept ? "SWEPT" : "ACTIVE"
    });
  }
  for (let i = 2; i < candles.length - 1; i++) {
    const prev = candles[i - 1];
    const curr = candles[i];
    const next = candles[i + 1];
    if (curr.high > prev.high && curr.high > next.high) {
      let swept = false;
      let sweptTime;
      for (let j = i + 2; j < candles.length; j++) {
        if (candles[j].high > curr.high && candles[j].close < curr.high) {
          swept = true;
          sweptTime = candles[j].timestamp;
          break;
        }
      }
      levels.push({
        id: `LIQ-SH-${curr.timestamp}`,
        symbol,
        levelType: "SWING_HIGH",
        price: curr.high,
        timestamp: curr.timestamp,
        isSwept: swept,
        sweptTimestamp: sweptTime,
        description: `Swing High at Rs. ${curr.high.toFixed(2)}`,
        status: swept ? "SWEPT" : "ACTIVE"
      });
    }
    if (curr.low < prev.low && curr.low < next.low) {
      let swept = false;
      let sweptTime;
      for (let j = i + 2; j < candles.length; j++) {
        if (candles[j].low < curr.low && candles[j].close > curr.low) {
          swept = true;
          sweptTime = candles[j].timestamp;
          break;
        }
      }
      levels.push({
        id: `LIQ-SL-${curr.timestamp}`,
        symbol,
        levelType: "SWING_LOW",
        price: curr.low,
        timestamp: curr.timestamp,
        isSwept: swept,
        sweptTimestamp: sweptTime,
        description: `Swing Low at Rs. ${curr.low.toFixed(2)}`,
        status: swept ? "SWEPT" : "ACTIVE"
      });
    }
  }
  return levels;
}
__name(detectLiquidityLevels, "detectLiquidityLevels");
function calculateMarketScore(params, weights = {
  momentumWeight: 0.25,
  relativeVolumeWeight: 0.2,
  trendWeight: 0.2,
  bosWeight: 0.15,
  orderBlockProximityWeight: 0.1,
  liquiditySweepWeight: 0.1
}) {
  const supporting = [];
  const conflicting = [];
  const clampedMomentum = Math.max(-5, Math.min(5, params.changePercent));
  const momentumComponent = clampedMomentum / 5 * 100;
  if (momentumComponent > 20) supporting.push(`Positive price change (+${params.changePercent}%)`);
  else if (momentumComponent < -20) conflicting.push(`Negative price change (${params.changePercent}%)`);
  let rvolScore = 0;
  if (params.relativeVolume > 1.2) {
    rvolScore = params.changePercent >= 0 ? 80 : -80;
    supporting.push(`Elevated relative volume (${params.relativeVolume}x 20D avg)`);
  } else if (params.relativeVolume < 0.7) {
    rvolScore = 0;
    conflicting.push(`Subdued trading volume (${params.relativeVolume}x 20D avg)`);
  } else {
    rvolScore = params.changePercent >= 0 ? 20 : -20;
  }
  let trendScore = 0;
  switch (params.trend) {
    case "STRONG_UP":
      trendScore = 100;
      supporting.push("Strong structural uptrend");
      break;
    case "MODERATE_UP":
      trendScore = 50;
      supporting.push("Moderate upward trajectory");
      break;
    case "SIDEWAYS":
      trendScore = 0;
      break;
    case "MODERATE_DOWN":
      trendScore = -50;
      conflicting.push("Moderate downward slope");
      break;
    case "STRONG_DOWN":
      trendScore = -100;
      conflicting.push("Strong structural downtrend");
      break;
  }
  const bosScore = params.hasBOS ? params.changePercent >= 0 ? 90 : -90 : 0;
  if (params.hasBOS) supporting.push("Confirmed technical break of structure (BOS)");
  let obScore = 0;
  if (params.hasRecentBullishOB && !params.hasRecentBearishOB) {
    obScore = 85;
    supporting.push("Fresh bullish demand order block zone below price");
  } else if (params.hasRecentBearishOB && !params.hasRecentBullishOB) {
    obScore = -85;
    conflicting.push("Active bearish supply order block zone above price");
  }
  let liqScore = 0;
  if (params.hasBullishSweep) {
    liqScore = 75;
    supporting.push("Bullish liquidity sweep (reclaimed previous low)");
  } else if (params.hasBearishSweep) {
    liqScore = -75;
    conflicting.push("Bearish liquidity sweep (rejection at prior swing high)");
  }
  const weightedTotal = momentumComponent * weights.momentumWeight + rvolScore * weights.relativeVolumeWeight + trendScore * weights.trendWeight + bosScore * weights.bosWeight + obScore * weights.orderBlockProximityWeight + liqScore * weights.liquiditySweepWeight;
  const totalScore = Math.max(-100, Math.min(100, Math.round(weightedTotal)));
  let direction = "NEUTRAL";
  if (totalScore >= 20) direction = "BULLISH";
  else if (totalScore <= -20) direction = "BEARISH";
  return {
    totalScore,
    momentumComponent: Math.round(momentumComponent),
    relativeVolumeComponent: Math.round(rvolScore),
    trendComponent: Math.round(trendScore),
    bosComponent: Math.round(bosScore),
    orderBlockComponent: Math.round(obScore),
    liquidityComponent: Math.round(liqScore),
    direction,
    supportingSignals: supporting,
    conflictingSignals: conflicting,
    dataCompleteness: 100
  };
}
__name(calculateMarketScore, "calculateMarketScore");

// src/data/mockMarketData.ts
function generateCandles(basePrice, volatility, trendBias, baseVolume, count3 = 60) {
  const candles = [];
  let price = basePrice;
  const startDate = /* @__PURE__ */ new Date("2026-01-15T09:15:00Z");
  for (let i = 0; i < count3; i++) {
    const curDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1e3);
    const day = curDate.getUTCDay();
    if (day === 0 || day === 6) continue;
    const dateStr = curDate.toISOString().split("T")[0];
    const timeUnix = Math.floor(curDate.getTime() / 1e3);
    const pseudoRandom = Math.sin(i * 12.9898 + basePrice * 0.05) * 43758.5453;
    const norm = pseudoRandom - Math.floor(pseudoRandom) - 0.5;
    const deltaPercent = norm * volatility * 2 + trendBias * 0.25;
    const open = Number((price * (1 + norm * 3e-3)).toFixed(2));
    const close = Number((price * (1 + deltaPercent / 100)).toFixed(2));
    const high = Number((Math.max(open, close) * (1 + Math.abs(norm) * 8e-3)).toFixed(2));
    const low = Number((Math.min(open, close) * (1 - Math.abs(norm) * 8e-3)).toFixed(2));
    const volMultiplier = 0.7 + Math.abs(norm) * 1.5;
    const volume = Math.round(baseVolume * volMultiplier);
    candles.push({
      timestamp: dateStr,
      timeUnix,
      open,
      high,
      low,
      close,
      volume
    });
    price = close;
  }
  return candles;
}
__name(generateCandles, "generateCandles");
var rawStocks = [
  { symbol: "RELIANCE", name: "Reliance Industries Ltd.", sector: "Oil & Gas / Conglomerate", marketCapCr: 1985400, basePrice: 2840, volatility: 1.4, trendBias: 0.6, baseVolume: 65e5, trend: "STRONG_UP" },
  { symbol: "HDFCBANK", name: "HDFC Bank Ltd.", sector: "Banking & Financials", marketCapCr: 128e4, basePrice: 1720, volatility: 1.2, trendBias: 0.4, baseVolume: 124e5, trend: "MODERATE_UP" },
  { symbol: "TCS", name: "Tata Consultancy Services", sector: "Information Technology", marketCapCr: 142e4, basePrice: 4180, volatility: 1.3, trendBias: -0.3, baseVolume: 21e5, trend: "MODERATE_DOWN" },
  { symbol: "INFY", name: "Infosys Ltd.", sector: "Information Technology", marketCapCr: 785e3, basePrice: 1890, volatility: 1.7, trendBias: -0.5, baseVolume: 78e5, trend: "STRONG_DOWN" },
  { symbol: "ICICIBANK", name: "ICICI Bank Ltd.", sector: "Banking & Financials", marketCapCr: 89e4, basePrice: 1245, volatility: 1.5, trendBias: 0.8, baseVolume: 142e5, trend: "STRONG_UP" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel Ltd.", sector: "Telecommunications", marketCapCr: 94e4, basePrice: 1650, volatility: 1.6, trendBias: 0.7, baseVolume: 56e5, trend: "STRONG_UP" },
  { symbol: "SBIN", name: "State Bank of India", sector: "Public Sector Banking", marketCapCr: 72e4, basePrice: 815, volatility: 1.8, trendBias: 0.5, baseVolume: 185e5, trend: "MODERATE_UP" },
  { symbol: "ITC", name: "ITC Ltd.", sector: "FMCG & Cigarettes", marketCapCr: 595e3, basePrice: 485, volatility: 0.9, trendBias: 0.1, baseVolume: 92e5, trend: "SIDEWAYS" },
  { symbol: "LT", name: "Larsen & Toubro Ltd.", sector: "Capital Goods & Infra", marketCapCr: 495e3, basePrice: 3620, volatility: 1.5, trendBias: 0.6, baseVolume: 28e5, trend: "STRONG_UP" },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever Ltd.", sector: "FMCG", marketCapCr: 56e4, basePrice: 2380, volatility: 1.1, trendBias: -0.2, baseVolume: 195e4, trend: "SIDEWAYS" },
  { symbol: "TATAMOTORS", name: "Tata Motors Passenger Ltd.", sector: "Automobile", marketCapCr: 335e3, basePrice: 915, volatility: 2.2, trendBias: 0.9, baseVolume: 154e5, trend: "STRONG_UP" },
  { symbol: "SUNPHARMA", name: "Sun Pharmaceutical Industries", sector: "Pharmaceuticals", marketCapCr: 425e3, basePrice: 1810, volatility: 1.3, trendBias: 0.5, baseVolume: 24e5, trend: "MODERATE_UP" },
  { symbol: "MARUTI", name: "Maruti Suzuki India Ltd.", sector: "Automobile", marketCapCr: 385e3, basePrice: 12250, volatility: 1.4, trendBias: 0.2, baseVolume: 65e4, trend: "SIDEWAYS" },
  { symbol: "TITAN", name: "Titan Company Ltd.", sector: "Consumer Durables / Luxury", marketCapCr: 31e4, basePrice: 3480, volatility: 1.6, trendBias: -0.4, baseVolume: 12e5, trend: "MODERATE_DOWN" },
  { symbol: "BAJFINANCE", name: "Bajaj Finance Ltd.", sector: "Non-Banking Financials", marketCapCr: 44e4, basePrice: 7120, volatility: 1.9, trendBias: -0.6, baseVolume: 18e5, trend: "STRONG_DOWN" },
  { symbol: "AXISBANK", name: "Axis Bank Ltd.", sector: "Banking & Financials", marketCapCr: 365e3, basePrice: 1180, volatility: 1.6, trendBias: 0.4, baseVolume: 89e5, trend: "MODERATE_UP" },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank Ltd.", sector: "Banking & Financials", marketCapCr: 35e4, basePrice: 1775, volatility: 1.2, trendBias: 0.1, baseVolume: 41e5, trend: "SIDEWAYS" },
  { symbol: "TATASTEEL", name: "Tata Steel Ltd.", sector: "Metals & Mining", marketCapCr: 195e3, basePrice: 158, volatility: 2.4, trendBias: 0.7, baseVolume: 42e6, trend: "STRONG_UP" },
  { symbol: "NTPC", name: "NTPC Ltd.", sector: "Power & Utilities", marketCapCr: 395e3, basePrice: 410, volatility: 1.5, trendBias: 0.8, baseVolume: 16e6, trend: "STRONG_UP" },
  { symbol: "POWERGRID", name: "Power Grid Corp. of India", sector: "Power Transmission", marketCapCr: 315e3, basePrice: 335, volatility: 1.2, trendBias: 0.5, baseVolume: 145e5, trend: "MODERATE_UP" },
  { symbol: "M&M", name: "Mahindra & Mahindra Ltd.", sector: "Automobile & Tractors", marketCapCr: 365e3, basePrice: 2950, volatility: 1.8, trendBias: 0.8, baseVolume: 49e5, trend: "STRONG_UP" },
  { symbol: "CIPLA", name: "Cipla Ltd.", sector: "Pharmaceuticals", marketCapCr: 128e3, basePrice: 1590, volatility: 1.3, trendBias: 0.3, baseVolume: 175e4, trend: "MODERATE_UP" },
  { symbol: "JSWSTEEL", name: "JSW Steel Ltd.", sector: "Metals & Mining", marketCapCr: 235e3, basePrice: 965, volatility: 2.1, trendBias: 0.6, baseVolume: 62e5, trend: "STRONG_UP" },
  { symbol: "ASIANPAINT", name: "Asian Paints Ltd.", sector: "Paints & Coatings", marketCapCr: 26e4, basePrice: 2720, volatility: 1.5, trendBias: -0.7, baseVolume: 165e4, trend: "STRONG_DOWN" }
];
var MOCK_STOCKS = rawStocks.map((def) => {
  const candles = generateCandles(def.basePrice, def.volatility, def.trendBias, def.baseVolume, 55);
  const latest = candles[candles.length - 1];
  const previous = candles[candles.length - 2];
  const change = Number((latest.close - previous.close).toFixed(2));
  const changePercent = calculatePercentageChange(latest.close, previous.close);
  const avgVol = Math.round(candles.slice(-20).reduce((acc, c) => acc + c.volume, 0) / 20);
  const relativeVolume = calculateRelativeVolume(latest.volume, avgVol);
  const detectedOBs = detectOrderBlocks(candles, { symbol: def.symbol });
  const detectedLiq = detectLiquidityLevels(candles, def.symbol);
  const hasBullOB = detectedOBs.some((o) => o.direction === "BULLISH_DEMAND" && o.status !== "INVALIDATED");
  const hasBearOB = detectedOBs.some((o) => o.direction === "BEARISH_SUPPLY" && o.status !== "INVALIDATED");
  const hasBullSweep = detectedLiq.some((l) => l.isSwept && l.levelType.includes("LOW"));
  const hasBearSweep = detectedLiq.some((l) => l.isSwept && l.levelType.includes("HIGH"));
  const hasBOS = detectedOBs.some((o) => o.hasBreakOfStructure);
  const score = calculateMarketScore({
    changePercent,
    relativeVolume,
    trend: def.trend,
    hasRecentBullishOB: hasBullOB,
    hasRecentBearishOB: hasBearOB,
    hasBullishSweep: hasBullSweep,
    hasBearishSweep: hasBearSweep,
    hasBOS
  });
  return {
    symbol: def.symbol,
    companyName: def.name,
    sector: def.sector,
    marketCapCr: def.marketCapCr,
    lastPrice: latest.close,
    previousClose: previous.close,
    open: latest.open,
    dayHigh: latest.high,
    dayLow: latest.low,
    change,
    changePercent,
    volume: latest.volume,
    avgVolume20D: avgVol,
    relativeVolume,
    volatilityPercent: def.volatility,
    trend: def.trend,
    bias: score.direction,
    score,
    activeOrderBlocks: detectedOBs,
    liquidityLevels: detectedLiq,
    candles1D: candles,
    isDemoData: true,
    demoNotice: "DEMO DATA \u2014 NOT LIVE MARKET DATA"
  };
});
var MOCK_INDICES = [
  {
    name: "NIFTY 50",
    symbol: "NIFTY",
    lastPrice: 24892.45,
    change: 148.8,
    changePercent: 0.6,
    dayHigh: 24945.1,
    dayLow: 24780.2,
    advancingCount: 34,
    decliningCount: 15,
    unchangedCount: 1,
    peRatio: 21.8,
    isDemoData: true,
    demoNotice: "DEMO DATA \u2014 NOT LIVE MARKET DATA"
  },
  {
    name: "NIFTY BANK",
    symbol: "BANKNIFTY",
    lastPrice: 52410.6,
    change: 395.25,
    changePercent: 0.76,
    dayHigh: 52580,
    dayLow: 52080.5,
    advancingCount: 9,
    decliningCount: 3,
    unchangedCount: 0,
    peRatio: 16.4,
    isDemoData: true,
    demoNotice: "DEMO DATA \u2014 NOT LIVE MARKET DATA"
  },
  {
    name: "INDIA VIX",
    symbol: "VIX",
    lastPrice: 13.25,
    change: -0.42,
    changePercent: -3.07,
    dayHigh: 13.9,
    dayLow: 13.1,
    advancingCount: 0,
    decliningCount: 0,
    unchangedCount: 0,
    isDemoData: true,
    demoNotice: "DEMO DATA \u2014 NOT LIVE MARKET DATA"
  }
];

// src/server/marketDataService.ts
var DEMO_DATA_NOTICE = "DEMO DATA \u2014 NOT LIVE MARKET DATA";
var MarketCacheManager = class {
  constructor() {
    this.cache = /* @__PURE__ */ new Map();
    this.hits = 0;
    this.misses = 0;
  }
  static {
    __name(this, "MarketCacheManager");
  }
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    this.hits++;
    return entry.value;
  }
  set(key, value, ttlSeconds) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1e3
    });
  }
  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
  getStats() {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size
    };
  }
};
var globalMarketCache = new MarketCacheManager();
function validateMarketCandles(candles) {
  const errors = [];
  if (!candles || candles.length === 0) {
    return { isValid: false, errors: ["Candle array is empty."], sanitized: [] };
  }
  const sanitized = [];
  let previousTimeUnix = -Infinity;
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const indexPrefix = `Candle[${i}] (${c.timestamp || "unknown"}):`;
    if (isNaN(c.open) || isNaN(c.high) || isNaN(c.low) || isNaN(c.close)) {
      errors.push(`${indexPrefix} Contains NaN prices.`);
      continue;
    }
    if (c.open <= 0 || c.high <= 0 || c.low <= 0 || c.close <= 0) {
      errors.push(`${indexPrefix} Prices must be strictly positive.`);
      continue;
    }
    if (c.high < c.low) {
      errors.push(`${indexPrefix} Invariant violation: High (${c.high}) < Low (${c.low}).`);
      continue;
    }
    const maxBody = Math.max(c.open, c.close);
    const minBody = Math.min(c.open, c.close);
    if (c.high < maxBody - 1e-3) {
      errors.push(`${indexPrefix} High (${c.high}) is lower than max(Open, Close) (${maxBody}).`);
      continue;
    }
    if (c.low > minBody + 1e-3) {
      errors.push(`${indexPrefix} Low (${c.low}) is higher than min(Open, Close) (${minBody}).`);
      continue;
    }
    if (c.volume < 0 || isNaN(c.volume)) {
      errors.push(`${indexPrefix} Volume cannot be negative or NaN.`);
      continue;
    }
    if (c.timeUnix <= previousTimeUnix) {
      errors.push(`${indexPrefix} Chronological violation: Unix timestamp (${c.timeUnix}) is not strictly greater than previous (${previousTimeUnix}).`);
      continue;
    }
    previousTimeUnix = c.timeUnix;
    sanitized.push(c);
  }
  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
}
__name(validateMarketCandles, "validateMarketCandles");
function checkFeedStaleness(lastTimestampMs, currentDate = /* @__PURE__ */ new Date()) {
  const istOffsetMs = 5.5 * 60 * 60 * 1e3;
  const istNow = new Date(currentDate.getTime() + istOffsetMs);
  const dayOfWeek = istNow.getUTCDay();
  const hours = istNow.getUTCHours();
  const minutes = istNow.getUTCMinutes();
  const currentMinuteOfDay = hours * 60 + minutes;
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const isDuringMarketHours = isWeekday && currentMinuteOfDay >= 555 && currentMinuteOfDay <= 930;
  const latencyMs = Math.max(0, currentDate.getTime() - lastTimestampMs);
  const lastTickTimeIST = new Date(lastTimestampMs + istOffsetMs).toISOString().replace("T", " ").slice(0, 19) + " IST";
  if (!isDuringMarketHours) {
    return {
      isStale: false,
      status: "SESSION_CLOSED",
      latencyMs,
      lastTickTimeIST
    };
  }
  const isStale = latencyMs > 60 * 1e3;
  return {
    isStale,
    status: isStale ? "FEED_STALE" : "ACTIVE_LIVE",
    latencyMs,
    lastTickTimeIST
  };
}
__name(checkFeedStaleness, "checkFeedStaleness");
var NSE_INSTRUMENT_MAP = {
  RELIANCE: "NSE_EQ|INE002A01018",
  TCS: "NSE_EQ|INE467B01029",
  HDFCBANK: "NSE_EQ|INE040A01034",
  INFY: "NSE_EQ|INE009A01021",
  ICICIBANK: "NSE_EQ|INE090A01021",
  BHARTIARTL: "NSE_EQ|INE397D01024",
  SBIN: "NSE_EQ|INE062A01020",
  ITC: "NSE_EQ|INE154A01025",
  LT: "NSE_EQ|INE018A01030",
  HINDUNILVR: "NSE_EQ|INE030A01027",
  TATAMOTORS: "NSE_EQ|INE155A01022",
  SUNPHARMA: "NSE_EQ|INE044A01036",
  MARUTI: "NSE_EQ|INE585B01010",
  TITAN: "NSE_EQ|INE280A01028",
  BAJFINANCE: "NSE_EQ|INE296A01024",
  AXISBANK: "NSE_EQ|INE238A01034",
  KOTAKBANK: "NSE_EQ|INE237A01028",
  TATASTEEL: "NSE_EQ|INE081A01020",
  NTPC: "NSE_EQ|INE733E01010",
  POWERGRID: "NSE_EQ|INE752E01010",
  "M&M": "NSE_EQ|INE101A01026",
  MM: "NSE_EQ|INE101A01026",
  CIPLA: "NSE_EQ|INE059A01026",
  JSWSTEEL: "NSE_EQ|INE019A01038",
  ASIANPAINT: "NSE_EQ|INE021A01026",
  NIFTY: "NSE_INDEX|Nifty 50",
  BANKNIFTY: "NSE_INDEX|Nifty Bank"
};
function getUpstoxInstrumentKey(symbol) {
  const clean = symbol.toUpperCase().trim();
  if (clean.startsWith("NSE_EQ|") || clean.startsWith("NSE_INDEX|")) {
    return clean;
  }
  return NSE_INSTRUMENT_MAP[clean] || `NSE_EQ|${clean}`;
}
__name(getUpstoxInstrumentKey, "getUpstoxInstrumentKey");
var DemonstrationMarketProvider = class {
  constructor() {
    this.providerId = "synthetic_demo";
    this.providerName = "Synthetic Demonstration Provider";
    this.isConfigured = true;
  }
  static {
    __name(this, "DemonstrationMarketProvider");
  }
  getStatus() {
    const cacheStats = globalMarketCache.getStats();
    const totalReq = cacheStats.hits + cacheStats.misses;
    const hitRate = totalReq > 0 ? Number((cacheStats.hits / totalReq * 100).toFixed(1)) : 100;
    return {
      providerId: this.providerId,
      providerName: this.providerName,
      isConfigured: true,
      isRealTime: false,
      rateLimitRemaining: 99999,
      cacheHitRatePercent: hitRate,
      feedHealth: "SYNTHETIC_SIMULATION",
      demoNotice: DEMO_DATA_NOTICE,
      lastTickTime: (/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN") + " IST (Simulated)",
      latencyMs: 1
    };
  }
  async getQuotes(symbols) {
    const nowTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN") + " IST (Simulated)";
    if (!symbols || symbols.length === 0) {
      return MOCK_STOCKS.map((q) => ({
        ...q,
        isDemoData: true,
        demoNotice: DEMO_DATA_NOTICE,
        feedStatus: "SIMULATED",
        lastUpdated: nowTime,
        dataSource: "Synthetic Demonstration Provider"
      }));
    }
    return symbols.map((sym) => {
      const existing = MOCK_STOCKS.find((s) => s.symbol === sym);
      const base = existing || MOCK_STOCKS[0];
      return {
        ...base,
        symbol: sym,
        companyName: existing ? existing.companyName : `${sym} (Demonstration)`,
        isDemoData: true,
        demoNotice: DEMO_DATA_NOTICE,
        feedStatus: "SIMULATED",
        lastUpdated: nowTime,
        dataSource: "Synthetic Demonstration Provider"
      };
    });
  }
  async getCandles(symbol, _timeframe, count3 = 60) {
    const stock = MOCK_STOCKS.find((s) => s.symbol === symbol) || MOCK_STOCKS[0];
    return stock.candles1D.slice(-count3);
  }
  async getIndices() {
    const nowTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN") + " IST (Simulated)";
    return MOCK_INDICES.map((i) => ({
      ...i,
      isDemoData: true,
      demoNotice: DEMO_DATA_NOTICE,
      feedStatus: "SIMULATED",
      lastUpdated: nowTime,
      dataSource: "Synthetic Demonstration Provider"
    }));
  }
};
var UpstoxMarketProvider = class {
  constructor(token) {
    this.providerId = "upstox";
    this.providerName = "Upstox Developer API v2";
    this.lastTickMs = Date.now();
    this.lastError = null;
    this.accessToken = token || UpstoxSessionManager.getToken() || (typeof process !== "undefined" ? process.env?.UPSTOX_ACCESS_TOKEN : void 0);
  }
  static {
    __name(this, "UpstoxMarketProvider");
  }
  get isConfigured() {
    return Boolean(this.accessToken && this.accessToken.trim() !== "");
  }
  getStatus() {
    const cacheStats = globalMarketCache.getStats();
    const totalReq = cacheStats.hits + cacheStats.misses;
    const hitRate = totalReq > 0 ? Number((cacheStats.hits / totalReq * 100).toFixed(1)) : 0;
    const staleness = checkFeedStaleness(this.lastTickMs);
    let feedHealth = "HEALTHY";
    if (!this.isConfigured) {
      feedHealth = "SYNTHETIC_SIMULATION";
    } else if (this.lastError) {
      feedHealth = "OFFLINE";
    } else if (staleness.isStale) {
      feedHealth = "STALE";
    }
    return {
      providerId: this.providerId,
      providerName: this.providerName,
      isConfigured: this.isConfigured,
      isRealTime: this.isConfigured && !this.lastError,
      rateLimitRemaining: this.isConfigured ? 50 : 0,
      cacheHitRatePercent: hitRate,
      feedHealth,
      demoNotice: this.isConfigured ? "LIVE AUTHENTICATED BROKER FEED" : DEMO_DATA_NOTICE,
      lastTickTime: staleness.lastTickTimeIST,
      latencyMs: staleness.latencyMs
    };
  }
  async getQuotes(symbols) {
    if (!this.isConfigured) {
      const demoProvider = new DemonstrationMarketProvider();
      return demoProvider.getQuotes(symbols);
    }
    const targetSymbols = symbols && symbols.length > 0 ? symbols : MOCK_STOCKS.map((s) => s.symbol);
    const cacheKey = `upstox_quotes_${targetSymbols.slice().sort().join("_")}`;
    const cached = globalMarketCache.get(cacheKey);
    if (cached) return cached;
    const validSymbols = [];
    const validEncodedKeys = [];
    for (const sym of targetSymbols) {
      const key = getUpstoxInstrumentKey(sym);
      if (NSE_INSTRUMENT_MAP[sym] || /^NSE_(EQ\|INE[A-Z0-9]{9}|INDEX\|.+)$/.test(key)) {
        validSymbols.push(sym);
        validEncodedKeys.push(encodeURIComponent(key));
      }
    }
    if (validEncodedKeys.length === 0) {
      const demoProvider = new DemonstrationMarketProvider();
      return demoProvider.getQuotes(targetSymbols);
    }
    try {
      const instrumentParam = validEncodedKeys.join(",");
      const res = await fetch(`https://api.upstox.com/v2/market-quote/quotes?instrument_key=${instrumentParam}`, {
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${this.accessToken}`
        }
      });
      if (res.status === 401) {
        this.lastError = "HTTP 401: Invalid or expired Upstox access token";
        throw new Error(this.lastError);
      }
      if (res.status === 429) {
        this.lastError = "HTTP 429: Upstox API rate limit reached (50 requests/sec)";
        throw new Error(this.lastError);
      }
      if (!res.ok) {
        let details = "";
        try {
          const errBody = await res.json();
          details = errBody.message || errBody.errors && JSON.stringify(errBody.errors) || "";
        } catch {
          details = res.statusText;
        }
        this.lastError = `Upstox API returned status ${res.status}: ${details || res.statusText}`;
        throw new Error(this.lastError);
      }
      const json = await res.json();
      this.lastTickMs = Date.now();
      this.lastError = null;
      const results = [];
      const dataObj = json.data || {};
      for (const symbol of targetSymbols) {
        const isinKey = getUpstoxInstrumentKey(symbol).replace("|", ":");
        const symKey = `NSE_EQ:${symbol}`;
        const item = dataObj[isinKey] || dataObj[symKey];
        const fallback = MOCK_STOCKS.find((s) => s.symbol === symbol) || MOCK_STOCKS[0];
        if (item) {
          const lastPrice = item.last_price || fallback.lastPrice;
          const netChange = typeof item.net_change === "number" ? item.net_change : null;
          const prevClose = netChange !== null ? Number((lastPrice - netChange).toFixed(2)) : item.ohlc?.close || fallback.previousClose;
          const change = netChange !== null ? Number(netChange.toFixed(2)) : Number((lastPrice - prevClose).toFixed(2));
          const changePercent = prevClose > 0 ? Number((change / prevClose * 100).toFixed(2)) : 0;
          const open = item.ohlc?.open || fallback.open;
          const dayHigh = item.ohlc?.high || fallback.dayHigh;
          const dayLow = item.ohlc?.low || fallback.dayLow;
          const volume = item.volume || fallback.volume;
          results.push({
            ...fallback,
            symbol,
            lastPrice,
            previousClose: prevClose,
            open,
            dayHigh,
            dayLow,
            change,
            changePercent,
            volume,
            isDemoData: false,
            demoNotice: void 0,
            feedStatus: "LIVE",
            lastUpdated: (/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN") + " IST",
            dataSource: "Upstox Developer API v2 (NSE Live)"
          });
        } else {
          results.push({
            ...fallback,
            symbol,
            isDemoData: true,
            demoNotice: DEMO_DATA_NOTICE,
            feedStatus: "SIMULATED",
            dataSource: "Synthetic Demonstration Feed"
          });
        }
      }
      globalMarketCache.set(cacheKey, results, 5);
      return results;
    } catch (err) {
      console.warn("Upstox quote retrieval failed, falling back to demonstration provider:", err);
      const demoProvider = new DemonstrationMarketProvider();
      return demoProvider.getQuotes(targetSymbols);
    }
  }
  async getCandles(symbol, timeframe, count3 = 60) {
    if (!this.isConfigured) {
      const demoProvider = new DemonstrationMarketProvider();
      return demoProvider.getCandles(symbol, timeframe, count3);
    }
    const cacheKey = `upstox_candles_${symbol}_${timeframe}_${count3}`;
    const cached = globalMarketCache.get(cacheKey);
    if (cached) return cached;
    const fallbackStock = MOCK_STOCKS.find((s) => s.symbol === symbol) || MOCK_STOCKS[0];
    const defaultCandles = fallbackStock.candles1D.slice(-count3);
    try {
      const instrumentKey = getUpstoxInstrumentKey(symbol);
      const interval = timeframe === "1D" ? "day" : timeframe === "1W" ? "week" : "30minute";
      const toDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const fromDate = new Date(Date.now() - count3 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
      const url = `https://api.upstox.com/v2/historical-candle/${encodeURIComponent(instrumentKey)}/${interval}/${toDate}/${fromDate}`;
      const res = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${this.accessToken}`
        }
      });
      if (res.status === 401) {
        this.lastError = "HTTP 401: Invalid or expired Upstox access token";
        throw new Error(this.lastError);
      }
      if (!res.ok) {
        throw new Error(`Upstox Historical API status ${res.status}: ${res.statusText}`);
      }
      const json = await res.json();
      const rawCandles = json.data?.candles || [];
      const formatted = rawCandles.map((c) => {
        const d = new Date(c[0]);
        const dateStr = d.toISOString().split("T")[0];
        return {
          timestamp: dateStr,
          timeUnix: Math.floor(d.getTime() / 1e3),
          open: Number(c[1].toFixed(2)),
          high: Number(c[2].toFixed(2)),
          low: Number(c[3].toFixed(2)),
          close: Number(c[4].toFixed(2)),
          volume: Math.round(c[5])
        };
      }).reverse();
      const validation = validateMarketCandles(formatted);
      if (validation.isValid && validation.sanitized.length > 0) {
        globalMarketCache.set(cacheKey, validation.sanitized, 60);
        return validation.sanitized;
      }
      return defaultCandles;
    } catch (err) {
      console.warn(`Upstox candle fetch failed for ${symbol}, using demo candles:`, err);
      return defaultCandles;
    }
  }
  async getIndices() {
    if (!this.isConfigured) {
      const demoProvider = new DemonstrationMarketProvider();
      return demoProvider.getIndices();
    }
    try {
      const niftyKey = encodeURIComponent(getUpstoxInstrumentKey("NIFTY"));
      const bankKey = encodeURIComponent(getUpstoxInstrumentKey("BANKNIFTY"));
      const res = await fetch(`https://api.upstox.com/v2/market-quote/quotes?instrument_key=${niftyKey},${bankKey}`, {
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${this.accessToken}`
        }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const dataObj = json.data || {};
      const niftyData = dataObj["NSE_INDEX:Nifty 50"];
      const bankData = dataObj["NSE_INDEX:Nifty Bank"];
      const fallbackIndices = new DemonstrationMarketProvider();
      const defaultList = await fallbackIndices.getIndices();
      if (niftyData || bankData) {
        return defaultList.map((idx) => {
          const item = idx.symbol === "NIFTY" ? niftyData : idx.symbol === "BANKNIFTY" ? bankData : null;
          if (item) {
            const lastPrice = item.last_price || idx.lastPrice;
            const netChange = typeof item.net_change === "number" ? item.net_change : null;
            const prevClose = item.ohlc?.close && item.ohlc.close > 0 ? item.ohlc.close : netChange !== null ? Number((lastPrice - netChange).toFixed(2)) : lastPrice - idx.change;
            const change = netChange !== null ? Number(netChange.toFixed(2)) : Number((lastPrice - prevClose).toFixed(2));
            const changePercent = prevClose > 0 ? Number((change / prevClose * 100).toFixed(2)) : 0;
            return {
              ...idx,
              lastPrice,
              change,
              changePercent,
              dayHigh: item.ohlc?.high || idx.dayHigh,
              dayLow: item.ohlc?.low || idx.dayLow,
              isDemoData: false,
              demoNotice: void 0,
              feedStatus: "LIVE",
              dataSource: "Upstox Developer API v2 (NSE)",
              lastUpdated: (/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN") + " IST"
            };
          }
          return idx;
        });
      }
      return defaultList;
    } catch (_err) {
      const demoProvider = new DemonstrationMarketProvider();
      return demoProvider.getIndices();
    }
  }
};
var UpstoxSessionManager = class _UpstoxSessionManager {
  static {
    __name(this, "UpstoxSessionManager");
  }
  static {
    this.memoryToken = null;
  }
  static {
    this.tokenConnectedAt = null;
  }
  static {
    this.lastVerificationError = null;
  }
  static {
    this.verifiedSymbol = null;
  }
  static {
    this.samplePrice = null;
  }
  static setToken(token, verifiedSymbol = "RELIANCE", samplePrice) {
    _UpstoxSessionManager.memoryToken = token.trim();
    _UpstoxSessionManager.tokenConnectedAt = (/* @__PURE__ */ new Date()).toISOString();
    _UpstoxSessionManager.lastVerificationError = null;
    _UpstoxSessionManager.verifiedSymbol = verifiedSymbol;
    _UpstoxSessionManager.samplePrice = samplePrice ?? null;
    globalMarketCache.clear();
  }
  static clearToken() {
    _UpstoxSessionManager.memoryToken = null;
    _UpstoxSessionManager.tokenConnectedAt = null;
    _UpstoxSessionManager.lastVerificationError = null;
    _UpstoxSessionManager.verifiedSymbol = null;
    _UpstoxSessionManager.samplePrice = null;
    globalMarketCache.clear();
  }
  static getToken(fallbackToken) {
    if (_UpstoxSessionManager.memoryToken && _UpstoxSessionManager.memoryToken.trim() !== "") {
      return _UpstoxSessionManager.memoryToken;
    }
    const token = fallbackToken || (typeof process !== "undefined" ? process.env?.UPSTOX_ACCESS_TOKEN : void 0);
    if (token && token.trim() !== "") {
      return token.trim();
    }
    return null;
  }
  static isConnected(fallbackToken) {
    const token = _UpstoxSessionManager.getToken(fallbackToken);
    return Boolean(token && token.length >= 10);
  }
  static getStatusInfo(fallbackToken) {
    if (_UpstoxSessionManager.memoryToken) {
      return {
        isConnected: true,
        source: "memory_session",
        connectedAt: _UpstoxSessionManager.tokenConnectedAt,
        error: _UpstoxSessionManager.lastVerificationError,
        verifiedSymbol: _UpstoxSessionManager.verifiedSymbol || void 0,
        samplePrice: _UpstoxSessionManager.samplePrice || void 0
      };
    }
    const token = fallbackToken || (typeof process !== "undefined" ? process.env?.UPSTOX_ACCESS_TOKEN : void 0);
    if (token && token.trim() !== "") {
      return {
        isConnected: true,
        source: "env_variable",
        connectedAt: null,
        error: null,
        verifiedSymbol: "RELIANCE"
      };
    }
    return {
      isConnected: false,
      source: "none",
      connectedAt: null,
      error: _UpstoxSessionManager.lastVerificationError
    };
  }
  static setVerificationError(err) {
    _UpstoxSessionManager.lastVerificationError = err;
  }
};
async function verifyUpstoxToken(token) {
  if (!token || typeof token !== "string" || token.trim().length < 10) {
    return {
      success: false,
      message: "Token verification failed: Token is empty or too short to be a valid Upstox Access Token."
    };
  }
  const cleanToken = token.trim();
  try {
    const instrumentKey = getUpstoxInstrumentKey("RELIANCE");
    const res = await fetch(`https://api.upstox.com/v2/market-quote/quotes?instrument_key=${encodeURIComponent(instrumentKey)}`, {
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${cleanToken}`
      }
    });
    if (res.status === 401) {
      return {
        success: false,
        message: "Upstox verification failed (HTTP 401 Unauthorized): Invalid, expired, or revoked access token."
      };
    }
    if (res.status === 429) {
      return {
        success: false,
        message: "Upstox rate limit reached (HTTP 429). Please wait a few seconds and retry."
      };
    }
    if (!res.ok) {
      return {
        success: false,
        message: `Upstox API responded with HTTP status ${res.status}: ${res.statusText}`
      };
    }
    const json = await res.json();
    const dataObj = json.data || {};
    const item = dataObj["NSE_EQ:INE002A01018"] || dataObj["NSE_EQ:RELIANCE"];
    if (!item || typeof item.last_price !== "number") {
      return {
        success: false,
        message: "Upstox API responded, but quote data format was invalid or missing expected price fields."
      };
    }
    return {
      success: true,
      message: "Verified successfully! Active connection established to Upstox Developer API v2 (NSE).",
      sampleData: {
        symbol: "RELIANCE",
        lastPrice: item.last_price,
        dayHigh: item.ohlc?.high || item.last_price,
        dayLow: item.ohlc?.low || item.last_price
      }
    };
  } catch (err) {
    const rawError = err instanceof Error ? err.message : String(err);
    const sanitizedError = rawError.split(cleanToken).join("[REDACTED_TOKEN]");
    return {
      success: false,
      message: `Connection test failed: ${sanitizedError}`
    };
  }
}
__name(verifyUpstoxToken, "verifyUpstoxToken");
function getMarketDataProvider(env2) {
  const token = UpstoxSessionManager.getToken(env2?.UPSTOX_ACCESS_TOKEN);
  if (token && token.trim() !== "") {
    return new UpstoxMarketProvider(token);
  }
  return new DemonstrationMarketProvider();
}
__name(getMarketDataProvider, "getMarketDataProvider");

// src/worker.ts
var connectRateLimitMap = /* @__PURE__ */ new Map();
function isConnectRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 1e3;
  const maxAttempts = 5;
  const history = (connectRateLimitMap.get(ip) || []).filter((t) => now - t < windowMs);
  if (history.length >= maxAttempts) {
    return true;
  }
  history.push(now);
  connectRateLimitMap.set(ip, history);
  return false;
}
__name(isConnectRateLimited, "isConnectRateLimited");
function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Requested-With",
      ...extraHeaders
    }
  });
}
__name(jsonResponse, "jsonResponse");
function corsPreflightResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Requested-With",
      "Access-Control-Max-Age": "86400"
    }
  });
}
__name(corsPreflightResponse, "corsPreflightResponse");
var worker_default = {
  async fetch(request, env2, _ctx) {
    const url = new URL(request.url);
    const { pathname, searchParams } = url;
    if (request.method === "OPTIONS") {
      return corsPreflightResponse();
    }
    if (pathname === "/api/market/status" && request.method === "GET") {
      try {
        const provider = getMarketDataProvider(env2);
        const status = provider.getStatus();
        const upstoxStatus = UpstoxSessionManager.getStatusInfo(env2.UPSTOX_ACCESS_TOKEN);
        return jsonResponse({
          success: true,
          data: {
            ...status,
            upstoxConnection: upstoxStatus
          }
        });
      } catch (error3) {
        const msg = error3 instanceof Error ? error3.message : "Failed to retrieve provider status";
        return jsonResponse({ success: false, error: msg }, 500);
      }
    }
    if (pathname === "/api/market/quotes" && request.method === "GET") {
      try {
        const provider = getMarketDataProvider(env2);
        const symbolsParam = searchParams.get("symbols");
        const symbols = symbolsParam ? symbolsParam.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean) : [];
        const quotes = await provider.getQuotes(symbols);
        return jsonResponse({
          success: true,
          count: quotes.length,
          data: quotes
        });
      } catch (error3) {
        const msg = error3 instanceof Error ? error3.message : "Failed to fetch quotes";
        return jsonResponse({ success: false, error: msg }, 500);
      }
    }
    if (pathname === "/api/market/candles" && request.method === "GET") {
      try {
        const provider = getMarketDataProvider(env2);
        const symbol = (searchParams.get("symbol") || "RELIANCE").toUpperCase();
        const timeframe = searchParams.get("timeframe") || "1D";
        const count3 = parseInt(searchParams.get("count") || "60", 10);
        const candles = await provider.getCandles(symbol, timeframe, count3);
        return jsonResponse({
          success: true,
          symbol,
          timeframe,
          count: candles.length,
          data: candles
        });
      } catch (error3) {
        const msg = error3 instanceof Error ? error3.message : "Failed to fetch candles";
        return jsonResponse({ success: false, error: msg }, 500);
      }
    }
    if (pathname === "/api/market/indices" && request.method === "GET") {
      try {
        const provider = getMarketDataProvider(env2);
        const indices = await provider.getIndices();
        return jsonResponse({
          success: true,
          data: indices
        });
      } catch (error3) {
        const msg = error3 instanceof Error ? error3.message : "Failed to fetch indices";
        return jsonResponse({ success: false, error: msg }, 500);
      }
    }
    if (pathname === "/api/market/upstox/connect" && request.method === "POST") {
      try {
        const clientIp = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
        if (isConnectRateLimited(clientIp)) {
          return jsonResponse({
            success: false,
            error: "Too many connection attempts. Please wait 1 minute before trying again."
          }, 429);
        }
        const contentType = request.headers.get("content-type") || "";
        if (!contentType.toLowerCase().includes("application/json")) {
          return jsonResponse({
            success: false,
            error: "Unsupported Media Type: Request must be application/json."
          }, 415);
        }
        let body = {};
        try {
          body = await request.json();
        } catch {
          return jsonResponse({
            success: false,
            error: "Invalid JSON payload received."
          }, 400);
        }
        const { token } = body;
        if (!token || typeof token !== "string" || token.trim().length < 10) {
          return jsonResponse({
            success: false,
            error: "Invalid token: Upstox access token must be a non-empty string of at least 10 characters."
          }, 400);
        }
        const cleanToken = token.trim();
        const TOKEN_FORMAT = /^[A-Za-z0-9_\-+=./]{10,2048}$/;
        if (!TOKEN_FORMAT.test(cleanToken)) {
          return jsonResponse({
            success: false,
            error: "Invalid token format: Token contains unsupported characters or exceeds safe length."
          }, 400);
        }
        const verification = await verifyUpstoxToken(cleanToken);
        if (!verification.success) {
          UpstoxSessionManager.setVerificationError(verification.message);
          return jsonResponse({
            success: false,
            error: verification.message
          }, 400);
        }
        const samplePrice = verification.sampleData?.lastPrice;
        UpstoxSessionManager.setToken(cleanToken, "RELIANCE", samplePrice);
        return jsonResponse({
          success: true,
          message: verification.message,
          verifiedSymbol: "RELIANCE",
          samplePrice,
          connectedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      } catch (error3) {
        const rawError = error3 instanceof Error ? error3.message : "Failed to connect Upstox account";
        return jsonResponse({ success: false, error: rawError }, 500);
      }
    }
    if (pathname === "/api/market/upstox/disconnect" && request.method === "POST") {
      try {
        UpstoxSessionManager.clearToken();
        return jsonResponse({
          success: true,
          message: "Upstox session disconnected successfully. Reverted to Demonstration Mode."
        });
      } catch (error3) {
        const msg = error3 instanceof Error ? error3.message : "Failed to disconnect Upstox account";
        return jsonResponse({ success: false, error: msg }, 500);
      }
    }
    if (pathname === "/api/market/upstox/status" && request.method === "GET") {
      try {
        const info3 = UpstoxSessionManager.getStatusInfo(env2.UPSTOX_ACCESS_TOKEN);
        return jsonResponse({
          success: true,
          data: info3
        });
      } catch (error3) {
        const msg = error3 instanceof Error ? error3.message : "Failed to retrieve connection status";
        return jsonResponse({ success: false, error: msg }, 500);
      }
    }
    if (env2.ASSETS) {
      return env2.ASSETS.fetch(request);
    }
    return new Response("Not Found", { status: 404 });
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
