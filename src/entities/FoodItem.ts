/**
 * Food item entity with 3D procedural representation and state tracking.
 * Reuses geometries and materials to avoid garbage collection allocations.
 */

import * as THREE from 'three';
import { FoodItemType, FoodItemState, INGREDIENT_DEFINITIONS } from '../data/ingredients.ts';
import { GameConfig } from '../game/GameConfig.ts';

// Shared geometry caches across all food items to optimize draw calls & memory
const cylinderGeometries = new Map<string, THREE.CylinderGeometry>();
const boxGeometries = new Map<string, THREE.BoxGeometry>();

// Cached color instances to prevent hot-loop allocations during cooking updates
const COLOR_RAW_PATTY = new THREE.Color(INGREDIENT_DEFINITIONS.raw_patty.color);
const COLOR_COOKED_PATTY = new THREE.Color(INGREDIENT_DEFINITIONS.cooked_patty.color);
const COLOR_BURNT_PATTY = new THREE.Color(INGREDIENT_DEFINITIONS.burnt_patty.color);

const COLOR_RAW_FRIES = new THREE.Color(INGREDIENT_DEFINITIONS.raw_fries.color);
const COLOR_COOKED_FRIES = new THREE.Color(INGREDIENT_DEFINITIONS.cooked_fries.color);
const COLOR_BURNT_FRIES = new THREE.Color(INGREDIENT_DEFINITIONS.burnt_fries.color);

function getSharedCylinder(radius: number, height: number): THREE.CylinderGeometry {
  const key = `${radius.toFixed(2)}_${height.toFixed(2)}`;
  if (!cylinderGeometries.has(key)) {
    const geom = new THREE.CylinderGeometry(radius, radius, height, 16);
    geom.userData = { isShared: true };
    cylinderGeometries.set(key, geom);
  }
  return cylinderGeometries.get(key)!;
}

function getSharedBox(w: number, h: number, d: number): THREE.BoxGeometry {
  const key = `${w.toFixed(2)}_${h.toFixed(2)}_${d.toFixed(2)}`;
  if (!boxGeometries.has(key)) {
    const geom = new THREE.BoxGeometry(w, h, d);
    geom.userData = { isShared: true };
    boxGeometries.set(key, geom);
  }
  return boxGeometries.get(key)!;
}

function getSharedTaperedCylinder(topRadius: number, botRadius: number, height: number): THREE.CylinderGeometry {
  const key = `${topRadius.toFixed(2)}_${botRadius.toFixed(2)}_${height.toFixed(2)}`;
  if (!cylinderGeometries.has(key)) {
    const geom = new THREE.CylinderGeometry(topRadius, botRadius, height, 16);
    geom.userData = { isShared: true };
    cylinderGeometries.set(key, geom);
  }
  return cylinderGeometries.get(key)!;
}

export class FoodItem {
  public id: string;
  public type: FoodItemType;
  public state: FoodItemState;
  public cookProgress: number = 0; // 0.0 to 1.5
  public burnProgress: number = 0;
  public stackedIngredients: FoodItemType[] = [];

  public mesh: THREE.Group;
  private primaryMaterial?: THREE.MeshStandardMaterial;

  constructor(type: FoodItemType, stacked?: FoodItemType[]) {
    this.id = 'food_' + Math.random().toString(36).substring(2, 9);
    this.type = type;
    if (type === 'cooked_patty') {
      this.state = 'COOKED';
    } else if (type === 'cooked_fries') {
      this.state = 'READY';
    } else if (type === 'burnt_patty' || type === 'burnt_fries') {
      this.state = 'BURNT';
    } else if (type === 'assembled_burger') {
      this.state = 'ASSEMBLED';
    } else if (type.startsWith('drink_')) {
      this.state = 'COOKED';
    } else {
      this.state = 'RAW';
    }

    if (stacked) {
      this.stackedIngredients = [...stacked];
    }

    this.mesh = new THREE.Group();
    this.mesh.name = `FoodItem_${this.id}`;
    this.rebuildMesh();
  }

