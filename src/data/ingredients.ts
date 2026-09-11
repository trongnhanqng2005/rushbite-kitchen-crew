/**
 * Data definitions for all ingredients and food items in RushBite.
 */

export type FoodItemType =
  | 'bun_bottom'
  | 'raw_patty'
  | 'cooked_patty'
  | 'burnt_patty'
  | 'cheese'
  | 'lettuce'
  | 'tomato'
  | 'bun_top'
  | 'assembled_burger';

export type FoodItemState = 'RAW' | 'COOKING' | 'COOKED' | 'BURNT' | 'ASSEMBLED';

export interface IngredientDef {
  id: FoodItemType;
  name: string;
  isCookable: boolean;
  cooksInto?: FoodItemType;
  burnsInto?: FoodItemType;
  color: string;
  cookedColor?: string;
  burntColor?: string;
  height: number; // For vertical stacking on assembly board
  radius: number;
  iconText: string;
}

export const INGREDIENT_DEFINITIONS: Record<FoodItemType, IngredientDef> = {
  bun_bottom: {
    id: 'bun_bottom',
    name: 'Bottom Bun',
    isCookable: false,
    color: '#D4924B',
    height: 0.08,
    radius: 0.22,
    iconText: '🍞',
  },
  raw_patty: {
    id: 'raw_patty',
    name: 'Raw Beef Patty',
    isCookable: true,
    cooksInto: 'cooked_patty',
    burnsInto: 'burnt_patty',
    color: '#B53B38',
    cookedColor: '#5C2D15',
    burntColor: '#1A1412',
    height: 0.06,
    radius: 0.21,
    iconText: '🥩',
  },
  cooked_patty: {
    id: 'cooked_patty',
    name: 'Cooked Patty',
    isCookable: true, // can stay on grill and burn!
    burnsInto: 'burnt_patty',
    color: '#5C2D15',
    burntColor: '#1A1412',
    height: 0.06,
    radius: 0.21,
    iconText: '🟤',
  },
  burnt_patty: {
    id: 'burnt_patty',
    name: 'Burnt Patty',
    isCookable: false,
    color: '#1A1412',
    height: 0.05,
    radius: 0.20,
    iconText: '⬛',
  },
  cheese: {
    id: 'cheese',
    name: 'Cheddar Cheese',
    isCookable: false,
    color: '#F4B02A',
    height: 0.03,
    radius: 0.22,
    iconText: '🧀',
  },
  lettuce: {
    id: 'lettuce',
    name: 'Crisp Lettuce',
    isCookable: false,
    color: '#4FA83D',
    height: 0.04,
    radius: 0.24,
    iconText: '🥬',
  },
  tomato: {
    id: 'tomato',
    name: 'Fresh Tomato',
    isCookable: false,
    color: '#D62828',
    height: 0.04,
    radius: 0.20,
    iconText: '🍅',
  },
  bun_top: {
    id: 'bun_top',
    name: 'Top Sesame Bun',
    isCookable: false,
    color: '#D4924B',
    height: 0.12,
    radius: 0.22,
    iconText: '🍔',
  },
  assembled_burger: {
    id: 'assembled_burger',
    name: 'Assembled Meal',
    isCookable: false,
    color: '#D4924B',
    height: 0.35,
    radius: 0.24,
    iconText: '🍔',
  },
};
