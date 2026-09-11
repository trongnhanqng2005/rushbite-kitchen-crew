/**
 * Lightweight bounding-box collision engine for restaurant geometry.
 * Provides frame-rate independent capsule-to-AABB sliding collision.
 */

import * as THREE from 'three';

export interface CollisionBox {
  min: THREE.Vector3;
  max: THREE.Vector3;
  name?: string;
}

export class CollisionWorld {
  private boxes: CollisionBox[] = [];

  // Temporary vectors for collision tests to avoid garbage collection
  private testMin = new THREE.Vector3();
  private testMax = new THREE.Vector3();
  private resolvedPos = new THREE.Vector3();

  public addBox(min: THREE.Vector3, max: THREE.Vector3, name?: string): void {
    this.boxes.push({
      min: min.clone(),
      max: max.clone(),
      name,
    });
  }

  public addBoxFromCenterSize(center: THREE.Vector3, size: THREE.Vector3, name?: string): void {
    const half = size.clone().multiplyScalar(0.5);
    this.boxes.push({
      min: new THREE.Vector3().subVectors(center, half),
      max: new THREE.Vector3().addVectors(center, half),
      name,
    });
  }

  public clear(): void {
    this.boxes = [];
  }

  /**
   * Resolves player movement with smooth sliding along obstacle surfaces.
   */
  public resolveMovement(currentPos: THREE.Vector3, moveDelta: THREE.Vector3, radius: number): THREE.Vector3 {
    this.resolvedPos.copy(currentPos);

    // 1. Resolve X movement
    if (Math.abs(moveDelta.x) > 0.0001) {
      this.resolvedPos.x += moveDelta.x;
      for (let i = 0; i < this.boxes.length; i++) {
        const box = this.boxes[i];
        if (this.checkOverlap(this.resolvedPos.x, this.resolvedPos.z, radius, box)) {
          // Slide response
          if (moveDelta.x > 0) {
            this.resolvedPos.x = box.min.x - radius;
          } else {
            this.resolvedPos.x = box.max.x + radius;
          }
        }
      }
    }

    // 2. Resolve Z movement
    if (Math.abs(moveDelta.z) > 0.0001) {
      this.resolvedPos.z += moveDelta.z;
      for (let i = 0; i < this.boxes.length; i++) {
        const box = this.boxes[i];
        if (this.checkOverlap(this.resolvedPos.x, this.resolvedPos.z, radius, box)) {
          // Slide response
          if (moveDelta.z > 0) {
            this.resolvedPos.z = box.min.z - radius;
          } else {
            this.resolvedPos.z = box.max.z + radius;
          }
        }
      }
    }

    return this.resolvedPos;
  }

  private checkOverlap(px: number, pz: number, radius: number, box: CollisionBox): boolean {
    const minX = px - radius;
    const maxX = px + radius;
    const minZ = pz - radius;
    const maxZ = pz + radius;

    return (
      maxX > box.min.x &&
      minX < box.max.x &&
      maxZ > box.min.z &&
      minZ < box.max.z
    );
  }

  public isPointInsideAnyBox(point: THREE.Vector3, radius: number = 0): boolean {
    for (let i = 0; i < this.boxes.length; i++) {
      if (this.checkOverlap(point.x, point.z, radius, this.boxes[i])) {
        return true;
      }
    }
    return false;
  }
}
