import { type Worker, type TaskCallback, type TaskTodo, type callback, type RateLimiterCallback, type PromiseEvents, type AsyncPoolOptions, type ResumeCallback } from './type';
import { sleep } from './utils';
/**
 * 异步任务池
 *
 * 可并行执行多个任务，并限制并行度
 * 待执行的任务可逐步添加，也可以控制任务添加的速度
 *
 * T: task data type
 */
export declare class AsyncPool<T = any> {
    #private;
    /**
     * 该异步并发池的名称，仅用于区分不同的实例
     * @default ''
     */
    name: string;
    /**
     * 并行度
     *
     * 同一时间最多能有多少个任务处于await状态
     * @default 2
     */
    parallel: number;
    /**
     * 当添加新任务后自动启动队列
     * @default true
     */
    autoRun: boolean;
    /**
     * 全局的任务执行者
     *
     * 如果添加任务数据时没有单独指定worker，则使用该全局woker处理任务数据
     */
    worker: Worker<T> | null;
    /**
     * 如果在worker中需要以触发某些回调事件为完成标志，则需要设置为true
     *
     * 这时worker的第二个参数中会包含一个next方法
     *
     * 需要在worker方法中手动调用next(result)才会结束此任务的执行
     */
    callbackInWorker: boolean;
    /**
     * 每个任务完成后的回调，可以获取任务返回结果
     */
    taskResultCallback: TaskCallback<T> | null;
    /**
     * 只在执行任务出现异常被捕获时触发，传入参数与taskResultCallback相同，触发error的任务根据配置也可能会自动重试
     */
    taskErrorCallback: TaskCallback<T> | null;
    /**
     * 任务执行报错，但接下来不会自动重试，意味着该任务将被丢弃
     */
    taskFailCallback: TaskCallback<T> | null;
    /**
     * 任务最多重试次数，如果任务失败重试次数超过该限制，任务数据会被丢弃不再添加到任务队列中
     * @default Number.MAX_SAFE_INTEGER
     */
    maxRetryCount: number;
    /**
     * 任务队列缓存上限
     *
     * 当达到上限时，可使用`await waitParallelIdel()`或`await add*()`来控制任务添加速度
     *
     * 如果不调用上面两个方法则该限制不会有实际作用
     *
     * @default Number.MAX_SAFE_INTEGER
     */
    queueCacheLimit: number;
    /**
     * 所有任务完成后的回调，每次队列全部完成后都会触发。如果需要防抖，可使用带有延迟防抖的`DelayPool`
     */
    allWorkerDoneCallback: callback | null;
    /**
     * 控制任务执行速率方法
     */
    rateLimiter: RateLimiterCallback<T> | null;
    /**
     * 正在处于运行中的任务数量
     * @returns number
     */
    activeWorkerCounts(): number;
    /**
     * 等待运行的任务队列数量
     * @returns number
     */
    queueCounts(): number;
    needBreak(): boolean;
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
    constructor(options?: AsyncPoolOptions<T>);
    queue(): TaskTodo<T>[];
    /**
     * 添加任务的通用方法
     * @param items 类型是 TaskTodo<T>
     */
    add(...items: TaskTodo<T>[]): void;
    /**
     * 添加单个待处理的数据
     * @param data
     * @returns
     */
    addTodo(data: T): void;
    /**
     * 添加多个待处理的数据
     * @param data
     * @returns
     */
    addTodos(...datas: T[]): void;
    /**
     * 添加待处理的数据和处理该数据的执行方法
     * @param data
     * @param worker 该数据的执行方法
     * @returns
     */
    addWorkerTodo(data: T, worker: Worker): void;
    /**
     * 添加多个待处理的数据
     * @param todo
     * @param worker 该数据的执行方法
     * @returns
     */
    addWorkerTodos(worker: Worker, ...datas: T[]): void;
    /**
     * 添加待执行的函数
     * @param workerTask 待执行的函数
     * @returns
     */
    addWorker(workerTask: callback): void;
    /**
     * 直接完成delay的promise
     *
     * 如果在delayAllWorkerDone的等待期间
     * 能明确知道不会有后续新增任务
     * 可调用此方法直接触发事件
     */
    resolveDelayDone(): void;
    /**
     * 等待所有任务执行完成
     * @returns
     */
    waitAllWorkerDone(): Promise<void>;
    /**
     * 当并行任务已满，并且待运行的任务过多时，需要等待
     * @param base_count 当待执行队列数量达到此值时，就开始等待，默认为`1`
     * @returns
     */
    waitQueueLess(base_count?: number): Promise<void>;
    /**
     * 等待恢复执行
     * @returns
     */
    waitResume(): PromiseLike<void> | null | undefined;
    /**
     * 暂停后续任务执行，可以恢复
     * 运行中的任务不受影响，
     * @param resume 恢复方法，(resolve, pool)
     */
    pause(resumeCallback: ResumeCallback<T>): PromiseLike<T> | null | undefined;
    /**
     * 恢复任务执行
     */
    resume(): void;
    /**
     * 结束任务执行，可再次调用run
     */
    stop(): Promise<void>;
    /** 停止、清空任务 */
    clear(): Promise<boolean>;
    /**
     * 启动并行库运行
     * @returns
     */
    run(): Promise<boolean>;
    /**
     * Promise事件，当事件触发时，promise对象会resolve
     *
     * 例如`await events.allWorkerDone`
     */
    events: PromiseEvents<PromiseLike<T> | null | undefined>;
}
export { sleep };
