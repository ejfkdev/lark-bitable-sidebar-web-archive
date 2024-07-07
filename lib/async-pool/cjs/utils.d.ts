import { PromiseKit } from './type';
/**
 * 把传入的方法包装成异步执行
 * @param f
 */
export declare const AsyncRun: (f: Function | null | undefined, ...args: any[]) => Promise<any>;
/**
 * Promise.withResolvers polyfill
 * @returns `{ resolve, reject, promise }`
 */
export declare const withResolvers: <T = any>(fn?: any) => {
    resolve: (value?: T | PromiseLike<T> | undefined) => void;
    reject: (reason?: any) => void;
    promise: Promise<void | T>;
};
/**
 * 阻塞和放行
 * @returns [promise, resolve]
 */
export declare const Wait: <T = any>(fn?: any) => [Promise<void | T>, (value?: T | PromiseLike<T> | undefined) => void];
/**
 * 阻塞、放行、拒绝
 * @returns [promise, resolve, reject]
 */
export declare const Wait3: <T = any>(fn?: any) => [Promise<void | T>, (value?: T | PromiseLike<T> | undefined) => void, (reason?: any) => void];
/**
 * 阻塞和放行，超时后直接放行
 * @param timeout 超时毫秒
 * @returns [promise, resolve]
 */
export declare const WaitTimeout: <T = any>(timeout?: number, fn?: any) => [Promise<void | T>, (value?: T | PromiseLike<T> | undefined) => void];
/**
 * 带有延迟防抖的Promise，在防抖时间内重复resolve会重新计时
 *
 * timeout为总超时计时，调用`WaitDelay()`后立即开始计时，到期后会强行resolve
 *
 * @param ms 防抖延迟毫秒
 * @param timeout 最大等待时长，超过后直接resolve，可被`cancel()`刷新计时，timeout必须大于防抖ms才会生效
 * @returns [pend, done, cancel]
 */
export declare const WaitDelay: (ms?: number, timeout?: number) => [Promise<void>, (value?: void | PromiseLike<void> | undefined) => void, (action?: string) => void];
/**
 * 带有延迟防抖的Promise，在防抖时间内重复resolve会重新计时
 *
 * 还有总超时时间，超时后立刻resolve
 *
 * 与`WaitDelay`不同之处在于，返回的pend是一个方法，只有调用`pend()`后才开始总超时计时
 * @param ms 防抖延迟毫秒
 * @returns [promise, pend, done, reset]
 */
export declare const WaitDelayPend: (ms?: number, onfulfilled?: ((value: any) => void | PromiseLike<void>) | null | undefined) => [Promise<void>, () => Promise<void>, (value?: void | PromiseLike<void> | undefined) => void, (action?: string) => void];
/**
 * 返回一个睡眠一段时间的promise
 * @param ms 睡眠毫秒
 * @returns
 */
export declare const sleep: (ms: number) => Promise<any>;
/**
 * 判断传入的数据没有值，为null或者为undefined，返回true
 * @param any
 * @returns
 */
export declare const None: (any: any | null | undefined) => boolean;
/**
 * 判断传入的数据有值，不为null也不为undefined，返回true
 * @param any
 * @returns boolean
 */
export declare const NotNone: (any: any | null | undefined) => boolean;
/**
 * 判断对象是否是可执行的
 * @param obj 方法
 * @returns
 */
export declare const isExecutable: (obj: any) => boolean;
export declare const isAsyncExecutable: (obj: any) => boolean;
export declare const GetPromiseKit: (fn?: any) => PromiseKit;
