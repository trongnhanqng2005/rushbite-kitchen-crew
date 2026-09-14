/**
 * Fryer Station for frying raw fries into golden crispy fries.
 * Supports 2 independent wire baskets with realistic immersion and drainage visuals.
 */

import * as THREE from 'three';
import { CookingStation } from './CookingStation.ts';
import { FoodItem } from '../entities/FoodItem.ts';
import { SoundManager } from '../audio/SoundManager.ts';

export interface FryerBasket {
  index: number;
  item: FoodItem | null;
  offset: THREE.Vector3;
  basketGroup: THREE.Group;
}

export class FryerStation extends CookingStation {
  public baskets: FryerBasket[] = [];
  public readonly maxBaskets = 2;
  private soundManager = SoundManager.getInstance();

  constructor(position: THREE.Vector3) {
    super(position);

    // Two fryer baskets side-by-side
    const spacing = 0.32;
    this.baskets = [
      {
        index: 0,
        item: null,
        offset: new THREE.Vector3(-spacing / 2, 0.92, 0),
        basketGroup: new THREE.Group(),
      },
      {
        index: 1,
        item: null,
        offset: new THREE.Vector3(spacing / 2, 0.92, 0),
        basketGroup: new THREE.Group(),
      },
    ];

    this.buildFryerMesh();
  }

