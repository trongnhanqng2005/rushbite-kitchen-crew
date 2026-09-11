/**
 * Cash Register & Service Counter station.
 * Front counter where players interact with waiting customers, take orders, and serve meals.
 */

import * as THREE from 'three';
import { Interactable } from '../systems/InteractionSystem.ts';
import { FoodItem } from '../entities/FoodItem.ts';
import { Customer } from '../entities/Customer.ts';
import { EventBus } from '../core/EventBus.ts';
import { SoundManager } from '../audio/SoundManager.ts';

export class CashRegisterStation implements Interactable {
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  private soundManager = SoundManager.getInstance();
  private eventBus = EventBus.getInstance();

  // Dynamic reference to currently queued customer at register
  public activeCustomer: Customer | null = null;

  constructor(position: THREE.Vector3) {
    this.position = position.clone();
    this.mesh = new THREE.Group();
    this.mesh.position.copy(position);

    this.buildRegisterMesh();
  }

  public getInteractionPosition(): THREE.Vector3 {
    return this.position;
  }

  private buildRegisterMesh(): void {
    // Service Counter
    const counterGeom = new THREE.BoxGeometry(1.6, 0.95, 0.9);
    const counterMat = new THREE.MeshStandardMaterial({ color: '#2B2D42', roughness: 0.4 });
    const counterMesh = new THREE.Mesh(counterGeom, counterMat);
    counterMesh.position.y = 0.475;
    counterMesh.castShadow = true;
    counterMesh.receiveShadow = true;
    this.mesh.add(counterMesh);

    // Warm wooden countertop
    const topGeom = new THREE.BoxGeometry(1.65, 0.06, 0.95);
    const topMat = new THREE.MeshStandardMaterial({ color: '#E09F3E', roughness: 0.3 });
    const topMesh = new THREE.Mesh(topGeom, topMat);
    topMesh.position.y = 0.96;
    topMesh.receiveShadow = true;
    this.mesh.add(topMesh);

    // Cash Register POS terminal
    const basePOS = new THREE.BoxGeometry(0.35, 0.12, 0.35);
    const posMat = new THREE.MeshStandardMaterial({ color: '#1B1C1E', roughness: 0.5 });
    const posBaseMesh = new THREE.Mesh(basePOS, posMat);
    posBaseMesh.position.set(0, 1.05, 0);
    this.mesh.add(posBaseMesh);

    // Touchscreen display angled
    const screenGeom = new THREE.BoxGeometry(0.32, 0.22, 0.04);
    const screenMat = new THREE.MeshStandardMaterial({ color: '#3A86FF', emissive: '#1A365D', roughness: 0.2 });
    const screenMesh = new THREE.Mesh(screenGeom, screenMat);
    screenMesh.position.set(0, 1.22, 0.05);
    screenMesh.rotation.x = -Math.PI / 8;
    this.mesh.add(screenMesh);
  }

  public canInteract(heldItem: FoodItem | null): boolean {
    if (!this.activeCustomer) return false;

    // Customer waiting to order
    if (this.activeCustomer.state === 'WAITING_TO_ORDER') {
      return true;
    }

    // Customer waiting for food
    if (this.activeCustomer.state === 'WAITING_FOR_FOOD') {
      return heldItem !== null;
    }

    return false;
  }

  public interact(heldItem: FoodItem | null): FoodItem | null {
    if (!this.activeCustomer) return heldItem;

    if (this.activeCustomer.state === 'WAITING_TO_ORDER') {
      this.eventBus.emit('ORDER_TAKEN', { customer: this.activeCustomer });
      this.soundManager.playCashRegister();
      return heldItem;
    }

    if (this.activeCustomer.state === 'WAITING_FOR_FOOD' && heldItem) {
      this.eventBus.emit('SERVE_ATTEMPT', {
        customer: this.activeCustomer,
        foodItem: heldItem,
      });
      // The OrderSystem handles verification and either consumes meal or rejects
      // If consumed, hands become null
      return null;
    }

    return heldItem;
  }

  public getInteractionLabel(heldItem: FoodItem | null): string {
    if (!this.activeCustomer) {
      return 'Cash Register (Waiting for customer...)';
    }

    if (this.activeCustomer.state === 'WAITING_TO_ORDER') {
      return '[E] Take Customer Order';
    }

    if (this.activeCustomer.state === 'WAITING_FOR_FOOD') {
      if (heldItem) {
        if (heldItem.type === 'assembled_burger') {
          return `[E] Serve Assembled Meal to ${this.activeCustomer.desiredRecipe?.name || 'Customer'}`;
        }
        return `[E] Serve Item (Needs full assembled burger!)`;
      }
      return `Waiting for: ${this.activeCustomer.desiredRecipe?.name || 'Burger'}`;
    }

    return 'Service Counter';
  }
}
