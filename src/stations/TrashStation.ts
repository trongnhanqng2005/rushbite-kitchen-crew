/**
 * Trash bin station for discarding burned patties, mistakes, or cleaning hands.
 */

import * as THREE from 'three';
import { Interactable } from '../systems/InteractionSystem.ts';
import { FoodItem } from '../entities/FoodItem.ts';
import { SoundManager } from '../audio/SoundManager.ts';
import { disposeObject3D } from '../utils/disposeThree.ts';

export class TrashStation implements Interactable {
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  private soundManager = SoundManager.getInstance();

  constructor(position: THREE.Vector3) {
    this.position = position.clone();
    this.mesh = new THREE.Group();
    this.mesh.position.copy(position);

    this.buildTrashMesh();
  }

  public getInteractionPosition(): THREE.Vector3 {
    return this.position;
  }

  private buildTrashMesh(): void {
    // Stainless steel commercial bin
    const binGeom = new THREE.CylinderGeometry(0.3, 0.26, 0.85, 16);
    const binMat = new THREE.MeshStandardMaterial({ color: '#4A5568', metalness: 0.6, roughness: 0.3 });
    const binMesh = new THREE.Mesh(binGeom, binMat);
    binMesh.position.y = 0.425;
    binMesh.castShadow = true;
    binMesh.receiveShadow = true;
    this.mesh.add(binMesh);

    // Lid rim
    const rimGeom = new THREE.CylinderGeometry(0.32, 0.32, 0.08, 16);
    const rimMat = new THREE.MeshStandardMaterial({ color: '#2D3748', metalness: 0.4, roughness: 0.5 });
    const rimMesh = new THREE.Mesh(rimGeom, rimMat);
    rimMesh.position.y = 0.86;
    this.mesh.add(rimMesh);
  }

  public canInteract(heldItem: FoodItem | null): boolean {
    return heldItem !== null;
  }

  public interact(heldItem: FoodItem | null): FoodItem | null {
    if (heldItem) {
      heldItem.dispose();
      this.soundManager.playTrash();
      return null;
    }
    return null;
  }

  public getInteractionLabel(heldItem: FoodItem | null): string {
    if (heldItem) {
      return `[E] Throw Away ${heldItem.type === 'assembled_burger' ? 'Burger' : 'Item'}`;
    }
    return 'Trash Bin (Empty Hands)';
  }

  public dispose(): void {
    disposeObject3D(this.mesh);
  }
}
