/**
 * Save System with schema validation and versioning for RushBite.
 */

export interface SavedGameData {
  version: number;
  cash: number;
  highestShift: number;
  reputation: number;
  purchasedUpgrades: string[];
  settings: {
    sensitivity: number;
    masterVolume: number;
    sfxVolume: number;
    graphicsQuality: 'LOW' | 'MEDIUM' | 'HIGH';
    invertY: boolean;
  };
}

const SAVE_KEY = 'rushbite_save_v1';
const CURRENT_VERSION = 1;

export const DEFAULT_SAVE_DATA: SavedGameData = {
  version: CURRENT_VERSION,
  cash: 0,
  highestShift: 1,
  reputation: 100,
  purchasedUpgrades: [],
  settings: {
    sensitivity: 0.0022,
    masterVolume: 0.8,
    sfxVolume: 0.8,
    graphicsQuality: 'HIGH',
    invertY: false,
  },
};

export class StorageUtil {
  public static load(): SavedGameData {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return { ...DEFAULT_SAVE_DATA };

      const parsed = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) {
        return { ...DEFAULT_SAVE_DATA };
      }

      // Validate core fields
      const data: SavedGameData = {
        version: CURRENT_VERSION,
        cash: typeof parsed.cash === 'number' && !isNaN(parsed.cash) ? Math.max(0, parsed.cash) : 0,
        highestShift: typeof parsed.highestShift === 'number' && parsed.highestShift >= 1 ? parsed.highestShift : 1,
        reputation: typeof parsed.reputation === 'number' ? parsed.reputation : 100,
        purchasedUpgrades: Array.isArray(parsed.purchasedUpgrades) ? parsed.purchasedUpgrades : [],
        settings: {
          sensitivity: typeof parsed.settings?.sensitivity === 'number' ? parsed.settings.sensitivity : 0.0022,
          masterVolume: typeof parsed.settings?.masterVolume === 'number' ? parsed.settings.masterVolume : 0.8,
          sfxVolume: typeof parsed.settings?.sfxVolume === 'number' ? parsed.settings.sfxVolume : 0.8,
          graphicsQuality: ['LOW', 'MEDIUM', 'HIGH'].includes(parsed.settings?.graphicsQuality)
            ? parsed.settings.graphicsQuality
            : 'HIGH',
          invertY: Boolean(parsed.settings?.invertY),
        },
      };

      return data;
    } catch (err) {
      console.warn('[StorageUtil] Failed to parse save data from localStorage, using defaults:', err);
      return { ...DEFAULT_SAVE_DATA };
    }
  }

  public static save(data: SavedGameData): void {
    try {
      data.version = CURRENT_VERSION;
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error('[StorageUtil] Failed to save game data:', err);
    }
  }

  public static reset(): void {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (err) {
      console.error('[StorageUtil] Failed to clear save data:', err);
    }
  }
}
