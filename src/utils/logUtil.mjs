import log4js from "log4js";
import dateFormat from "date-format";
import { format as node_util_format } from "util";

export class Log4jsContext {
  _context = new Map();

  addContext(key, value) {
    this._context.set(key, value);
  }
  getContext(key) {
    return this._context.get(key);
  }
  getContexts() {
    return this._context;
  }
  getContextObj() {
    return Object.fromEntries(this._context.entries());
  }
  removeContext(key) {
    this._context.delete(key);
  }
  clearContext() {
    this._context.clear();
  }
}

const log4jsContext = new Log4jsContext();

log4js.addLayout("full-fomart", function (config) {
  return function (logEvent) {
    const context = Object.assign({}, log4jsContext.getContextObj(), logEvent.context);
    const dataStr = node_util_format(...logEvent.data).replace(/\n/g, "");
    return (
      node_util_format(
        "%s [%s] [%s:%s] - ",
        timestampLevelAndCategory(logEvent),
        context.fileName ?? "",
        context.moduleName ?? "",
        context.funnctionName ?? ""
      ) + dataStr
    );
  };
});

log4js.configure({
  appenders: {
    console: { type: "console" },
    app: {
      type: "fileSync",
      filename: "logger-gulp-har.log",
      maxLogSize: 5242880,
      backups: 3,
      flags: "w",
      layout: { type: "full-fomart" }
    },
    performance: {
      type: "fileSync",
      filename: "performance-gulp-har.log",
      maxLogSize: 5242880,
      backups: 3,
      flags: "w",
      layout: { type: "full-fomart" }
    },
    _debug: { type: "logLevelFilter", appender: "app", level: "debug" },
    _error: { type: "logLevelFilter", appender: "console", level: "error" },
  },
  categories: {
    default: { appenders: ["_debug", "_error"], level: "debug" },
    performance: { appenders: ["performance"], level: "trace" }
  }
});

export function getLogger(appender, options = {}) {
  let _log = log4js.getLogger(appender);
  Object.entries((options.context ??= {})).forEach(([key, value]) => {
    _log.addContext(key, value);
  });
  return _log;
}

export default {
  get log4js() {
    return log4js;
  },
  get context() {
    return log4jsContext;
  }
};

// copy from log4js\lib\layouts.js
function timestampLevelAndCategory(logEvent) {
  return node_util_format(
    "[%s] [%s] %s -",
    dateFormat.asString(logEvent.startTime),
    logEvent.level.toString(),
    logEvent.categoryName
  );
}

