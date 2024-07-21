import _slicedToArray from "@babel/runtime/helpers/esm/slicedToArray";
import _regeneratorRuntime from "@babel/runtime/helpers/esm/regeneratorRuntime";
import _asyncToGenerator from "@babel/runtime/helpers/esm/asyncToGenerator";
import _toConsumableArray from "@babel/runtime/helpers/esm/toConsumableArray";
import _classCallCheck from "@babel/runtime/helpers/esm/classCallCheck";
import _createClass from "@babel/runtime/helpers/esm/createClass";
import _classPrivateMethodInitSpec from "@babel/runtime/helpers/esm/classPrivateMethodInitSpec";
import _classPrivateFieldInitSpec from "@babel/runtime/helpers/esm/classPrivateFieldInitSpec";
import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import _classPrivateMethodGet from "@babel/runtime/helpers/esm/classPrivateMethodGet";
import _classPrivateFieldSet from "@babel/runtime/helpers/esm/classPrivateFieldSet";
import _classPrivateFieldGet from "@babel/runtime/helpers/esm/classPrivateFieldGet";
import { AsyncRun, GetPromiseKit, isExecutable, sleep, Wait, WaitTimeout } from "./utils";

/**
 * 异步任务池
 *
 * 可并行执行多个任务，并限制并行度
 * 待执行的任务可逐步添加，也可以控制任务添加的速度
 *
 * T: task data type
 */
