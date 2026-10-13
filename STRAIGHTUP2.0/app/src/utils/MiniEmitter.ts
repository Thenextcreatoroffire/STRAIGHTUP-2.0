/**
 * Small dependency-free typed event emitter. React Native no longer ships
 * Node's `events` module, and we don't want to pull in a polyfill just for
 * this, so we roll a minimal one used by the bluetooth service and the
 * demo simulator.
 */
export type Listener<T> = (payload: T) => void;

export class MiniEmitter<Events extends object> {
  private listeners: { [K in keyof Events]?: Array<Listener<Events[K]>> } = {};

  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    const arr = this.listeners[event] ?? [];
    arr.push(listener);
    this.listeners[event] = arr;
    return () => this.off(event, listener);
  }

  off<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
    const arr = this.listeners[event];
    if (!arr) return;
    this.listeners[event] = arr.filter(l => l !== listener) as Array<Listener<Events[K]>>;
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const arr = this.listeners[event];
    if (!arr) return;
    // copy in case a listener unsubscribes during iteration
    [...arr].forEach(listener => {
      try {
        listener(payload);
      } catch (e) {
        console.warn('[MiniEmitter] listener threw', e);
      }
    });
  }

  removeAllListeners(): void {
    this.listeners = {};
  }
}
