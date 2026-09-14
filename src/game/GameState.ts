/**
 * Global game state container.
 * Separate from React rendering cycle; provides lightweight snapshots for UI consumption.
 */

import { OrderSnapshot } from '../entities/Order.ts';
import { FoodItemType, FoodItemState } from '../data/ingredients.ts';
import { ShiftResultsData } from '../systems/ShiftSystem.ts';

export type GamePhase = 'MAIN_MENU' | 'PLAYING' | 'PAUSED' | 'SHIFT_RESULTS' | 'SETTINGS' | 'UPGRADES';

export interface HeldItemSummary {
  type: FoodItemType;
  state: FoodItemState;
  cookProgress: number;
  layers?: FoodItemType[];
}

export interface DebugMetrics {
  fps: number;
  frameTimeMs: number;
  activeCustomers: number;
  activeOrders: number;
  sceneObjects: number;
  drawCalls: number;
  triangles: number;
  memoryGeometries?: number;
  memoryTextures?: number;
}

export class GameState {
  public phase: GamePhase = 'MAIN_MENU';
  public cash: number = 0;
  public shiftRevenue: number = 0;
  public shiftTips: number = 0;
  public currentShift: number = 1;
  public remainingShiftSeconds: number = 240;
  public totalShiftSeconds: number = 240;

  public heldItem: HeldItemSummary | null = null;
  public currentPrompt: string = '';
  public secondaryPrompt?: string;
  public activeOrders: OrderSnapshot[] = [];
  public isRushActive: boolean = false;
  public rushState: 'NORMAL' | 'RUSH_WARNING' | 'RUSH_ACTIVE' | 'RECOVERY' = 'NORMAL';

  public lastShiftResults: ShiftResultsData | null = null;
  public debugMetrics: DebugMetrics = {
    fps: 60,
    frameTimeMs: 16.6,
    activeCustomers: 0,
    activeOrders: 0,
    sceneObjects: 0,
    drawCalls: 0,
    triangles: 0,
  };
}