var _waitTime = /*#__PURE__*/new WeakMap();
var _queue = /*#__PURE__*/new WeakMap();
var _running = /*#__PURE__*/new WeakMap();
var _paused = /*#__PURE__*/new WeakMap();
var _needBreak = /*#__PURE__*/new WeakMap();
var _activeWorker = /*#__PURE__*/new WeakMap();
var _reAddCount = /*#__PURE__*/new WeakMap();
var _limitPromise = /*#__PURE__*/new WeakMap();
var _reAddTaskTodo = /*#__PURE__*/new WeakSet();
var _next = /*#__PURE__*/new WeakSet();
var _exec = /*#__PURE__*/new WeakSet();
var _waitAddOrDone = /*#__PURE__*/new WeakSet();
var _rateLimit = /*#__PURE__*/new WeakSet();
var _events = /*#__PURE__*/new WeakMap();
export var AsyncPool = /*#__PURE__*/function () {
  /**
   *
   * @param name 该异步并发池的名称，仅用于区分不同的实例。 默认值:''
   * @param parallel 并行度,同一时间最多能有多少个任务处于await状态。 默认值:2
   * @param maxRetryCount 任务最多重试次数，如果任务失败重试次数超过该限制，任务数据会被丢弃不再添加到任务队列中。 默认值:Number.MAX_SAFE_INTEGER
   * @param autoRun 当添加新任务后自动启动队列。 默认值:true
   * @param worker 全局的任务执行者。如果添加任务数据时没有单独指定worker，则使用该全局woker处理任务数据
   * @param taskResultCallback 每个任务完成后的回调，可以获取任务返回结果
   * @param taskErrorCallback 只在执行任务出现异常被捕获时触发
   * @param allWorkerDoneCallback 所有任务完成后的回调，每次队列全部完成后都会触发。如果需要防抖，可使用带有延迟防抖的`DelayPool`
   * @param rateLimiter 控制任务执行速率方法
   */
  function AsyncPool() {
    var _this = this,
      _options$name,
      _options$parallel,
      _options$autoRun,
      _options$worker,
      _options$waitTime,
      _options$maxRetryCoun,
      _options$taskResultCa,
      _options$taskErrorCal,
      _options$taskFailCall,
      _options$allWorkerDon,
      _options$rateLimiter,
      _options$queueCacheLi,
      _options$callbackInWo,
      _options$autoRetry,
      _options$retryDelay;
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {
      name: '',
      parallel: 2,
      maxRetryCount: Number.MAX_SAFE_INTEGER,
      waitTime: 0,
      autoRun: true,
      autoRetry: false,
      retryDelay: 0,
      worker: null,
      taskResultCallback: null,
      taskErrorCallback: null,
      taskFailCallback: null,
      allWorkerDoneCallback: null,
      rateLimiter: null,
      callbackInWorker: false
    };
    _classCallCheck(this, AsyncPool);
    /**
     * 任务执行限速
     *
     * 在next获取到一个任务数据后，调用此方法进行限速
     * @param task_todo
     * @returns
     */
    _classPrivateMethodInitSpec(this, _rateLimit);
    _classPrivateMethodInitSpec(this, _waitAddOrDone);
    /**
     * 执行任务
     *
     * @param task_todo
     */
    _classPrivateMethodInitSpec(this, _exec);
    /**
     * 从待运行队列取出最早放入的一个任务，并且控制并行度
     *
     * 当待处理的任务队列为空时，返回null
     *
     * 如果设置了空闲等待超时，超时后任务队列会停止运行
     *
     * @returns [TaskTodo<T>, boolean] [任务，是否没有任务了]
     * 加第二个参数是因为用户传入的任务数据也有可能是null，所以要用另一个变量显式区分
     */
    _classPrivateMethodInitSpec(this, _next);
    /**
     * 重试任务，有最多次数限制
     * @param task_todo
     * @returns boolean 是否成功添加到队列中
     */
    _classPrivateMethodInitSpec(this, _reAddTaskTodo);
    /**
     * 该异步并发池的名称，仅用于区分不同的实例
     * @default ''
     */
    _defineProperty(this, "name", '');
    /**
     * 并行度
     *
     * 同一时间最多能有多少个任务处于await状态
     * @default 2
     */
    _defineProperty(this, "parallel", 2);
    /**
     * 当添加新任务后自动启动队列
     * @default true
     */
    _defineProperty(this, "autoRun", true);
    /**
     * 全局的任务执行者
     *
     * 如果添加任务数据时没有单独指定worker，则使用该全局woker处理任务数据
     */
    _defineProperty(this, "worker", null);
    /**
     * 如果在worker中需要以触发某些回调事件为完成标志，则需要设置为true
     * 
     * 这时worker的第二个参数中会包含一个next方法
     * 
     * 需要在worker方法中手动调用next(result)才会结束此任务的执行
     */
    _defineProperty(this, "callbackInWorker", false);
    /**
     * 每个任务完成后的回调，可以获取任务返回结果
     */
    _defineProperty(this, "taskResultCallback", null);
    /**
     * 只在执行任务出现异常被捕获时触发，传入参数与taskResultCallback相同，触发error的任务根据配置也可能会自动重试
     */
    _defineProperty(this, "taskErrorCallback", null);
    /**
     * 任务执行报错，但接下来不会自动重试，意味着该任务将被丢弃
     */
    _defineProperty(this, "taskFailCallback", null);
    /**
     * 任务最多重试次数，如果任务失败重试次数超过该限制，任务数据会被丢弃不再添加到任务队列中
     * @default 2**3
     */
    _defineProperty(this, "maxRetryCount", Math.pow(2, 3));
    /**
     * 是否自动重试失败的任务
     * @default false
     */
    _defineProperty(this, "autoRetry", false);
    /**
     * 重试任务默认延迟
     * @default 0
     */
    _defineProperty(this, "retryDelay", 0);
    /**
     * 触发所有任务完成之前等待的冗余时间
     */
    _classPrivateFieldInitSpec(this, _waitTime, {
      writable: true,
      value: 0
    });
    /** 任务队列 */
    _classPrivateFieldInitSpec(this, _queue, {
      writable: true,
      value: []
    });
    /**
     * 任务队列缓存上限
     *
     * 当达到上限时，可使用`await waitParallelIdel()`或`await add*()`来控制任务添加速度
     *
     * 如果不调用上面两个方法则该限制不会有实际作用
     *
     * @default Number.MAX_SAFE_INTEGER
     */
    _defineProperty(this, "queueCacheLimit", Number.MAX_SAFE_INTEGER);
    /**
     * 所有任务完成后的回调，每次队列全部完成后都会触发。如果需要防抖，可使用带有延迟防抖的`DelayPool`
     */
    _defineProperty(this, "allWorkerDoneCallback", null);
    /**
     * 控制任务执行速率方法
     */
    _defineProperty(this, "rateLimiter", null);
    /**
     * 任务队列是否处于运行中
     */
    _classPrivateFieldInitSpec(this, _running, {
      writable: true,
      value: false
    });
    /**
     * 任务队列是否处于暂停状态
     */
    _classPrivateFieldInitSpec(this, _paused, {
      writable: true,
      value: false
    });
    /**
     * 任务队列执行是否需要停止
     */
    _classPrivateFieldInitSpec(this, _needBreak, {
      writable: true,
      value: false
    });
    /**
     * 正在处于运行中的任务数量
     */
    _classPrivateFieldInitSpec(this, _activeWorker, {
      writable: true,
      value: 0
    });
    /**
     * 重试任务可以延迟一段时间添加到任务列表中
     * 如果有即将到来的任务，那么所有任务完成事件先不触发
     */
    _classPrivateFieldInitSpec(this, _reAddCount, {
      writable: true,
      value: 0
    });
    /**
     * 限速等待
     */
    _classPrivateFieldInitSpec(this, _limitPromise, {
      writable: true,
      value: null
    });
    _classPrivateFieldInitSpec(this, _events, {
      writable: true,
      value: {
        /** 达到恢复状态 */
        resume: {},
        /** 达到停止状态 */
        stop: {},
        /** 所有任务完成，无延迟 */
        allWorkerDone: {},
        /** 有空闲位置 */
        parallelIdel: {},
        /** 达到运行状态 */
        run: {},
        /** 所有任务完成，带有延迟 */
        delayAllWorkerTime: {},
        /** 队列中添加了任务 */
        queueAdd: {},
        /** 没有正在执行的任务 */
        activeWorkerClear: {},
        /** 每有一个任务完成触发一次 */
        oneWorkerDone: {}
      }
    });
    /**
     * Promise事件，当事件触发时，promise对象会resolve
     * 
     * 例如`await events.allWorkerDone`
     */
    _defineProperty(this, "events", Object.defineProperties({}, {
      resume: {
        get: function get() {
          var _classPrivateFieldGet2;
          return (_classPrivateFieldGet2 = _classPrivateFieldGet(_this, _events).resume) === null || _classPrivateFieldGet2 === void 0 ? void 0 : _classPrivateFieldGet2.Promise;
        }
      },
      stop: {
        get: function get() {
          var _classPrivateFieldGet3;
          return (_classPrivateFieldGet3 = _classPrivateFieldGet(_this, _events).stop) === null || _classPrivateFieldGet3 === void 0 ? void 0 : _classPrivateFieldGet3.Promise;
        }
      },
      allWorkerDone: {
        get: function get() {
          var _classPrivateFieldGet4;
          return (_classPrivateFieldGet4 = _classPrivateFieldGet(_this, _events).allWorkerDone) === null || _classPrivateFieldGet4 === void 0 ? void 0 : _classPrivateFieldGet4.Promise;
        }
      },
      parallelIdel: {
        get: function get() {
          var _classPrivateFieldGet5;
          return (_classPrivateFieldGet5 = _classPrivateFieldGet(_this, _events).parallelIdel) === null || _classPrivateFieldGet5 === void 0 ? void 0 : _classPrivateFieldGet5.Promise;
        }
      },
      run: {
        get: function get() {
          var _classPrivateFieldGet6;
          return (_classPrivateFieldGet6 = _classPrivateFieldGet(_this, _events).run) === null || _classPrivateFieldGet6 === void 0 ? void 0 : _classPrivateFieldGet6.Promise;
        }
      },
      delayAllWorkerTime: {
        get: function get() {
          var _classPrivateFieldGet7;
          return (_classPrivateFieldGet7 = _classPrivateFieldGet(_this, _events).delayAllWorkerTime) === null || _classPrivateFieldGet7 === void 0 ? void 0 : _classPrivateFieldGet7.Promise;
        }
      },
      queueAdd: {
        get: function get() {
          var _classPrivateFieldGet8;
          return (_classPrivateFieldGet8 = _classPrivateFieldGet(_this, _events).queueAdd) === null || _classPrivateFieldGet8 === void 0 ? void 0 : _classPrivateFieldGet8.Promise;
        }
      },
      activeWorkerClear: {
        get: function get() {
          var _classPrivateFieldGet9;
          return (_classPrivateFieldGet9 = _classPrivateFieldGet(_this, _events).activeWorkerClear) === null || _classPrivateFieldGet9 === void 0 ? void 0 : _classPrivateFieldGet9.Promise;
        }
      },
      oneWorkerDone: {
        get: function get() {
          var _classPrivateFieldGet10;
          return (_classPrivateFieldGet10 = _classPrivateFieldGet(_this, _events).oneWorkerDone) === null || _classPrivateFieldGet10 === void 0 ? void 0 : _classPrivateFieldGet10.Promise;
        }
      }
    }));
    this.name = (_options$name = options.name) !== null && _options$name !== void 0 ? _options$name : this.name;
    options.parallel = (_options$parallel = options.parallel) !== null && _options$parallel !== void 0 ? _options$parallel : this.parallel;
    this.parallel = options.parallel < 1 ? 1 : options.parallel;
    this.autoRun = (_options$autoRun = options.autoRun) !== null && _options$autoRun !== void 0 ? _options$autoRun : this.autoRun;
    this.worker = (_options$worker = options.worker) !== null && _options$worker !== void 0 ? _options$worker : this.worker;
    _classPrivateFieldSet(this, _waitTime, (_options$waitTime = options.waitTime) !== null && _options$waitTime !== void 0 ? _options$waitTime : 0);
    _classPrivateFieldSet(this, _waitTime, _classPrivateFieldGet(this, _waitTime) < 0 ? 0 : _classPrivateFieldGet(this, _waitTime));
    options.maxRetryCount = (_options$maxRetryCoun = options.maxRetryCount) !== null && _options$maxRetryCoun !== void 0 ? _options$maxRetryCoun : this.maxRetryCount;
    this.maxRetryCount = options.maxRetryCount < 0 ? 0 : options.maxRetryCount;
    this.taskResultCallback = (_options$taskResultCa = options.taskResultCallback) !== null && _options$taskResultCa !== void 0 ? _options$taskResultCa : this.taskResultCallback;
    this.taskErrorCallback = (_options$taskErrorCal = options.taskErrorCallback) !== null && _options$taskErrorCal !== void 0 ? _options$taskErrorCal : this.taskErrorCallback;
    this.taskFailCallback = (_options$taskFailCall = options.taskFailCallback) !== null && _options$taskFailCall !== void 0 ? _options$taskFailCall : this.taskFailCallback;
    this.allWorkerDoneCallback = (_options$allWorkerDon = options.allWorkerDoneCallback) !== null && _options$allWorkerDon !== void 0 ? _options$allWorkerDon : this.allWorkerDoneCallback;
    this.rateLimiter = (_options$rateLimiter = options.rateLimiter) !== null && _options$rateLimiter !== void 0 ? _options$rateLimiter : this.rateLimiter;
    options.queueCacheLimit = (_options$queueCacheLi = options.queueCacheLimit) !== null && _options$queueCacheLi !== void 0 ? _options$queueCacheLi : Number.MAX_SAFE_INTEGER;
    this.queueCacheLimit = options.queueCacheLimit < 1 ? 1 : options.queueCacheLimit;
    this.callbackInWorker = (_options$callbackInWo = options.callbackInWorker) !== null && _options$callbackInWo !== void 0 ? _options$callbackInWo : false;
    this.autoRetry = (_options$autoRetry = options.autoRetry) !== null && _options$autoRetry !== void 0 ? _options$autoRetry : false;
    this.retryDelay = (_options$retryDelay = options.retryDelay) !== null && _options$retryDelay !== void 0 ? _options$retryDelay : 0;
    _classPrivateFieldGet(this, _events).run = GetPromiseKit();
    _classPrivateFieldGet(this, _events).stop = GetPromiseKit();
    _classPrivateFieldGet(this, _events).oneWorkerDone = GetPromiseKit();
  }
  _createClass(AsyncPool, [{
    key: "activeWorkerCounts",
    value:
    /**
     * 正在处于运行中的任务数量
     * @returns number
     */
    function activeWorkerCounts() {
      return _classPrivateFieldGet(this, _activeWorker);
    }
    /**
     * 等待运行的任务队列数量
     * @returns number
     */
  }, {
    key: "queueCounts",
    value: function queueCounts() {
      return _classPrivateFieldGet(this, _queue).length;
    }
  }, {
    key: "needBreak",
    value: function needBreak() {
      return _classPrivateFieldGet(this, _needBreak);
    }
  }, {
    key: "queue",
    value: function queue() {
      return _classPrivateFieldGet(this, _queue);
    }

    /**
     * 添加任务的通用方法
     * @param items 类型是 TaskTodo<T>
     */
  }, {
    key: "add",
    value: function add() {
      for (var _len = arguments.length, items = new Array(_len), _key = 0; _key < _len; _key++) {
        items[_key] = arguments[_key];
      }
      for (var _i = 0, _items = items; _i < _items.length; _i++) {
        var item = _items[_i];
        _classPrivateFieldGet(this, _queue).push(item);
      }
      if (items.length > 0) {
        var _classPrivateFieldGet11, _classPrivateFieldGet12;
        (_classPrivateFieldGet11 = _classPrivateFieldGet(this, _events).queueAdd) === null || _classPrivateFieldGet11 === void 0 || (_classPrivateFieldGet12 = _classPrivateFieldGet11.Resolve) === null || _classPrivateFieldGet12 === void 0 || _classPrivateFieldGet12.call(_classPrivateFieldGet11);
      }
      this.autoRun && this.run();
    }

    /**
     * 添加单个待处理的数据
     * @param data
     * @returns
     */
  }, {
    key: "addTodo",
    value: function addTodo(data) {
      this.add({
        data: data
      });
    }

    /**
     * 添加多个待处理的数据
     * @param data
     * @returns
     */
  }, {
    key: "addTodos",
    value: function addTodos() {
      for (var _len2 = arguments.length, datas = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        datas[_key2] = arguments[_key2];
      }
      this.add.apply(this, _toConsumableArray(datas.map(function (data) {
        return {
          data: data
        };
      })));
    }

    /**
     * 添加待处理的数据和处理该数据的执行方法
     * @param data
     * @param worker 该数据的执行方法
     * @returns
     */
  }, {
    key: "addWorkerTodo",
    value: function addWorkerTodo(data, worker) {
      this.add({
        data: data,
        worker: worker
      });
    }

    /**
     * 添加多个待处理的数据
     * @param todo
     * @param worker 该数据的执行方法
     * @returns
     */
  }, {
    key: "addWorkerTodos",
    value: function addWorkerTodos(worker) {
      for (var _len3 = arguments.length, datas = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
        datas[_key3 - 1] = arguments[_key3];
      }
      this.add.apply(this, _toConsumableArray(datas.map(function (data) {
        return {
          data: data,
          worker: worker
        };
      })));
    }

    /**
     * 添加待执行的函数
     * @param workerTask 待执行的函数
     * @returns
     */
  }, {
    key: "addWorker",
    value: function addWorker(workerTask) {
      this.add({
        workerFn: workerTask
      });
    }
  }, {
    key: "resolveDelayDone",
    value:
    /**
     * 直接完成delay的promise
     *
     * 如果在delayAllWorkerDone的等待期间
     * 能明确知道不会有后续新增任务
     * 可调用此方法直接触发事件
     */
    function resolveDelayDone() {
      var _classPrivateFieldGet13, _classPrivateFieldGet14;
      (_classPrivateFieldGet13 = (_classPrivateFieldGet14 = _classPrivateFieldGet(this, _events).delayAllWorkerTime).Resolve) === null || _classPrivateFieldGet13 === void 0 || _classPrivateFieldGet13.call(_classPrivateFieldGet14);
    }
  }, {
    key: "waitAllWorkerDone",
    value: (
    /**
     * 等待所有任务执行完成
     * @returns
     */
    function () {
      var _waitAllWorkerDone = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
        return _regeneratorRuntime().wrap(function _callee$(_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              _context.next = 2;
              return this.events.run;
            case 2:
              _context.next = 4;
              return this.events.allWorkerDone;
            case 4:
            case "end":
              return _context.stop();
          }
        }, _callee, this);
      }));
      function waitAllWorkerDone() {
        return _waitAllWorkerDone.apply(this, arguments);
      }
      return waitAllWorkerDone;
    }()
    /**
     * 当并行任务已满，并且待运行的任务过多时，需要等待
     * @param base_count 当待执行队列数量达到此值时，就开始等待，默认为`1`
     * @returns 
     */
    )
  }, {
    key: "waitQueueLess",
    value: (function () {
      var _waitQueueLess = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2() {
        var base_count,
          _args2 = arguments;
        return _regeneratorRuntime().wrap(function _callee2$(_context2) {
          while (1) switch (_context2.prev = _context2.next) {
            case 0:
              base_count = _args2.length > 0 && _args2[0] !== undefined ? _args2[0] : 1;
            case 1:
              if (!(_classPrivateFieldGet(this, _activeWorker) >= this.parallel && _classPrivateFieldGet(this, _queue).length >= base_count)) {
                _context2.next = 7;
                break;
              }
              _context2.next = 4;
              return this.events.oneWorkerDone;
            case 4:
              _classPrivateFieldGet(this, _events).oneWorkerDone = GetPromiseKit();
              _context2.next = 1;
              break;
            case 7:
            case "end":
              return _context2.stop();
          }
        }, _callee2, this);
      }));
      function waitQueueLess() {
        return _waitQueueLess.apply(this, arguments);
      }
      return waitQueueLess;
    }()
    /**
     * 等待恢复执行
     * @returns
     */
    )
  }, {
    key: "waitResume",
    value: function waitResume() {
      return _classPrivateFieldGet(this, _events).resume.Promise;
    }

    /**
     * 暂停后续任务执行，可以恢复
     * 运行中的任务不受影响，
     * @param resume 恢复方法，(resolve, pool)
     */
  }, {
    key: "pause",
    value: function pause(resumeCallback) {
      if (!_classPrivateFieldGet(this, _paused)) {
        _classPrivateFieldGet(this, _events).resume = GetPromiseKit();
        _classPrivateFieldSet(this, _paused, true);
        // 调用自定义的恢复方法
        if (isExecutable(resumeCallback)) {
          AsyncRun(resumeCallback, this.resume.bind(this), this);
        }
      }
      return this.events.resume;
    }

    /**
     * 恢复任务执行
     */
  }, {
    key: "resume",
    value: function resume() {
      var _classPrivateFieldGet15, _classPrivateFieldGet16;
      (_classPrivateFieldGet15 = _classPrivateFieldGet(this, _events).resume) === null || _classPrivateFieldGet15 === void 0 || (_classPrivateFieldGet16 = _classPrivateFieldGet15.Resolve) === null || _classPrivateFieldGet16 === void 0 || _classPrivateFieldGet16.call(_classPrivateFieldGet15);
      _classPrivateFieldGet(this, _events).resume = {};
      _classPrivateFieldSet(this, _paused, false);
    }

    /**
     * 结束任务执行，可再次调用run
     */
  }, {
    key: "stop",
    value: (function () {
      var _stop = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee3() {
        return _regeneratorRuntime().wrap(function _callee3$(_context3) {
          while (1) switch (_context3.prev = _context3.next) {
            case 0:
              _classPrivateFieldSet(this, _needBreak, true);
              _context3.next = 3;
              return this.events.stop;
            case 3:
            case "end":
              return _context3.stop();
          }
        }, _callee3, this);
      }));
      function stop() {
        return _stop.apply(this, arguments);
      }
      return stop;
    }() /** 停止、清空任务 */)
  }, {
    key: "clear",
    value: (function () {
      var _clear = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee4() {
        return _regeneratorRuntime().wrap(function _callee4$(_context4) {
          while (1) switch (_context4.prev = _context4.next) {
            case 0:
              _context4.next = 2;
              return this.stop();
            case 2:
              _classPrivateFieldSet(this, _activeWorker, 0);
              _classPrivateFieldSet(this, _queue, []);
              return _context4.abrupt("return", true);
            case 5:
            case "end":
              return _context4.stop();
          }
        }, _callee4, this);
      }));
      function clear() {
        return _clear.apply(this, arguments);
      }
      return clear;
    }()
    /**
     * 启动并行库运行
     * @returns
     */
    )
  }, {
    key: "run",
    value: (function () {
      var _run = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee5() {
        var _classPrivateFieldGet17, _classPrivateFieldGet18, _classPrivateFieldGet22, _classPrivateFieldGet23;
        var _this$activeWorker3, _this$activeWorker4, _classPrivateFieldGet19, _ref, _ref2, task_todo, none_todo, _classPrivateFieldGet20, _classPrivateFieldGet21, _this$allWorkerDoneCa;
        return _regeneratorRuntime().wrap(function _callee5$(_context5) {
          while (1) switch (_context5.prev = _context5.next) {
            case 0:
              if (!(_classPrivateFieldGet(this, _running) || _classPrivateFieldGet(this, _queue).length == 0)) {
                _context5.next = 2;
                break;
              }
              return _context5.abrupt("return", false);
            case 2:
              _classPrivateFieldSet(this, _running, true);
              _classPrivateFieldSet(this, _needBreak, false);

              // 所有任务完成事件初始化
              _classPrivateFieldGet(this, _events).allWorkerDone = GetPromiseKit();
              (_classPrivateFieldGet17 = _classPrivateFieldGet(this, _events).run) === null || _classPrivateFieldGet17 === void 0 || (_classPrivateFieldGet18 = _classPrivateFieldGet17.Resolve) === null || _classPrivateFieldGet18 === void 0 || _classPrivateFieldGet18.call(_classPrivateFieldGet17);
              _context5.next = 8;
              return _classPrivateFieldGet(this, _limitPromise);
            case 8:
              if (!true) {
                _context5.next = 28;
                break;
              }
              if (!_classPrivateFieldGet(this, _needBreak)) {
                _context5.next = 11;
                break;
              }
              return _context5.abrupt("break", 28);
            case 11:
              _context5.next = 13;
              return _classPrivateMethodGet(this, _waitAddOrDone, _waitAddOrDone2).call(this);
            case 13:
              _context5.next = 15;
              return _classPrivateMethodGet(this, _next, _next2).call(this);
            case 15:
              _ref = _context5.sent;
              _ref2 = _slicedToArray(_ref, 2);
              task_todo = _ref2[0];
              none_todo = _ref2[1];
              if (!none_todo) {
                _context5.next = 21;
                break;
              }
              return _context5.abrupt("break", 28);
            case 21:
              _classPrivateFieldSet(this, _activeWorker, (_this$activeWorker3 = _classPrivateFieldGet(this, _activeWorker), _this$activeWorker4 = _this$activeWorker3++, _this$activeWorker3)), _this$activeWorker4;
              if (!((_classPrivateFieldGet19 = _classPrivateFieldGet(this, _events).activeWorkerClear) !== null && _classPrivateFieldGet19 !== void 0 && _classPrivateFieldGet19.Promise)) {
                _classPrivateFieldGet(this, _events).activeWorkerClear = GetPromiseKit();
              }
              if (_classPrivateFieldGet(this, _activeWorker) >= this.parallel) {
                _classPrivateFieldGet(this, _events).parallelIdel = GetPromiseKit();
              }
              // 卡点，主要用于控制执行速率
              _classPrivateFieldSet(this, _limitPromise, _classPrivateMethodGet(this, _rateLimit, _rateLimit2).call(this, task_todo));
              _classPrivateMethodGet(this, _exec, _exec2).call(this, task_todo);
              _context5.next = 8;
              break;
            case 28:
              _classPrivateFieldSet(this, _needBreak, false);
              _classPrivateFieldSet(this, _running, false);
              if (_classPrivateFieldGet(this, _queue).length == 0 && _classPrivateFieldGet(this, _activeWorker) == 0 && _classPrivateFieldGet(this, _reAddCount) == 0) {
                (_classPrivateFieldGet20 = _classPrivateFieldGet(this, _events).allWorkerDone) === null || _classPrivateFieldGet20 === void 0 || (_classPrivateFieldGet21 = _classPrivateFieldGet20.Resolve) === null || _classPrivateFieldGet21 === void 0 || _classPrivateFieldGet21.call(_classPrivateFieldGet20);
                (_this$allWorkerDoneCa = this.allWorkerDoneCallback) === null || _this$allWorkerDoneCa === void 0 || _this$allWorkerDoneCa.call(this);
              }
              (_classPrivateFieldGet22 = _classPrivateFieldGet(this, _events).stop) === null || _classPrivateFieldGet22 === void 0 || (_classPrivateFieldGet23 = _classPrivateFieldGet22.Resolve) === null || _classPrivateFieldGet23 === void 0 || _classPrivateFieldGet23.call(_classPrivateFieldGet22);
              _classPrivateFieldGet(this, _events).stop = GetPromiseKit();
              _classPrivateFieldGet(this, _events).run = GetPromiseKit();
              _classPrivateFieldSet(this, _limitPromise, _classPrivateMethodGet(this, _rateLimit, _rateLimit2).call(this, null));
              return _context5.abrupt("return", true);
            case 36:
            case "end":
              return _context5.stop();
          }
        }, _callee5, this);
      }));
      function run() {
        return _run.apply(this, arguments);
      }
      return run;
    }())
  }]);
  return AsyncPool;
}();
function _reAddTaskTodo2(task_todo, delayMs) {
  var _task_todo$retryCount,
    _this2 = this;
  task_todo.retryCount = (_task_todo$retryCount = task_todo.retryCount) !== null && _task_todo$retryCount !== void 0 ? _task_todo$retryCount : 0;
  task_todo.retryCount += 1;
  if (task_todo.retryCount > this.maxRetryCount) {
    var error = new Error('retry count limit');
    error.name = 'AsyncPoolRetryCountLimit';
    var cbArgs = {
      data: task_todo.data,
      result: null,
      error: error,
      retryCount: task_todo.retryCount,
      retried: false,
      retry: function retry() {},
      pool: this
    };
    AsyncRun(this.taskErrorCallback, cbArgs);
    return false;
  }
  // 这时候的 所有任务完成事件 应该等到这个任务添加后才启动
  if (Number.isInteger(delayMs) && delayMs >= 0) {
    var _this$reAddCount, _this$reAddCount2;
    _classPrivateFieldSet(this, _reAddCount, (_this$reAddCount = _classPrivateFieldGet(this, _reAddCount), _this$reAddCount2 = _this$reAddCount++, _this$reAddCount)), _this$reAddCount2;
    setTimeout(function () {
      var _this$reAddCount3, _this$reAddCount4;
      _this2.add(task_todo);
      _classPrivateFieldSet(_this2, _reAddCount, (_this$reAddCount3 = _classPrivateFieldGet(_this2, _reAddCount), _this$reAddCount4 = _this$reAddCount3--, _this$reAddCount3)), _this$reAddCount4;
    }, delayMs);
  } else {
    this.add(task_todo);
  }
  return true;
}
function _next2() {
  return _next3.apply(this, arguments);
}
function _next3() {
  _next3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee6() {
    var _classPrivateFieldGet24;
    var todo;
    return _regeneratorRuntime().wrap(function _callee6$(_context6) {
      while (1) switch (_context6.prev = _context6.next) {
        case 0:
          if (!(_classPrivateFieldGet(this, _queue).length == 0)) {
            _context6.next = 2;
            break;
          }
          return _context6.abrupt("return", [null, true]);
        case 2:
          if (!_classPrivateFieldGet(this, _needBreak)) {
            _context6.next = 4;
            break;
          }
          return _context6.abrupt("return", [null, true]);
        case 4:
          // 返回最早添加的任务数据
          todo = (_classPrivateFieldGet24 = _classPrivateFieldGet(this, _queue).shift()) !== null && _classPrivateFieldGet24 !== void 0 ? _classPrivateFieldGet24 : null;
          if (_classPrivateFieldGet(this, _queue).length === 0) {
            _classPrivateFieldGet(this, _events).queueAdd = GetPromiseKit();
          }
          return _context6.abrupt("return", [todo, false]);
        case 7:
        case "end":
          return _context6.stop();
      }
    }, _callee6, this);
  }));
  return _next3.apply(this, arguments);
}
function _exec2(_x) {
  return _exec3.apply(this, arguments);
}
function _exec3() {
  _exec3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee7(task_todo) {
    var _retryCount,
      _this3 = this;
    var _this$activeWorker, _this$activeWorker2;
    var error, result, retried, data, worker, workerFn, retryCount, retry, fn, promise, resolve, _Wait3, _Wait4, cbArgs, _classPrivateFieldGet25, _classPrivateFieldGet26, _classPrivateFieldGet27, _classPrivateFieldGet28, _classPrivateFieldGet29, _classPrivateFieldGet30;
    return _regeneratorRuntime().wrap(function _callee7$(_context7) {
      while (1) switch (_context7.prev = _context7.next) {
        case 0:
          error = null;
          result = null; // 在worker中已经调用了retry，retried为true
          retried = false;
          data = task_todo.data, worker = task_todo.worker, workerFn = task_todo.workerFn, retryCount = task_todo.retryCount;
          retryCount = (_retryCount = retryCount) !== null && _retryCount !== void 0 ? _retryCount : 0;
          retry = function retry(delayMs) {
            if (retried) return;
            retried = true;
            return _classPrivateMethodGet(_this3, _reAddTaskTodo, _reAddTaskTodo2).call(_this3, task_todo, delayMs !== null && delayMs !== void 0 ? delayMs : _this3.retryDelay);
          }; // 执行，获得任务结果
          _context7.prev = 6;
          if (!(workerFn != null && isExecutable(workerFn))) {
            _context7.next = 13;
            break;
          }
          _context7.next = 10;
          return workerFn(this);
        case 10:
          result = _context7.sent;
          _context7.next = 23;
          break;
        case 13:
          // 单个任务配置的执行者、全局执行者
          fn = worker !== null && worker !== void 0 ? worker : this.worker;
          promise = void 0, resolve = void 0;
          if (this.callbackInWorker) {
            _Wait3 = Wait();
            _Wait4 = _slicedToArray(_Wait3, 2);
            promise = _Wait4[0];
            resolve = _Wait4[1];
          }
          _context7.next = 18;
          return AsyncRun(fn, data, {
            retryCount: retryCount,
            pool: this,
            retry: retry,
            next: resolve
          });
        case 18:
          result = _context7.sent;
          if (!this.callbackInWorker) {
            _context7.next = 23;
            break;
          }
          _context7.next = 22;
          return promise;
        case 22:
          result = _context7.sent;
        case 23:
          _context7.next = 29;
          break;
        case 25:
          _context7.prev = 25;
          _context7.t0 = _context7["catch"](6);
          error = _context7.t0;
          if (this.autoRetry) {
            retry();
          }
        case 29:
          cbArgs = {
            data: data,
            result: result,
            error: error,
            retryCount: retryCount,
            retried: retried,
            retry: function retry(delayMs) {
              return _classPrivateMethodGet(_this3, _reAddTaskTodo, _reAddTaskTodo2).call(_this3, task_todo, delayMs);
            },
            pool: this
          };
          if (error != null) {
            AsyncRun(this.taskErrorCallback, cbArgs);
          }
          AsyncRun(this.taskResultCallback, cbArgs);
          _classPrivateFieldSet(this, _activeWorker, (_this$activeWorker = _classPrivateFieldGet(this, _activeWorker), _this$activeWorker2 = _this$activeWorker--, _this$activeWorker)), _this$activeWorker2;

          // 空余一个执行额度，触发idel
          if (_classPrivateFieldGet(this, _activeWorker) < this.parallel) {
            (_classPrivateFieldGet25 = (_classPrivateFieldGet26 = _classPrivateFieldGet(this, _events).oneWorkerDone).Resolve) === null || _classPrivateFieldGet25 === void 0 || _classPrivateFieldGet25.call(_classPrivateFieldGet26);
            (_classPrivateFieldGet27 = (_classPrivateFieldGet28 = _classPrivateFieldGet(this, _events).parallelIdel).Resolve) === null || _classPrivateFieldGet27 === void 0 || _classPrivateFieldGet27.call(_classPrivateFieldGet28);
          }
          if (_classPrivateFieldGet(this, _activeWorker) <= 0) {
            (_classPrivateFieldGet29 = _classPrivateFieldGet(this, _events).activeWorkerClear) === null || _classPrivateFieldGet29 === void 0 || (_classPrivateFieldGet30 = _classPrivateFieldGet29.Resolve) === null || _classPrivateFieldGet30 === void 0 || _classPrivateFieldGet30.call(_classPrivateFieldGet29);
          }
        case 35:
        case "end":
          return _context7.stop();
      }
    }, _callee7, this, [[6, 25]]);
  }));
  return _exec3.apply(this, arguments);
}
function _waitAddOrDone2() {
  return _waitAddOrDone3.apply(this, arguments);
}
function _waitAddOrDone3() {
  _waitAddOrDone3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee8() {
    var _this4 = this;
    var _classPrivateFieldGet31, _classPrivateFieldGet32, _classPrivateFieldGet33, _classPrivateFieldGet34, _WaitTimeout, _WaitTimeout2, p, r;
    return _regeneratorRuntime().wrap(function _callee8$(_context8) {
      while (1) switch (_context8.prev = _context8.next) {
        case 0:
          _context8.next = 2;
          return _classPrivateFieldGet(this, _limitPromise);
        case 2:
          _context8.next = 4;
          return this.events.resume;
        case 4:
          if (!(_classPrivateFieldGet(this, _queue).length > 0)) {
            _context8.next = 10;
            break;
          }
          if (!(_classPrivateFieldGet(this, _activeWorker) >= this.parallel)) {
            _context8.next = 8;
            break;
          }
          _context8.next = 8;
          return this.events.parallelIdel;
        case 8:
          _context8.next = 25;
          break;
        case 10:
          if (!(_classPrivateFieldGet(this, _activeWorker) > 0 || _classPrivateFieldGet(this, _reAddCount) > 0)) {
            _context8.next = 16;
            break;
          }
          // 任务队列为0
          _classPrivateFieldGet(this, _events).activeWorkerClear = GetPromiseKit(function () {
            _classPrivateFieldGet(_this4, _events).activeWorkerClear = {};
          });
          _context8.next = 14;
          return Promise.any([// 有新任务增加
          (_classPrivateFieldGet31 = _classPrivateFieldGet(this, _events).queueAdd) === null || _classPrivateFieldGet31 === void 0 ? void 0 : _classPrivateFieldGet31.Promise, // 所有并发任务完成
          (_classPrivateFieldGet32 = _classPrivateFieldGet(this, _events).activeWorkerClear) === null || _classPrivateFieldGet32 === void 0 ? void 0 : _classPrivateFieldGet32.Promise]);
        case 14:
          _context8.next = 25;
          break;
        case 16:
          if (!(_classPrivateFieldGet(this, _queue).length == 0 && _classPrivateFieldGet(this, _activeWorker) == 0 && _classPrivateFieldGet(this, _reAddCount) == 0 && _classPrivateFieldGet(this, _waitTime) > 0)) {
            _context8.next = 23;
            break;
          }
          _WaitTimeout = WaitTimeout(_classPrivateFieldGet(this, _waitTime)), _WaitTimeout2 = _slicedToArray(_WaitTimeout, 2), p = _WaitTimeout2[0], r = _WaitTimeout2[1];
          _classPrivateFieldGet(this, _events).delayAllWorkerTime = {
            Promise: p,
            Resolve: r
          };
          _context8.next = 21;
          return Promise.any([(_classPrivateFieldGet33 = _classPrivateFieldGet(this, _events).delayAllWorkerTime) === null || _classPrivateFieldGet33 === void 0 ? void 0 : _classPrivateFieldGet33.Promise, (_classPrivateFieldGet34 = _classPrivateFieldGet(this, _events).queueAdd) === null || _classPrivateFieldGet34 === void 0 ? void 0 : _classPrivateFieldGet34.Promise]);
        case 21:
          _context8.next = 25;
          break;
        case 23:
          _context8.next = 25;
          return sleep(0);
        case 25:
        case "end":
          return _context8.stop();
      }
    }, _callee8, this);
  }));
  return _waitAddOrDone3.apply(this, arguments);
}
function _rateLimit2(task_todo) {
  if (isExecutable(this.rateLimiter)) {
    var _Wait = Wait(),
      _Wait2 = _slicedToArray(_Wait, 2),
      pend = _Wait2[0],
      done = _Wait2[1];
    AsyncRun(this.rateLimiter, done, task_todo);
    return pend;
  }
  return null;
}
export { sleep };
//# sourceMappingURL=async-pool.js.map