/**
 * Cooking system: centrally updates all cooking items on the grill.
 * Prevents multiple animation frames and respects simulation deltaTime.
 */

import { GrillStation } from '../stations/GrillStation.ts';
import { FryerStation } from '../stations/FryerStation.ts';
import { GameConfig } from '../game/GameConfig.ts';
import { EventBus } from '../core/EventBus.ts';

export class CookingSystem {
  private grillStation: GrillStation;
  private fryerStation?: FryerStation;
  private eventBus = EventBus.getInstance();
  public cookSpeedMultiplier: number = 1.0;

  constructor(grillStation: GrillStation, fryerStation?: FryerStation) {
    this.grillStation = grillStation;
    this.fryerStation = fryerStation;
  }

  public setFryerStation(fryerStation: FryerStation): void {
    this.fryerStation = fryerStation;
  }

  public update(dt: number): void {
    const baseRate = GameConfig.cooking.baseCookRate * this.cookSpeedMultiplier;
    const progressDelta = baseRate * dt;

    // Update grill patties
    this.grillStation.forEachCookingPatty((patty) => {
      const prevState = patty.state;
      patty.advanceCooking(progressDelta);

      if (prevState !== patty.state) {
        this.eventBus.emit('PATTY_STATE_CHANGED', {
          item: patty,
          newState: patty.state,
        });
      }
    });

    // Update fryer fries
    if (this.fryerStation) {
      this.fryerStation.forEachCookingFries((fries) => {
        const prevState = fries.state;
        fries.advanceCooking(progressDelta);

        if (prevState !== fries.state) {
          this.eventBus.emit('FRIES_STATE_CHANGED', {
            item: fries,
            newState: fries.state,
          });
        }
      });
    }
  }
}

