import { AsyncPool } from './async-pool';
/**
 * 回调方法类型
 */
export type callback<T = any> = (() => T) | (() => PromiseLike<T>);
/**
 * 执行的worker额外的参数
 */
export type WorkerOptions<T> = {
    /**
     * 重试的次数
     */
    retryCount: number;
    /**
     * 并发池对象实例
     */
    pool: AsyncPool<T>;
    /**
     * 重试此任务
     */
    retry: ((delayMs?: number | null) => any) | ((delayMs?: number | null) => PromiseLike<any>);
    /**
     * 当任务worker为普通方法时，需要调用next表示worker已完成
     * 使用场景：需要触发某些回调事件才算执行完成
     * @param value 任务的返回值
     * @returns
     */
    next?: (value: any) => any;
};
/**
 * 任务本身也可以是一个方法
 */
export type WorkerFn<T = any> = ((pool: AsyncPool<T>) => any) | ((pool: AsyncPool<T>) => PromiseLike<any>);
/**
 * 任务数据的执行方法类型
 *
 * 第一个数据为传入的data
 * 第二个数据为额外的上下文
 */
export type Worker<T = any> = ((data: T | null | undefined, args: WorkerOptions<T>) => any) | ((data: T, args: WorkerOptions<T>) => PromiseLike<any>);
/**
 * 异步任务数据
 *
 * data: 任务数据
 * worker: 针对该任务的执行方法
 * workerFn: 任务就是方法
 * retry: 该任务重试次数
 */
export type TaskTodo<T = any> = {
    /** 任务数据 */
    data?: T | null;
    /** 针对该任务的执行方法 */
    worker?: Worker<T> | null;
    /** 任务就是方法 */
    workerFn?: WorkerFn | null;
    /** 该任务重试次数，首次执行是0 */
    retryCount?: number;
};
/**
 * 任务执行后回调参数类型
 */
export type TaskCallbackArgs<T> = {
    /** 任务处理的数据 */
    data: T;
    /** 任务执行结果 */
    result: any;
    /** 执行异常数据 */
    error: Error;
    /** 该任务重试的次数，从未重试过为0 */
    retryCount: number;
    /** 任务在worker中是否已经被重试 */
    retried: boolean;
    /** 重新排队执行该任务 */
    retry: ((delayMs?: number | null) => any) | ((delayMs?: number | null) => PromiseLike<any>);
    /** 异步池对象实例 */
    pool: AsyncPool<T>;
};
/**
 * 任务执行后回调方法类型
 */
export type TaskCallback<T> = ((args: TaskCallbackArgs<T>) => any) | ((args: TaskCallbackArgs<T>) => PromiseLike<any>);
export type Resolve<T = void> = (value?: T | PromiseLike<T> | undefined) => T;
export type Reject = (reason?: any) => void;
export type ResolveNull<T = void> = ((value?: T | PromiseLike<T> | undefined) => T) | null;
export type RejectNull = ((reason?: any) => void) | null;
export type PromiseKit<T = void> = {
    /**
     * 用于等待
     */
    Promise?: PromiseLike<T> | null;
    Resolve?: ResolveNull;
    Reject?: RejectNull;
    /**
     * 对于带有延迟功能的Promise，用于取消计时
     */
    Reset?: (action?: string) => void;
};
export type PromiseKitExport<T = void> = {
    /**
     * 用于等待
     */
    Promise?: PromiseLike<T> | null;
};
/**
 * 恢复异步池执行的回调方法
 */
export type ResumeCallback<T> = ((resolve: Resolve, pool: AsyncPool<T>) => any) | ((resolve: Resolve, pool: AsyncPool<T>) => PromiseLike<any>);
/**
 * 控制任务执行速率回调方法
 * 接收两个参数
 * @param done: 放行运行，只有调用该方法后，任务才会继续执行，否则会一直等待
 * @param data: 待执行的任务数据
 */
export type RateLimiterCallback<T> = ((done: Resolve, data: TaskTodo<T>) => void) | ((done: Resolve, data: TaskTodo<T>) => PromiseLike<void>);
/**
 * 初始化实例的参数类型
 */
export type AsyncPoolOptions<T> = {
    /** 该异步并发池的名称，仅用于区分不同的实例 */
    name?: string;
    /** 并行度，同一时间最多能有多少个任务处于await状态。默认为`2`
     */
    parallel?: number;
    /** 添加任务是否自动执行，默认为`true`
     *
     * 如果为false，需要手动调用`AsyncPool.run()`来启动任务队列
     */
    autoRun?: boolean;
    /** 任务的全局默认执行方法 */
    worker?: Worker | null;
    /** 任务最大重试次数，负数为无限，默认为`3`
     *
     * 重试超出限制后后会触发`taskErrorCallback`，error的name为`AsyncPoolRetryCountLimit`
     */
    maxRetryCount?: number;
    /** 所有任务完成事件触发延迟，默认`0` */
    waitTime?: number;
    /** 每个任务执行完成后的回调 */
    taskResultCallback?: TaskCallback<T> | null;
    /** 任务执行出现异常的回调 */
    taskErrorCallback?: TaskCallback<T> | null;
    /** 任务执行出错并且不会再自动重试，将被丢弃 */
    taskFailCallback?: TaskCallback<T> | null;
    /** 队列中所有任务完成后的回调 */
    allWorkerDoneCallback?: callback | null;
    /** 等待并行额度有空闲的超时时间，超时后所有任务都停止 */
    parallelIdelTimeout?: number;
    /** 任务执行频率限制 */
    rateLimiter?: RateLimiterCallback<T> | null;
    /** 任务队列最大缓存数量 */
    queueCacheLimit?: number;
    /**
     * 如果在worker中需要以触发某些回调事件为完成标志，则需要设置为true
     *
     * 这时worker的第二个参数中会包含一个`next`方法
     *
     * 需要在worker方法中手动调用`next(result)`才会结束此任务的执行
     */
    callbackInWorker?: boolean;
};
export type PromiseEvents<T = PromiseKit> = {
    /** 恢复 */
    resume: T;
    /** 停止 */
    stop: T;
    /** 所有任务完成，没有延迟 */
    allWorkerDone: T;
    /** 所有任务完成，带有延迟 */
    delayAllWorkerTime: T;
    /**
     * 等待有空闲额度
     *
     * 当运行中的woker数量达到parallel数量，会生成此Promise
     * 直到有worker执行完毕产生空闲，此Promise会resolve
     */
    parallelIdel: T;
    /** 处于执行状态 */
    run: T;
    /** 队列添加了新任务 */
    queueAdd: T;
    /** 没有正在执行的任务 */
    activeWorkerClear: T;
    /** 每有一个任务完成就触发一次 */
    oneWorkerDone: T;
};
