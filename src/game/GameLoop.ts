/**
 * Centralized GameLoop using requestAnimationFrame and clamped deltaTime.
 * Enforces separation of input, simulation, and rendering.
 */

import { GameTime } from '../core/Time.ts';

export class GameLoop {
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private time: GameTime;

  private onUpdate: (dt: number, totalTime: number) => void;
  private onRender: () => void;

  constructor(
    onUpdate: (dt: number, totalTime: number) => void,
    onRender: () => void
  ) {
    this.time = new GameTime();
    this.onUpdate = onUpdate;
    this.onRender = onRender;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.time.reset();
    this.loop();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private loop = (): void => {
    if (!this.isRunning) return;

    const dt = this.time.update();

    // 1. Simulation step (independent of framerate)
    this.onUpdate(dt, this.time.totalTime);

    // 2. Render step
    this.onRender();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  public get frameCount(): number {
    return this.time.frameCount;
  }

  public get totalTime(): number {
    return this.time.totalTime;
  }
}
