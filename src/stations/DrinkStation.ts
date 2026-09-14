/**
 * Drink Station for dispensing soda beverages (Cola, Lemon Soda, Orange Soda).
 * Fast, readable interaction with clear color differentiation.
 */

import * as THREE from 'three';
import { Interactable } from '../systems/InteractionSystem.ts';
import { FoodItem } from '../entities/FoodItem.ts';
import { FoodItemType } from '../data/ingredients.ts';
import { SoundManager } from '../audio/SoundManager.ts';
import { disposeObject3D } from '../utils/disposeThree.ts';

export type DrinkFlavorType = 'drink_cola' | 'drink_lemon' | 'drink_orange';

interface FlavorInfo {
  type: DrinkFlavorType;
  name: string;
  color: string;
  icon: string;
}

const FLAVORS: FlavorInfo[] = [
  { type: 'drink_cola', name: 'Fountain Cola', color: '#E63946', icon: '🥤' },
  { type: 'drink_lemon', name: 'Lemon Soda', color: '#A7C957', icon: '🍋' },
  { type: 'drink_orange', name: 'Orange Soda', color: '#FB8500', icon: '🍊' },
];

export class DrinkStation implements Interactable {
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  public isLocked: boolean = false;
  public unlockShift: number = 3;
  private selectedFlavorIndex: number = 0;
  private soundManager = SoundManager.getInstance();
  private indicatorLightMat?: THREE.MeshStandardMaterial;

  constructor(position: THREE.Vector3) {
    this.position = position.clone();
    this.mesh = new THREE.Group();
    this.mesh.position.copy(position);

    this.buildDispenserMesh();
  }

  public setLocked(locked: boolean): void {
    this.isLocked = locked;
  }

