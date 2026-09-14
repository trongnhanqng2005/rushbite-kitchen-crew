/**
 * Data-driven menu and combo definitions for RushBite: Kitchen Crew.
 * Supports multi-component orders (Burgers, Fries, Drinks).
 */

import { Recipe, RECIPES, evaluateBurgerAgainstRecipe } from './recipes.ts';
import { FoodItem } from '../entities/FoodItem.ts';

export type OrderComponentType = 'burger' | 'fries' | 'drink';
export type DrinkFlavor = 'drink_cola' | 'drink_lemon' | 'drink_orange';

export interface OrderComponent {
  type: OrderComponentType;
  recipe?: Recipe;
  drinkType?: DrinkFlavor;
  name: string;
  icon: string;
  basePrice: number;
}

export interface ComboDefinition {
  id: string;
  name: string;
  description: string;
  components: OrderComponent[];
  basePrice: number;
  unlockShift: number;
  icon: string;
}

export interface ComboValidationResult {
  matches: boolean;
  accuracy: number;
  feedback: string;
  missingComponent?: OrderComponentType;
  wrongComponent?: string;
}

// Helpers to build standard components
export function makeBurgerComponent(recipeId: string): OrderComponent {
  const recipe = RECIPES.find((r) => r.id === recipeId) || RECIPES[0];
  return {
    type: 'burger',
    recipe,
    name: recipe.name,
    icon: recipe.icon,
    basePrice: recipe.basePrice,
  };
}

export function makeFriesComponent(): OrderComponent {
  return {
    type: 'fries',
    name: 'Crispy Fries',
    icon: '🍟',
    basePrice: 3.0,
  };
}

export function makeDrinkComponent(flavor: DrinkFlavor): OrderComponent {
  const names: Record<DrinkFlavor, { name: string; icon: string }> = {
    drink_cola: { name: 'Fountain Cola', icon: '🥤' },
    drink_lemon: { name: 'Lemon Soda', icon: '🍋' },
    drink_orange: { name: 'Orange Soda', icon: '🍊' },
  };
  return {
    type: 'drink',
    drinkType: flavor,
    name: names[flavor].name,
    icon: names[flavor].icon,
    basePrice: 2.5,
  };
}

// Data-driven menu definitions unlocked progressively across shifts
export const MENU_COMBOS: ComboDefinition[] = [
  // --- SHIFT 1: Single Burgers ---
  {
    id: 'item_plain_burger',
    name: 'Plain Burger',
    description: 'Crispy bun and a grilled beef patty.',
    components: [makeBurgerComponent('plain_burger')],
    basePrice: 5.0,
    unlockShift: 1,
    icon: '🍔',
  },
  {
    id: 'item_cheeseburger',
    name: 'Classic Cheeseburger',
    description: 'Grilled patty with melted cheddar cheese.',
    components: [makeBurgerComponent('cheeseburger')],
    basePrice: 7.0,
    unlockShift: 1,
    icon: '🧀',
  },
  {
    id: 'item_deluxe_burger',
    name: 'RushBite Deluxe',
    description: 'Patty, melted cheese, crisp lettuce, and tomato.',
    components: [makeBurgerComponent('classic_burger')],
    basePrice: 9.5,
    unlockShift: 1,
    icon: '👑',
  },

  // --- SHIFT 2: Fries Introduced (Burger + Fries) ---
  {
    id: 'combo_plain_fries',
    name: 'Plain Burger & Fries',
    description: 'Plain burger served with hot golden fries.',
    components: [makeBurgerComponent('plain_burger'), makeFriesComponent()],
    basePrice: 7.5,
    unlockShift: 2,
    icon: '🍟',
  },
  {
    id: 'combo_cheese_fries',
    name: 'Cheeseburger & Fries',
    description: 'Classic cheeseburger with a side of crispy fries.',
    components: [makeBurgerComponent('cheeseburger'), makeFriesComponent()],
    basePrice: 9.5,
    unlockShift: 2,
    icon: '🧀',
  },
  {
    id: 'combo_double_fries',
    name: 'Double Cheddar & Fries',
    description: 'Double beef patties and fries feast.',
    components: [makeBurgerComponent('double_cheeseburger'), makeFriesComponent()],
    basePrice: 14.0,
    unlockShift: 2,
    icon: '🔥',
  },

  // --- SHIFT 3: Drinks Introduced (Burger + Drink) ---
  {
    id: 'combo_plain_cola',
    name: 'Burger & Fountain Cola',
    description: 'Quick bite with an ice-cold fountain cola.',
    components: [makeBurgerComponent('plain_burger'), makeDrinkComponent('drink_cola')],
    basePrice: 7.0,
    unlockShift: 3,
    icon: '🥤',
  },
  {
    id: 'combo_cheese_lemon',
    name: 'Cheeseburger & Lemon Soda',
    description: 'Cheesy savor with zesty lemon soda.',
    components: [makeBurgerComponent('cheeseburger'), makeDrinkComponent('drink_lemon')],
    basePrice: 9.0,
    unlockShift: 3,
    icon: '🍋',
  },
  {
    id: 'combo_deluxe_orange',
    name: 'Deluxe & Orange Soda',
    description: 'Deluxe burger paired with citrus orange soda.',
    components: [makeBurgerComponent('classic_burger'), makeDrinkComponent('drink_orange')],
    basePrice: 11.5,
    unlockShift: 3,
    icon: '🍊',
  },

  // --- SHIFT 4+: Full Combos (Burger + Fries + Drink) ---
  {
    id: 'combo_rushbite_classic',
    name: 'RushBite Classic Trio',
    description: 'Cheeseburger, crispy golden fries, and fountain cola.',
    components: [
      makeBurgerComponent('cheeseburger'),
      makeFriesComponent(),
      makeDrinkComponent('drink_cola'),
    ],
    basePrice: 12.0,
    unlockShift: 4,
    icon: '⭐',
  },
  {
    id: 'combo_deluxe_feast',
    name: 'Deluxe Feast Combo',
    description: 'RushBite Deluxe burger, hot fries, and crisp orange soda.',
    components: [
      makeBurgerComponent('classic_burger'),
      makeFriesComponent(),
      makeDrinkComponent('drink_orange'),
    ],
    basePrice: 14.5,
    unlockShift: 4,
    icon: '🎉',
  },
  {
    id: 'combo_double_monster',
    name: 'Double Monster Trio',
    description: 'Double beef patties, crispy fries, and fountain cola.',
    components: [
      makeBurgerComponent('double_cheeseburger'),
      makeFriesComponent(),
      makeDrinkComponent('drink_cola'),
    ],
    basePrice: 16.5,
    unlockShift: 4,
    icon: '💥',
  },
];

