/**
 * Generic Object Pool for reusable items to avoid garbage collection spikes in 60 FPS loops.
 */

export class ObjectPool<T> {
  private available: T[] = [];
  private inUse: Set<T> = new Set();
  private factory: () => T;
  private resetFn?: (item: T) => void;

  constructor(factory: () => T, initialSize: number = 10, resetFn?: (item: T) => void) {
    this.factory = factory;
    this.resetFn = resetFn;

    for (let i = 0; i < initialSize; i++) {
      this.available.push(this.factory());
    }
  }

  public acquire(): T {
    let item: T;
    if (this.available.length > 0) {
      item = this.available.pop()!;
    } else {
      item = this.factory();
    }
    this.inUse.add(item);
    return item;
  }

  public release(item: T): void {
    if (this.inUse.has(item)) {
      this.inUse.delete(item);
      if (this.resetFn) {
        this.resetFn(item);
      }
      this.available.push(item);
    }
  }

  public releaseAll(): void {
    this.inUse.forEach((item) => {
      if (this.resetFn) {
        this.resetFn(item);
      }
      this.available.push(item);
    });
    this.inUse.clear();
  }

  public get activeCount(): number {
    return this.inUse.size;
  }

  public get poolSize(): number {
    return this.available.length + this.inUse.size;
  }
}
