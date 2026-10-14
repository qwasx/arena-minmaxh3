// 简易事件总线
type Fn = (...args: any[]) => void;
class Bus {
  private m = new Map<string, Set<Fn>>();
  on(ev: string, fn: Fn) { if (!this.m.has(ev)) this.m.set(ev, new Set()); this.m.get(ev)!.add(fn); return () => this.off(ev, fn); }
  off(ev: string, fn: Fn) { this.m.get(ev)?.delete(fn); }
  emit(ev: string, ...args: any[]) { this.m.get(ev)?.forEach((f) => { try { f(...args); } catch (e) { console.error(e); } }); }
}
export const bus = new Bus();
export const toast = (text: string, kind: 'info' | 'good' | 'bad' | 'gold' = 'info') => bus.emit('toast', text, kind);
