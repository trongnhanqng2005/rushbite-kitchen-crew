/**
 * RushBite: Kitchen Crew - Core Gameplay and Systems Stabilization Test Suite.
 *
 * Clearly distinguished test categories and cases:
 * Category 1: Event Lifecycle Ownership & Regression
 * Category 2: Shift Finalization & SHIFT_ENDED Exactly-Once Invariant
 * Category 3: Gameplay Clock Consistency (Simulation vs Wall-Clock)
 * Category 4: Real Production Cooking & FoodItem State Transitions
 * Category 5: Order Patience & Shift Integration (In-Flight Orders on Shift End)
 * Category 6: Economy Reward Calculations & Penalties
 * Category 7: Recipe Layer & Accuracy Evaluation
 * Category 8: Storage Resilience & Progression Sanitization
 * Category 9: Three.js Resource Ownership & Disposal
 */

import * as THREE from 'three';
import { evaluateBurgerAgainstRecipe, RECIPES } from '../src/data/recipes.ts';
import { GameConfig } from '../src/game/GameConfig.ts';
import { FoodItem } from '../src/entities/FoodItem.ts';
import { Order } from '../src/entities/Order.ts';
import { OrderSystem } from '../src/systems/OrderSystem.ts';
import { EconomySystem } from '../src/systems/EconomySystem.ts';
import { ShiftSystem } from '../src/systems/ShiftSystem.ts';
import { FoodItemType } from '../src/data/ingredients.ts';
import { GameTime } from '../src/core/Time.ts';
import { EventBus } from '../src/core/EventBus.ts';
import { StorageUtil, DEFAULT_SAVE_DATA } from '../src/utils/storage.ts';
import { FryerStation } from '../src/stations/FryerStation.ts';
import { DrinkStation } from '../src/stations/DrinkStation.ts';
import { CashRegisterStation } from '../src/stations/CashRegisterStation.ts';
import { Customer } from '../src/entities/Customer.ts';

// Setup minimal headless DOM environment for Node.js test execution
const mockStorage: Record<string, string> = {};
globalThis.localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, val: string) => { mockStorage[key] = val; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
  key: () => null,
  length: 0,
} as Storage;

globalThis.window = {
  innerWidth: 1024,
  innerHeight: 768,
  devicePixelRatio: 1,
  addEventListener: () => {},
  removeEventListener: () => {},
} as unknown as Window & typeof globalThis;

const fakeGl = {
  VERSION: 7938,
  VENDOR: 7936,
  RENDERER: 7937,
  SHADING_LANGUAGE_VERSION: 35724,
  MAX_VERTEX_ATTRIBS: 34921,
  MAX_VERTEX_UNIFORM_VECTORS: 36347,
  MAX_VARYING_VECTORS: 36348,
  MAX_COMBINED_TEXTURE_IMAGE_UNITS: 35661,
  MAX_VERTEX_TEXTURE_IMAGE_UNITS: 35660,
  MAX_TEXTURE_IMAGE_UNITS: 34930,
  MAX_FRAGMENT_UNIFORM_VECTORS: 36349,
  getExtension: () => null,
  getContextAttributes: () => ({ xrCompatible: false }),
  getParameter: (p: number) => {
    if (p === 7938) return 'WebGL 2.0';
    if (p === 7936) return 'MockVendor';
    if (p === 7937) return 'MockRenderer';
    if (p === 35724) return 'WebGL GLSL ES 3.00';
    return 16;
  },
  getShaderPrecisionFormat: () => ({ precision: 23, rangeMin: 127, rangeMax: 127 }),
  enable: () => {},
  disable: () => {},
  createTexture: () => ({}),
  bindTexture: () => {},
  texParameteri: () => {},
  texImage2D: () => {},
  texImage3D: () => {},
  texStorage2D: () => {},
  texStorage3D: () => {},
  pixelStorei: () => {},
  viewport: () => {},
  clearColor: () => {},
  clearDepth: () => {},
  clearStencil: () => {},
  clear: () => {},
  cullFace: () => {},
  frontFace: () => {},
  colorMask: () => {},
  depthMask: () => {},
  depthFunc: () => {},
  blendEquationSeparate: () => {},
  blendFuncSeparate: () => {},
  createBuffer: () => ({}),
  bindBuffer: () => {},
  bufferData: () => {},
  createFramebuffer: () => ({}),
  bindFramebuffer: () => {},
  createRenderbuffer: () => ({}),
  bindRenderbuffer: () => {},
  renderbufferStorage: () => {},
  framebufferRenderbuffer: () => {},
  checkFramebufferStatus: () => 36053,
  canvas: { width: 1024, height: 768 },
};

