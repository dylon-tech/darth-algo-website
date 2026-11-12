import {AsyncLocalStorage} from 'node:async_hooks';
const requestLifetime=new AsyncLocalStorage<number>();
export const nativeRequiredWindowMs=280000; // 275s HTTP + durable receipt margin
export function withNativeRequestLifetime<T>(startedAtMs:number,work:()=>T):T {
 return requestLifetime.run(startedAtMs+300000,work);
}
export function nativeRequestDeadline(){return requestLifetime.getStore()||0;}
export function nativeHasDispatchWindow(deadlineMs=nativeRequestDeadline()){
 const remaining=deadlineMs-Date.now();return remaining>=nativeRequiredWindowMs&&remaining<=300000;
}
export function assertNativeDispatchWindow(deadlineMs=nativeRequestDeadline()){
 if(!nativeHasDispatchWindow(deadlineMs))throw Error('RENDER_REQUEST_DEADLINE');
}
