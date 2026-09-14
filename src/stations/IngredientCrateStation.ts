/**
 * Ingredient storage station / crate dispenser for fresh kitchen supplies.
 */

import * as THREE from 'three';
import { Interactable } from '../systems/InteractionSystem.ts';
import { FoodItem } from '../entities/FoodItem.ts';
import { FoodItemType, INGREDIENT_DEFINITIONS } from '../data/ingredients.ts';
import { SoundManager } from '../audio/SoundManager.ts';
import { disposeObject3D } from '../utils/disposeThree.ts';

export class IngredientCrateStation implements Interactable {
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  public ingredientType: FoodItemType;

  private soundManager = SoundManager.getInstance();

  constructor(position: THREE.Vector3, ingredientType: FoodItemType) {
    this.position = position.clone();
    this.ingredientType = ingredientType;

    this.mesh = new THREE.Group();
    this.mesh.position.copy(position);

    this.buildCrateMesh();
  }

  public getInteractionPosition(): THREE.Vector3 {
    return this.position;
  }

  private buildCrateMesh(): void {
    const def = INGREDIENT_DEFINITIONS[this.ingredientType];

    // Counter table under crate
    const tableGeom = new THREE.BoxGeometry(0.75, 0.85, 0.75);
    const tableMat = new THREE.MeshStandardMaterial({ color: '#DCE0E5', roughness: 0.4 });
    const tableMesh = new THREE.Mesh(tableGeom, tableMat);
    tableMesh.position.y = 0.425;
    tableMesh.castShadow = true;
    tableMesh.receiveShadow = true;
    this.mesh.add(tableMesh);

    // Rustic wooden / plastic crate container
    const crateGeom = new THREE.BoxGeometry(0.65, 0.25, 0.65);
    const crateMat = new THREE.MeshStandardMaterial({ color: '#8D5B4C', roughness: 0.8 });
    const crateMesh = new THREE.Mesh(crateGeom, crateMat);
    crateMesh.position.y = 0.95;
    crateMesh.castShadow = true;
    this.mesh.add(crateMesh);

    // Ingredient preview inside crate
    const previewGeom = this.ingredientType === 'cheese'
      ? new THREE.BoxGeometry(0.4, 0.15, 0.4)
      : new THREE.CylinderGeometry(0.2, 0.2, 0.15, 12);
    const previewMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(def.color),
      roughness: 0.5,
    });
    const previewMesh = new THREE.Mesh(previewGeom, previewMat);
    previewMesh.position.y = 1.05;
    this.mesh.add(previewMesh);
  }

  public canInteract(heldItem: FoodItem | null): boolean {
    if (heldItem) {
      // Can put back matching item if holding same type
      return heldItem.type === this.ingredientType;
    }
    // Hand empty: can grab item
    return true;
  }

  public interact(heldItem: FoodItem | null): FoodItem | null {
    if (heldItem) {
      if (heldItem.type === this.ingredientType) {
        heldItem.dispose();
        this.soundManager.playPlace();
        return null; // Put back
      }
      return heldItem;
    }

    // Grab fresh item
    const newItem = new FoodItem(this.ingredientType);
    this.soundManager.playPickup();
    return newItem;
  }

  public getInteractionLabel(heldItem: FoodItem | null): string {
    const def = INGREDIENT_DEFINITIONS[this.ingredientType];
    if (heldItem) {
      if (heldItem.type === this.ingredientType) {
        return `[E] Put Back ${def.name}`;
      }
      return `Hands full (${INGREDIENT_DEFINITIONS[heldItem.type]?.name || 'Item'})`;
    }
    return `[E] Take ${def.name}`;
  }

  public dispose(): void {
    disposeObject3D(this.mesh);
  }
}