  private buildDispenserMesh(): void {
    // Stainless steel counter table
    const tableGeom = new THREE.BoxGeometry(1.1, 0.9, 0.85);
    const tableMat = new THREE.MeshStandardMaterial({
      color: '#CBD5E1',
      metalness: 0.6,
      roughness: 0.3,
    });
    const tableMesh = new THREE.Mesh(tableGeom, tableMat);
    tableMesh.position.y = 0.45;
    tableMesh.castShadow = true;
    tableMesh.receiveShadow = true;
    this.mesh.add(tableMesh);

    // Main soda fountain dispenser unit
    const unitGeom = new THREE.BoxGeometry(0.88, 0.72, 0.58);
    const unitMat = new THREE.MeshStandardMaterial({
      color: '#1E293B',
      metalness: 0.7,
      roughness: 0.25,
    });
    const unitMesh = new THREE.Mesh(unitGeom, unitMat);
    unitMesh.position.set(0, 1.26, -0.05);
    unitMesh.castShadow = true;
    unitMesh.receiveShadow = true;
    this.mesh.add(unitMesh);

    // Front drink marquee banner
    const marqueeGeom = new THREE.BoxGeometry(0.82, 0.22, 0.02);
    const marqueeMat = new THREE.MeshStandardMaterial({
      color: '#0F172A',
      roughness: 0.3,
      metalness: 0.5,
    });
    const marqueeMesh = new THREE.Mesh(marqueeGeom, marqueeMat);
    marqueeMesh.position.set(0, 1.5, 0.245);
    this.mesh.add(marqueeMesh);

    // 3 beverage dispenser nozzles and flavor badges
    const nozzleX = [-0.24, 0.0, 0.24];
    FLAVORS.forEach((flavor, i) => {
      const x = nozzleX[i];

      // Flavor logo badge
      const badgeGeom = new THREE.BoxGeometry(0.18, 0.14, 0.02);
      const badgeMat = new THREE.MeshStandardMaterial({
        color: flavor.color,
        roughness: 0.3,
        metalness: 0.2,
      });
      const badgeMesh = new THREE.Mesh(badgeGeom, badgeMat);
      badgeMesh.position.set(x, 1.5, 0.255);
      this.mesh.add(badgeMesh);

      // Dispenser spout nozzle
      const spoutGeom = new THREE.CylinderGeometry(0.02, 0.015, 0.08, 8);
      const spoutMat = new THREE.MeshStandardMaterial({
        color: '#E2E8F0',
        metalness: 0.9,
        roughness: 0.1,
      });
      const spoutMesh = new THREE.Mesh(spoutGeom, spoutMat);
      spoutMesh.position.set(x, 1.22, 0.14);
      this.mesh.add(spoutMesh);

      // Push lever
      const leverGeom = new THREE.BoxGeometry(0.04, 0.12, 0.01);
      const leverMat = new THREE.MeshStandardMaterial({ color: '#64748B', roughness: 0.5 });
      const leverMesh = new THREE.Mesh(leverGeom, leverMat);
      leverMesh.position.set(x, 1.15, 0.12);
      this.mesh.add(leverMesh);
    });

    // Stainless steel drip tray grate
    const trayGeom = new THREE.BoxGeometry(0.78, 0.03, 0.28);
    const trayMat = new THREE.MeshStandardMaterial({
      color: '#94A3B8',
      metalness: 0.85,
      roughness: 0.3,
    });
    const trayMesh = new THREE.Mesh(trayGeom, trayMat);
    trayMesh.position.set(0, 0.92, 0.14);
    trayMesh.receiveShadow = true;
    this.mesh.add(trayMesh);

    // Active selection indicator light
    const lightGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.02, 12);
    lightGeom.rotateX(Math.PI / 2);
    this.indicatorLightMat = new THREE.MeshStandardMaterial({
      color: FLAVORS[0].color,
      emissive: new THREE.Color(FLAVORS[0].color).multiplyScalar(0.6),
      roughness: 0.2,
    });
    const lightMesh = new THREE.Mesh(lightGeom, this.indicatorLightMat);
    lightMesh.position.set(-0.24, 1.38, 0.25);
    this.mesh.add(lightMesh);
  }

  public getInteractionPosition(): THREE.Vector3 {
    return this.position;
  }

  public get selectedFlavor(): FlavorInfo {
    return FLAVORS[this.selectedFlavorIndex];
  }

  public nextFlavor(): FlavorInfo {
    this.selectedFlavorIndex = (this.selectedFlavorIndex + 1) % FLAVORS.length;
    this.updateIndicator();
    this.soundManager.playPickup();
    return this.selectedFlavor;
  }

  private updateIndicator(): void {
    if (this.indicatorLightMat) {
      const color = this.selectedFlavor.color;
      this.indicatorLightMat.color.set(color);
      this.indicatorLightMat.emissive.set(color).multiplyScalar(0.6);
    }
  }

  public canInteract(heldItem: FoodItem | null): boolean {
    if (this.isLocked) return true;
    // Can fill drink when hands are empty
    return heldItem === null;
  }

  public interact(heldItem: FoodItem | null): FoodItem | null {
    if (this.isLocked) {
      this.soundManager.playError();
      return heldItem;
    }

    if (heldItem) return heldItem; // Hands full

    // Dispense currently selected drink
    const drink = new FoodItem(this.selectedFlavor.type);
    this.soundManager.playDrinkDispense();
    return drink;
  }

  public secondaryInteract(heldItem: FoodItem | null): FoodItem | null {
    if (this.isLocked) return heldItem;
    // Cycle to next flavor
    this.nextFlavor();
    return heldItem;
  }

  public getSecondaryLabel(_heldItem: FoodItem | null): string | undefined {
    if (this.isLocked) return undefined;
    const nextIdx = (this.selectedFlavorIndex + 1) % FLAVORS.length;
    const nextFlav = FLAVORS[nextIdx];
    return `[RMB] Switch to ${nextFlav.name}`;
  }

  public getInteractionLabel(heldItem: FoodItem | null): string {
    if (this.isLocked) {
      return `Unlocks on Shift ${this.unlockShift}`;
    }
    if (heldItem) {
      return `Hands full (Holding ${heldItem.type.replace('_', ' ')})`;
    }
    return `[E] Fill ${this.selectedFlavor.name} (${this.selectedFlavor.icon})`;
  }

  public dispose(): void {
    disposeObject3D(this.mesh);
  }
}
