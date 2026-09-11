/**
 * Burger assembly station where players stack buns, patties, cheese, and veggies.
 */

import * as THREE from 'three';
import { Interactable } from '../systems/InteractionSystem.ts';
import { FoodItem } from '../entities/FoodItem.ts';
import { FoodItemType, INGREDIENT_DEFINITIONS } from '../data/ingredients.ts';
import { SoundManager } from '../audio/SoundManager.ts';

export class AssemblyStation implements Interactable {
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  public currentStack: FoodItemType[] = [];

  private stackMeshGroup: THREE.Group;
  private soundManager = SoundManager.getInstance();

  constructor(position: THREE.Vector3) {
    this.position = position.clone();
    this.mesh = new THREE.Group();
    this.mesh.position.copy(position);

    this.stackMeshGroup = new THREE.Group();
    this.stackMeshGroup.position.set(0, 0.96, 0);
    this.mesh.add(this.stackMeshGroup);

    this.buildAssemblyMesh();
  }

  private buildAssemblyMesh(): void {
    // Prep counter
    const baseGeom = new THREE.BoxGeometry(1.3, 0.9, 0.9);
    const baseMat = new THREE.MeshStandardMaterial({ color: '#E9ECEF', roughness: 0.3 });
    const baseMesh = new THREE.Mesh(baseGeom, baseMat);
    baseMesh.position.y = 0.45;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    this.mesh.add(baseMesh);

    // Bamboo cutting board
    const boardGeom = new THREE.BoxGeometry(0.7, 0.04, 0.55);
    const boardMat = new THREE.MeshStandardMaterial({ color: '#C19A6B', roughness: 0.7 });
    const boardMesh = new THREE.Mesh(boardGeom, boardMat);
    boardMesh.position.y = 0.92;
    boardMesh.receiveShadow = true;
    this.mesh.add(boardMesh);
  }

  public getInteractionPosition(): THREE.Vector3 {
    return this.position;
  }

  public canInteract(heldItem: FoodItem | null): boolean {
    if (heldItem) {
      // Cannot assemble another full burger into a burger
      if (heldItem.type === 'assembled_burger') return false;
      return true; // Any ingredient can be added
    }
    // Can pick up if at least one ingredient is on board
    return this.currentStack.length > 0;
  }

  public interact(heldItem: FoodItem | null): FoodItem | null {
    if (heldItem) {
      if (heldItem.type !== 'assembled_burger') {
        this.currentStack.push(heldItem.type);
        this.rebuildStackVisuals();
        this.soundManager.playPlace();
        heldItem.dispose();
        return null; // Consumed ingredient from hand
      }
      return heldItem;
    }

    // Pick up assembled meal
    if (this.currentStack.length > 0) {
      const meal = new FoodItem('assembled_burger', this.currentStack);
      this.currentStack = [];
      this.rebuildStackVisuals();
      this.soundManager.playPickup();
      return meal;
    }

    return null;
  }

  public secondaryInteract(_heldItem: FoodItem | null): FoodItem | null {
    if (this.currentStack.length > 0) {
      this.currentStack = [];
      this.rebuildStackVisuals();
      this.soundManager.playTrash();
    }
    return _heldItem;
  }

  public clear(): void {
    this.currentStack = [];
    this.rebuildStackVisuals();
  }

  public getSecondaryLabel(_heldItem: FoodItem | null): string | undefined {
    if (this.currentStack.length > 0) {
      return '[RMB] Clear Assembly Board';
    }
    return undefined;
  }

  public getInteractionLabel(heldItem: FoodItem | null): string {
    if (heldItem) {
      const def = INGREDIENT_DEFINITIONS[heldItem.type];
      return `[E] Add ${def.name} to Stack (${this.currentStack.length} items)`;
    }

    if (this.currentStack.length === 0) {
      return 'Assembly Board (Empty - Add Bun to start)';
    }

    const hasTopBun = this.currentStack[this.currentStack.length - 1] === 'bun_top';
    const desc = hasTopBun ? 'Complete Burger' : `${this.currentStack.length} Layers`;
    return `[E] Pick Up Assembled Meal (${desc})`;
  }

  private rebuildStackVisuals(): void {
    while (this.stackMeshGroup.children.length > 0) {
      const child = this.stackMeshGroup.children[0] as THREE.Mesh;
      this.stackMeshGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material.dispose();
      }
    }

    if (this.currentStack.length === 0) return;

    let currentY = 0;
    this.currentStack.forEach((ingType) => {
      const def = INGREDIENT_DEFINITIONS[ingType];
      let geom: THREE.BufferGeometry;

      if (ingType === 'cheese') {
        geom = new THREE.BoxGeometry(0.35, def.height, 0.35);
      } else if (ingType === 'bun_top') {
        geom = new THREE.CylinderGeometry(def.radius * 0.82, def.radius, def.height, 16);
      } else {
        geom = new THREE.CylinderGeometry(def.radius, def.radius, def.height, 16);
      }

      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(def.color),
        roughness: 0.6,
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.y = currentY + def.height / 2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.stackMeshGroup.add(mesh);

      currentY += def.height;
    });
  }
}
