/**
 * Base cooking station class.
 */

import * as THREE from 'three';
import { Interactable } from '../systems/InteractionSystem.ts';
import { FoodItem } from '../entities/FoodItem.ts';

export abstract class CookingStation implements Interactable {
  public mesh: THREE.Group;
  public position: THREE.Vector3;

  constructor(position: THREE.Vector3) {
    this.position = position.clone();
    this.mesh = new THREE.Group();
    this.mesh.position.copy(position);
  }

  public getInteractionPosition(): THREE.Vector3 {
    return this.position;
  }

  public abstract canInteract(heldItem: FoodItem | null): boolean;
  public abstract interact(heldItem: FoodItem | null): FoodItem | null;
  public abstract getInteractionLabel(heldItem: FoodItem | null): string;
}
