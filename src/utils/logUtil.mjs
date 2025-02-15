// 导入 events 模块
import { EventEmitter } from "events";

// 创建一个 EventEmitter 实例
// export const LogUtil = new EventEmitter();

class LogUtils extends EventEmitter {
  _level = 1;

  static levels = {
    trace: 0,
    debug: 1,
    info: 2,
    warn: 3,
    error: 4,
    fatal: 5,
  };

  constructor() {
    super();
    this._record();
  }

  error(message) {
    this.log("error", message);
  }

  log(type, message) {
    if (this._level <= LogUtils.levels[type]) {
      this.emit("log", { type: type, message: message });
    }
  }

  warn(message) {
    this.log("warn", message);
  }

  info(message) {
    this.log("info", message);
  }

  debug(message) {
    this.log("debug", message);
  }

  trace(message) {
    this.log("trace", message);
  }

  fatal(message) {
    this.log("fatal", message);
  }

  _record() {
    super.on("log", (event) => {
      let { type,  message: { har_name, feature_name, ...others }} = event;
      console.log(`${Date.now()} [${type.toLocaleUpperCase()}] [${har_name}] [${feature_name}] ${JSON.stringify(others)}`);
    });
  }

  level(level) {
    this._level = LogUtils.levels[level] || 2;
  }
}

export const LogUtil = new LogUtils();

