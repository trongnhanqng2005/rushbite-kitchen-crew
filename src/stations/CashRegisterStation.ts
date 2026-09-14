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
import { disposeObject3D } from '../utils/disposeThree.ts';

export class CashRegisterStation implements Interactable {
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  private soundManager = SoundManager.getInstance();
  private eventBus = EventBus.getInstance();

  // Dynamic reference to currently queued customer at register
  public activeCustomer: Customer | null = null;

  // Cafeteria serving tray on the service counter
  public trayItems: FoodItem[] = [];
  private readonly maxTrayItems = 4;
  private readonly trayOffsets: THREE.Vector3[] = [
    new THREE.Vector3(0.38, 1.0, -0.08),
    new THREE.Vector3(0.60, 1.0, -0.08),
    new THREE.Vector3(0.38, 1.0, 0.12),
    new THREE.Vector3(0.60, 1.0, 0.12),
  ];

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
    // Service Counter body
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

    // Cash Register POS terminal (left side)
    const basePOS = new THREE.BoxGeometry(0.35, 0.12, 0.35);
    const posMat = new THREE.MeshStandardMaterial({ color: '#1B1C1E', roughness: 0.5 });
    const posBaseMesh = new THREE.Mesh(basePOS, posMat);
    posBaseMesh.position.set(-0.35, 1.05, 0);
    this.mesh.add(posBaseMesh);

    // Touchscreen display angled
    const screenGeom = new THREE.BoxGeometry(0.32, 0.22, 0.04);
    const screenMat = new THREE.MeshStandardMaterial({ color: '#3A86FF', emissive: '#1A365D', roughness: 0.2 });
    const screenMesh = new THREE.Mesh(screenGeom, screenMat);
    screenMesh.position.set(-0.35, 1.22, 0.05);
    screenMesh.rotation.x = -Math.PI / 8;
    this.mesh.add(screenMesh);

    // Red fast-food serving tray (right side)
    const trayBaseGeom = new THREE.BoxGeometry(0.56, 0.02, 0.44);
    const trayBaseMat = new THREE.MeshStandardMaterial({
      color: '#D90429',
      roughness: 0.35,
      metalness: 0.1,
    });
    const trayBase = new THREE.Mesh(trayBaseGeom, trayBaseMat);
    trayBase.position.set(0.49, 0.99, 0.02);
    this.mesh.add(trayBase);

    // Raised lip around tray
    const lipGeom = new THREE.BoxGeometry(0.58, 0.04, 0.02);
    const lipMat = new THREE.MeshStandardMaterial({ color: '#BA181B', roughness: 0.3 });
    const lipFront = new THREE.Mesh(lipGeom, lipMat);
    lipFront.position.set(0.49, 1.01, 0.23);
    const lipBack = new THREE.Mesh(lipGeom, lipMat);
    lipBack.position.set(0.49, 1.01, -0.19);
    this.mesh.add(lipFront);
    this.mesh.add(lipBack);
  }

  public canInteract(heldItem: FoodItem | null): boolean {
    if (!this.activeCustomer) return false;

    // Customer waiting to order
    if (this.activeCustomer.state === 'WAITING_TO_ORDER') {
      return true;
    }

    // Customer waiting for food: can place item on tray or serve tray
    if (this.activeCustomer.state === 'WAITING_FOR_FOOD') {
      if (heldItem) {
        return this.trayItems.length < this.maxTrayItems;
      }
      return this.trayItems.length > 0;
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

    if (this.activeCustomer.state === 'WAITING_FOR_FOOD') {
      if (heldItem) {
        // Place held item onto the tray
        if (this.trayItems.length < this.maxTrayItems) {
          const slotOffset = this.trayOffsets[this.trayItems.length];
          heldItem.mesh.position.copy(slotOffset);
          this.mesh.add(heldItem.mesh);
          this.trayItems.push(heldItem);
          this.soundManager.playPlace();
          return null; // Hands are now free
        }
        return heldItem;
      }

      // Hands empty: serve tray items to customer
      if (this.trayItems.length > 0) {
        this.eventBus.emit('SERVE_ATTEMPT', {
          customer: this.activeCustomer,
          foodItems: [...this.trayItems],
        });
        return null;
      }
    }

    return heldItem;
  }

  public secondaryInteract(heldItem: FoodItem | null): FoodItem | null {
    // RMB to pick back up last item from tray if hands empty
    if (!heldItem && this.trayItems.length > 0) {
      return this.popTrayItem();
    }
    return heldItem;
  }

  public popTrayItem(): FoodItem | null {
    const item = this.trayItems.pop();
    if (item) {
      this.mesh.remove(item.mesh);
      this.soundManager.playPickup();
      return item;
    }
    return null;
  }

  public clearTray(): void {
    for (const item of this.trayItems) {
      this.mesh.remove(item.mesh);
      item.dispose();
    }
    this.trayItems = [];
  }

  public getSecondaryLabel(heldItem: FoodItem | null): string | undefined {
    if (!heldItem && this.trayItems.length > 0) {
      const last = this.trayItems[this.trayItems.length - 1];
      return `[RMB] Pick Up ${last.type.replace('_', ' ')} from Tray`;
    }
    return undefined;
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
        return `[E] Place ${heldItem.type.replace('_', ' ')} on Serving Tray (${this.trayItems.length}/4)`;
      }

      if (this.trayItems.length > 0) {
        return `[E] Serve Order (${this.trayItems.length} item${this.trayItems.length > 1 ? 's' : ''} on tray)`;
      }

      const orderName =
        this.activeCustomer.desiredCombo?.name ||
        this.activeCustomer.desiredRecipe?.name ||
        'Order';
      return `Waiting for: ${orderName} (Place items on tray)`;
    }

    return 'Service Counter';
  }

  public dispose(): void {
    this.clearTray();
    this.activeCustomer = null;
    disposeObject3D(this.mesh);
  }
}
