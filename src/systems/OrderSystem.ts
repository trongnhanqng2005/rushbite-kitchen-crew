/**
 * Order system managing active orders, patience countdowns,
 * order cards in the HUD, and burger recipe evaluation.
 */

import { Order, OrderSnapshot } from '../entities/Order.ts';
import { Recipe, RECIPES, evaluateBurgerAgainstRecipe } from '../data/recipes.ts';
import { FoodItem } from '../entities/FoodItem.ts';
import { GameConfig } from '../game/GameConfig.ts';
import { EventBus } from '../core/EventBus.ts';

export interface OrderValidationResult {
  success: boolean;
  order: Order;
  recipe: Recipe;
  accuracy: number;
  feedback: string;
}

export class OrderSystem {
  private activeOrders: Order[] = [];
  private eventBus = EventBus.getInstance();
  public patienceMultiplier: number = 1.0;

  // Unlocked recipes for current shift
  public availableRecipes: Recipe[] = [...RECIPES.filter((r) => r.unlockShift === 1)];

  public setShiftRecipes(shiftNumber: number): void {
    this.availableRecipes = RECIPES.filter((r) => r.unlockShift <= shiftNumber);
  }

  public get orderCount(): number {
    return this.activeOrders.length;
  }

  public canAcceptNewOrder(): boolean {
    return this.activeOrders.length < GameConfig.customer.maxActiveOrders;
  }

  public createOrder(customerId: string, recipe: Recipe, currentTime: number): Order {
    const maxPatience = GameConfig.customer.basePatienceSeconds * this.patienceMultiplier;
    const order = new Order(customerId, recipe, maxPatience, currentTime);
    this.activeOrders.push(order);

    this.eventBus.emit('ORDER_CREATED', order.toSnapshot());
    return order;
  }

  public update(dt: number): void {
    const decay = GameConfig.customer.patienceDecayRate * dt;

    for (let i = this.activeOrders.length - 1; i >= 0; i--) {
      const order = this.activeOrders[i];
      const expired = order.updatePatience(decay);

      if (expired) {
        this.eventBus.emit('ORDER_EXPIRED', order.toSnapshot());
        this.activeOrders.splice(i, 1);
      }
    }
  }

  public validateAndFulfill(customerId: string, foodItem: FoodItem): OrderValidationResult {
    const orderIndex = this.activeOrders.findIndex((o) => o.customerId === customerId);
    if (orderIndex === -1) {
      return {
        success: false,
        order: null as unknown as Order,
        recipe: null as unknown as Recipe,
        accuracy: 0,
        feedback: 'No matching order for customer!',
      };
    }

    const order = this.activeOrders[orderIndex];
    const layers = foodItem.type === 'assembled_burger' ? foodItem.stackedIngredients : [foodItem.type];
    const evalResult = evaluateBurgerAgainstRecipe(layers, order.recipe);

    if (evalResult.matches) {
      order.status = 'COMPLETED';
      this.activeOrders.splice(orderIndex, 1);
      this.eventBus.emit('ORDER_COMPLETED', {
        order: order.toSnapshot(),
        accuracy: evalResult.accuracy,
        feedback: evalResult.feedback,
      });

      return {
        success: true,
        order,
        recipe: order.recipe,
        accuracy: evalResult.accuracy,
        feedback: evalResult.feedback,
      };
    } else {
      this.eventBus.emit('ORDER_FAILED', {
        order: order.toSnapshot(),
        accuracy: evalResult.accuracy,
        feedback: evalResult.feedback,
      });

      return {
        success: false,
        order,
        recipe: order.recipe,
        accuracy: evalResult.accuracy,
        feedback: evalResult.feedback,
      };
    }
  }

  public cancelOrder(customerId: string): void {
    const idx = this.activeOrders.findIndex((o) => o.customerId === customerId);
    if (idx !== -1) {
      const order = this.activeOrders[idx];
      order.status = 'EXPIRED';
      this.activeOrders.splice(idx, 1);
      this.eventBus.emit('ORDER_CANCELLED', order.toSnapshot());
    }
  }

  public getSnapshots(): OrderSnapshot[] {
    return this.activeOrders.map((o) => o.toSnapshot());
  }

  public clear(): void {
    this.activeOrders = [];
  }
}
