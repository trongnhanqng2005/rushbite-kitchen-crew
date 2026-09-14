/**
 * Shift System: manages gameplay sessions, shift timer, and post-shift result metrics.
 */

import { GameConfig } from '../game/GameConfig.ts';
import { EventBus } from '../core/EventBus.ts';

export type ShiftPhase = 'PRE_SHIFT' | 'ACTIVE' | 'ENDED';
export type RushState = 'NORMAL' | 'RUSH_WARNING' | 'RUSH_ACTIVE' | 'RECOVERY';

export interface ShiftResultsData {
  shiftNumber: number;
  durationSeconds: number;
  ordersCompleted: number;
  ordersFailed: number;
  totalRevenue: number;
  totalTips: number;
  averageSatisfaction: number;
  bestOrderTime: number;
  ratingGrade: 'S' | 'A' | 'B' | 'C' | 'F';
}

export class ShiftSystem {
  public shiftNumber: number = 1;
  public phase: ShiftPhase = 'PRE_SHIFT';
  public remainingSeconds: number = GameConfig.shift.shiftDurationSeconds;
  public totalShiftSeconds: number = GameConfig.shift.shiftDurationSeconds;

  // Stats for the current shift
  public ordersCompleted: number = 0;
  public ordersFailed: number = 0;
  public satisfactionScores: number[] = [];
  public bestOrderTime: number = 999;
  public elapsedSimulationTime: number = 0;
  public lastResults: ShiftResultsData | null = null;

  // Rush Period Tracking: NORMAL -> RUSH_WARNING -> RUSH_ACTIVE -> RECOVERY
  public rushState: RushState = 'NORMAL';
  public isRushActive: boolean = false;
  private warningFired: boolean = false;
  private rushStartFired: boolean = false;
  private rushEndFired: boolean = false;

  private eventBus = EventBus.getInstance();

  constructor(initialShift: number = 1) {
    this.shiftNumber = initialShift;
  }

  public startShift(): void {
    this.phase = 'ACTIVE';
    this.remainingSeconds = GameConfig.shift.shiftDurationSeconds;
    this.totalShiftSeconds = GameConfig.shift.shiftDurationSeconds;
    this.ordersCompleted = 0;
    this.ordersFailed = 0;
    this.satisfactionScores = [];
    this.bestOrderTime = 999;
    this.elapsedSimulationTime = 0;
    this.lastResults = null;

    this.rushState = 'NORMAL';
    this.isRushActive = false;
    this.warningFired = false;
    this.rushStartFired = false;
    this.rushEndFired = false;

    this.eventBus.emit('SHIFT_STARTED', { shiftNumber: this.shiftNumber });
  }

  public update(dt: number): void {
    if (this.phase !== 'ACTIVE') return;

    this.remainingSeconds -= dt;
    this.elapsedSimulationTime += dt;
    if (this.remainingSeconds <= 0) {
      this.remainingSeconds = 0;
    }

    // Deterministic Rush Lifecycle:
    // NORMAL: 0% to 30%
    // RUSH_WARNING: 30% to 35%
    // RUSH_ACTIVE: 35% to 70%
    // RECOVERY / NORMAL: 70% to 100%
    const warningStart = this.totalShiftSeconds * 0.30;
    const rushStart = this.totalShiftSeconds * 0.35;
    const rushEnd = this.totalShiftSeconds * 0.70;

    if (this.elapsedSimulationTime >= rushEnd) {
      this.rushState = 'RECOVERY';
      this.isRushActive = false;
      if (!this.rushEndFired) {
        this.rushEndFired = true;
        this.eventBus.emit('RUSH_PERIOD_ENDED', {});
      }
    } else if (this.elapsedSimulationTime >= rushStart) {
      this.rushState = 'RUSH_ACTIVE';
      this.isRushActive = true;
      if (!this.rushStartFired) {
        this.rushStartFired = true;
        this.eventBus.emit('RUSH_PERIOD_STARTED', {
          duration: rushEnd - rushStart,
          remaining: rushEnd - this.elapsedSimulationTime,
        });
      }
    } else if (this.elapsedSimulationTime >= warningStart) {
      this.rushState = 'RUSH_WARNING';
      this.isRushActive = false;
      if (!this.warningFired) {
        this.warningFired = true;
        this.eventBus.emit('RUSH_WARNING_STARTED', {
          warningDuration: rushStart - warningStart,
          timeToRush: rushStart - this.elapsedSimulationTime,
        });
      }
    } else {
      this.rushState = 'NORMAL';
      this.isRushActive = false;
    }
  }

  public isExpired(): boolean {
    return this.phase === 'ACTIVE' && this.remainingSeconds <= 0;
  }

  public recordCompletedOrder(orderDurationSeconds: number, satisfaction: number): void {
    this.ordersCompleted++;
    this.satisfactionScores.push(satisfaction);
    if (orderDurationSeconds < this.bestOrderTime) {
      this.bestOrderTime = +orderDurationSeconds.toFixed(1);
    }
  }

  public recordFailedOrder(): void {
    this.ordersFailed++;
    this.satisfactionScores.push(0.1);
  }

  public endShift(revenue: number = 0, tips: number = 0): ShiftResultsData {
    if (this.phase === 'ENDED' && this.lastResults) {
      return this.lastResults;
    }
    this.phase = 'ENDED';

    const avgSat = this.satisfactionScores.length > 0
      ? +(this.satisfactionScores.reduce((a, b) => a + b, 0) / this.satisfactionScores.length).toFixed(2)
      : 1.0;

    let ratingGrade: 'S' | 'A' | 'B' | 'C' | 'F' = 'B';
    if (this.ordersCompleted >= 8 && avgSat >= 0.9 && this.ordersFailed === 0) {
      ratingGrade = 'S';
    } else if (this.ordersCompleted >= 5 && avgSat >= 0.75 && this.ordersFailed <= 1) {
      ratingGrade = 'A';
    } else if (this.ordersCompleted >= 3 && this.ordersFailed <= 2) {
      ratingGrade = 'B';
    } else if (this.ordersCompleted > 0) {
      ratingGrade = 'C';
    } else {
      ratingGrade = 'F';
    }

    const results: ShiftResultsData = {
      shiftNumber: this.shiftNumber,
      durationSeconds: Math.round(this.totalShiftSeconds - this.remainingSeconds),
      ordersCompleted: this.ordersCompleted,
      ordersFailed: this.ordersFailed,
      totalRevenue: revenue,
      totalTips: tips,
      averageSatisfaction: avgSat,
      bestOrderTime: this.bestOrderTime === 999 ? 0 : this.bestOrderTime,
      ratingGrade,
    };

    this.lastResults = results;
    this.eventBus.emit('SHIFT_ENDED', results);
    return results;
  }

  public advanceToNextShift(): void {
    this.shiftNumber++;
    this.startShift();
  }
}
