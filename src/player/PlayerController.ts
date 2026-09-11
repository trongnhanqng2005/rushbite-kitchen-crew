/**
 * First-person player controller with pointer lock, smooth acceleration/deceleration,
 * frame-rate independent deltaTime motion, and continuous collision response.
 */

import * as THREE from 'three';
import { CollisionWorld } from '../world/CollisionWorld.ts';
import { GameConfig } from '../game/GameConfig.ts';
import { FoodItem } from '../entities/FoodItem.ts';
import { EventBus } from '../core/EventBus.ts';

export class PlayerController {
  public camera: THREE.PerspectiveCamera;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public heldItem: FoodItem | null = null;

  private collisionWorld: CollisionWorld;
  private domElement: HTMLElement;
  private eventBus = EventBus.getInstance();

  // Rotation angles
  private pitch: number = 0; // vertical camera rotation (X-axis)
  private yaw: number = 0;   // horizontal camera rotation (Y-axis)

  // Input states
  private keys: Record<string, boolean> = {
    KeyW: false,
    KeyA: false,
    KeyS: false,
    KeyD: false,
    ShiftLeft: false,
    ShiftRight: false,
  };

  public isPointerLocked: boolean = false;
  private handPivot: THREE.Group;
  private walkBobTimer: number = 0;

  // Reusable vectors to prevent GC allocations in 60fps loop
  private forward = new THREE.Vector3();
  private right = new THREE.Vector3();
  private desiredVelocity = new THREE.Vector3();
  private moveDelta = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, collisionWorld: CollisionWorld) {
    this.camera = camera;
    this.domElement = domElement;
    this.collisionWorld = collisionWorld;

    // Start inside kitchen behind service counter
    this.position = new THREE.Vector3(-1.0, GameConfig.player.eyeHeight, -3.5);
    this.camera.position.copy(this.position);
    this.yaw = 0; // facing forward towards counter
    this.pitch = 0;

    // Hand/held item visual anchor attached directly to camera
    this.handPivot = new THREE.Group();
    this.handPivot.position.set(0.35, -0.32, -0.65);
    this.camera.add(this.handPivot);

    this.bindEvents();
  }

  private bindEvents(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.addEventListener('mousemove', this.onMouseMove);
  }

  public requestPointerLock(): void {
    try {
      this.domElement.requestPointerLock();
    } catch (e) {
      console.warn('[PlayerController] Pointer lock error:', e);
    }
  }

  public unlockPointer(): void {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  private onPointerLockChange = (): void => {
    this.isPointerLocked = document.pointerLockElement === this.domElement;
    this.eventBus.emit('POINTER_LOCK_CHANGED', this.isPointerLocked);
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isPointerLocked) return;

    const sens = GameConfig.player.mouseSensitivity;
    const invert = GameConfig.player.invertY ? -1 : 1;

    this.yaw -= e.movementX * sens;
    this.pitch -= e.movementY * sens * invert;

    // Clamp vertical look angle
    const maxPitch = (Math.PI / 2) * 0.92;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.code in this.keys) {
      this.keys[e.code] = true;
    }
    if (e.code === 'KeyE') {
      this.eventBus.emit('PLAYER_INTERACT_PRESSED', null);
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    if (e.code in this.keys) {
      this.keys[e.code] = false;
    }
  };

  public setHeldItem(item: FoodItem | null): void {
    // Clear old held item from handPivot
    if (this.heldItem && this.heldItem !== item) {
      this.handPivot.remove(this.heldItem.mesh);
    }

    this.heldItem = item;

    if (this.heldItem) {
      this.heldItem.mesh.position.set(0, 0, 0);
      this.heldItem.mesh.rotation.set(0.1, 0.2, 0);
      this.handPivot.add(this.heldItem.mesh);
    }

    this.eventBus.emit('HELD_ITEM_CHANGED', this.heldItem ? {
      type: this.heldItem.type,
      state: this.heldItem.state,
      cookProgress: this.heldItem.cookProgress,
      layers: this.heldItem.stackedIngredients,
    } : null);
  }

  public update(dt: number): void {
    // 1. Update Camera Orientation using Euler
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.camera.rotation.z = 0;

    // 2. Compute Direction Vectors from camera Yaw (planar movement on X-Z)
    this.forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    this.right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();

    let moveX = 0;
    let moveZ = 0;
    if (this.keys.KeyW) moveZ += 1;
    if (this.keys.KeyS) moveZ -= 1;
    if (this.keys.KeyD) moveX += 1;
    if (this.keys.KeyA) moveX -= 1;

    // Desired planar velocity
    this.desiredVelocity.set(0, 0, 0);
    if (moveX !== 0 || moveZ !== 0) {
      this.desiredVelocity
        .addScaledVector(this.forward, moveZ)
        .addScaledVector(this.right, moveX)
        .normalize();

      const isSprinting = this.keys.ShiftLeft || this.keys.ShiftRight;
      const targetSpeed = isSprinting ? GameConfig.player.sprintSpeed : GameConfig.player.moveSpeed;
      this.desiredVelocity.multiplyScalar(targetSpeed);
    }

    // 3. Smooth Acceleration & Deceleration
    const accel = this.desiredVelocity.lengthSq() > 0 ? GameConfig.player.acceleration : GameConfig.player.deceleration;
    this.velocity.x += (this.desiredVelocity.x - this.velocity.x) * Math.min(1.0, accel * dt);
    this.velocity.z += (this.desiredVelocity.z - this.velocity.z) * Math.min(1.0, accel * dt);

    // 4. Resolve Movement with Collision World
    this.moveDelta.copy(this.velocity).multiplyScalar(dt);
    if (this.moveDelta.lengthSq() > 0.000001) {
      const newPos = this.collisionWorld.resolveMovement(
        this.position,
        this.moveDelta,
        GameConfig.player.radius
      );
      this.position.copy(newPos);

      // Walk bobbing effect on hand view model
      this.walkBobTimer += dt * (this.velocity.length() * 2.2);
      this.handPivot.position.y = -0.32 + Math.sin(this.walkBobTimer) * 0.015;
      this.handPivot.position.x = 0.35 + Math.cos(this.walkBobTimer * 0.5) * 0.01;
    } else {
      this.handPivot.position.set(0.35, -0.32, -0.65);
    }

    // Keep camera at eye height
    this.position.y = GameConfig.player.eyeHeight;
    this.camera.position.copy(this.position);
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    document.removeEventListener('mousemove', this.onMouseMove);
  }
}