  public advanceCooking(deltaProgress: number): void {
    if (this.type === 'raw_patty' || this.type === 'cooked_patty') {
      this.cookProgress += deltaProgress;

      if (this.cookProgress >= GameConfig.cooking.burntThreshold) {
        this.state = 'BURNT';
        this.type = 'burnt_patty';
      } else if (this.cookProgress >= GameConfig.cooking.cookedMinProgress) {
        this.state = 'COOKED';
        this.type = 'cooked_patty';
      } else {
        this.state = 'COOKING';
      }

      this.updatePattyVisuals();
    } else if (this.type === 'raw_fries' || this.type === 'cooked_fries') {
      this.cookProgress += deltaProgress;

      if (this.cookProgress >= GameConfig.cooking.burntThreshold) {
        this.state = 'BURNT';
        this.type = 'burnt_fries';
      } else if (this.cookProgress >= GameConfig.cooking.cookedMinProgress) {
        this.state = 'READY';
        this.type = 'cooked_fries';
      } else {
        this.state = 'FRYING';
      }

      this.updateFriesVisuals();
    }
  }

  private updatePattyVisuals(): void {
    if (!this.primaryMaterial) return;

    // Smooth visual transition from raw red -> cooked savory brown -> charred black
    if (this.cookProgress < GameConfig.cooking.cookedMinProgress) {
      const t = this.cookProgress / GameConfig.cooking.cookedMinProgress;
      this.primaryMaterial.color.copy(COLOR_RAW_PATTY).lerp(COLOR_COOKED_PATTY, t);
      this.primaryMaterial.roughness = 0.6 + t * 0.2;
    } else if (this.cookProgress <= GameConfig.cooking.burntThreshold) {
      const t = (this.cookProgress - GameConfig.cooking.cookedMinProgress) / (GameConfig.cooking.burntThreshold - GameConfig.cooking.cookedMinProgress);
      this.primaryMaterial.color.copy(COLOR_COOKED_PATTY).lerp(COLOR_BURNT_PATTY, t);
      this.primaryMaterial.roughness = 0.8 + t * 0.2;
    } else {
      this.primaryMaterial.color.copy(COLOR_BURNT_PATTY);
      this.primaryMaterial.roughness = 1.0;
    }
  }

  private updateFriesVisuals(): void {
    if (!this.primaryMaterial) return;

    if (this.cookProgress < GameConfig.cooking.cookedMinProgress) {
      const t = this.cookProgress / GameConfig.cooking.cookedMinProgress;
      this.primaryMaterial.color.copy(COLOR_RAW_FRIES).lerp(COLOR_COOKED_FRIES, t);
      this.primaryMaterial.roughness = 0.7;
    } else if (this.cookProgress <= GameConfig.cooking.burntThreshold) {
      const t = (this.cookProgress - GameConfig.cooking.cookedMinProgress) / (GameConfig.cooking.burntThreshold - GameConfig.cooking.cookedMinProgress);
      this.primaryMaterial.color.copy(COLOR_COOKED_FRIES).lerp(COLOR_BURNT_FRIES, t);
      this.primaryMaterial.roughness = 0.9;
    } else {
      this.primaryMaterial.color.copy(COLOR_BURNT_FRIES);
      this.primaryMaterial.roughness = 1.0;
    }
  }

