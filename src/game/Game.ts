/**
 * Master Game Controller for RushBite: Kitchen Crew.
 * Coordinates Three.js scene, player, world, stations, simulation systems,
 * audio, and state updates.
 */

import * as THREE from 'three';
import { GameState } from './GameState.ts';
import { GameConfig } from './GameConfig.ts';
import { GameLoop } from './GameLoop.ts';
import { CollisionWorld } from '../world/CollisionWorld.ts';
import { RestaurantWorld } from '../world/RestaurantWorld.ts';
import { PlayerController } from '../player/PlayerController.ts';
import { InteractionSystem } from '../systems/InteractionSystem.ts';
import { CookingSystem } from '../systems/CookingSystem.ts';
import { OrderSystem } from '../systems/OrderSystem.ts';
import { CustomerSystem } from '../systems/CustomerSystem.ts';
import { EconomySystem } from '../systems/EconomySystem.ts';
import { ShiftSystem } from '../systems/ShiftSystem.ts';
import { DifficultySystem } from '../systems/DifficultySystem.ts';
import { EventBus } from '../core/EventBus.ts';
import { SoundManager } from '../audio/SoundManager.ts';
import { StorageUtil, SavedGameData } from '../utils/storage.ts';
import { FoodItem } from '../entities/FoodItem.ts';
import { Customer } from '../entities/Customer.ts';

export class Game {
  public state: GameState = new GameState();

  public renderer!: THREE.WebGLRenderer;
  public scene!: THREE.Scene;
  public camera!: THREE.PerspectiveCamera;

  public collisionWorld!: CollisionWorld;
  public restaurantWorld!: RestaurantWorld;
  public player!: PlayerController;

  public interactionSystem!: InteractionSystem;
  public cookingSystem!: CookingSystem;
  public orderSystem!: OrderSystem;
  public customerSystem!: CustomerSystem;
  public economySystem!: EconomySystem;
  public shiftSystem!: ShiftSystem;
  public difficultySystem!: DifficultySystem;

  private gameLoop!: GameLoop;
  private eventBus = EventBus.getInstance();
  private soundManager = SoundManager.getInstance();

  private container: HTMLElement;
  private isDestroyed = false;

  // Stored unsubscription callbacks for explicit lifecycle cleanup
  private unsubscribers: Array<() => void> = [];

  // Deterministic simulation clock for gameplay statistics
  public simulationTime: number = 0;

  // Throttled HUD update timer
  private orderSnapshotTimer = 0;

  // Debug metric sampling timers
  private lastSampleTime = 0;
  private frameCountSinceSample = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.initSaveAndConfig();
    this.initThree();
    this.initSystems();
    this.bindEvents();

    this.gameLoop = new GameLoop(
      (dt, totalTime) => this.onSimulationUpdate(dt, totalTime),
      () => this.onRender()
    );

