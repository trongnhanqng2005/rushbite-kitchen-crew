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
    this.interactionSystem.registerInteractable(this.restaurantWorld.assemblyStation);
    this.interactionSystem.registerInteractable(this.restaurantWorld.cashRegisterStation);
    this.interactionSystem.registerInteractable(this.restaurantWorld.trashStation);
    this.restaurantWorld.crateStations.forEach((crate) => {
      this.interactionSystem.registerInteractable(crate);
    });

    this.cookingSystem = new CookingSystem(this.restaurantWorld.grillStation);
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

  private bindEvents(): void {
    // Player interact [E]
    this.eventBus.on('PLAYER_INTERACT_PRESSED', () => {
      if (this.state.phase !== 'PLAYING') return;
      this.triggerInteraction();
    });

    // Mouse click for primary interact / secondary interact
    this.renderer.domElement.addEventListener('mousedown', (e) => {
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
    });

    // Context menu prevent so right click works for gameplay
    this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    // Listen to SERVE_ATTEMPT from cash register
    this.eventBus.on('SERVE_ATTEMPT', ({ customer, foodItem }: { customer: any; foodItem: FoodItem }) => {
      const result = this.orderSystem.validateAndFulfill(customer.id, foodItem);

      if (result.success) {
        const orderTime = (performance.now() * 0.001) - result.order.createdTime;
        const breakdown = this.economySystem.registerCompletedOrder(
          result.recipe,
          result.order.patienceRatio,
          result.accuracy
        );

        this.customerSystem.completeCustomerOrder(customer.id);
        this.shiftSystem.recordCompletedOrder(orderTime, result.accuracy);
        this.soundManager.playOrderServed();

        this.state.cash = this.economySystem.cash;
        this.state.shiftRevenue = this.economySystem.shiftRevenue;
        this.state.shiftTips = this.economySystem.shiftTips;

        // Consumed item from hand
        foodItem.dispose();
        this.player.setHeldItem(null);
      } else {
        this.soundManager.playError();
        this.economySystem.registerFailedOrder();
        this.shiftSystem.recordFailedOrder();
        this.state.cash = this.economySystem.cash;
        // Keep or drop meal
        this.player.setHeldItem(foodItem);
      }
    });

    // Listen to expired orders
    this.eventBus.on('ORDER_EXPIRED', () => {
      this.economySystem.registerFailedOrder();
      this.shiftSystem.recordFailedOrder();
      this.state.cash = this.economySystem.cash;
    });

    // ESC key pauses game
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        if (this.state.phase === 'PLAYING') {
          this.pauseGame();
        } else if (this.state.phase === 'PAUSED') {
          this.resumeGame();
        }
      }
    });
  }

  private triggerInteraction(): void {
    const updatedHeld = this.interactionSystem.triggerInteract(this.player.heldItem);
    this.player.setHeldItem(updatedHeld);
  }

  public startShift(): void {
    this.soundManager.init();
    this.difficultySystem.applyShiftDifficulty(this.state.currentShift);

    this.shiftSystem.startShift();
    this.economySystem.resetShift();
    this.customerSystem.clear();
    this.orderSystem.clear();
    this.restaurantWorld.grillStation.clear();
    this.restaurantWorld.assemblyStation.clear();
    this.player.setHeldItem(null);

    this.state.phase = 'PLAYING';
    this.state.remainingShiftSeconds = this.shiftSystem.remainingSeconds;
    this.state.totalShiftSeconds = this.shiftSystem.totalShiftSeconds;

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
    this.restaurantWorld.assemblyStation.clear();
    this.player.setHeldItem(null);
    this.soundManager.stopGrillSizzle();
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

  private onSimulationUpdate(dt: number, totalTime: number): void {
    if (this.state.phase !== 'PLAYING') return;

    // 1. Player movement & camera
    this.player.update(dt);

    // 2. Cooking station items update
    this.cookingSystem.update(dt);

    // 3. Customer spawning, movement & AI
    this.customerSystem.update(dt, totalTime);

    // 4. Order timers and expirations
    this.orderSystem.update(dt);

    // 5. Shift clock
    this.shiftSystem.update(dt);
    this.state.remainingShiftSeconds = Math.max(0, Math.ceil(this.shiftSystem.remainingSeconds));

    // Check if shift reached time limit
    if (this.shiftSystem.phase === 'ENDED') {
      const results = this.shiftSystem.endShift(this.economySystem.shiftRevenue, this.economySystem.shiftTips);
      this.state.lastShiftResults = results;
      this.state.phase = 'SHIFT_RESULTS';
      this.player.unlockPointer();
      this.soundManager.stopGrillSizzle();
      this.soundManager.playOrderServed();
      this.saveProgression();
      return;
    }

    // 6. Interaction prompt raycast
    const prompt = this.interactionSystem.update(this.camera, this.player.heldItem);
    this.state.currentPrompt = prompt.label;
    this.state.secondaryPrompt = prompt.secondaryLabel;

    // 7. Update active orders snapshots for HUD
    this.state.activeOrders = this.orderSystem.getSnapshots();

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
    this.isDestroyed = true;
    this.gameLoop.stop();
    window.removeEventListener('resize', this.onWindowResize);
    this.player.dispose();
    this.customerSystem.clear();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