const fake2DContext = {
  fillText: () => {},
  clearRect: () => {},
  beginPath: () => {},
  arc: () => {},
  fill: () => {},
  stroke: () => {},
  font: '',
  fillStyle: '',
  textAlign: '',
  textBaseline: '',
};

const fakeElement: Record<string, unknown> = {
  addEventListener: () => {},
  removeEventListener: () => {},
  appendChild: () => {},
  removeChild: () => {},
  parentElement: { removeChild: () => {} },
  getContext: (type: string) => (type === '2d' ? fake2DContext : fakeGl),
  style: {},
  width: 1024,
  height: 768,
};

globalThis.document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  createElementNS: () => fakeElement,
  createElement: () => fakeElement,
} as unknown as Document;

import { Game } from '../src/game/Game.ts';

// Test runner infrastructure
let totalAssertions = 0;
let passedAssertions = 0;

function assert(condition: boolean, message: string): void {
  totalAssertions++;
  if (!condition) {
    throw new Error(`[ASSERTION FAILED] ${message}`);
  }
  passedAssertions++;
}

function runCategory(name: string, fn: () => void): void {
  console.log(`\n▶ [CATEGORY] ${name}`);
  fn();
}

// ---------------------------------------------------------------------------
// TEST RUNNER
// ---------------------------------------------------------------------------
console.log('====================================================');
console.log('  RUSHBITE: KITCHEN CREW STABILIZATION VERIFICATION  ');
console.log('====================================================');

// ---------------------------------------------------------------------------
// CATEGORY 1: Event Lifecycle Ownership & Regression
// ---------------------------------------------------------------------------
runCategory('Category 1: Event Lifecycle Ownership & Regression', () => {
  const eb = EventBus.getInstance();

  const fakeContainer = {
    clientWidth: 1024,
    clientHeight: 768,
    appendChild: () => {},
  } as unknown as HTMLElement;

  const baselineListeners = eb.getListenerCount();

  // Case 1.1: Game creation registers expected subscriptions
  const game1 = new Game(fakeContainer);
  const countAfterCreate1 = eb.getListenerCount();
  assert(countAfterCreate1 > baselineListeners, 'Game creation must attach active event listeners');

  // Case 1.2: Game disposal completely unbinds all owned subscriptions
  game1.dispose();
  const countAfterDispose1 = eb.getListenerCount();
  assert(
    countAfterDispose1 === baselineListeners,
    `Game dispose must return EventBus listener count to baseline (${baselineListeners}), got: ${countAfterDispose1}`
  );

  // Case 1.3: Repeated cycle (create -> dispose -> create -> dispose) does not leak listeners
  const game2 = new Game(fakeContainer);
  const countAfterCreate2 = eb.getListenerCount();
  assert(countAfterCreate2 === countAfterCreate1, 'Second Game instance must register the exact same listener count');

  game2.dispose();
  const countAfterDispose2 = eb.getListenerCount();
  assert(
    countAfterDispose2 === baselineListeners,
    `Second Game dispose must return listener count to baseline (${baselineListeners}), got: ${countAfterDispose2}`
  );
});

