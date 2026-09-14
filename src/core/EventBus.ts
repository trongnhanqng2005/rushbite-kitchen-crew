/**
 * Strongly typed EventBus for decoupled communication between gameplay systems,
 * player controller, audio, and UI overlays.
 */

export type EventCallback<T = unknown> = (data: T) => void;

export class EventBus {
  private static instance: EventBus;
  private listeners: Map<string, Set<EventCallback<unknown>>> = new Map();

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public on<T = unknown>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback<unknown>);

    // Return unbind function for clean cleanup
    return () => {
      this.off(event, callback);
    };
  }

  public off<T = unknown>(event: string, callback: EventCallback<T>): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(callback as EventCallback<unknown>);
      if (set.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  public emit<T = unknown>(event: string, data?: T): void {
    const set = this.listeners.get(event);
    if (set) {
      // Create a snapshot array to protect against modification during iteration
      const snapshot = Array.from(set);
      for (let i = 0; i < snapshot.length; i++) {
        try {
          snapshot[i](data as unknown);
        } catch (err) {
          console.error(`[EventBus] Error in listener for event "${event}":`, err);
        }
      }
    }
  }

  public getActiveEvents(): string[] {
    return Array.from(this.listeners.keys());
  }

  public getListenerCount(event?: string): number {
    if (event) {
      return this.listeners.get(event)?.size || 0;
    }
    let total = 0;
    for (const set of this.listeners.values()) {
      total += set.size;
    }
    return total;
  }

  public clear(): void {
    this.listeners.clear();
  }
}
