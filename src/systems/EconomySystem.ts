/**
 * Economy system handling revenue calculations, speed bonuses,
 * satisfaction tips, penalties, and balance tracking.
 */

import { Recipe } from '../data/recipes.ts';
import { GameConfig } from '../game/GameConfig.ts';
import { EventBus } from '../core/EventBus.ts';

export interface EarningsBreakdown {
  basePrice: number;
  speedBonus: number;
  accuracyBonus: number;
  tipMultiplier: number;
  totalEarned: number;
  feedback: string;
}

export class EconomySystem {
  public cash: number = 0;
  public shiftRevenue: number = 0;
  public shiftTips: number = 0;
  public completedOrders: number = 0;
  public failedOrders: number = 0;

  public tipMultiplier: number = 1.0;
  private eventBus = EventBus.getInstance();

  constructor(initialCash: number = 0) {
    this.cash = initialCash;
  }

  public resetShift(): void {
    this.shiftRevenue = 0;
    this.shiftTips = 0;
    this.completedOrders = 0;
    this.failedOrders = 0;
  }

  /**
   * Pure deterministic reward formula considering speed, accuracy, and customer satisfaction.
   */
  public calculateReward(
    recipeOrItem: { basePrice: number },
    patienceRatio: number, // 0.0 to 1.0
    accuracy: number       // 0.0 to 1.0
  ): EarningsBreakdown {
    const base = recipeOrItem.basePrice;

    // Speed bonus: up to 40% of base price if served quickly (>50% patience remaining)
    let speedBonus = 0;
    if (patienceRatio > 0.4) {
      speedBonus = +(base * GameConfig.economy.speedBonusMaxPercent * ((patienceRatio - 0.4) / 0.6)).toFixed(2);
    }

    // Perfect accuracy bonus
    let accuracyBonus = 0;
    if (accuracy >= 0.99) {
      accuracyBonus = GameConfig.economy.perfectAssemblyBonus;
    }

    const subtotal = base + speedBonus + accuracyBonus;
    const totalEarned = +(subtotal * this.tipMultiplier).toFixed(2);

    let feedback = 'Order served!';
    if (accuracy >= 0.99 && patienceRatio >= 0.7) {
      feedback = 'Lightning fast & gourmet perfect! Huge tip!';
    } else if (patienceRatio < 0.25) {
      feedback = 'Customer was getting impatient.';
    }

    return {
      basePrice: base,
      speedBonus,
      accuracyBonus,
      tipMultiplier: this.tipMultiplier,
      totalEarned,
      feedback,
    };
  }

  public registerCompletedOrder(
    recipeOrItem: { basePrice: number },
    patienceRatio: number,
    accuracy: number
  ): EarningsBreakdown {
    const breakdown = this.calculateReward(recipeOrItem, patienceRatio, accuracy);
    const tip = +(breakdown.totalEarned - breakdown.basePrice).toFixed(2);

    this.shiftRevenue = +(this.shiftRevenue + breakdown.totalEarned).toFixed(2);
    this.shiftTips = +(this.shiftTips + Math.max(0, tip)).toFixed(2);
    this.cash = +(this.cash + breakdown.totalEarned).toFixed(2);
    this.completedOrders++;

    this.eventBus.emit('ECONOMY_ORDER_PAID', {
      breakdown,
      currentCash: this.cash,
      shiftRevenue: this.shiftRevenue,
    });

    return breakdown;
  }

  public registerFailedOrder(): void {
    this.failedOrders++;
    // Small penalty for wasted supplies
    const penalty = GameConfig.economy.burntPenalty;
    this.cash = +(Math.max(0, this.cash - penalty)).toFixed(2);

    this.eventBus.emit('ECONOMY_ORDER_PENALTY', {
      penalty,
      currentCash: this.cash,
    });
  }

  public canAfford(cost: number): boolean {
    return this.cash >= cost;
  }

  public deduct(amount: number): boolean {
    if (this.canAfford(amount)) {
      this.cash = +(this.cash - amount).toFixed(2);
      return true;
    }
    return false;
  }
}
