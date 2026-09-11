/**
 * Unit test suite for RushBite: Kitchen Crew core gameplay logic.
 * Tests pure game mechanics without requiring WebGL/Three.js render context:
 * - Recipe matching & layer evaluation
 * - Cooking state transitions (RAW -> COOKING -> COOKED -> BURNT)
 * - Order patience decay & status transitions
 * - Economy reward calculation & bonuses
 * - Shift completion & rating aggregation
 */

import { evaluateBurgerAgainstRecipe, RECIPES } from '../src/data/recipes.ts';
import { GameConfig } from '../src/game/GameConfig.ts';
import { Order } from '../src/entities/Order.ts';
import { EconomySystem } from '../src/systems/EconomySystem.ts';
import { ShiftSystem } from '../src/systems/ShiftSystem.ts';
import { FoodItemType } from '../src/data/ingredients.ts';
import { GameTime } from '../src/core/Time.ts';
import { StorageUtil, DEFAULT_SAVE_DATA } from '../src/utils/storage.ts';

// Simple lightweight assertion runner
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[TEST FAILED] ${message}`);
  }
}

function runTests() {
  console.log('--- STARTING RUSHBITE GAMEPLAY UNIT TESTS ---');
  let passed = 0;

  // 1. RECIPE MATCHING TESTS
  console.log('Testing: Recipe Matching...');
  const classicRecipe = RECIPES.find((r) => r.id === 'classic_burger')!;
  assert(classicRecipe !== undefined, 'Classic burger recipe should exist');

  // Test exact assembly
  const perfectStack: FoodItemType[] = ['bun_bottom', 'cooked_patty', 'cheese', 'lettuce', 'tomato', 'bun_top'];
  const perfectResult = evaluateBurgerAgainstRecipe(perfectStack, classicRecipe);
  assert(perfectResult.matches === true, 'Perfect stack should match recipe');
  assert(perfectResult.accuracy === 1.0, 'Perfect stack should have 1.0 accuracy');
  passed++;

  // Test burnt patty rejection
  const burntStack: FoodItemType[] = ['bun_bottom', 'burnt_patty', 'cheese', 'lettuce', 'tomato', 'bun_top'];
  const burntResult = evaluateBurgerAgainstRecipe(burntStack, classicRecipe);
  assert(burntResult.matches === false, 'Burnt patty stack must NOT match recipe');
  assert(burntResult.feedback.includes('burnt'), 'Feedback must mention burnt meat');
  passed++;

  // Test raw meat rejection
  const rawStack: FoodItemType[] = ['bun_bottom', 'raw_patty', 'cheese', 'lettuce', 'tomato', 'bun_top'];
  const rawResult = evaluateBurgerAgainstRecipe(rawStack, classicRecipe);
  assert(rawResult.matches === false, 'Raw patty stack must NOT match recipe');
  assert(rawResult.feedback.includes('raw'), 'Feedback must mention raw meat');
  passed++;

  // Test missing buns
  const noBunsStack: FoodItemType[] = ['cooked_patty', 'cheese', 'lettuce', 'tomato'];
  const noBunsResult = evaluateBurgerAgainstRecipe(noBunsStack, classicRecipe);
  assert(noBunsResult.matches === false, 'Missing bun stack must not match');
  passed++;

  // Test missing ingredient (missing patty from Plain Burger - only buns)
  const plainRecipe = RECIPES.find((r) => r.id === 'plain_burger')!;
  const missingIngredientStack: FoodItemType[] = ['bun_bottom', 'bun_top'];
  const missingIngredientResult = evaluateBurgerAgainstRecipe(missingIngredientStack, plainRecipe);
  assert(missingIngredientResult.matches === false, 'Burger missing required patty must not match');
  assert(missingIngredientResult.accuracy < 0.75, 'Accuracy should be below 0.75 for missing main ingredient');
  passed++;

  // Test wrong ingredient combination (e.g. completely wrong item or extra mismatch)
  const wrongStack: FoodItemType[] = ['bun_bottom', 'cheese', 'bun_top']; // Plain cheese bun served for Deluxe
  const wrongResult = evaluateBurgerAgainstRecipe(wrongStack, classicRecipe);
  assert(wrongResult.matches === false, 'Wrong ingredient combination must reject');
  assert(wrongResult.accuracy < 0.75, 'Accuracy must be below passing threshold (0.75)');
  passed++;

  // 2. COOKING STATE TRANSITION TESTS
  console.log('Testing: Cooking State Transitions...');
  // Simulate cook progress
  let progress = 0.0;
  let state = 'RAW';

  function simulateCook(delta: number) {
    progress += delta;
    if (progress >= GameConfig.cooking.burntThreshold) {
      state = 'BURNT';
    } else if (progress >= GameConfig.cooking.cookedMinProgress) {
      state = 'COOKED';
    } else {
      state = 'COOKING';
    }
  }

  simulateCook(0.3);
  assert(state === 'COOKING', `At 0.3 progress should be COOKING, got: ${state}`);
  simulateCook(0.4); // now 0.7
  assert(state === 'COOKED', `At 0.7 progress should be COOKED, got: ${state}`);
  simulateCook(0.6); // now 1.3
  assert(state === 'BURNT', `At 1.3 progress should be BURNT, got: ${state}`);
  passed++;

  // 3. ORDER PATIENCE & LIFECYCLE TESTS
  console.log('Testing: Order Patience...');
  const order = new Order('cust_test', classicRecipe, 40, 100);
  assert(order.remainingPatience === 40, 'Initial patience should be 40');
  assert(order.patienceRatio === 1.0, 'Initial patience ratio should be 1.0');

  // Decay 20 seconds
  order.updatePatience(20);
  assert(order.remainingPatience === 20, 'Patience should decay to 20');
  assert(order.patienceRatio === 0.5, 'Patience ratio should be 0.5');
  assert(order.status === 'PENDING', 'Order should still be PENDING');

  // Decay past 0
  const expired = order.updatePatience(25);
  assert(expired === true, 'Order should expire when patience reaches 0');
  assert(order.status === 'EXPIRED', 'Order status should be EXPIRED');
  passed++;

  // 4. ECONOMY REWARD CALCULATION TESTS
  console.log('Testing: Economy Reward Calculations...');
  const economy = new EconomySystem(100);
  assert(economy.cash === 100, 'Initial cash should be 100');

  // Fast order with 1.0 accuracy (patience = 0.9)
  const fastReward = economy.calculateReward(classicRecipe, 0.9, 1.0);
  assert(fastReward.basePrice === classicRecipe.basePrice, 'Base price must match recipe');
  assert(fastReward.speedBonus > 0, 'Fast order must yield speed bonus');
  assert(fastReward.accuracyBonus === GameConfig.economy.perfectAssemblyBonus, 'Perfect accuracy bonus should apply');
  assert(fastReward.totalEarned > classicRecipe.basePrice, 'Total earned must exceed base price');

  // Slow order (patience = 0.1)
  const slowReward = economy.calculateReward(classicRecipe, 0.1, 0.8);
  assert(slowReward.speedBonus === 0, 'Slow order should have 0 speed bonus');
  assert(slowReward.accuracyBonus === 0, 'Non-perfect order should have 0 accuracy bonus');
  assert(slowReward.totalEarned === classicRecipe.basePrice, 'Slow order should only get base price');

  // Register payout
  economy.registerCompletedOrder(classicRecipe, 0.9, 1.0);
  assert(economy.cash > 100, 'Cash should increase after completed order');
  assert(economy.completedOrders === 1, 'Completed orders count must be 1');

  // Register failed order
  const cashBeforeFail = economy.cash;
  economy.registerFailedOrder();
  assert(economy.cash === cashBeforeFail - GameConfig.economy.burntPenalty, 'Penalty should be deducted');
  assert(economy.failedOrders === 1, 'Failed orders count must be 1');
  passed++;

  // 5. SHIFT SYSTEM COMPLETION TESTS
  console.log('Testing: Shift Completion...');
  const shift = new ShiftSystem(1);
  shift.startShift();
  assert(shift.phase === 'ACTIVE', 'Shift must be ACTIVE');

  shift.recordCompletedOrder(12.5, 1.0);
  shift.recordCompletedOrder(14.0, 0.95);
  shift.recordCompletedOrder(10.2, 1.0);
  shift.recordCompletedOrder(11.0, 1.0);
  shift.recordCompletedOrder(9.8, 1.0);

  const results = shift.endShift(85.5, 18.0);
  assert(results.ordersCompleted === 5, 'Must report 5 completed orders');
  assert(results.ordersFailed === 0, 'Must report 0 failed orders');
  assert(results.totalRevenue === 85.5, 'Must report correct revenue');
  assert(results.totalTips === 18.0, 'Must report correct tips');
  assert(results.bestOrderTime === 9.8, 'Best order time should be 9.8s');
  assert(results.ratingGrade === 'A' || results.ratingGrade === 'S', 'High performance should receive A or S grade');
  passed++;

  // 6. EDGE CASE: BROWSER TAB BECOMES INACTIVE AND RETURNS (DELTA CLAMP)
  console.log('Testing: Edge Case C - Tab Inactive Delta Clamp...');
  const gameTime = new GameTime();
  gameTime.reset();
  // Simulate 10 seconds passing while tab was hidden in background
  const simulatedDt = gameTime.update(performance.now() + 10000);
  assert(simulatedDt <= 0.1, `Delta time must be clamped to maxDelta (0.1s), got: ${simulatedDt}`);
  passed++;

  // 7. EDGE CASE: SHIFT ENDS WHILE ACTIVE ORDER STILL EXISTS
  console.log('Testing: Edge Case D - Shift Ends With Active Order...');
  const shiftWithOrder = new ShiftSystem(1);
  shiftWithOrder.startShift();
  shiftWithOrder.recordCompletedOrder(15, 1.0);
  // An active order existed but shift timer ended
  const endResults = shiftWithOrder.endShift(10, 2);
  assert(shiftWithOrder.phase === 'ENDED', 'Shift phase must transition to ENDED');
  assert(endResults.ordersCompleted === 1, 'Only completed orders should be counted');
  assert(endResults.shiftNumber === 1, 'Shift number must be preserved');
  passed++;

  // 8. EDGE CASE: START NEXT SHIFT FROM RESULT SCREEN
  console.log('Testing: Edge Case E - Advance to Next Shift...');
  const multiShift = new ShiftSystem(1);
  multiShift.startShift();
  multiShift.endShift(20, 5);
  multiShift.advanceToNextShift();
  assert(multiShift.shiftNumber === 2, 'Shift number must increment to 2');
  assert(multiShift.phase === 'ACTIVE', 'Shift phase must reset to ACTIVE');
  assert(multiShift.ordersCompleted === 0, 'Orders completed must reset to 0');
  assert(multiShift.ordersFailed === 0, 'Orders failed must reset to 0');
  passed++;

  // 9. EDGE CASES F & G: CORRUPTED AND MISSING LOCALSTORAGE
  console.log('Testing: Edge Cases F & G - LocalStorage Resilience...');
  // Mock localStorage in test environment
  const mockStorage: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, val: string) => { mockStorage[key] = val; },
    removeItem: (key: string) => { delete mockStorage[key]; },
  };

  // Case G: Completely missing localStorage
  mockStorage['rushbite_save_v1'] = '';
  delete mockStorage['rushbite_save_v1'];
  const missingData = StorageUtil.load();
  assert(missingData.version === 1, 'Missing storage must return version 1');
  assert(missingData.cash === 0, 'Missing storage must default cash to 0');
  assert(missingData.highestShift === 1, 'Missing storage must default highestShift to 1');
  assert(missingData.settings.graphicsQuality === 'HIGH', 'Missing storage must default graphics');
  passed++;

  // Case F: Invalid / corrupted localStorage (malformed JSON, NaN cash, invalid types)
  mockStorage['rushbite_save_v1'] = '{corrupted: json string [!@#';
  const corruptedData = StorageUtil.load();
  assert(corruptedData.cash === DEFAULT_SAVE_DATA.cash, 'Corrupted JSON must fallback to default cash');
  assert(corruptedData.highestShift === DEFAULT_SAVE_DATA.highestShift, 'Corrupted JSON must fallback to default shift');

  mockStorage['rushbite_save_v1'] = JSON.stringify({
    cash: 'NaN',
    highestShift: -5,
    settings: { graphicsQuality: 'INVALID_QUALITY' }
  });
  const badTypesData = StorageUtil.load();
  assert(badTypesData.cash === 0, 'Non-number cash must sanitize to 0');
  assert(badTypesData.highestShift === 1, 'Negative shift must sanitize to 1');
  assert(badTypesData.settings.graphicsQuality === 'HIGH', 'Invalid graphics preset must sanitize to HIGH');
  passed++;

  console.log(`\n🎉 ALL ${passed} UNIT TEST SUITES PASSED CLEANLY!`);
}

runTests();
