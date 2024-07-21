var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/utils.ts
var utils_exports = {};
__export(utils_exports, {
  AsyncRun: () => AsyncRun,
  GetPromiseKit: () => GetPromiseKit,
  None: () => None,
  NotNone: () => NotNone,
  Wait: () => Wait,
  Wait3: () => Wait3,
  WaitDelay: () => WaitDelay,
  WaitDelayPend: () => WaitDelayPend,
  WaitTimeout: () => WaitTimeout,
  isAsyncExecutable: () => isAsyncExecutable,
  isExecutable: () => isExecutable,
  sleep: () => sleep,
  withResolvers: () => withResolvers
});
module.exports = __toCommonJS(utils_exports);
var AsyncRun = async (f, ...args) => await (f == null ? void 0 : f(...args));
var withResolvers = (fn) => {
  let a, b;
  let promise = new Promise((resolve, reject) => {
    a = resolve;
    b = reject;
  }).catch(() => {
  });
  if (isExecutable(fn)) {
    promise = promise.then(fn).catch(() => {
    });
  }
  return { resolve: a, reject: b, promise };
};
var Wait = (fn) => {
  const { promise, resolve } = withResolvers == null ? void 0 : withResolvers(fn);
  return [promise, resolve];
};
var Wait3 = (fn) => {
  const { promise, resolve, reject } = withResolvers == null ? void 0 : withResolvers(fn);
  return [promise, resolve, reject];
};
var WaitTimeout = (timeout = 60 * 1e3, fn) => {
  const { promise, resolve } = withResolvers == null ? void 0 : withResolvers(fn);
  timeout = timeout > 2147483647 ? 2147483647 : timeout;
  timeout = timeout < 0 ? 0 : timeout;
  setTimeout(resolve);
  return [promise, resolve];
};
var WaitDelay = (ms = 0, timeout = -1) => {
  ms = ms > 0 ? ms : 0;
  timeout = timeout > 2147483647 ? 2147483647 : timeout;
  const [pend, resolve] = Wait();
  let pending = false;
  let t1 = null;
  let t2 = null;
  let done = () => {
    cancel();
    t1 = setTimeout(resolve, ms);
    if (pending && t2 == null && timeout >= ms) {
      t2 = setTimeout(resolve, timeout);
    }
  };
  let cancel = (action) => {
    clearTimeout(t1);
    t1 = null;
    if (action != "done") {
      clearTimeout(t2);
      t2 = null;
    }
  };
  if (t2 == null && timeout >= ms) {
    t2 = setTimeout(resolve, timeout);
  }
  return [pend, done, cancel];
};
var WaitDelayPend = (ms = 0, onfulfilled) => {
  ms = ms < 0 ? 0 : ms;
  ms = ms > 2147483647 ? 2147483647 : ms;
  let [promise, resolve] = Wait(onfulfilled);
  let tick = null;
  let done = () => {
    clearTimeout(tick);
    resolve();
  };
  let reset = () => {
    clearTimeout(tick);
  };
  const pend = () => {
    reset();
    tick = setTimeout(() => {
      resolve();
    }, ms);
    return promise;
  };
  return [promise, pend, done, reset];
};
var sleep = (ms) => {
  const [promise, resolve] = Wait();
  setTimeout(resolve, ms);
  return promise;
};
var None = (any) => {
  return any == null || any == void 0;
};
var NotNone = (any) => {
  return any != null && any != void 0;
};
var isExecutable = (obj) => {
  var _a;
  if (typeof obj === "function") {
    return true;
  }
  const GeneratorFunction = function* () {
  }.constructor;
  if (obj instanceof GeneratorFunction) {
    return true;
  }
  if (obj instanceof Promise) {
    return true;
  }
  if (((_a = obj == null ? void 0 : obj.constructor) == null ? void 0 : _a.name) === "AsyncFunction") {
    return true;
  }
  return false;
};
var isAsyncExecutable = (obj) => {
  var _a;
  const GeneratorFunction = function* () {
  }.constructor;
  if (obj instanceof GeneratorFunction) {
    return true;
  }
  if (obj instanceof Promise) {
    return true;
  }
  if (((_a = obj == null ? void 0 : obj.constructor) == null ? void 0 : _a.name) === "AsyncFunction") {
    return true;
  }
  return false;
};
var GetPromiseKit = (fn) => {
  const { resolve, reject, promise } = withResolvers(fn);
  return {
    Promise: promise,
    Resolve: resolve,
    Reject: reject
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AsyncRun,
  GetPromiseKit,
  None,
  NotNone,
  Wait,
  Wait3,
  WaitDelay,
  WaitDelayPend,
  WaitTimeout,
  isAsyncExecutable,
  isExecutable,
  sleep,
  withResolvers
});
//# sourceMappingURL=utils.js.map