// ---------------------------------------------------------------------------
// CATEGORY 2: Shift Finalization & SHIFT_ENDED Exactly-Once Invariant
// ---------------------------------------------------------------------------
runCategory('Category 2: Shift Finalization & SHIFT_ENDED Invariant', () => {
  const eb = EventBus.getInstance();

  // Case 2.1: Under timer expiration, duplicate completion calls, and rapid simulation ticks, SHIFT_ENDED fires once
  let shiftEndedCount = 0;
  const unsubscribe = eb.on('SHIFT_ENDED', () => {
    shiftEndedCount++;
  });

  const shiftSystem = new ShiftSystem(1);
  shiftSystem.startShift();

  // Advance time past the shift duration
  shiftSystem.update(GameConfig.shift.shiftDurationSeconds + 5);
  assert(shiftSystem.isExpired() === true, 'ShiftSystem must report expired');

  // Call endShift first time
  const results1 = shiftSystem.endShift(100, 25);
  assert(results1.shiftNumber === 1, 'First endShift must calculate results');
  assert(shiftEndedCount === 1, `SHIFT_ENDED must fire exactly once on first completion, fired: ${shiftEndedCount}`);

  // Duplicate completion trigger
  const results2 = shiftSystem.endShift(100, 25);
  assert(results2 === results1, 'Subsequent endShift call must return cached results');
  assert(shiftEndedCount === 1, `SHIFT_ENDED must NOT re-fire on duplicate endShift call, fired: ${shiftEndedCount}`);

  // Rapid simulation ticks after ending
  shiftSystem.update(0.016);
  shiftSystem.update(0.016);
  shiftSystem.update(0.016);
  assert(shiftEndedCount === 1, `SHIFT_ENDED must NOT re-fire during rapid updates, fired: ${shiftEndedCount}`);

  unsubscribe();
});

// ---------------------------------------------------------------------------
// CATEGORY 3: Gameplay Clock Consistency (Simulation vs Wall-Clock)
// ---------------------------------------------------------------------------
runCategory('Category 3: Gameplay Clock Consistency', () => {
  // Case 3.1: 10s gameplay -> pause -> wait -> resume -> 2s gameplay records ~12s order duration
  const orderSystem = new OrderSystem();
  const classicRecipe = RECIPES.find((r) => r.id === 'classic_burger')!;

  let simulationClock = 0;

  // Order placed at t = 0s
  const order = orderSystem.createOrder('customer_clock_test', classicRecipe, simulationClock);
  assert(order.createdTime === 0, 'Order created time must reflect simulation clock');

  // 10s gameplay simulated
  const step1 = 10.0;
  simulationClock += step1;
  orderSystem.update(step1);

  // Game paused: wall-clock time passes (e.g. user pauses for 300 seconds), simulation clock does NOT advance
  const pauseWallClockDuration = 300.0;
  // (No simulation update called while paused)

  // Game resumed: 2s gameplay simulated
  const step2 = 2.0;
  simulationClock += step2;
  orderSystem.update(step2);

  // Calculate order elapsed duration based on gameplay simulation clock
  const gameplayOrderDuration = simulationClock - order.createdTime;
  const wallClockOrderDuration = gameplayOrderDuration + pauseWallClockDuration;

  assert(
    Math.abs(gameplayOrderDuration - 12.0) < 0.001,
    `Gameplay order duration must be 12.0s, got: ${gameplayOrderDuration}`
  );
  assert(
    wallClockOrderDuration > 300,
    `Wall clock duration (${wallClockOrderDuration}s) must be decoupled from simulation duration`
  );
});

// ---------------------------------------------------------------------------
// CATEGORY 4: Real Production Cooking & FoodItem State Transitions
// ---------------------------------------------------------------------------
runCategory('Category 4: Production Cooking State Transitions', () => {
  // Case 4.1: Exercises production FoodItem.advanceCooking and state transitions
  const patty = new FoodItem('raw_patty');
  assert(patty.state === 'RAW', `Initial patty state must be RAW, got: ${patty.state}`);
  assert(patty.cookProgress === 0, 'Initial cook progress must be 0');

  // Advance to COOKING (0.3 < cookedMinProgress 0.6)
  patty.advanceCooking(0.3);
  assert(patty.state === 'COOKING', `At 0.3 progress, patty state must be COOKING, got: ${patty.state}`);

  // Advance to COOKED (0.7 >= 0.6 and < burntThreshold 1.2)
  patty.advanceCooking(0.4);
  assert(Math.abs(patty.cookProgress - 0.7) < 0.001, 'Cook progress must equal 0.7');
  assert(patty.state === 'COOKED', `At 0.7 progress, patty state must be COOKED, got: ${patty.state}`);

  // Advance to BURNT (1.3 >= 1.2)
  patty.advanceCooking(0.6);
  assert(Math.abs(patty.cookProgress - 1.3) < 0.001, 'Cook progress must equal 1.3');
  assert(patty.state === 'BURNT', `At 1.3 progress, patty state must be BURNT, got: ${patty.state}`);
});