    window.addEventListener('resize', this.onWindowResize);
  }

  private initSaveAndConfig(): void {
    const saved = StorageUtil.load();
    this.state.cash = saved.cash;
    this.state.currentShift = saved.highestShift;

    GameConfig.player.mouseSensitivity = saved.settings.sensitivity;
    GameConfig.player.invertY = saved.settings.invertY;
    GameConfig.applyGraphicsPreset(saved.settings.graphicsQuality);
    GameConfig.audio.masterVolume = saved.settings.masterVolume;
    GameConfig.audio.sfxVolume = saved.settings.sfxVolume;
  }

  private initThree(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#1A1C20');
    this.scene.fog = new THREE.FogExp2('#1A1C20', 0.025);

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(72, width / height, 0.1, 100);
    this.scene.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({
      antialias: GameConfig.graphics.quality !== 'LOW',
      powerPreference: 'high-performance',
    });

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, GameConfig.graphics.maxPixelRatio));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    if (GameConfig.graphics.shadows) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    this.container.appendChild(this.renderer.domElement);
  }

  private initSystems(): void {
    this.collisionWorld = new CollisionWorld();
    this.restaurantWorld = new RestaurantWorld(this.scene, this.collisionWorld);
    this.player = new PlayerController(this.camera, this.renderer.domElement, this.collisionWorld);

    this.interactionSystem = new InteractionSystem();
    // Register all interactable stations
    this.interactionSystem.registerInteractable(this.restaurantWorld.grillStation);
    this.interactionSystem.registerInteractable(this.restaurantWorld.fryerStation);
    this.interactionSystem.registerInteractable(this.restaurantWorld.drinkStation);
    this.interactionSystem.registerInteractable(this.restaurantWorld.assemblyStation);
    this.interactionSystem.registerInteractable(this.restaurantWorld.cashRegisterStation);
    this.interactionSystem.registerInteractable(this.restaurantWorld.trashStation);
    this.restaurantWorld.crateStations.forEach((crate) => {
      this.interactionSystem.registerInteractable(crate);
    });

    this.cookingSystem = new CookingSystem(
      this.restaurantWorld.grillStation,
      this.restaurantWorld.fryerStation
    );
    this.orderSystem = new OrderSystem();
    this.customerSystem = new CustomerSystem(this.restaurantWorld, this.orderSystem);
    this.economySystem = new EconomySystem(this.state.cash);
    this.shiftSystem = new ShiftSystem(this.state.currentShift);
    this.difficultySystem = new DifficultySystem(
      this.customerSystem,
      this.orderSystem,
      this.cookingSystem,
      this.economySystem
    );
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (this.state.phase !== 'PLAYING') return;
    if (!this.player.isPointerLocked) {
      this.player.requestPointerLock();
      this.soundManager.init();
      return;
    }

    if (e.button === 0) {
      // Left click = Primary action / interact
      this.triggerInteraction();
    } else if (e.button === 2) {
      // Right click = Secondary action
      const newHeld = this.interactionSystem.triggerSecondaryInteract(this.player.heldItem);
      this.player.setHeldItem(newHeld);
    }
  };

  private onContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'Escape') {
      if (this.state.phase === 'PLAYING') {
        this.pauseGame();
      } else if (this.state.phase === 'PAUSED') {
        this.resumeGame();
      }
    }
  };

  private bindEvents(): void {
    // Player interact [E]
    this.unsubscribers.push(
      this.eventBus.on('PLAYER_INTERACT_PRESSED', () => {
        if (this.state.phase !== 'PLAYING') return;
        this.triggerInteraction();
      })
    );

    // Mouse click for primary interact / secondary interact
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown);

    // Context menu prevent so right click works for gameplay
    this.renderer.domElement.addEventListener('contextmenu', this.onContextMenu);

    // Listen to SERVE_ATTEMPT from cash register
    this.unsubscribers.push(
      this.eventBus.on(
        'SERVE_ATTEMPT',
        ({
          customer,
          foodItem,
          foodItems,
        }: {
          customer: Customer;
          foodItem?: FoodItem;
          foodItems?: FoodItem[];
        }) => {
          const items =
            foodItems && foodItems.length > 0
              ? foodItems
              : foodItem
              ? [foodItem]
              : [];

          const result = this.orderSystem.validateAndFulfill(customer.id, items);

          if (result.success) {
            // Accurate gameplay simulation clock duration (not wall-clock)
            const orderTime = this.simulationTime - result.order.createdTime;
            const targetReward = result.combo || result.recipe;
            this.economySystem.registerCompletedOrder(
              targetReward,
              result.order.patienceRatio,
              result.accuracy
            );

            this.customerSystem.completeCustomerOrder(customer.id);
            this.shiftSystem.recordCompletedOrder(orderTime, result.accuracy);
            this.soundManager.playOrderServed();

            this.state.cash = this.economySystem.cash;
            this.state.shiftRevenue = this.economySystem.shiftRevenue;
            this.state.shiftTips = this.economySystem.shiftTips;
            this.state.activeOrders = this.orderSystem.getSnapshots();

            // Clear tray and consumed items
            this.restaurantWorld.cashRegisterStation.clearTray();
            if (this.player.heldItem && items.includes(this.player.heldItem)) {
              this.player.heldItem.dispose();
              this.player.setHeldItem(null);
            }
          } else {
            this.soundManager.playError();
            // Reject tray: provide feedback, keep order active for player to fix, do NOT increment failedOrders or stack penalties
            this.state.currentPrompt = result.feedback;
            this.state.activeOrders = this.orderSystem.getSnapshots();
          }
        }
      )
    );

    // Listen to expired orders
    this.unsubscribers.push(
      this.eventBus.on('ORDER_EXPIRED', () => {
        this.economySystem.registerFailedOrder();
        this.shiftSystem.recordFailedOrder();
        this.state.cash = this.economySystem.cash;
        this.state.activeOrders = this.orderSystem.getSnapshots();
      })
    );

    // ESC key pauses game
    window.addEventListener('keydown', this.onKeyDown);
  }

  private triggerInteraction(): void {
    const updatedHeld = this.interactionSystem.triggerInteract(this.player.heldItem);
    this.player.setHeldItem(updatedHeld);
  }

  public startShift(): void {
    this.soundManager.init();
    this.difficultySystem.applyShiftDifficulty(this.state.currentShift);

    // Update station availability for current shift without rebuilding RestaurantWorld
    this.restaurantWorld.updateStationAvailability(this.state.currentShift);

    this.shiftSystem.startShift();
    this.economySystem.resetShift();
    this.customerSystem.clear();
    this.orderSystem.clear();
    this.restaurantWorld.grillStation.clear();
    this.restaurantWorld.fryerStation.clear();
    this.restaurantWorld.assemblyStation.clear();
    this.restaurantWorld.cashRegisterStation.clearTray();
    this.player.setHeldItem(null);

    this.simulationTime = 0;
    this.orderSnapshotTimer = 0;
    this.state.phase = 'PLAYING';
    this.state.remainingShiftSeconds = this.shiftSystem.remainingSeconds;
    this.state.totalShiftSeconds = this.shiftSystem.totalShiftSeconds;
    this.state.activeOrders = [];
    this.state.isRushActive = false;
    this.state.rushState = 'NORMAL';

    this.gameLoop.start();
    this.player.requestPointerLock();
  }

  public pauseGame(): void {
    if (this.state.phase === 'PLAYING') {
      this.state.phase = 'PAUSED';
      this.player.unlockPointer();
    }
  }

  public resumeGame(): void {
    if (this.state.phase === 'PAUSED') {
      this.state.phase = 'PLAYING';
      this.player.requestPointerLock();
    }
  }

  public quitToMainMenu(): void {
    this.state.phase = 'MAIN_MENU';
    this.player.unlockPointer();
    this.customerSystem.clear();
    this.orderSystem.clear();
    this.restaurantWorld.grillStation.clear();
    this.restaurantWorld.fryerStation.clear();
    this.restaurantWorld.assemblyStation.clear();
    this.restaurantWorld.cashRegisterStation.clearTray();
    this.player.setHeldItem(null);
    this.soundManager.stopGrillSizzle();
    this.soundManager.stopFryerSizzle();
    this.state.activeOrders = [];
    this.state.isRushActive = false;
  }

  public nextShift(): void {
    this.state.currentShift++;
    this.shiftSystem.shiftNumber = this.state.currentShift;
    this.saveProgression();
    this.startShift();
  }

  public saveProgression(): void {
    const saved: SavedGameData = {
      version: 1,
      cash: this.economySystem.cash,
      highestShift: Math.max(this.state.currentShift, 1),
      reputation: 100,
      purchasedUpgrades: [],
      settings: {
        sensitivity: GameConfig.player.mouseSensitivity,
        masterVolume: GameConfig.audio.masterVolume,
        sfxVolume: GameConfig.audio.sfxVolume,
        graphicsQuality: GameConfig.graphics.quality,
        invertY: GameConfig.player.invertY,
      },
    };
    StorageUtil.save(saved);
  }

  private finalizeShift(): void {
    if (this.state.phase !== 'PLAYING') return;

    // Sole owner of shift finalization
    const results = this.shiftSystem.endShift(this.economySystem.shiftRevenue, this.economySystem.shiftTips);
    this.state.lastShiftResults = results;
    this.state.phase = 'SHIFT_RESULTS';
    this.player.unlockPointer();
    this.soundManager.stopGrillSizzle();
    this.soundManager.stopFryerSizzle();
    this.soundManager.playOrderServed();
    this.saveProgression();
  }

  private onSimulationUpdate(dt: number, totalTime: number): void {
    if (this.state.phase !== 'PLAYING') return;

    // Advance deterministic gameplay clock
    this.simulationTime += dt;

    // 1. Player movement & camera
    this.player.update(dt);

    // 2. Cooking station items update
    this.cookingSystem.update(dt);

    // 3. Customer spawning, movement & AI (receives simulation time)
    this.customerSystem.update(dt, this.simulationTime);

    // 4. Order timers and expirations
    this.orderSystem.update(dt);

    // 5. Shift clock
    this.shiftSystem.update(dt);
    this.state.remainingShiftSeconds = Math.max(0, Math.ceil(this.shiftSystem.remainingSeconds));
    this.state.isRushActive = this.shiftSystem.isRushActive;
    this.state.rushState = this.shiftSystem.rushState;

    // Check if shift reached time limit
    if (this.shiftSystem.isExpired()) {
      this.finalizeShift();
      return;
    }

    // 6. Interaction prompt raycast
    const prompt = this.interactionSystem.update(this.camera, this.player.heldItem);
    this.state.currentPrompt = prompt.label;
    this.state.secondaryPrompt = prompt.secondaryLabel;

    // Update held item for HUD
    if (this.player.heldItem) {
      this.state.heldItem = {
        type: this.player.heldItem.type,
        state: this.player.heldItem.state,
        cookProgress: this.player.heldItem.cookProgress,
        layers: this.player.heldItem.stackedIngredients,
      };
    } else {
      this.state.heldItem = null;
    }

    // 7. Update active orders snapshots for HUD (throttled to ~12 Hz / 80ms)
    this.orderSnapshotTimer += dt;
    if (this.orderSnapshotTimer >= 0.08) {
      this.orderSnapshotTimer = 0;
      this.state.activeOrders = this.orderSystem.getSnapshots();
    }

    // 8. Track FPS and debug metrics sampling every 500ms
    this.frameCountSinceSample++;
    const now = performance.now();
    if (now - this.lastSampleTime >= 500) {
      const elapsed = (now - this.lastSampleTime) * 0.001;
      const fps = Math.round(this.frameCountSinceSample / elapsed);
      const info = this.renderer.info;

      this.state.debugMetrics = {
        fps,
        frameTimeMs: +(1000 / Math.max(1, fps)).toFixed(1),
        activeCustomers: this.customerSystem.customers.length,
        activeOrders: this.orderSystem.orderCount,
        sceneObjects: this.scene.children.length,
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        memoryGeometries: info.memory.geometries,
        memoryTextures: info.memory.textures,
      };

      this.lastSampleTime = now;
      this.frameCountSinceSample = 0;
    }
  }

  private onRender(): void {
    if (this.isDestroyed) return;
    this.renderer.render(this.scene, this.camera);
  }

  private onWindowResize = (): void => {
    if (!this.container || this.isDestroyed) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public applyGraphicsQuality(preset: 'LOW' | 'MEDIUM' | 'HIGH'): void {
    GameConfig.applyGraphicsPreset(preset);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, GameConfig.graphics.maxPixelRatio));
    this.renderer.shadowMap.enabled = GameConfig.graphics.shadows;
    this.saveProgression();
  }

  public dispose(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    this.gameLoop.stop();

    // DOM event listeners cleanup
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('keydown', this.onKeyDown);
    if (this.renderer?.domElement) {
      this.renderer.domElement.removeEventListener('mousedown', this.onMouseDown);
      this.renderer.domElement.removeEventListener('contextmenu', this.onContextMenu);
    }

    // EventBus cleanup: invoke all stored unbind callbacks
    for (let i = 0; i < this.unsubscribers.length; i++) {
      this.unsubscribers[i]();
    }
    this.unsubscribers = [];

    // Symmetrical system disposals
    this.player.dispose();
    this.customerSystem.dispose();
    this.restaurantWorld.dispose();
    this.soundManager.dispose();

    // Three.js renderer cleanup
    this.renderer.dispose();
    if (this.renderer.domElement?.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
