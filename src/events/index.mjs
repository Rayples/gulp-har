import { EventEmitter } from "events";
class MyEmitter extends EventEmitter {
  on(eventName, listener) {
    return super.on(eventName, listener);
  }

  emit(eventName, ...args) {
    return super.emit(eventName, ...args);
  }
}

const myEmitter = new MyEmitter();
myEmitter.setMaxListeners(Infinity);

export default myEmitter;

