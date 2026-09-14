/**
 * Order entity for tracking active customer requests and patience timers.
 */

import { Recipe, RECIPES } from '../data/recipes.ts';
import { FoodItemType } from '../data/ingredients.ts';
import { ComboDefinition, OrderComponent } from '../data/menu.ts';

export type OrderStatus = 'PENDING' | 'PREPARING' | 'COMPLETED' | 'EXPIRED' | 'WRONG';

export interface ComponentTicketSummary {
  name: string;
  icon: string;
  type: string;
  recipeId?: string;
  drinkType?: string;
}

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
  comboId?: string;
  comboName?: string;
  components?: ComponentTicketSummary[];
}

export class Order {
  public readonly orderId: string;
  public readonly customerId: string;
  public readonly recipe: Recipe;
  public readonly combo: ComboDefinition;
  public readonly createdTime: number;
  public readonly maxPatience: number;
  public remainingPatience: number;
  public status: OrderStatus = 'PENDING';

  constructor(
    customerId: string,
    recipeOrCombo: Recipe | ComboDefinition,
    maxPatience: number,
    currentTime: number
  ) {
    this.orderId = 'ord_' + Math.random().toString(36).substring(2, 8);
    this.customerId = customerId;

    if ('components' in recipeOrCombo) {
      // It is a ComboDefinition
      this.combo = recipeOrCombo;
      const burgerComp = recipeOrCombo.components.find((c) => c.type === 'burger');
      this.recipe = burgerComp?.recipe || {
        id: recipeOrCombo.id,
        name: recipeOrCombo.name,
        description: recipeOrCombo.description,
        ingredients: [],
        basePrice: recipeOrCombo.basePrice,
        preparationDifficulty: 2,
        unlockShift: recipeOrCombo.unlockShift,
        icon: recipeOrCombo.icon,
      };
    } else {
      // It is a single Recipe
      this.recipe = recipeOrCombo;
      this.combo = {
        id: 'combo_' + recipeOrCombo.id,
        name: recipeOrCombo.name,
        description: recipeOrCombo.description,
        components: [
          {
            type: 'burger',
            recipe: recipeOrCombo,
            name: recipeOrCombo.name,
            icon: recipeOrCombo.icon,
            basePrice: recipeOrCombo.basePrice,
          },
        ],
        basePrice: recipeOrCombo.basePrice,
        unlockShift: recipeOrCombo.unlockShift,
        icon: recipeOrCombo.icon,
      };
    }

    this.maxPatience = maxPatience;
    this.remainingPatience = maxPatience;
    this.createdTime = currentTime;
  }

  public get components(): OrderComponent[] {
    return this.combo.components;
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
    const componentsSummary: ComponentTicketSummary[] = this.combo.components.map((c) => ({
      name: c.name,
      icon: c.icon,
      type: c.type,
      recipeId: c.recipe?.id,
      drinkType: c.drinkType,
    }));

    return {
      orderId: this.orderId,
      customerId: this.customerId,
      recipeId: this.recipe.id,
      recipeName: this.combo.name || this.recipe.name,
      recipeIcon: this.combo.icon || this.recipe.icon,
      requiredIngredients: this.recipe.ingredients,
      basePrice: this.combo.basePrice || this.recipe.basePrice,
      remainingPatience: this.remainingPatience,
      maxPatience: this.maxPatience,
      patiencePercent: Math.round(this.patienceRatio * 100),
      status: this.status,
      comboId: this.combo.id,
      comboName: this.combo.name,
      components: componentsSummary,
    };
  }
}
