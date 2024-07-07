import _slicedToArray from "@babel/runtime/helpers/esm/slicedToArray";
import _regeneratorRuntime from "@babel/runtime/helpers/esm/regeneratorRuntime";
import _asyncToGenerator from "@babel/runtime/helpers/esm/asyncToGenerator";
/**
 * 把传入的方法包装成异步执行
 * @param f
 */
export var AsyncRun = /*#__PURE__*/function () {
  var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(f) {
    var _len,
      args,
      _key,
      _args = arguments;
    return _regeneratorRuntime().wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          for (_len = _args.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
            args[_key - 1] = _args[_key];
          }
          _context.next = 3;
          return f === null || f === void 0 ? void 0 : f.apply(void 0, args);
        case 3:
          return _context.abrupt("return", _context.sent);
        case 4:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return function AsyncRun(_x) {
    return _ref.apply(this, arguments);
  };
}();

/**
 * Promise.withResolvers polyfill
 * @returns `{ resolve, reject, promise }`
 */
export var withResolvers = function withResolvers(fn) {
  var a, b;
  var promise = new Promise(function (resolve, reject) {
    // @ts-ignore
    a = resolve;
    b = reject;
  }).catch(function () {});
  if (isExecutable(fn)) {
    // @ts-ignore
    promise = promise.then(fn).catch(function () {});
  }
  // @ts-ignore
  return {
    resolve: a,
    reject: b,
    promise: promise
  };
};

/**
 * 阻塞和放行
 * @returns [promise, resolve]
 */
export var Wait = function Wait(fn) {
  var _ref3;
  var _ref2 = (_ref3 = withResolvers) === null || _ref3 === void 0 ? void 0 : _ref3(fn),
    promise = _ref2.promise,
    resolve = _ref2.resolve;
  return [promise, resolve];
};

/**
 * 阻塞、放行、拒绝
 * @returns [promise, resolve, reject]
 */
export var Wait3 = function Wait3(fn) {
  var _ref5;
  var _ref4 = (_ref5 = withResolvers) === null || _ref5 === void 0 ? void 0 : _ref5(fn),
    promise = _ref4.promise,
    resolve = _ref4.resolve,
    reject = _ref4.reject;
  return [promise, resolve, reject];
};

/**
 * 阻塞和放行，超时后直接放行
 * @param timeout 超时毫秒
 * @returns [promise, resolve]
 */
export var WaitTimeout = function WaitTimeout() {
  var _ref7;
  var timeout = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 60 * 1000;
  var fn = arguments.length > 1 ? arguments[1] : undefined;
  var _ref6 = (_ref7 = withResolvers) === null || _ref7 === void 0 ? void 0 : _ref7(fn),
    promise = _ref6.promise,
    resolve = _ref6.resolve;
  timeout = timeout > 2147483647 ? 2147483647 : timeout;
  timeout = timeout < 0 ? 0 : timeout;
  setTimeout(resolve);
  return [promise, resolve];
};

/**
 * 带有延迟防抖的Promise，在防抖时间内重复resolve会重新计时
 *
 * timeout为总超时计时，调用`WaitDelay()`后立即开始计时，到期后会强行resolve
 *
 * @param ms 防抖延迟毫秒
 * @param timeout 最大等待时长，超过后直接resolve，可被`cancel()`刷新计时，timeout必须大于防抖ms才会生效
 * @returns [pend, done, cancel]
 */
export var WaitDelay = function WaitDelay() {
  var ms = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
  var timeout = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : -1;
  ms = ms > 0 ? ms : 0;
  timeout = timeout > 2147483647 ? 2147483647 : timeout;
  var _Wait = Wait(),
    _Wait2 = _slicedToArray(_Wait, 2),
    pend = _Wait2[0],
    resolve = _Wait2[1];
  var pending = false;
  var t1 = null;
  var t2 = null;

  /**
   * 启动带有防抖的resolve，计时到期后会执行resolve，完结promise
   *
   * 在延迟时间内再次执行`done()`，会重置计时
   */
  var done = function done() {
    cancel();
    t1 = setTimeout(resolve, ms);
    // 只有处于pend状态，才会尝试刷新总超时
    if (pending && t2 == null && timeout >= ms) {
      t2 = setTimeout(resolve, timeout);
    }
  };

  /**
   * 取消执行`done`的防抖计时，如果action!='done'，还会一并取消总超时
   *
   * 对于总超时取消后，需要再次执行`pend()`或`done()`，才会重新计时
   * @param action 默认为空
   */
  var cancel = function cancel(action) {
    clearTimeout(t1);
    t1 = null;
    if (action != 'done') {
      // 不等于done，会重新计时
      clearTimeout(t2);
      t2 = null;
    }
  };
  if (t2 == null && timeout >= ms) {
    t2 = setTimeout(resolve, timeout);
  }
  return [pend, done, cancel];
};

/**
 * 带有延迟防抖的Promise，在防抖时间内重复resolve会重新计时
 *
 * 还有总超时时间，超时后立刻resolve
 *
 * 与`WaitDelay`不同之处在于，返回的pend是一个方法，只有调用`pend()`后才开始总超时计时
 * @param ms 防抖延迟毫秒
 * @returns [promise, pend, done, reset]
 */
export var WaitDelayPend = function WaitDelayPend() {
  var ms = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
  var onfulfilled = arguments.length > 1 ? arguments[1] : undefined;
  ms = ms < 0 ? 0 : ms;
  ms = ms > 2147483647 ? 2147483647 : ms;
  var _Wait3 = Wait(onfulfilled),
    _Wait4 = _slicedToArray(_Wait3, 2),
    promise = _Wait4[0],
    resolve = _Wait4[1];
  var tick = null;

  /**
   * 启动带有防抖的resolve，计时到期后会执行resolve，完结promise
   *
   * 在延迟时间内再次执行`done()`，会重置计时
   */
  var done = function done() {
    clearTimeout(tick);
    resolve();
  };

  /**
   * 取消执行`done`的防抖计时，如果action!='done'，还会一并取消总超时
   *
   * 对于总超时取消后，需要再次执行`pend()`或`done()`，才会重新计时
   * @param action 默认为空
   */
  var reset = function reset() {
    clearTimeout(tick);
  };

  // 只有pend后，才会启动总超时计时
  var pend = function pend() {
    reset();
    tick = setTimeout(function () {
      resolve();
    }, ms);
    return promise;
  };

  // 第一个参数是promis对象，第二个是启动计时，第三个是直接完成，第四个是重置计时
  return [promise, pend, done, reset];
};

/**
 * 返回一个睡眠一段时间的promise
 * @param ms 睡眠毫秒
 * @returns
 */
export var sleep = function sleep(ms) {
  var _Wait5 = Wait(),
    _Wait6 = _slicedToArray(_Wait5, 2),
    promise = _Wait6[0],
    resolve = _Wait6[1];
  setTimeout(resolve, ms);
  return promise;
};

/**
 * 判断传入的数据没有值，为null或者为undefined，返回true
 * @param any
 * @returns
 */
export var None = function None(any) {
  return any == null || any == undefined;
};

/**
 * 判断传入的数据有值，不为null也不为undefined，返回true
 * @param any
 * @returns boolean
 */
export var NotNone = function NotNone(any) {
  return any != null && any != undefined;
};

/**
 * 判断对象是否是可执行的
 * @param obj 方法
 * @returns
 */
export var isExecutable = function isExecutable(obj) {
  var _obj$constructor;
  // 检查是否为普通函数或async函数
  if (typeof obj === 'function') {
    return true;
  }

  // 检查是否为生成器函数
  var GeneratorFunction = /*#__PURE__*/_regeneratorRuntime().mark(function _callee2() {
    return _regeneratorRuntime().wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }).constructor;
  if (obj instanceof GeneratorFunction) {
    return true;
  }

  // 检查是否为Promise
  if (obj instanceof Promise) {
    return true;
  }
  if ((obj === null || obj === void 0 || (_obj$constructor = obj.constructor) === null || _obj$constructor === void 0 ? void 0 : _obj$constructor.name) === 'AsyncFunction') {
    return true;
  }
  return false;
};
export var isAsyncExecutable = function isAsyncExecutable(obj) {
  var _obj$constructor2;
  // 检查是否为生成器函数
  var GeneratorFunction = /*#__PURE__*/_regeneratorRuntime().mark(function _callee3() {
    return _regeneratorRuntime().wrap(function _callee3$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
        case "end":
          return _context3.stop();
      }
    }, _callee3);
  }).constructor;
  if (obj instanceof GeneratorFunction) {
    return true;
  }

  // 检查是否为Promise
  if (obj instanceof Promise) {
    return true;
  }
  if ((obj === null || obj === void 0 || (_obj$constructor2 = obj.constructor) === null || _obj$constructor2 === void 0 ? void 0 : _obj$constructor2.name) === 'AsyncFunction') {
    return true;
  }
  return false;
};
export var GetPromiseKit = function GetPromiseKit(fn) {
  var _withResolvers = withResolvers(fn),
    resolve = _withResolvers.resolve,
    reject = _withResolvers.reject,
    promise = _withResolvers.promise;
  return {
    Promise: promise,
    Resolve: resolve,
    Reject: reject
  };
};
//# sourceMappingURL=utils.js.map