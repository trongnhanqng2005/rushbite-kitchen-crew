/**
 * Time management class for frame-rate independent game simulation.
 * Clamps delta time to prevent physics explosions and speedups after tab-switching.
 */

export class GameTime {
  public deltaTime: number = 0;
  public totalTime: number = 0;
  public timeScale: number = 1.0;
  public frameCount: number = 0;

  private lastTime: number = 0;
  private readonly maxDelta: number = 0.1; // 100ms max delta clamp

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.lastTime = performance.now() * 0.001;
    this.deltaTime = 0;
    this.totalTime = 0;
    this.frameCount = 0;
  }

  public update(currentTimeMs?: number): number {
    const now = (currentTimeMs ?? performance.now()) * 0.001;
    let rawDelta = now - this.lastTime;
    this.lastTime = now;

    if (rawDelta < 0) rawDelta = 0;
    // Clamp to prevent spiral of death or huge jumps on tab resume
    this.deltaTime = Math.min(rawDelta, this.maxDelta) * this.timeScale;
    this.totalTime += this.deltaTime;
    this.frameCount++;

    return this.deltaTime;
  }
}
