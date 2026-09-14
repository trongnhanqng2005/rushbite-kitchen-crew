/**
 * Grill Station for cooking raw patties into juicy burgers.
 * Supports multiple concurrent cooking slots on the hotplate.
 */

import * as THREE from 'three';
import { CookingStation } from './CookingStation.ts';
import { FoodItem } from '../entities/FoodItem.ts';
import { SoundManager } from '../audio/SoundManager.ts';

export interface GrillSlot {
  index: number;
  item: FoodItem | null;
  offset: THREE.Vector3;
}

export class GrillStation extends CookingStation {
  public slots: GrillSlot[] = [];
  public readonly maxSlots = 4;
  private soundManager = SoundManager.getInstance();

  constructor(position: THREE.Vector3) {
    super(position);

    // 2x2 grid of cooking slots on the grill surface
    const spacing = 0.38;
    this.slots = [
      { index: 0, item: null, offset: new THREE.Vector3(-spacing / 2, 0.95, -spacing / 2) },
      { index: 1, item: null, offset: new THREE.Vector3(spacing / 2, 0.95, -spacing / 2) },
      { index: 2, item: null, offset: new THREE.Vector3(-spacing / 2, 0.95, spacing / 2) },
      { index: 3, item: null, offset: new THREE.Vector3(spacing / 2, 0.95, spacing / 2) },
    ];

    this.buildGrillMesh();
  }

  private buildGrillMesh(): void {
    // Grill counter body
    const baseGeom = new THREE.BoxGeometry(1.2, 0.9, 0.9);
    const baseMat = new THREE.MeshStandardMaterial({ color: '#2B2D42', roughness: 0.5 });
    const baseMesh = new THREE.Mesh(baseGeom, baseMat);
    baseMesh.position.y = 0.45;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    this.mesh.add(baseMesh);

    // Stainless steel cooktop frame
    const topGeom = new THREE.BoxGeometry(1.24, 0.06, 0.94);
    const topMat = new THREE.MeshStandardMaterial({ color: '#A0AAB2', metalness: 0.8, roughness: 0.2 });
    const topMesh = new THREE.Mesh(topGeom, topMat);
    topMesh.position.y = 0.92;
    topMesh.receiveShadow = true;
    this.mesh.add(topMesh);

    // Cast iron heated hotplate
    const plateGeom = new THREE.BoxGeometry(0.95, 0.02, 0.75);
    const plateMat = new THREE.MeshStandardMaterial({ color: '#1B1C1E', metalness: 0.6, roughness: 0.7 });
    const plateMesh = new THREE.Mesh(plateGeom, plateMat);
    plateMesh.position.y = 0.945;
    plateMesh.receiveShadow = true;
    this.mesh.add(plateMesh);

    // Overhead range hood
    const hoodGeom = new THREE.BoxGeometry(1.2, 0.3, 0.8);
    const hoodMat = new THREE.MeshStandardMaterial({ color: '#71797E', metalness: 0.7, roughness: 0.3 });
    const hoodMesh = new THREE.Mesh(hoodGeom, hoodMat);
    hoodMesh.position.set(0, 2.3, 0);
    this.mesh.add(hoodMesh);
  }

  public get activePattyCount(): number {
    let count = 0;
    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i].item !== null) count++;
    }
    return count;
  }

  public get cookingPatties(): FoodItem[] {
    const list: FoodItem[] = [];
    for (let i = 0; i < this.slots.length; i++) {
      const item = this.slots[i].item;
      if (item !== null) list.push(item);
    }
    return list;
  }

  public forEachCookingPatty(fn: (item: FoodItem) => void): void {
    for (let i = 0; i < this.slots.length; i++) {
      const item = this.slots[i].item;
      if (item !== null) fn(item);
    }
  }

  public canInteract(heldItem: FoodItem | null): boolean {
    if (heldItem) {
      // Can place raw or cooked patty onto grill if slot available
      if (heldItem.type === 'raw_patty' || heldItem.type === 'cooked_patty') {
        for (let i = 0; i < this.slots.length; i++) {
          if (this.slots[i].item === null) return true;
        }
      }
      return false;
    }
    // Can pick up if any slot has an item
    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i].item !== null) return true;
    }
    return false;
  }

  public interact(heldItem: FoodItem | null): FoodItem | null {
    if (heldItem) {
      if (heldItem.type === 'raw_patty' || heldItem.type === 'cooked_patty') {
        const emptySlot = this.slots.find((s) => s.item === null);
        if (emptySlot) {
          emptySlot.item = heldItem;
          heldItem.state = 'COOKING';
          heldItem.mesh.position.copy(emptySlot.offset);
          this.mesh.add(heldItem.mesh);
          this.soundManager.playPlace();
          this.soundManager.startGrillSizzle();
          return null; // Hand is now empty
        }
      }
      return heldItem;
    }

    // Pick up: prioritize cooked patties first, then burnt, then raw without temporary arrays
    let targetSlot: GrillSlot | null = null;
    let fallbackSlot: GrillSlot | null = null;
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (slot.item) {
        if (!fallbackSlot) fallbackSlot = slot;
        if (slot.item.state === 'COOKED') {
          targetSlot = slot;
          break;
        } else if (slot.item.state === 'BURNT' && (!targetSlot || targetSlot.item?.state !== 'COOKED')) {
          targetSlot = slot;
        }
      }
    }
    if (!targetSlot) targetSlot = fallbackSlot;
    if (!targetSlot || !targetSlot.item) return null;

    const item = targetSlot.item;
    targetSlot.item = null;
    this.mesh.remove(item.mesh);

    if (this.activePattyCount === 0) {
      this.soundManager.stopGrillSizzle();
    }
    this.soundManager.playPickup();
    return item;
  }

  public clear(): void {
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (slot.item) {
        this.mesh.remove(slot.item.mesh);
        slot.item.dispose();
        slot.item = null;
      }
    }
    this.soundManager.stopGrillSizzle();
  }

  public override dispose(): void {
    this.clear();
    super.dispose();
  }

  public getInteractionLabel(heldItem: FoodItem | null): string {
    if (heldItem) {
      if (heldItem.type === 'raw_patty' || heldItem.type === 'cooked_patty') {
        const hasSlot = this.slots.some((s) => s.item === null);
        return hasSlot ? '[E] Place Patty on Grill' : 'Grill Full (4/4)';
      }
      return 'Grill only accepts burger patties';
    }

    const occupied = this.slots.filter((s) => s.item !== null);
    if (occupied.length === 0) return 'Grill is Empty';

    const cooked = occupied.filter((s) => s.item?.state === 'COOKED').length;
    const burnt = occupied.filter((s) => s.item?.state === 'BURNT').length;

    if (cooked > 0) return `[E] Pick Up Cooked Patty (${cooked} ready)`;
    if (burnt > 0) return `[E] Pick Up Burnt Patty (${burnt} burnt)`;
    return `[E] Pick Up Sizzling Patty (${occupied.length} cooking)`;
  }
}