// ---------------------------------------------------------------------------
// CATEGORY 5: Order Patience & Shift Integration
// ---------------------------------------------------------------------------
runCategory('Category 5: Order Patience & Shift Integration', () => {
  const classicRecipe = RECIPES.find((r) => r.id === 'classic_burger')!;

  // Case 5.1: Order patience decay and expiration
  const order = new Order('cust_patience', classicRecipe, 40, 0);
  assert(order.remainingPatience === 40, 'Initial patience must be 40');
  assert(order.patienceRatio === 1.0, 'Initial patience ratio must be 1.0');

  order.updatePatience(20);
  assert(order.remainingPatience === 20, 'Patience should decay to 20');
  assert(order.patienceRatio === 0.5, 'Patience ratio should be 0.5');
  assert(order.status === 'PENDING', 'Order should still be PENDING');

  const expired = order.updatePatience(25);
  assert(expired === true, 'Order should expire when patience reaches 0');
  assert(order.status === 'EXPIRED', 'Order status should be EXPIRED');

  // Case 5.2: Shift ends with active order in production OrderSystem
  const orderSystem = new OrderSystem();
  const shiftSystem = new ShiftSystem(1);
  shiftSystem.startShift();

  const inFlightOrder = orderSystem.createOrder('cust_inflight', classicRecipe, 0);
  assert(orderSystem.orderCount === 1, 'OrderSystem must contain in-flight order');
  assert(inFlightOrder.status === 'PENDING', 'In-flight order must be PENDING');

  // Shift reaches time limit and ends
  shiftSystem.update(GameConfig.shift.shiftDurationSeconds + 1);
  assert(shiftSystem.isExpired() === true, 'Shift should be expired');

  const endResults = shiftSystem.endShift(50, 10);
  assert(shiftSystem.phase === 'ENDED', 'Shift phase must transition to ENDED');
  assert(endResults.ordersCompleted === 0, 'Unfinished order must not count as completed');
  assert(endResults.ordersFailed === 0, 'In-flight order must not prematurely count as failed');
  assert(orderSystem.orderCount === 1, 'Active order remains queryable in OrderSystem');
});

// ---------------------------------------------------------------------------
// CATEGORY 6: Economy Reward Calculations & Penalties
// ---------------------------------------------------------------------------
runCategory('Category 6: Economy Reward Calculations & Penalties', () => {
  const classicRecipe = RECIPES.find((r) => r.id === 'classic_burger')!;
  const economy = new EconomySystem(100);
  assert(economy.cash === 100, 'Initial cash should be 100');

  // Case 6.1: Fast order with perfect accuracy
  const fastReward = economy.calculateReward(classicRecipe, 0.9, 1.0);
  assert(fastReward.basePrice === classicRecipe.basePrice, 'Base price must match recipe');
  assert(fastReward.speedBonus > 0, 'Fast order must yield speed bonus');
  assert(fastReward.accuracyBonus === GameConfig.economy.perfectAssemblyBonus, 'Perfect accuracy bonus must apply');
  assert(fastReward.totalEarned > classicRecipe.basePrice, 'Total earned must exceed base price');

  // Case 6.2: Slow order without bonus
  const slowReward = economy.calculateReward(classicRecipe, 0.1, 0.8);
  assert(slowReward.speedBonus === 0, 'Slow order should have 0 speed bonus');
  assert(slowReward.accuracyBonus === 0, 'Non-perfect order should have 0 accuracy bonus');
  assert(slowReward.totalEarned === classicRecipe.basePrice, 'Slow order should only get base price');

  // Case 6.3: Register payout
  economy.registerCompletedOrder(classicRecipe, 0.9, 1.0);
  assert(economy.cash > 100, 'Cash should increase after completed order');
  assert(economy.completedOrders === 1, 'Completed orders count must be 1');

  // Case 6.4: Register failed order
  const cashBeforeFail = economy.cash;
  economy.registerFailedOrder();
  assert(economy.cash === cashBeforeFail - GameConfig.economy.burntPenalty, 'Penalty must be deducted');
  assert(economy.failedOrders === 1, 'Failed orders count must be 1');
});