  private buildFryerMesh(): void {
    // Stainless steel commercial cabinet
    const bodyGeom = new THREE.BoxGeometry(0.95, 0.9, 0.85);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: '#9EABB3',
      metalness: 0.75,
      roughness: 0.25,
    });
    const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
    bodyMesh.position.y = 0.45;
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    this.mesh.add(bodyMesh);

    // Deep oil vat well
    const vatGeom = new THREE.BoxGeometry(0.74, 0.25, 0.54);
    const vatMat = new THREE.MeshStandardMaterial({
      color: '#212529',
      roughness: 0.6,
      metalness: 0.4,
    });
    const vatMesh = new THREE.Mesh(vatGeom, vatMat);
    vatMesh.position.y = 0.85;
    vatMesh.receiveShadow = true;
    this.mesh.add(vatMesh);

    // Golden frying oil surface
    const oilGeom = new THREE.PlaneGeometry(0.7, 0.5);
    const oilMat = new THREE.MeshStandardMaterial({
      color: '#D4A313',
      roughness: 0.1,
      metalness: 0.2,
      transparent: true,
      opacity: 0.88,
    });
    const oilMesh = new THREE.Mesh(oilGeom, oilMat);
    oilMesh.rotation.x = -Math.PI / 2;
    oilMesh.position.y = 0.88;
    this.mesh.add(oilMesh);

    // Front control panel with temperature dials
    const panelGeom = new THREE.BoxGeometry(0.85, 0.12, 0.02);
    const panelMat = new THREE.MeshStandardMaterial({ color: '#2B2D42', roughness: 0.4 });
    const panelMesh = new THREE.Mesh(panelGeom, panelMat);
    panelMesh.position.set(0, 0.82, 0.435);
    this.mesh.add(panelMesh);

    // Two dial knobs
    [-0.2, 0.2].forEach((x) => {
      const dialGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.02, 12);
      dialGeom.rotateX(Math.PI / 2);
      const dialMat = new THREE.MeshStandardMaterial({ color: '#E63946', roughness: 0.3 });
      const dialMesh = new THREE.Mesh(dialGeom, dialMat);
      dialMesh.position.set(x, 0.82, 0.45);
      this.mesh.add(dialMesh);
    });

    // Build the 2 wire mesh baskets
    this.baskets.forEach((basket) => {
      const g = basket.basketGroup;
      g.position.copy(basket.offset);

      // Wire mesh basket cage
      const basketBoxGeom = new THREE.BoxGeometry(0.24, 0.16, 0.32);
      const wireMat = new THREE.MeshStandardMaterial({
        color: '#D0D7DE',
        metalness: 0.9,
        roughness: 0.2,
        wireframe: true,
      });
      const wireMesh = new THREE.Mesh(basketBoxGeom, wireMat);
      wireMesh.position.y = 0.08;
      g.add(wireMesh);

      // Basket handle
      const handleGeom = new THREE.CylinderGeometry(0.012, 0.012, 0.28, 8);
      handleGeom.rotateX(Math.PI / 3);
      const handleMat = new THREE.MeshStandardMaterial({ color: '#1B1C1E', roughness: 0.8 });
      const handleMesh = new THREE.Mesh(handleGeom, handleMat);
      handleMesh.position.set(0, 0.22, 0.22);
      g.add(handleMesh);

      this.mesh.add(g);
    });
  }

  public get activeBasketCount(): number {
    let count = 0;
    for (let i = 0; i < this.baskets.length; i++) {
      if (this.baskets[i].item !== null) count++;
    }
    return count;
  }

  public forEachCookingFries(fn: (item: FoodItem) => void): void {
    for (let i = 0; i < this.baskets.length; i++) {
      const item = this.baskets[i].item;
      if (item !== null) {
        fn(item);
        // Visual basket position: immersed when frying, raised when ready or burnt
        if (item.state === 'COOKED' || item.state === 'BURNT') {
          this.baskets[i].basketGroup.position.y = 0.98; // Raised to drain oil
        } else {
          this.baskets[i].basketGroup.position.y = 0.84; // Submerged in hot oil
        }
      } else {
        this.baskets[i].basketGroup.position.y = 0.92; // Neutral rest
      }
    }
  }

  public canInteract(heldItem: FoodItem | null): boolean {
    if (heldItem) {
      if (heldItem.type === 'raw_fries' || heldItem.type === 'cooked_fries') {
        for (let i = 0; i < this.baskets.length; i++) {
          if (this.baskets[i].item === null) return true;
        }
      }
      return false;
    }
    // Pick up if any basket has food
    for (let i = 0; i < this.baskets.length; i++) {
      if (this.baskets[i].item !== null) return true;
    }
    return false;
  }

  public interact(heldItem: FoodItem | null): FoodItem | null {
    if (heldItem) {
      if (heldItem.type === 'raw_fries' || heldItem.type === 'cooked_fries') {
        const emptyBasket = this.baskets.find((b) => b.item === null);
        if (emptyBasket) {
          emptyBasket.item = heldItem;
          heldItem.state = 'COOKING';
          heldItem.mesh.position.set(0, 0.08, 0);
          emptyBasket.basketGroup.add(heldItem.mesh);
          emptyBasket.basketGroup.position.y = 0.84; // Submerge

          this.soundManager.playPlace();
          this.soundManager.startFryerSizzle();
          return null; // Consumed from hands
        }
      }
      return heldItem;
    }

    // Pick up: prioritize cooked/ready fries, then burnt, then raw
    let targetBasket: FryerBasket | null = null;
    let fallbackBasket: FryerBasket | null = null;

    for (let i = 0; i < this.baskets.length; i++) {
      const b = this.baskets[i];
      if (b.item) {
        if (!fallbackBasket) fallbackBasket = b;
        if (b.item.state === 'COOKED') {
          targetBasket = b;
          break;
        } else if (b.item.state === 'BURNT' && (!targetBasket || targetBasket.item?.state !== 'COOKED')) {
          targetBasket = b;
        }
      }
    }

    if (!targetBasket) targetBasket = fallbackBasket;
    if (!targetBasket || !targetBasket.item) return null;

    const item = targetBasket.item;
    targetBasket.item = null;
    targetBasket.basketGroup.remove(item.mesh);
    targetBasket.basketGroup.position.y = 0.92;

    if (this.activeBasketCount === 0) {
      this.soundManager.stopFryerSizzle();
    }

    this.soundManager.playPickup();
    return item;
  }

  public clear(): void {
    for (let i = 0; i < this.baskets.length; i++) {
      const b = this.baskets[i];
      if (b.item) {
        b.basketGroup.remove(b.item.mesh);
        b.item.dispose();
        b.item = null;
      }
      b.basketGroup.position.y = 0.92;
    }
    this.soundManager.stopFryerSizzle();
  }

  public override dispose(): void {
    this.clear();
    super.dispose();
  }

  public getInteractionLabel(heldItem: FoodItem | null): string {
    if (heldItem) {
      if (heldItem.type === 'raw_fries' || heldItem.type === 'cooked_fries') {
        const hasBasket = this.baskets.some((b) => b.item === null);
        return hasBasket ? '[E] Lower Fries into Fryer Basket' : 'Fryer Baskets Full (2/2)';
      }
      return 'Fryer only accepts fries';
    }

    const occupied = this.baskets.filter((b) => b.item !== null);
    if (occupied.length === 0) return 'Fryer Baskets Empty';

    const cooked = occupied.filter((b) => b.item?.state === 'COOKED').length;
    const burnt = occupied.filter((b) => b.item?.state === 'BURNT').length;

    if (cooked > 0) return `[E] Pick Up Crispy Fries (${cooked} ready)`;
    if (burnt > 0) return `[E] Pick Up Burnt Fries (${burnt} burnt)`;
    return `[E] Pick Up Frying Basket (${occupied.length} frying)`;
  }
}
