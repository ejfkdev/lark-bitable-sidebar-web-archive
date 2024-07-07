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
var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var __privateWrapper = (obj, member, setter, getter) => ({
  set _(value) {
    __privateSet(obj, member, value, setter);
  },
  get _() {
    return __privateGet(obj, member, getter);
  }
});
var __privateMethod = (obj, member, method) => {
  __accessCheck(obj, member, "access private method");
  return method;
};

// src/async-pool.ts
var async_pool_exports = {};
__export(async_pool_exports, {
  AsyncPool: () => AsyncPool,
  sleep: () => import_utils.sleep
});
module.exports = __toCommonJS(async_pool_exports);
var import_utils = require("./utils");
var _waitTime, _queue, _running, _paused, _needBreak, _activeWorker, _reAddCount, _reAddTaskTodo, reAddTaskTodo_fn, _next, next_fn, _exec, exec_fn, _waitAddOrDone, waitAddOrDone_fn, _rateLimit, rateLimit_fn, _events;
var AsyncPool = class {
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
  constructor(options = {
    name: "",
    parallel: 2,
    maxRetryCount: Number.MAX_SAFE_INTEGER,
    waitTime: 0,
    autoRun: true,
    worker: null,
    taskResultCallback: null,
    taskErrorCallback: null,
    taskFailCallback: null,
    allWorkerDoneCallback: null,
    rateLimiter: null,
    callbackInWorker: false
  }) {
    /**
     * 重试任务，有最多次数限制
     * @param task_todo
     * @returns boolean 是否成功添加到队列中
     */
    __privateAdd(this, _reAddTaskTodo);
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
    __privateAdd(this, _next);
    /**
     * 执行任务
     *
     * @param task_todo
     */
    __privateAdd(this, _exec);
    __privateAdd(this, _waitAddOrDone);
    /**
     * 任务执行限速
     *
     * 在next获取到一个任务数据后，调用此方法进行限速
     * @param task_todo
     * @returns
     */
    __privateAdd(this, _rateLimit);
    /**
     * 该异步并发池的名称，仅用于区分不同的实例
     * @default ''
     */
    this.name = "";
    /**
     * 并行度
     *
     * 同一时间最多能有多少个任务处于await状态
     * @default 2
     */
    this.parallel = 2;
    /**
     * 当添加新任务后自动启动队列
     * @default true
     */
    this.autoRun = true;
    /**
     * 全局的任务执行者
     *
     * 如果添加任务数据时没有单独指定worker，则使用该全局woker处理任务数据
     */
    this.worker = null;
    /**
     * 如果在worker中需要以触发某些回调事件为完成标志，则需要设置为true
     * 
     * 这时worker的第二个参数中会包含一个next方法
     * 
     * 需要在worker方法中手动调用next(result)才会结束此任务的执行
     */
    this.callbackInWorker = false;
    /**
     * 每个任务完成后的回调，可以获取任务返回结果
     */
    this.taskResultCallback = null;
    /**
     * 只在执行任务出现异常被捕获时触发，传入参数与taskResultCallback相同，触发error的任务根据配置也可能会自动重试
     */
    this.taskErrorCallback = null;
    /**
     * 任务执行报错，但接下来不会自动重试，意味着该任务将被丢弃
     */
    this.taskFailCallback = null;
    /**
     * 任务最多重试次数，如果任务失败重试次数超过该限制，任务数据会被丢弃不再添加到任务队列中
     * @default Number.MAX_SAFE_INTEGER
     */
    this.maxRetryCount = 2 ** 3;
    /**
     * 触发所有任务完成之前等待的冗余时间
     */
    __privateAdd(this, _waitTime, 0);
    /** 任务队列 */
    __privateAdd(this, _queue, []);
    /**
     * 任务队列缓存上限
     *
     * 当达到上限时，可使用`await waitParallelIdel()`或`await add*()`来控制任务添加速度
     *
     * 如果不调用上面两个方法则该限制不会有实际作用
     *
     * @default Number.MAX_SAFE_INTEGER
     */
    this.queueCacheLimit = Number.MAX_SAFE_INTEGER;
    /**
     * 所有任务完成后的回调，每次队列全部完成后都会触发。如果需要防抖，可使用带有延迟防抖的`DelayPool`
     */
    this.allWorkerDoneCallback = null;
    /**
     * 控制任务执行速率方法
     */
    this.rateLimiter = null;
    /**
     * 任务队列是否处于运行中
     */
    __privateAdd(this, _running, false);
    /**
     * 任务队列是否处于暂停状态
     */
    __privateAdd(this, _paused, false);
    /**
     * 任务队列执行是否需要停止
     */
    __privateAdd(this, _needBreak, false);
    /**
     * 正在处于运行中的任务数量
     */
    __privateAdd(this, _activeWorker, 0);
    /**
     * 重试任务可以延迟一段时间添加到任务列表中
     * 如果有即将到来的任务，那么所有任务完成事件先不触发
     */
    __privateAdd(this, _reAddCount, 0);
    __privateAdd(this, _events, {
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
    });
    /**
     * Promise事件，当事件触发时，promise对象会resolve
     * 
     * 例如`await events.allWorkerDone`
     */
    this.events = Object.defineProperties({}, {
      resume: {
        get: () => {
          var _a;
          return (_a = __privateGet(this, _events).resume) == null ? void 0 : _a.Promise;
        }
      },
      stop: {
        get: () => {
          var _a;
          return (_a = __privateGet(this, _events).stop) == null ? void 0 : _a.Promise;
        }
      },
      allWorkerDone: {
        get: () => {
          var _a;
          return (_a = __privateGet(this, _events).allWorkerDone) == null ? void 0 : _a.Promise;
        }
      },
      parallelIdel: {
        get: () => {
          var _a;
          return (_a = __privateGet(this, _events).parallelIdel) == null ? void 0 : _a.Promise;
        }
      },
      run: {
        get: () => {
          var _a;
          return (_a = __privateGet(this, _events).run) == null ? void 0 : _a.Promise;
        }
      },
      delayAllWorkerTime: {
        get: () => {
          var _a;
          return (_a = __privateGet(this, _events).delayAllWorkerTime) == null ? void 0 : _a.Promise;
        }
      },
      queueAdd: {
        get: () => {
          var _a;
          return (_a = __privateGet(this, _events).queueAdd) == null ? void 0 : _a.Promise;
        }
      },
      activeWorkerClear: {
        get: () => {
          var _a;
          return (_a = __privateGet(this, _events).activeWorkerClear) == null ? void 0 : _a.Promise;
        }
      },
      oneWorkerDone: {
        get: () => {
          var _a;
          return (_a = __privateGet(this, _events).oneWorkerDone) == null ? void 0 : _a.Promise;
        }
      }
    });
    this.name = options.name ?? this.name;
    options.parallel = options.parallel ?? this.parallel;
    this.parallel = options.parallel < 1 ? 1 : options.parallel;
    this.autoRun = options.autoRun ?? this.autoRun;
    this.worker = options.worker ?? this.worker;
    __privateSet(this, _waitTime, options.waitTime ?? 0);
    __privateSet(this, _waitTime, __privateGet(this, _waitTime) < 0 ? 0 : __privateGet(this, _waitTime));
    options.maxRetryCount = options.maxRetryCount ?? this.maxRetryCount;
    this.maxRetryCount = options.maxRetryCount < 0 ? 0 : options.maxRetryCount;
    this.taskResultCallback = options.taskResultCallback ?? this.taskResultCallback;
    this.taskErrorCallback = options.taskErrorCallback ?? this.taskErrorCallback;
    this.taskFailCallback = options.taskFailCallback ?? this.taskFailCallback;
    this.allWorkerDoneCallback = options.allWorkerDoneCallback ?? this.allWorkerDoneCallback;
    this.rateLimiter = options.rateLimiter ?? this.rateLimiter;
    options.queueCacheLimit = options.queueCacheLimit ?? Number.MAX_SAFE_INTEGER;
    this.queueCacheLimit = options.queueCacheLimit < 1 ? 1 : options.queueCacheLimit;
    this.callbackInWorker = options.callbackInWorker ?? false;
    __privateGet(this, _events).run = (0, import_utils.GetPromiseKit)();
    __privateGet(this, _events).stop = (0, import_utils.GetPromiseKit)();
    __privateGet(this, _events).oneWorkerDone = (0, import_utils.GetPromiseKit)();
  }
  /**
   * 正在处于运行中的任务数量
   * @returns number
   */
  activeWorkerCounts() {
    return __privateGet(this, _activeWorker);
  }
  /**
   * 等待运行的任务队列数量
   * @returns number
   */
  queueCounts() {
    return __privateGet(this, _queue).length;
  }
  needBreak() {
    return __privateGet(this, _needBreak);
  }
  queue() {
    return __privateGet(this, _queue);
  }
  /**
   * 添加任务的通用方法
   * @param items 类型是 TaskTodo<T>
   */
  add(...items) {
    var _a, _b;
    for (const item of items) {
      __privateGet(this, _queue).push(item);
    }
    if (items.length > 0) {
      (_b = (_a = __privateGet(this, _events).queueAdd) == null ? void 0 : _a.Resolve) == null ? void 0 : _b.call(_a);
    }
    this.autoRun && this.run();
  }
  /**
   * 添加单个待处理的数据
   * @param data
   * @returns
   */
  addTodo(data) {
    this.add({ data });
  }
  /**
   * 添加多个待处理的数据
   * @param data
   * @returns
   */
  addTodos(...datas) {
    this.add(...datas.map((data) => ({ data })));
  }
  /**
   * 添加待处理的数据和处理该数据的执行方法
   * @param data
   * @param worker 该数据的执行方法
   * @returns
   */
  addWorkerTodo(data, worker) {
    this.add({ data, worker });
  }
  /**
   * 添加多个待处理的数据
   * @param todo
   * @param worker 该数据的执行方法
   * @returns
   */
  addWorkerTodos(worker, ...datas) {
    this.add(...datas.map((data) => ({ data, worker })));
  }
  /**
   * 添加待执行的函数
   * @param workerTask 待执行的函数
   * @returns
   */
  addWorker(workerTask) {
    this.add({ workerFn: workerTask });
  }
  /**
   * 直接完成delay的promise
   *
   * 如果在delayAllWorkerDone的等待期间
   * 能明确知道不会有后续新增任务
   * 可调用此方法直接触发事件
   */
  resolveDelayDone() {
    var _a, _b;
    (_b = (_a = __privateGet(this, _events).delayAllWorkerTime).Resolve) == null ? void 0 : _b.call(_a);
  }
  /**
   * 等待所有任务执行完成
   * @returns
   */
  async waitAllWorkerDone() {
    await this.events.run;
    await this.events.allWorkerDone;
  }
  /**
   * 当并行任务已满，并且待运行的任务过多时，需要等待
   * @param base_count 当待执行队列数量达到此值时，就开始等待，默认为`1`
   * @returns 
   */
  async waitQueueLess(base_count = 1) {
    while (__privateGet(this, _activeWorker) >= this.parallel && __privateGet(this, _queue).length >= base_count) {
      await this.events.oneWorkerDone;
      __privateGet(this, _events).oneWorkerDone = (0, import_utils.GetPromiseKit)();
    }
  }
  /**
   * 等待恢复执行
   * @returns
   */
  waitResume() {
    return __privateGet(this, _events).resume.Promise;
  }
  /**
   * 暂停后续任务执行，可以恢复
   * 运行中的任务不受影响，
   * @param resume 恢复方法，(resolve, pool)
   */
  pause(resumeCallback) {
    if (!__privateGet(this, _paused)) {
      __privateGet(this, _events).resume = (0, import_utils.GetPromiseKit)();
      __privateSet(this, _paused, true);
      if ((0, import_utils.isExecutable)(resumeCallback)) {
        (0, import_utils.AsyncRun)(resumeCallback, this.resume.bind(this), this);
      }
    }
    return this.events.resume;
  }
  /**
   * 恢复任务执行
   */
  resume() {
    var _a, _b;
    (_b = (_a = __privateGet(this, _events).resume) == null ? void 0 : _a.Resolve) == null ? void 0 : _b.call(_a);
    __privateGet(this, _events).resume = {};
    __privateSet(this, _paused, false);
  }
  /**
   * 结束任务执行，可再次调用run
   */
  async stop() {
    __privateSet(this, _needBreak, true);
    await this.events.stop;
  }
  /** 停止、清空任务 */
  async clear() {
    await this.stop();
    __privateSet(this, _activeWorker, 0);
    __privateSet(this, _queue, []);
    return true;
  }
  /**
   * 启动并行库运行
   * @returns
   */
  async run() {
    var _a, _b, _c, _d, _e, _f, _g;
    if (__privateGet(this, _running) || __privateGet(this, _queue).length == 0) {
      return false;
    }
    __privateSet(this, _running, true);
    __privateSet(this, _needBreak, false);
    __privateGet(this, _events).allWorkerDone = (0, import_utils.GetPromiseKit)();
    (_b = (_a = __privateGet(this, _events).run) == null ? void 0 : _a.Resolve) == null ? void 0 : _b.call(_a);
    while (true) {
      if (__privateGet(this, _needBreak)) {
        break;
      }
      await __privateMethod(this, _waitAddOrDone, waitAddOrDone_fn).call(this);
      let [task_todo, none_todo] = await __privateMethod(this, _next, next_fn).call(this);
      if (none_todo) {
        break;
      }
      __privateWrapper(this, _activeWorker)._++;
      if (!((_c = __privateGet(this, _events).activeWorkerClear) == null ? void 0 : _c.Promise)) {
        __privateGet(this, _events).activeWorkerClear = (0, import_utils.GetPromiseKit)();
      }
      if (__privateGet(this, _activeWorker) >= this.parallel) {
        __privateGet(this, _events).parallelIdel = (0, import_utils.GetPromiseKit)();
      }
      await __privateMethod(this, _rateLimit, rateLimit_fn).call(this, task_todo);
      __privateMethod(this, _exec, exec_fn).call(this, task_todo);
    }
    __privateSet(this, _needBreak, false);
    __privateSet(this, _running, false);
    if (__privateGet(this, _queue).length == 0 && __privateGet(this, _activeWorker) == 0 && __privateGet(this, _reAddCount) == 0) {
      (_e = (_d = __privateGet(this, _events).allWorkerDone) == null ? void 0 : _d.Resolve) == null ? void 0 : _e.call(_d);
    }
    (_g = (_f = __privateGet(this, _events).stop) == null ? void 0 : _f.Resolve) == null ? void 0 : _g.call(_f);
    __privateGet(this, _events).stop = (0, import_utils.GetPromiseKit)();
    __privateGet(this, _events).run = (0, import_utils.GetPromiseKit)();
    return true;
  }
};
_waitTime = new WeakMap();
_queue = new WeakMap();
_running = new WeakMap();
_paused = new WeakMap();
_needBreak = new WeakMap();
_activeWorker = new WeakMap();
_reAddCount = new WeakMap();
_reAddTaskTodo = new WeakSet();
reAddTaskTodo_fn = function(task_todo, delayMs) {
  task_todo.retryCount = task_todo.retryCount ?? 0;
  task_todo.retryCount += 1;
  if (task_todo.retryCount > this.maxRetryCount) {
    const error = new Error("retry count limit");
    error.name = "AsyncPoolRetryCountLimit";
    const cbArgs = {
      data: task_todo.data,
      result: null,
      error,
      retryCount: task_todo.retryCount,
      retried: false,
      retry: () => {
      },
      pool: this
    };
    (0, import_utils.AsyncRun)(this.taskErrorCallback, cbArgs);
    return false;
  }
  if (Number.isInteger(delayMs) && delayMs >= 0) {
    __privateWrapper(this, _reAddCount)._++;
    setTimeout(() => {
      this.add(task_todo);
      __privateWrapper(this, _reAddCount)._--;
    }, delayMs);
  } else {
    this.add(task_todo);
  }
  return true;
};
_next = new WeakSet();
next_fn = async function() {
  if (__privateGet(this, _queue).length == 0) {
    return [null, true];
  }
  if (__privateGet(this, _needBreak)) {
    return [null, true];
  }
  const todo = __privateGet(this, _queue).shift() ?? null;
  if (__privateGet(this, _queue).length === 0) {
    __privateGet(this, _events).queueAdd = (0, import_utils.GetPromiseKit)();
  }
  return [todo, false];
};
_exec = new WeakSet();
exec_fn = async function(task_todo) {
  var _a, _b, _c, _d, _e, _f;
  let error = null;
  let result = null;
  let retried = false;
  let { data, worker, workerFn, retryCount } = task_todo;
  retryCount = retryCount ?? 0;
  try {
    if (workerFn != null && (0, import_utils.isExecutable)(workerFn)) {
      result = await workerFn(this);
    } else {
      const fn = worker ?? this.worker;
      let [promise, resolve] = [, ,];
      if (this.callbackInWorker) {
        [promise, resolve] = (0, import_utils.Wait)();
      }
      result = await (0, import_utils.AsyncRun)(
        fn,
        data,
        {
          retryCount,
          pool: this,
          retry: (delayMs) => {
            retried = true;
            __privateMethod(this, _reAddTaskTodo, reAddTaskTodo_fn).call(this, task_todo, delayMs);
          },
          next: resolve
        }
      );
      if (this.callbackInWorker) {
        result = await promise;
      }
    }
  } catch (e) {
    error = e;
  }
  const cbArgs = {
    data,
    result,
    error,
    retryCount,
    retried,
    retry: (delayMs) => __privateMethod(this, _reAddTaskTodo, reAddTaskTodo_fn).call(this, task_todo, delayMs),
    pool: this
  };
  if (error != null) {
    (0, import_utils.AsyncRun)(this.taskErrorCallback, cbArgs);
  }
  (0, import_utils.AsyncRun)(this.taskResultCallback, cbArgs);
  __privateWrapper(this, _activeWorker)._--;
  if (__privateGet(this, _activeWorker) < this.parallel) {
    (_b = (_a = __privateGet(this, _events).oneWorkerDone).Resolve) == null ? void 0 : _b.call(_a);
    (_d = (_c = __privateGet(this, _events).parallelIdel).Resolve) == null ? void 0 : _d.call(_c);
  }
  if (__privateGet(this, _activeWorker) <= 0) {
    (_f = (_e = __privateGet(this, _events).activeWorkerClear) == null ? void 0 : _e.Resolve) == null ? void 0 : _f.call(_e);
  }
};
_waitAddOrDone = new WeakSet();
waitAddOrDone_fn = async function() {
  var _a, _b, _c, _d;
  await this.events.resume;
  if (__privateGet(this, _queue).length > 0) {
    if (__privateGet(this, _activeWorker) >= this.parallel) {
      await this.events.parallelIdel;
    }
  } else if (__privateGet(this, _activeWorker) > 0 || __privateGet(this, _reAddCount) > 0) {
    __privateGet(this, _events).activeWorkerClear = (0, import_utils.GetPromiseKit)(() => {
      __privateGet(this, _events).activeWorkerClear = {};
    });
    await Promise.any([
      // 有新任务增加
      (_a = __privateGet(this, _events).queueAdd) == null ? void 0 : _a.Promise,
      // 所有并发任务完成
      (_b = __privateGet(this, _events).activeWorkerClear) == null ? void 0 : _b.Promise
    ]);
  } else if (__privateGet(this, _queue).length == 0 && __privateGet(this, _activeWorker) == 0 && __privateGet(this, _reAddCount) == 0 && __privateGet(this, _waitTime) > 0) {
    const [p, r] = (0, import_utils.WaitTimeout)(__privateGet(this, _waitTime));
    __privateGet(this, _events).delayAllWorkerTime = { Promise: p, Resolve: r };
    await Promise.any([
      (_c = __privateGet(this, _events).delayAllWorkerTime) == null ? void 0 : _c.Promise,
      (_d = __privateGet(this, _events).queueAdd) == null ? void 0 : _d.Promise
    ]);
  } else {
    await (0, import_utils.sleep)(0);
  }
};
_rateLimit = new WeakSet();
rateLimit_fn = function(task_todo) {
  if ((0, import_utils.isExecutable)(this.rateLimiter)) {
    const [pend, done] = (0, import_utils.Wait)();
    (0, import_utils.AsyncRun)(this.rateLimiter, done, task_todo);
    return pend;
  }
  return null;
};
_events = new WeakMap();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AsyncPool,
  sleep
});
//# sourceMappingURL=async-pool.js.map