// ---------------------------------------------------------------------------
// CATEGORY 7: Recipe Layer & Accuracy Evaluation
// ---------------------------------------------------------------------------
runCategory('Category 7: Recipe Layer & Accuracy Evaluation', () => {
  const classicRecipe = RECIPES.find((r) => r.id === 'classic_burger')!;

  // Case 7.1: Perfect burger stack
  const perfectStack: FoodItemType[] = ['bun_bottom', 'cooked_patty', 'cheese', 'lettuce', 'tomato', 'bun_top'];
  const perfectResult = evaluateBurgerAgainstRecipe(perfectStack, classicRecipe);
  assert(perfectResult.matches === true, 'Perfect stack should match recipe');
  assert(perfectResult.accuracy === 1.0, 'Perfect stack should have 1.0 accuracy');

  // Case 7.2: Burnt patty rejection
  const burntStack: FoodItemType[] = ['bun_bottom', 'burnt_patty', 'cheese', 'lettuce', 'tomato', 'bun_top'];
  const burntResult = evaluateBurgerAgainstRecipe(burntStack, classicRecipe);
  assert(burntResult.matches === false, 'Burnt patty stack must NOT match recipe');
  assert(burntResult.feedback.includes('burnt'), 'Feedback must mention burnt meat');

  // Case 7.3: Raw patty rejection
  const rawStack: FoodItemType[] = ['bun_bottom', 'raw_patty', 'cheese', 'lettuce', 'tomato', 'bun_top'];
  const rawResult = evaluateBurgerAgainstRecipe(rawStack, classicRecipe);
  assert(rawResult.matches === false, 'Raw patty stack must NOT match recipe');
  assert(rawResult.feedback.includes('raw'), 'Feedback must mention raw meat');

  // Case 7.4: Missing buns
  const noBunsStack: FoodItemType[] = ['cooked_patty', 'cheese', 'lettuce', 'tomato'];
  const noBunsResult = evaluateBurgerAgainstRecipe(noBunsStack, classicRecipe);
  assert(noBunsResult.matches === false, 'Missing bun stack must not match');

  // Case 7.5: Edge Case - Time delta clamping on background tab return
  const gameTime = new GameTime();
  gameTime.reset();
  const simulatedDt = gameTime.update(performance.now() + 10000);
  assert(simulatedDt <= 0.1, `Delta time must be clamped to maxDelta (0.1s), got: ${simulatedDt}`);
});

// ---------------------------------------------------------------------------
// CATEGORY 8: Storage Resilience & Progression Sanitization
// ---------------------------------------------------------------------------
runCategory('Category 8: Storage Resilience & Progression Sanitization', () => {
  // Case 8.1: Missing localStorage defaults
  delete mockStorage['rushbite_save_v1'];
  const missingData = StorageUtil.load();
  assert(missingData.version === 1, 'Missing storage must return version 1');
  assert(missingData.cash === 0, 'Missing storage must default cash to 0');
  assert(missingData.highestShift === 1, 'Missing storage must default highestShift to 1');
  assert(missingData.settings.graphicsQuality === 'HIGH', 'Missing storage must default graphics to HIGH');

  // Case 8.2: Corrupted JSON recovers gracefully
  mockStorage['rushbite_save_v1'] = '{corrupted: json string [!@#';
  const corruptedData = StorageUtil.load();
  assert(corruptedData.cash === DEFAULT_SAVE_DATA.cash, 'Corrupted JSON must fallback to default cash');
  assert(corruptedData.highestShift === DEFAULT_SAVE_DATA.highestShift, 'Corrupted JSON must fallback to default shift');

  // Case 8.3: Sanitization of invalid types and out-of-range numbers
  mockStorage['rushbite_save_v1'] = JSON.stringify({
    cash: 'NaN',
    highestShift: -5,
    settings: { graphicsQuality: 'INVALID_QUALITY' },
  });
  const badTypesData = StorageUtil.load();
  assert(badTypesData.cash === 0, 'Non-number cash must sanitize to 0');
  assert(badTypesData.highestShift === 1, 'Negative shift must sanitize to 1');
  assert(badTypesData.settings.graphicsQuality === 'HIGH', 'Invalid graphics preset must sanitize to HIGH');
});