/**
 * Validates an array of delivered food items against a target combo definition.
 */
export function evaluateOrderComponents(
  deliveredItems: FoodItem[],
  combo: ComboDefinition
): ComboValidationResult {
  if (!deliveredItems || deliveredItems.length === 0) {
    return {
      matches: false,
      accuracy: 0,
      feedback: 'No food presented!',
    };
  }

  // Check for burnt items
  const hasBurnt = deliveredItems.some(
    (item) => item.state === 'BURNT' || item.type === 'burnt_patty' || item.type === 'burnt_fries'
  );
  if (hasBurnt) {
    return {
      matches: false,
      accuracy: 0.1,
      feedback: 'Order rejected: Contains burnt food!',
    };
  }

  // Check for raw fries
  const hasRawFries = deliveredItems.some((item) => item.type === 'raw_fries');
  if (hasRawFries) {
    return {
      matches: false,
      accuracy: 0.1,
      feedback: 'Order rejected: Fries are still raw!',
    };
  }

  const remainingDelivered = [...deliveredItems];
  const accuracies: number[] = [];

  for (const component of combo.components) {
    if (component.type === 'burger') {
      const idx = remainingDelivered.findIndex((item) => item.type === 'assembled_burger');
      if (idx === -1) {
        return {
          matches: false,
          accuracy: 0,
          feedback: `Missing ${component.name}!`,
          missingComponent: 'burger',
        };
      }
      const burgerItem = remainingDelivered.splice(idx, 1)[0];
      const result = evaluateBurgerAgainstRecipe(
        burgerItem.stackedIngredients,
        component.recipe || RECIPES[0]
      );
      if (!result.matches) {
        return {
          matches: false,
          accuracy: result.accuracy,
          feedback: result.feedback,
        };
      }
      accuracies.push(result.accuracy);
    } else if (component.type === 'fries') {
      const idx = remainingDelivered.findIndex((item) => item.type === 'cooked_fries');
      if (idx === -1) {
        return {
          matches: false,
          accuracy: 0,
          feedback: 'Missing Crispy Fries!',
          missingComponent: 'fries',
        };
      }
      remainingDelivered.splice(idx, 1);
      accuracies.push(1.0);
    } else if (component.type === 'drink') {
      const idx = remainingDelivered.findIndex((item) => item.type === component.drinkType);
      if (idx === -1) {
        // Check if a wrong drink was delivered
        const wrongDrinkIdx = remainingDelivered.findIndex((item) => item.type.startsWith('drink_'));
        if (wrongDrinkIdx !== -1) {
          const wrongItem = remainingDelivered[wrongDrinkIdx];
          return {
            matches: false,
            accuracy: 0.2,
            feedback: `Wrong drink! Customer ordered ${component.name}.`,
            wrongComponent: 'drink',
          };
        }
        return {
          matches: false,
          accuracy: 0,
          feedback: `Missing ${component.name}!`,
          missingComponent: 'drink',
        };
      }
      remainingDelivered.splice(idx, 1);
      accuracies.push(1.0);
    }
  }

  // If there are unexpected extra items, small penalty but allow
  if (remainingDelivered.length > 0) {
    const avgAccuracy = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
    return {
      matches: true,
      accuracy: Math.max(0.7, avgAccuracy - remainingDelivered.length * 0.1),
      feedback: 'Order complete with extra items.',
    };
  }

  const finalAccuracy = accuracies.reduce((a, b) => a + b, 0) / (accuracies.length || 1);
  return {
    matches: true,
    accuracy: finalAccuracy,
    feedback: finalAccuracy >= 0.99 ? 'Perfect order delivery!' : 'Good order delivery!',
  };
}
