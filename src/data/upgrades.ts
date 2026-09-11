/**
 * Upgrades and store data for restaurant progression.
 */

export interface RestaurantUpgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  purchased: boolean;
  effectType: 'grill_speed' | 'customer_patience' | 'tip_multiplier' | 'sprint_speed';
  effectValue: number;
}

export const INITIAL_UPGRADES: RestaurantUpgrade[] = [
  {
    id: 'turbo_grill',
    name: 'Turbo Heat Grill',
    description: 'Patties cook 25% faster on the flat-top.',
    cost: 50,
    purchased: false,
    effectType: 'grill_speed',
    effectValue: 1.25,
  },
  {
    id: 'cozy_music',
    name: 'Lounge Music System',
    description: 'Customers are 20% more patient while waiting.',
    cost: 75,
    purchased: false,
    effectType: 'customer_patience',
    effectValue: 1.20,
  },
  {
    id: 'fancy_packaging',
    name: 'Golden Wrap Trays',
    description: 'Boost all customer tip earnings by 25%.',
    cost: 120,
    purchased: false,
    effectType: 'tip_multiplier',
    effectValue: 1.25,
  },
  {
    id: 'running_shoes',
    name: 'Kitchen Sprint Shoes',
    description: 'Move 20% faster around the kitchen.',
    cost: 40,
    purchased: false,
    effectType: 'sprint_speed',
    effectValue: 1.20,
  },
];