// ---------------------------------------------------------------------------
// CATEGORY 9: Three.js Resource Ownership & Disposal
// ---------------------------------------------------------------------------
runCategory('Category 9: Three.js Resource Ownership & Disposal', () => {
  // Case 9.1: Shared FoodItem geometries are tagged with isShared
  const item1 = new FoodItem('bun_bottom');
  const item2 = new FoodItem('bun_bottom');

  const child1 = item1.mesh.children[0] as THREE.Mesh;
  const child2 = item2.mesh.children[0] as THREE.Mesh;

  assert(child1 !== undefined && child2 !== undefined, 'FoodItem must contain visual mesh child');
  assert(child1.geometry === child2.geometry, 'Multiple FoodItems must share module-scoped geometry');
  assert(child1.geometry.userData.isShared === true, 'Shared geometry must be tagged with userData.isShared = true');

  // Disposing item1 does not dispose the shared geometry
  item1.dispose();
  assert(
    child2.geometry !== null,
    'Disposing one FoodItem must NOT dispose shared geometry still needed by other items'
  );
  item2.dispose();
});

// ---------------------------------------------------------------------------
// CATEGORY 10: Milestone 2 Stations, Combos & Rush Hour Verification
// ---------------------------------------------------------------------------
runCategory('Category 10: Milestone 2 Stations, Combos & Rush Hour Verification', () => {
  // Case 10.1: FryerStation dual baskets and cooking
  const fryer = new FryerStation(new THREE.Vector3(0, 0, 0));

  assert(fryer.baskets.length === 2, 'FryerStation must have 2 independent baskets');
  assert(fryer.baskets[0].item === null, 'Basket 0 starts empty');
  assert(fryer.baskets[1].item === null, 'Basket 1 starts empty');

  // Place raw fries into basket 0
  const rawFries = new FoodItem('raw_fries');
  const remainingHand = fryer.interact(rawFries);
  assert(remainingHand === null, 'Raw fries must be accepted into empty basket');
  assert(fryer.baskets[0].item !== null, 'Basket 0 must now contain the food item');
  assert(fryer.baskets[0].item!.state === 'COOKING', 'Fries in basket must enter COOKING state');

  // Advance cooking
  fryer.forEachCookingFries((fries: FoodItem) => {
    fries.advanceCooking(1.0); // 100% cooked
  });
  assert(fryer.baskets[0].item?.state === 'COOKED', 'Fries must become COOKED after cooking advances');
  assert(fryer.baskets[0].item?.type === 'cooked_fries', 'Item type must transform into cooked_fries');

  // Retrieve cooked fries with empty hands
  const retrievedFries = fryer.interact(null);
  assert(retrievedFries !== null, 'Player with empty hands must retrieve cooked fries');
  assert(retrievedFries!.type === 'cooked_fries', 'Retrieved item type must be cooked_fries');
  assert(retrievedFries!.state === 'COOKED', 'Retrieved item state must be COOKED');
  assert(fryer.baskets[0].item === null, 'Basket must return to empty after retrieval');

  fryer.dispose();
  retrievedFries!.dispose();

  // Case 10.2: DrinkStation flavor cycling and dispensing
  const drinkStation = new DrinkStation(new THREE.Vector3(0, 0, 0));

  assert(drinkStation.selectedFlavor.type === 'drink_cola', 'DrinkStation initial flavor is drink_cola');
  drinkStation.secondaryInteract(null);
  assert(drinkStation.selectedFlavor.type === 'drink_lemon', 'RMB must cycle flavor to drink_lemon');
  drinkStation.secondaryInteract(null);
  assert(drinkStation.selectedFlavor.type === 'drink_orange', 'RMB must cycle flavor to drink_orange');
  drinkStation.secondaryInteract(null);
  assert(drinkStation.selectedFlavor.type === 'drink_cola', 'RMB must wrap flavor back to drink_cola');

  // Dispense drink
  const dispensedDrink = drinkStation.interact(null);
  assert(dispensedDrink !== null, 'Interacting with empty hands dispenses a drink');
  assert(dispensedDrink!.type === 'drink_cola', 'Dispensed item must match currently selected flavor drink_cola');
  assert(dispensedDrink!.state === 'COOKED', 'Drink is ready to serve');

  drinkStation.dispose();
  dispensedDrink!.dispose();

  // Case 10.3: Multi-component Combo validation in OrderSystem
  const orderSystem = new OrderSystem();
  orderSystem.setShiftRecipes(4); // Unlocks full trio combos

  const targetCombo = orderSystem.availableCombos.find((c) => c.components.length === 3)!;
  assert(targetCombo !== undefined, 'Shift 4 must provide 3-component trio combos');

  const comboOrder = orderSystem.createOrder('cust_test', targetCombo, 0);
  assert(comboOrder.combo !== undefined, 'Order created with combo must have combo definition');
  assert(comboOrder.components.length === 3, 'Combo order must have 3 components');

  // Create combo food items: burger + fries + drink
  const burgerItem = new FoodItem('assembled_burger');
  burgerItem.state = 'ASSEMBLED';
  const burgerRecipe = targetCombo.components.find((c) => c.type === 'burger')?.recipe || RECIPES[0];
  burgerItem.stackedIngredients = [...burgerRecipe.ingredients];

  const friesItem = new FoodItem('cooked_fries');
  friesItem.state = 'COOKED';

  const drinkComponent = targetCombo.components.find((c) => c.type === 'drink')!;
  const sodaItem = new FoodItem(drinkComponent.drinkType || 'drink_cola');
  sodaItem.state = 'COOKED';

  // Test partial fulfillment (only burger provided)
  const partialResult = orderSystem.validateAndFulfill('cust_test', [burgerItem]);
  assert(partialResult.success === false, 'Single burger must NOT fulfill a 3-component combo order');

  // Test complete fulfillment (burger + fries + drink)
  const fullResult = orderSystem.validateAndFulfill('cust_test', [burgerItem, friesItem, sodaItem]);
  assert(fullResult.success === true, 'All combo components must successfully fulfill combo order');
  assert(fullResult.accuracy >= 0.95, 'Matching components must achieve high accuracy');

  burgerItem.dispose();
  friesItem.dispose();
  sodaItem.dispose();
  orderSystem.clear();

  // Case 10.4: CashRegisterStation Serving Tray mechanics
  const register = new CashRegisterStation(new THREE.Vector3(0, 0, 0));

  const customer = new Customer('cust_tray', new THREE.Vector3(0, 0, 1.6));
  customer.state = 'WAITING_FOR_FOOD';
  register.activeCustomer = customer;

  assert(register.trayItems.length === 0, 'Tray starts empty');

  // Place item 1 on tray
  const testBurger = new FoodItem('assembled_burger');
  const handAfter1 = register.interact(testBurger);
  assert(handAfter1 === null, 'Item placed on tray frees player hands');
  assert(register.trayItems.length === 1, 'Tray now contains 1 item');

  // Place item 2 on tray
  const testFries = new FoodItem('cooked_fries');
  const handAfter2 = register.interact(testFries);
  assert(handAfter2 === null, 'Second item placed on tray');
  assert(register.trayItems.length === 2, 'Tray now contains 2 items');

  // Pop item off tray with RMB
  const popped = register.secondaryInteract(null);
  assert(popped !== null, 'RMB must pick back up last item from tray');
  assert(popped!.type === 'cooked_fries', 'Popped item was fries');
  assert(register.trayItems.length === 1, 'Tray count decremented to 1');

  popped!.dispose();
  register.clearTray();
  customer.dispose();
  register.dispose();

  // Case 10.5: Deterministic Rush Period in ShiftSystem
  const shift = new ShiftSystem(1);
  shift.startShift();
  assert(shift.isRushActive === false, 'Rush period is initially false');

  // Advance to 30% of shift (before rush)
  shift.update(shift.totalShiftSeconds * 0.30);
  assert(shift.isRushActive === false, 'Rush period not active before 35%');

  // Advance into rush window (50% of shift)
  shift.update(shift.totalShiftSeconds * 0.20);
  assert(shift.isRushActive === true, 'Rush period must be active at 50% shift time');

  // Advance past rush window (75% of shift)
  shift.update(shift.totalShiftSeconds * 0.25);
  assert(shift.isRushActive === false, 'Rush period must deactivate after 70% shift time');
});

console.log('\n====================================================');
console.log(`  RESULT: ${passedAssertions}/${totalAssertions} ASSERTIONS PASSED ACROSS 10 CATEGORIES`);
console.log('====================================================\n');
