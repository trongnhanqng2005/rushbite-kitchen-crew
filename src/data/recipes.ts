/**
 * Data-driven recipes and matching algorithms for RushBite.
 */

import { FoodItemType } from './ingredients.ts';

export interface Recipe {
  id: string;
  name: string;
  description: string;
  ingredients: FoodItemType[]; // Expected layers bottom-to-top
  basePrice: number;
  preparationDifficulty: number; // 1 to 5
  unlockShift: number;
  icon: string;
}

export const RECIPES: Recipe[] = [
  {
    id: 'plain_burger',
    name: 'Plain Burger',
    description: 'Crispy bun and a grilled patty.',
    ingredients: ['bun_bottom', 'cooked_patty', 'bun_top'],
    basePrice: 5.0,
    preparationDifficulty: 1,
    unlockShift: 1,
    icon: '🍔',
  },
  {
    id: 'cheeseburger',
    name: 'Classic Cheeseburger',
    description: 'Bottom bun, grilled beef patty, melted cheese, top bun.',
    ingredients: ['bun_bottom', 'cooked_patty', 'cheese', 'bun_top'],
    basePrice: 7.0,
    preparationDifficulty: 2,
    unlockShift: 1,
    icon: '🧀',
  },
  {
    id: 'classic_burger',
    name: 'RushBite Deluxe',
    description: 'Bun, patty, cheese, lettuce, tomato, top bun.',
    ingredients: ['bun_bottom', 'cooked_patty', 'cheese', 'lettuce', 'tomato', 'bun_top'],
    basePrice: 9.5,
    preparationDifficulty: 3,
    unlockShift: 1,
    icon: '👑',
  },
  {
    id: 'double_cheeseburger',
    name: 'Double Cheddar Monster',
    description: 'Double beef patties and double melted cheese.',
    ingredients: ['bun_bottom', 'cooked_patty', 'cheese', 'cooked_patty', 'cheese', 'bun_top'],
    basePrice: 12.0,
    preparationDifficulty: 4,
    unlockShift: 2,
    icon: '🔥',
  },
  {
    id: 'garden_burger',
    name: 'Garden Crunch',
    description: 'Fresh vegetarian stack with cheddar, double lettuce, and juicy tomato.',
    ingredients: ['bun_bottom', 'cheese', 'lettuce', 'tomato', 'lettuce', 'bun_top'],
    basePrice: 8.0,
    preparationDifficulty: 2,
    unlockShift: 2,
    icon: '🌱',
  },
];

/**
 * Validates whether an array of stacked ingredients matches a recipe.
 * Returns an accuracy score between 0.0 and 1.0.
 */
export function evaluateBurgerAgainstRecipe(
  stacked: FoodItemType[],
  recipe: Recipe
): { matches: boolean; accuracy: number; feedback: string } {
  if (!stacked || stacked.length === 0) {
    return { matches: false, accuracy: 0, feedback: 'Plate is empty!' };
  }

  // Any burnt patty instantly ruins the burger
  if (stacked.includes('burnt_patty')) {
    return { matches: false, accuracy: 0.1, feedback: 'The burger patty is burnt!' };
  }

  // Raw patty is unacceptable
  if (stacked.includes('raw_patty')) {
    return { matches: false, accuracy: 0.1, feedback: 'The meat is raw!' };
  }

  // Exact layer match: 100% accuracy
  if (
    stacked.length === recipe.ingredients.length &&
    stacked.every((item, i) => item === recipe.ingredients[i])
  ) {
    return { matches: true, accuracy: 1.0, feedback: 'Perfect assembly!' };
  }

  // Count ingredient matches (allowing slightly swapped layers but correct items)
  const recipeCounts = new Map<FoodItemType, number>();
  recipe.ingredients.forEach((item) => {
    recipeCounts.set(item, (recipeCounts.get(item) || 0) + 1);
  });

  const stackedCounts = new Map<FoodItemType, number>();
  stacked.forEach((item) => {
    stackedCounts.set(item, (stackedCounts.get(item) || 0) + 1);
  });

  let matchedItems = 0;
  let penalty = 0;

  recipeCounts.forEach((count, item) => {
    const present = stackedCounts.get(item) || 0;
    matchedItems += Math.min(count, present);
    if (present < count) {
      penalty += (count - present) * 0.2;
    }
  });

  // Extra unneeded ingredients
  stackedCounts.forEach((count, item) => {
    const needed = recipeCounts.get(item) || 0;
    if (count > needed) {
      penalty += (count - needed) * 0.15;
    }
  });

  const baseRatio = matchedItems / Math.max(recipe.ingredients.length, stacked.length);
  const accuracy = Math.max(0, Math.min(1.0, baseRatio - penalty * 0.3));

  // If missing buns or major components
  if (!stacked.includes('bun_bottom') || !stacked.includes('bun_top')) {
    return { matches: false, accuracy: accuracy * 0.5, feedback: 'Missing burger buns!' };
  }

  // Has primary ingredients but maybe layers are slightly different
  if (accuracy >= 0.75) {
    return { matches: true, accuracy, feedback: 'Good burger, slight layer mismatch' };
  }

  return { matches: false, accuracy, feedback: 'Wrong ingredients!' };
}
