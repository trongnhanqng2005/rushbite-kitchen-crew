/**
 * Interaction system handling center-screen raycasting and interactable dispatching.
 */

import * as THREE from 'three';
import { FoodItem } from '../entities/FoodItem.ts';
import { GameConfig } from '../game/GameConfig.ts';

export interface Interactable {
  canInteract(heldItem: FoodItem | null): boolean;
  interact(heldItem: FoodItem | null): FoodItem | null; // returns updated held item
  getInteractionLabel(heldItem: FoodItem | null): string;
  getInteractionPosition(): THREE.Vector3;
  secondaryInteract?(heldItem: FoodItem | null): FoodItem | null;
  getSecondaryLabel?(heldItem: FoodItem | null): string | undefined;
}

export interface InteractionPrompt {
  hasTarget: boolean;
  label: string;
  secondaryLabel?: string;
  distance: number;
}

export class InteractionSystem {
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private centerCoord: THREE.Vector2 = new THREE.Vector2(0, 0); // center of screen
  private interactables: Interactable[] = [];
  private currentTarget: Interactable | null = null;

  // Reusable vectors to prevent GC allocations
  private tempOrigin: THREE.Vector3 = new THREE.Vector3();
  private tempTarget: THREE.Vector3 = new THREE.Vector3();

  // Cached prompt to eliminate per-frame object allocations
  private cachedPrompt: InteractionPrompt = {
    hasTarget: false,
    label: '',
    secondaryLabel: undefined,
    distance: 0,
  };

  public registerInteractable(obj: Interactable): void {
    if (!this.interactables.includes(obj)) {
      this.interactables.push(obj);
    }
  }

  public unregisterInteractable(obj: Interactable): void {
    const idx = this.interactables.indexOf(obj);
    if (idx !== -1) {
      this.interactables.splice(idx, 1);
    }
  }

  public update(camera: THREE.Camera, heldItem: FoodItem | null): InteractionPrompt {
    this.raycaster.setFromCamera(this.centerCoord, camera);
    const maxDist = GameConfig.interaction.maxDistance;
    const ray = this.raycaster.ray;

    let closestDist = maxDist;
    let bestInteractable: Interactable | null = null;

    camera.getWorldPosition(this.tempOrigin);

    for (let i = 0; i < this.interactables.length; i++) {
      const target = this.interactables[i];
      const pos = target.getInteractionPosition();

      // Quick distance check before ray test
      const distToPlayer = this.tempOrigin.distanceTo(pos);
      if (distToPlayer > maxDist + 1.0) continue;

      // Project target point onto ray
      this.tempTarget.copy(pos);
      const distToRay = ray.distanceToPoint(this.tempTarget);

      // Station interaction radius
      if (distToRay < 0.65 && distToPlayer < closestDist) {
        if (target.canInteract(heldItem)) {
          closestDist = distToPlayer;
          bestInteractable = target;
        }
      }
    }

    this.currentTarget = bestInteractable;

    if (this.currentTarget) {
      this.cachedPrompt.hasTarget = true;
      this.cachedPrompt.label = this.currentTarget.getInteractionLabel(heldItem);
      this.cachedPrompt.secondaryLabel = this.currentTarget.getSecondaryLabel ? this.currentTarget.getSecondaryLabel(heldItem) : undefined;
      this.cachedPrompt.distance = closestDist;
      return this.cachedPrompt;
    }

    this.cachedPrompt.hasTarget = false;
    this.cachedPrompt.label = '';
    this.cachedPrompt.secondaryLabel = undefined;
    this.cachedPrompt.distance = 0;
    return this.cachedPrompt;
  }

  public triggerInteract(heldItem: FoodItem | null): FoodItem | null {
    if (this.currentTarget && this.currentTarget.canInteract(heldItem)) {
      return this.currentTarget.interact(heldItem);
    }
    return heldItem;
  }

  public triggerSecondaryInteract(heldItem: FoodItem | null): FoodItem | null {
    if (this.currentTarget && this.currentTarget.secondaryInteract) {
      return this.currentTarget.secondaryInteract(heldItem);
    }
    return heldItem;
  }

  public getTarget(): Interactable | null {
    return this.currentTarget;
  }
}
