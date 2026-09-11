/**
 * Customer entity with state machine, low-poly procedural 3D model,
 * patience tracking and satisfaction calculation.
 */

import * as THREE from 'three';
import { Recipe } from '../data/recipes.ts';
import { Order } from './Order.ts';

export type CustomerState =
  | 'ENTERING'
  | 'WAITING_TO_ORDER'
  | 'ORDERING'
  | 'WAITING_FOR_FOOD'
  | 'RECEIVING_ORDER'
  | 'LEAVING'
  | 'ANGRY_LEAVING';

const SHIRT_COLORS = ['#E63946', '#457B9D', '#2A9D8F', '#E76F51', '#6A4C93', '#F4A261'];
const SKIN_COLORS = ['#F8D7B8', '#D79E78', '#A9704F', '#6E452E', '#E4B590'];

export class Customer {
  public readonly id: string;
  public state: CustomerState = 'ENTERING';
  public order: Order | null = null;
  public desiredRecipe: Recipe | null = null;
  public satisfaction: number = 1.0; // 0.0 to 1.0

  public mesh: THREE.Group;
  public targetPosition: THREE.Vector3 = new THREE.Vector3();
  public currentPosition: THREE.Vector3 = new THREE.Vector3();
  public walkSpeed: number = 2.4;

  public queueIndex: number = 0;
  private animTimer: number = Math.random() * 10;
  private bodyMesh?: THREE.Mesh;
  private headMesh?: THREE.Mesh;

  // Overhead mood indicator
  private moodSprite?: THREE.Sprite;
  private static canvasCache: HTMLCanvasElement | null = null;
  private static tempDir = new THREE.Vector3();

  constructor(id: string, startPos: THREE.Vector3) {
    this.id = id;
    this.currentPosition.copy(startPos);
    this.targetPosition.copy(startPos);

    this.mesh = new THREE.Group();
    this.mesh.position.copy(startPos);
    this.mesh.name = `Customer_${id}`;

    this.buildStylizedModel();
  }

  private buildStylizedModel(): void {
    const shirtColor = SHIRT_COLORS[Math.floor(Math.random() * SHIRT_COLORS.length)];
    const skinColor = SKIN_COLORS[Math.floor(Math.random() * SKIN_COLORS.length)];

    // Body / Torso
    const bodyGeom = new THREE.CylinderGeometry(0.3, 0.35, 0.9, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.6 });
    this.bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
    this.bodyMesh.position.y = 0.85;
    this.bodyMesh.castShadow = true;
    this.mesh.add(this.bodyMesh);

    // Legs
    const legGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.45, 6);
    const legMat = new THREE.MeshStandardMaterial({ color: '#2B2D42', roughness: 0.8 });
    const legL = new THREE.Mesh(legGeom, legMat);
    legL.position.set(-0.16, 0.225, 0);
    const legR = new THREE.Mesh(legGeom, legMat);
    legR.position.set(0.16, 0.225, 0);
    this.mesh.add(legL);
    this.mesh.add(legR);

    // Head
    const headGeom = new THREE.SphereGeometry(0.24, 10, 10);
    const headMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.5 });
    this.headMesh = new THREE.Mesh(headGeom, headMat);
    this.headMesh.position.y = 1.48;
    this.headMesh.castShadow = true;
    this.mesh.add(this.headMesh);

    // Casual Cap
    const capGeom = new THREE.CylinderGeometry(0.26, 0.26, 0.08, 8);
    const capMat = new THREE.MeshStandardMaterial({ color: '#1D3557' });
    const cap = new THREE.Mesh(capGeom, capMat);
    cap.position.y = 1.62;
    this.mesh.add(cap);

    // Mood indicator sprite above head
    this.setupMoodSprite();
  }

  private setupMoodSprite(): void {
    if (!Customer.canvasCache) {
      Customer.canvasCache = document.createElement('canvas');
      Customer.canvasCache.width = 128;
      Customer.canvasCache.height = 128;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.font = '72px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💬', 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    this.moodSprite = new THREE.Sprite(spriteMat);
    this.moodSprite.scale.set(0.65, 0.65, 0.65);
    this.moodSprite.position.set(0, 2.05, 0);
    this.mesh.add(this.moodSprite);
  }

  public updateMoodIcon(emoji: string): void {
    if (!this.moodSprite || !this.moodSprite.material.map) return;
    const canvas = (this.moodSprite.material.map as THREE.CanvasTexture).image as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 128, 128);
    // Draw rounded background pill
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(64, 64, 52, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 4;
    ctx.strokeStyle = '#D97706';
    ctx.stroke();

    ctx.font = '54px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 64, 66);

    this.moodSprite.material.map.needsUpdate = true;
  }

  public updateMovement(dt: number): void {
    const distSq = this.currentPosition.distanceToSquared(this.targetPosition);
    if (distSq > 0.005) {
      Customer.tempDir.subVectors(this.targetPosition, this.currentPosition).normalize();
      this.currentPosition.addScaledVector(Customer.tempDir, this.walkSpeed * dt);
      this.mesh.position.copy(this.currentPosition);

      // Rotate towards target
      const angle = Math.atan2(Customer.tempDir.x, Customer.tempDir.z);
      this.mesh.rotation.y = angle;

      // Subtle walking bounce
      this.animTimer += dt * 10;
      if (this.bodyMesh) {
        this.bodyMesh.position.y = 0.85 + Math.sin(this.animTimer) * 0.04;
      }
    } else {
      this.currentPosition.copy(this.targetPosition);
      this.mesh.position.copy(this.currentPosition);
    }
  }

  public dispose(): void {
    if (this.moodSprite) {
      if (this.moodSprite.material.map) {
        this.moodSprite.material.map.dispose();
      }
      this.moodSprite.material.dispose();
    }
    while (this.mesh.children.length > 0) {
      const child = this.mesh.children[0] as THREE.Mesh;
      this.mesh.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material.dispose();
      }
    }
  }
}