  public rebuildMesh(): void {
    // Clean old children
    while (this.mesh.children.length > 0) {
      const child = this.mesh.children[0];
      this.mesh.remove(child);
    }

    if (this.type === 'assembled_burger') {
      this.buildBurgerStackMesh();
      return;
    }

    if (this.type === 'raw_fries' || this.type === 'cooked_fries' || this.type === 'burnt_fries') {
      this.buildFriesMesh();
      return;
    }

    if (this.type.startsWith('drink_')) {
      this.buildDrinkMesh();
      return;
    }

    const def = INGREDIENT_DEFINITIONS[this.type];
    let geom: THREE.BufferGeometry;

    if (this.type === 'cheese') {
      geom = getSharedBox(0.38, def.height, 0.38);
    } else if (this.type === 'bun_top') {
      geom = getSharedTaperedCylinder(def.radius * 0.85, def.radius, def.height);
    } else {
      geom = getSharedCylinder(def.radius, def.height);
    }

    this.primaryMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(def.color),
      roughness: 0.7,
      metalness: 0.05,
    });

    const mesh = new THREE.Mesh(geom, this.primaryMaterial);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.y = def.height / 2;
    this.mesh.add(mesh);

    // If already cooked or burnt upon creation
    if (this.type === 'raw_patty' || this.type === 'cooked_patty' || this.type === 'burnt_patty') {
      this.updatePattyVisuals();
    }
  }

  private buildBurgerStackMesh(): void {
    let currentY = 0;

    // Small stylized serving plate beneath the burger
    const plateGeom = getSharedCylinder(0.32, 0.02);
    const plateMat = new THREE.MeshStandardMaterial({ color: '#E8E8E8', roughness: 0.3 });
    const plateMesh = new THREE.Mesh(plateGeom, plateMat);
    plateMesh.position.y = 0.01;
    plateMesh.receiveShadow = true;
    this.mesh.add(plateMesh);
    currentY += 0.02;

    this.stackedIngredients.forEach((ingType) => {
      const def = INGREDIENT_DEFINITIONS[ingType];
      let geom: THREE.BufferGeometry;

      if (ingType === 'cheese') {
        geom = getSharedBox(0.36, def.height, 0.36);
      } else if (ingType === 'bun_top') {
        geom = getSharedTaperedCylinder(def.radius * 0.82, def.radius, def.height);
      } else {
        geom = getSharedCylinder(def.radius, def.height);
      }

      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(def.color),
        roughness: 0.6,
      });

      const layerMesh = new THREE.Mesh(geom, mat);
      layerMesh.castShadow = true;
      layerMesh.receiveShadow = true;
      layerMesh.position.y = currentY + def.height / 2;
      this.mesh.add(layerMesh);

      currentY += def.height;
    });
  }

  private buildFriesMesh(): void {
    const def = INGREDIENT_DEFINITIONS[this.type];

    // Red cardboard fry box
    const boxGeom = getSharedBox(0.22, 0.18, 0.14);
    const boxMat = new THREE.MeshStandardMaterial({ color: '#D90429', roughness: 0.5 });
    const boxMesh = new THREE.Mesh(boxGeom, boxMat);
    boxMesh.position.y = 0.09;
    boxMesh.castShadow = true;
    boxMesh.receiveShadow = true;
    this.mesh.add(boxMesh);

    // Fry sticks
    const initialColor = this.type === 'burnt_fries'
      ? COLOR_BURNT_FRIES
      : this.type === 'cooked_fries'
      ? COLOR_COOKED_FRIES
      : COLOR_RAW_FRIES;

    this.primaryMaterial = new THREE.MeshStandardMaterial({
      color: initialColor.clone(),
      roughness: 0.7,
    });

    // Staggered fry sticks protruding from box
    const stickGeom = getSharedBox(0.035, 0.18, 0.035);
    const offsets = [
      { x: -0.05, y: 0.18, z: -0.02, rot: 0.08 },
      { x: 0.0, y: 0.20, z: 0.01, rot: -0.05 },
      { x: 0.05, y: 0.19, z: -0.02, rot: 0.06 },
      { x: -0.03, y: 0.17, z: 0.03, rot: -0.04 },
      { x: 0.04, y: 0.18, z: 0.03, rot: 0.05 },
    ];

    offsets.forEach((off) => {
      const stick = new THREE.Mesh(stickGeom, this.primaryMaterial!);
      stick.position.set(off.x, off.y, off.z);
      stick.rotation.z = off.rot;
      stick.castShadow = true;
      this.mesh.add(stick);
    });

    if (this.type === 'cooked_fries' || this.type === 'burnt_fries' || this.cookProgress > 0) {
      this.updateFriesVisuals();
    }
  }

  private buildDrinkMesh(): void {
    const def = INGREDIENT_DEFINITIONS[this.type];

    // Main cup body
    const cupGeom = getSharedTaperedCylinder(0.12, 0.085, 0.26);
    const cupMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(def.color),
      roughness: 0.4,
      metalness: 0.05,
    });
    const cupMesh = new THREE.Mesh(cupGeom, cupMat);
    cupMesh.position.y = 0.13;
    cupMesh.castShadow = true;
    cupMesh.receiveShadow = true;
    this.mesh.add(cupMesh);

    // Cup lid
    const lidGeom = getSharedCylinder(0.125, 0.02);
    const lidMat = new THREE.MeshStandardMaterial({ color: '#F1F3F5', roughness: 0.2 });
    const lidMesh = new THREE.Mesh(lidGeom, lidMat);
    lidMesh.position.y = 0.265;
    lidMesh.castShadow = true;
    this.mesh.add(lidMesh);

    // Straw sticking out
    const strawGeom = getSharedCylinder(0.015, 0.12);
    const strawMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.3 });
    const strawMesh = new THREE.Mesh(strawGeom, strawMat);
    strawMesh.position.set(0.02, 0.31, 0);
    strawMesh.rotation.z = -0.15;
    strawMesh.castShadow = true;
    this.mesh.add(strawMesh);
  }

  public dispose(): void {
    while (this.mesh.children.length > 0) {
      const child = this.mesh.children[0] as THREE.Mesh;
      this.mesh.remove(child);
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
  }
}
