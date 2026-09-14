/**
 * Cooking system: centrally updates all cooking items on the grill.
 * Prevents multiple animation frames and respects simulation deltaTime.
 */

import { GrillStation } from '../stations/GrillStation.ts';
import { GameConfig } from '../game/GameConfig.ts';
import { EventBus } from '../core/EventBus.ts';

export class CookingSystem {
  private grillStation: GrillStation;
  private eventBus = EventBus.getInstance();
  public cookSpeedMultiplier: number = 1.0;

  constructor(grillStation: GrillStation) {
    this.grillStation = grillStation;
  }

  public update(dt: number): void {
    const baseRate = GameConfig.cooking.baseCookRate * this.cookSpeedMultiplier;
    const progressDelta = baseRate * dt;

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
  }
}
