/**
 * Difficulty and Progression System:
 * Scales recipe pool, customer arrival pacing, and patience thresholds per shift.
 */

import { CustomerSystem } from './CustomerSystem.ts';
import { OrderSystem } from './OrderSystem.ts';
import { CookingSystem } from './CookingSystem.ts';
import { EconomySystem } from './EconomySystem.ts';
import { RestaurantUpgrade } from '../data/upgrades.ts';

export class DifficultySystem {
  private customerSystem: CustomerSystem;
  private orderSystem: OrderSystem;
  private cookingSystem: CookingSystem;
  private economySystem: EconomySystem;

  constructor(
    customerSystem: CustomerSystem,
    orderSystem: OrderSystem,
    cookingSystem: CookingSystem,
    economySystem: EconomySystem
  ) {
    this.customerSystem = customerSystem;
    this.orderSystem = orderSystem;
    this.cookingSystem = cookingSystem;
    this.economySystem = economySystem;
  }

  public applyShiftDifficulty(shiftNumber: number): void {
    // 1. Unlock new recipes for shift
    this.orderSystem.setShiftRecipes(shiftNumber);

    // 2. Adjust customer spawn rates (faster rush for higher shifts)
    const spawnMultiplier = 1.0 + Math.min(0.6, (shiftNumber - 1) * 0.12);
    this.customerSystem.spawnRateMultiplier = spawnMultiplier;

    // 3. Patience scaling
    const patienceMultiplier = Math.max(0.75, 1.0 - (shiftNumber - 1) * 0.05);
    this.customerSystem.customerPatienceMultiplier = patienceMultiplier;
    this.orderSystem.patienceMultiplier = patienceMultiplier;
  }

  public applyPurchasedUpgrades(upgrades: RestaurantUpgrade[]): void {
    upgrades.forEach((upg) => {
      if (!upg.purchased) return;

      switch (upg.effectType) {
        case 'grill_speed':
          this.cookingSystem.cookSpeedMultiplier = upg.effectValue;
          break;
        case 'customer_patience':
          this.customerSystem.customerPatienceMultiplier *= upg.effectValue;
          this.orderSystem.patienceMultiplier *= upg.effectValue;
          break;
        case 'tip_multiplier':
          this.economySystem.tipMultiplier = upg.effectValue;
          break;
        case 'sprint_speed':
          // Handled via PlayerSettings
          break;
      }
    });
  }
}
