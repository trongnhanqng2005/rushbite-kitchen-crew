/**
 * Customer system: manages spawning, queue positions at counter,
 * throttled AI state transitions, and animations.
 */

import * as THREE from 'three';
import { Customer } from '../entities/Customer.ts';
import { RestaurantWorld } from '../world/RestaurantWorld.ts';
import { OrderSystem } from './OrderSystem.ts';
import { GameConfig } from '../game/GameConfig.ts';
import { EventBus } from '../core/EventBus.ts';
import { SoundManager } from '../audio/SoundManager.ts';

export class CustomerSystem {
  public customers: Customer[] = [];
  private world: RestaurantWorld;
  private orderSystem: OrderSystem;
  private eventBus = EventBus.getInstance();
  private soundManager = SoundManager.getInstance();

  private spawnTimer: number = 2.0; // first customer arrives quickly
  private aiTickTimer: number = 0;
  private readonly aiTickRate: number = 0.15; // 6.6 Hz throttled AI logic

  public customerPatienceMultiplier: number = 1.0;
  public spawnRateMultiplier: number = 1.0;
  private currentSimulationTime: number = 0;
  private unsubOrderTaken: (() => void) | null = null;

  constructor(world: RestaurantWorld, orderSystem: OrderSystem) {
    this.world = world;
    this.orderSystem = orderSystem;

    // Listen to order taken event from register
    this.unsubOrderTaken = this.eventBus.on('ORDER_TAKEN', ({ customer }: { customer: Customer }) => {
      if (customer.state === 'WAITING_TO_ORDER' && customer.desiredRecipe) {
        customer.state = 'WAITING_FOR_FOOD';
        customer.updateMoodIcon('⏳');
        customer.order = this.orderSystem.createOrder(customer.id, customer.desiredRecipe, this.currentSimulationTime);
      }
    });
  }

  public update(dt: number, currentTime: number): void {
    this.currentSimulationTime = currentTime;
    // 1. Spawning Logic
    this.updateSpawning(dt);

    // 2. Continuous Visual / Movement Updates (every frame for smooth walking)
    for (let i = 0; i < this.customers.length; i++) {
      this.customers[i].updateMovement(dt);
    }

    // 3. Throttled AI logic (runs at ~7 Hz to save CPU)
    this.aiTickTimer += dt;
    if (this.aiTickTimer >= this.aiTickRate) {
      this.aiTickTimer = 0;
      this.tickAI(currentTime);
    }

    // Update active customer reference on cash register
    this.updateRegisterReference();
  }

  private updateSpawning(dt: number): void {
    if (this.customers.length >= GameConfig.customer.maxActiveCustomers) return;

    this.spawnTimer -= dt * this.spawnRateMultiplier;
    if (this.spawnTimer <= 0) {
      this.spawnCustomer();
      const minInterval = GameConfig.customer.spawnIntervalMin / this.spawnRateMultiplier;
      const maxInterval = GameConfig.customer.spawnIntervalMax / this.spawnRateMultiplier;
      this.spawnTimer = minInterval + Math.random() * (maxInterval - minInterval);
    }
  }

  public spawnCustomer(): Customer | null {
    if (this.customers.length >= GameConfig.customer.maxActiveCustomers) return null;

    const id = 'cust_' + Math.random().toString(36).substring(2, 7);
    const customer = new Customer(id, this.world.entranceSpawnPoint);

    // Select random unlocked recipe
    const recipes = this.orderSystem.availableRecipes;
    customer.desiredRecipe = recipes[Math.floor(Math.random() * recipes.length)];

    this.customers.push(customer);
    this.world.scene.add(customer.mesh);

    // Play arrival chime
    this.soundManager.playOrderArrival();
    this.eventBus.emit('CUSTOMER_ARRIVED', { customerId: id, recipe: customer.desiredRecipe.name });

    this.recalculateQueuePositions();
    return customer;
  }

  private recalculateQueuePositions(): void {
    const queueSlots = this.world.counterQueuePositions;
    let queueIdx = 0;

    for (let i = 0; i < this.customers.length; i++) {
      const cust = this.customers[i];
      if (cust.state === 'ENTERING' || cust.state === 'WAITING_TO_ORDER' || cust.state === 'WAITING_FOR_FOOD') {
        cust.queueIndex = queueIdx;
        const targetPos = queueSlots[Math.min(queueIdx, queueSlots.length - 1)];
        cust.targetPosition.copy(targetPos);
        queueIdx++;
      }
    }
  }

  private tickAI(_currentTime: number): void {
    for (let i = this.customers.length - 1; i >= 0; i--) {
      const cust = this.customers[i];

      switch (cust.state) {
        case 'ENTERING': {
          const dist = cust.currentPosition.distanceTo(cust.targetPosition);
          if (dist < 0.25) {
            cust.state = 'WAITING_TO_ORDER';
            cust.updateMoodIcon('💬');
          }
          break;
        }

        case 'WAITING_TO_ORDER': {
          // Overhead indicator prompt
          break;
        }

        case 'WAITING_FOR_FOOD': {
          if (cust.order) {
            // If order expired
            if (cust.order.status === 'EXPIRED') {
              cust.state = 'ANGRY_LEAVING';
              cust.targetPosition.copy(this.world.exitPoint);
              cust.updateMoodIcon('😡');
              this.soundManager.playError();
              this.eventBus.emit('CUSTOMER_ANGRY_LEFT', { customerId: cust.id });
            }
          }
          break;
        }

        case 'RECEIVING_ORDER': {
          cust.updateMoodIcon('😋');
          cust.state = 'LEAVING';
          cust.targetPosition.copy(this.world.exitPoint);
          this.recalculateQueuePositions();
          break;
        }

        case 'LEAVING':
        case 'ANGRY_LEAVING': {
          const distToExit = cust.currentPosition.distanceTo(this.world.exitPoint);
          if (distToExit < 0.6) {
            this.removeCustomer(i);
          }
          break;
        }
      }
    }
  }

  private updateRegisterReference(): void {
    // Customer at head of queue (queueIndex 0)
    const frontCust = this.customers.find((c) =>
      c.queueIndex === 0 &&
      (c.state === 'WAITING_TO_ORDER' || c.state === 'WAITING_FOR_FOOD') &&
      c.currentPosition.distanceTo(this.world.counterQueuePositions[0]) < 1.0
    );

    this.world.cashRegisterStation.activeCustomer = frontCust || null;
  }

  public completeCustomerOrder(customerId: string): void {
    const cust = this.customers.find((c) => c.id === customerId);
    if (cust) {
      cust.state = 'RECEIVING_ORDER';
    }
  }

  private removeCustomer(index: number): void {
    const cust = this.customers[index];
    this.world.scene.remove(cust.mesh);
    cust.dispose();
    this.customers.splice(index, 1);
    this.recalculateQueuePositions();
  }

  public clear(): void {
    for (let i = 0; i < this.customers.length; i++) {
      this.world.scene.remove(this.customers[i].mesh);
      this.customers[i].dispose();
    }
    this.customers = [];
    this.world.cashRegisterStation.activeCustomer = null;
  }

  public dispose(): void {
    this.clear();
    if (this.unsubOrderTaken) {
      this.unsubOrderTaken();
      this.unsubOrderTaken = null;
    }
  }
}
