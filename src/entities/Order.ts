/**
 * Order entity for tracking active customer requests and patience timers.
 */

import { Recipe } from '../data/recipes.ts';
import { FoodItemType } from '../data/ingredients.ts';

export type OrderStatus = 'PENDING' | 'PREPARING' | 'COMPLETED' | 'EXPIRED' | 'WRONG';

export interface OrderSnapshot {
  orderId: string;
  customerId: string;
  recipeId: string;
  recipeName: string;
  recipeIcon: string;
  requiredIngredients: FoodItemType[];
  basePrice: number;
  remainingPatience: number;
  maxPatience: number;
  patiencePercent: number;
  status: OrderStatus;
}

export class Order {
  public readonly orderId: string;
  public readonly customerId: string;
  public readonly recipe: Recipe;
  public readonly createdTime: number;
  public readonly maxPatience: number;
  public remainingPatience: number;
  public status: OrderStatus = 'PENDING';

  constructor(customerId: string, recipe: Recipe, maxPatience: number, currentTime: number) {
    this.orderId = 'ord_' + Math.random().toString(36).substring(2, 8);
    this.customerId = customerId;
    this.recipe = recipe;
    this.maxPatience = maxPatience;
    this.remainingPatience = maxPatience;
    this.createdTime = currentTime;
  }

  public updatePatience(decayAmount: number): boolean {
    if (this.status !== 'PENDING' && this.status !== 'PREPARING') return false;

    this.remainingPatience -= decayAmount;
    if (this.remainingPatience <= 0) {
      this.remainingPatience = 0;
      this.status = 'EXPIRED';
      return true; // Expired
    }
    return false;
  }

  public get patienceRatio(): number {
    return Math.max(0, Math.min(1.0, this.remainingPatience / this.maxPatience));
  }

  public toSnapshot(): OrderSnapshot {
    return {
      orderId: this.orderId,
      customerId: this.customerId,
      recipeId: this.recipe.id,
      recipeName: this.recipe.name,
      recipeIcon: this.recipe.icon,
      requiredIngredients: this.recipe.ingredients,
      basePrice: this.recipe.basePrice,
      remainingPatience: this.remainingPatience,
      maxPatience: this.maxPatience,
      patiencePercent: Math.round(this.patienceRatio * 100),
      status: this.status,
    };
  }
}
