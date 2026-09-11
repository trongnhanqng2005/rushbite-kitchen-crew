/**
 * Central configuration file for RushBite: Kitchen Crew.
 * Prevents magic numbers across the codebase and centralizes balancing values.
 */

export interface GraphicsSettings {
  quality: 'LOW' | 'MEDIUM' | 'HIGH';
  shadows: boolean;
  maxPixelRatio: number;
  viewDistance: number;
}

export interface AudioSettings {
  masterVolume: number;
  sfxVolume: number;
  muted: boolean;
}

export interface PlayerSettings {
  moveSpeed: number;
  sprintSpeed: number;
  acceleration: number;
  deceleration: number;
  mouseSensitivity: number;
  invertY: boolean;
  eyeHeight: number;
  radius: number;
}

export interface CookingConfig {
  rawMaxProgress: number;     // 0.0 -> 0.60 is RAW
  cookedMinProgress: number;  // 0.60 -> 1.00 is COOKED (sweet spot ~0.85)
  burntThreshold: number;     // > 1.25 is BURNT
  baseCookRate: number;       // Progress per second (e.g. 0.075 -> ~13.3 sec to cooked)
}

export interface CustomerConfig {
  maxActiveCustomers: number;
  maxActiveOrders: number;
  basePatienceSeconds: number;
  patienceDecayRate: number;
  spawnIntervalMin: number;
  spawnIntervalMax: number;
}

export interface ShiftConfig {
  shiftDurationSeconds: number; // e.g. 180s for active testing/fun, configurable up to 300s
  warningTimeSeconds: number;
}

export interface EconomyConfig {
  speedBonusMaxPercent: number;
  perfectAssemblyBonus: number;
  burntPenalty: number;
  latePenalty: number;
}

export class GameConfig {
  public static player: PlayerSettings = {
    moveSpeed: 4.5,
    sprintSpeed: 7.0,
    acceleration: 24.0,
    deceleration: 20.0,
    mouseSensitivity: 0.0022,
    invertY: false,
    eyeHeight: 1.62,
    radius: 0.38,
  };

  public static interaction = {
    maxDistance: 2.8,
    radius: 0.25,
  };

  public static cooking: CookingConfig = {
    rawMaxProgress: 0.60,
    cookedMinProgress: 0.60,
    burntThreshold: 1.25,
    baseCookRate: 0.08,
  };

  public static customer: CustomerConfig = {
    maxActiveCustomers: 6,
    maxActiveOrders: 5,
    basePatienceSeconds: 45,
    patienceDecayRate: 1.0,
    spawnIntervalMin: 12,
    spawnIntervalMax: 22,
  };

  public static shift: ShiftConfig = {
    shiftDurationSeconds: 240, // 4 minutes
    warningTimeSeconds: 30,
  };

  public static economy: EconomyConfig = {
    speedBonusMaxPercent: 0.40,
    perfectAssemblyBonus: 2.50,
    burntPenalty: 4.00,
    latePenalty: 3.00,
  };

  public static graphics: GraphicsSettings = {
    quality: 'HIGH',
    shadows: true,
    maxPixelRatio: 1.5,
    viewDistance: 50,
  };

  public static audio: AudioSettings = {
    masterVolume: 0.8,
    sfxVolume: 0.8,
    muted: false,
  };

  public static applyGraphicsPreset(preset: 'LOW' | 'MEDIUM' | 'HIGH'): void {
    GameConfig.graphics.quality = preset;
    if (preset === 'LOW') {
      GameConfig.graphics.shadows = false;
      GameConfig.graphics.maxPixelRatio = 1.0;
    } else if (preset === 'MEDIUM') {
      GameConfig.graphics.shadows = true;
      GameConfig.graphics.maxPixelRatio = 1.25;
    } else {
      GameConfig.graphics.shadows = true;
      GameConfig.graphics.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    }
  }
}
