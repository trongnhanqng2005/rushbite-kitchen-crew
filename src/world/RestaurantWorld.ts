/**
 * Stylized 3D Restaurant Environment for RushBite: Kitchen Crew.
 * Creates procedural kitchen, service counters, dining area, lighting,
 * and sets up bounding boxes in CollisionWorld.
 */

import * as THREE from 'three';
import { CollisionWorld } from './CollisionWorld.ts';
import { GrillStation } from '../stations/GrillStation.ts';
import { AssemblyStation } from '../stations/AssemblyStation.ts';
import { CashRegisterStation } from '../stations/CashRegisterStation.ts';
import { IngredientCrateStation } from '../stations/IngredientCrateStation.ts';
import { TrashStation } from '../stations/TrashStation.ts';

export class RestaurantWorld {
  public scene: THREE.Scene;
  public collisionWorld: CollisionWorld;

  public grillStation!: GrillStation;
  public assemblyStation!: AssemblyStation;
  public cashRegisterStation!: CashRegisterStation;
  public trashStation!: TrashStation;
  public crateStations: IngredientCrateStation[] = [];

  // Customer waypoints
  public entranceSpawnPoint = new THREE.Vector3(0, 0, 8.5);
  public counterQueuePositions: THREE.Vector3[] = [
    new THREE.Vector3(0, 0, 1.6),   // Front of register
    new THREE.Vector3(0, 0, 3.0),   // 2nd in line
    new THREE.Vector3(0, 0, 4.4),   // 3rd in line
    new THREE.Vector3(0, 0, 5.8),   // 4th in line
  ];
  public exitPoint = new THREE.Vector3(0, 0, 9.5);

  constructor(scene: THREE.Scene, collisionWorld: CollisionWorld) {
    this.scene = scene;
    this.collisionWorld = collisionWorld;

    this.setupLighting();
    this.buildArchitecture();
    this.setupStations();
  }

  private setupLighting(): void {
    // Ambient / Hemisphere lighting for soft baked feel
    const hemiLight = new THREE.HemisphereLight(0xFFF7E6, 0x333B44, 0.85);
    hemiLight.position.set(0, 10, 0);
    this.scene.add(hemiLight);

    // Single primary shadow-casting directional light
    const dirLight = new THREE.DirectionalLight(0xFFF2D1, 1.1);
    dirLight.position.set(5, 8, 3);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 25;
    dirLight.shadow.camera.left = -10;
    dirLight.shadow.camera.right = 10;
    dirLight.shadow.camera.top = 10;
    dirLight.shadow.camera.bottom = -10;
    dirLight.shadow.bias = -0.001;
    this.scene.add(dirLight);

    // Subtle warm point light over cooking station (no shadow casting for 60fps performance)
    const grillLight = new THREE.PointLight(0xFFA726, 0.8, 6);
    grillLight.position.set(-2.5, 2.4, -6.5);
    this.scene.add(grillLight);

    // Subtle warm accent over register
    const counterLight = new THREE.PointLight(0xFFD54F, 0.7, 6);
    counterLight.position.set(0, 2.4, 0.5);
    this.scene.add(counterLight);
  }

  private buildArchitecture(): void {
    // 1. Flooring
    // Kitchen floor (checkered gray/cream tile)
    const kitchenFloorGeom = new THREE.PlaneGeometry(13.6, 9.6);
    const kitchenFloorMat = new THREE.MeshStandardMaterial({
      color: '#E0E3E5',
      roughness: 0.35,
      metalness: 0.1,
    });
    const kitchenFloor = new THREE.Mesh(kitchenFloorGeom, kitchenFloorMat);
    kitchenFloor.rotation.x = -Math.PI / 2;
    kitchenFloor.position.set(0, 0, -4);
    kitchenFloor.receiveShadow = true;
    this.scene.add(kitchenFloor);

    // Dining area floor (warm terracotta/wood)
    const diningFloorGeom = new THREE.PlaneGeometry(13.6, 10);
    const diningFloorMat = new THREE.MeshStandardMaterial({
      color: '#B26237',
      roughness: 0.7,
    });
    const diningFloor = new THREE.Mesh(diningFloorGeom, diningFloorMat);
    diningFloor.rotation.x = -Math.PI / 2;
    diningFloor.position.set(0, 0, 5.0);
    diningFloor.receiveShadow = true;
    this.scene.add(diningFloor);

    // 2. Outer Perimeter Walls
    // Back wall (z = -8.8)
    this.createWall(new THREE.Vector3(0, 2, -8.8), new THREE.Vector3(13.6, 4, 0.4), '#F8F9FA');
    // Front wall with entrance gap (z = 9)
    this.createWall(new THREE.Vector3(-4.5, 2, 9), new THREE.Vector3(4.6, 4, 0.4), '#F8F9FA');
    this.createWall(new THREE.Vector3(4.5, 2, 9), new THREE.Vector3(4.6, 4, 0.4), '#F8F9FA');
    // Entrance overhead lintel
    this.createWall(new THREE.Vector3(0, 3.4, 9), new THREE.Vector3(4.4, 1.2, 0.4), '#E65100');

    // Left wall (x = -6.8)
    this.createWall(new THREE.Vector3(-6.8, 2, 0.1), new THREE.Vector3(0.4, 4, 18), '#F8F9FA');
    // Right wall (x = 6.8)
    this.createWall(new THREE.Vector3(6.8, 2, 0.1), new THREE.Vector3(0.4, 4, 18), '#F8F9FA');

    // 3. Service Counter Divider Wall between kitchen and dining
    // Left counter segment
    this.createCounter(new THREE.Vector3(-2.6, 0.475, 0), new THREE.Vector3(2.4, 0.95, 0.8));
    // Right counter segment
    this.createCounter(new THREE.Vector3(2.6, 0.475, 0), new THREE.Vector3(2.4, 0.95, 0.8));

    // Kitchen swing door opening on far left (x = -5.0) for player passage!
    // Wall segment on far right
    this.createWall(new THREE.Vector3(5.2, 2, 0), new THREE.Vector3(2.8, 4, 0.3), '#2B2D42');

    // 4. Stylized Menu Board above Front Counter
    const menuBoardGeom = new THREE.BoxGeometry(4.2, 1.1, 0.1);
    const menuBoardMat = new THREE.MeshStandardMaterial({
      color: '#1B1C1E',
      emissive: '#0D0E10',
      roughness: 0.3,
    });
    const menuBoard = new THREE.Mesh(menuBoardGeom, menuBoardMat);
    menuBoard.position.set(0, 2.8, 0);
    this.scene.add(menuBoard);

    // Warm Orange decorative trim strip
    const trimGeom = new THREE.BoxGeometry(4.3, 0.08, 0.12);
    const trimMat = new THREE.MeshStandardMaterial({ color: '#FB8500', roughness: 0.4 });
    const trim = new THREE.Mesh(trimGeom, trimMat);
    trim.position.set(0, 2.2, 0);
    this.scene.add(trim);

    // 5. Dining Area Tables & Stools
    this.createDiningTable(new THREE.Vector3(-4.2, 0, 4.0));
    this.createDiningTable(new THREE.Vector3(4.2, 0, 4.0));
    this.createDiningTable(new THREE.Vector3(-4.2, 0, 7.0));
    this.createDiningTable(new THREE.Vector3(4.2, 0, 7.0));
  }

  private createWall(pos: THREE.Vector3, size: THREE.Vector3, color: string): void {
    const geom = new THREE.BoxGeometry(size.x, size.y, size.z);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(pos);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    this.collisionWorld.addBoxFromCenterSize(pos, size, 'Wall');
  }

  private createCounter(pos: THREE.Vector3, size: THREE.Vector3): void {
    const geom = new THREE.BoxGeometry(size.x, size.y, size.z);
    const mat = new THREE.MeshStandardMaterial({ color: '#2B2D42', roughness: 0.4 });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(pos);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    // Top laminate
    const topGeom = new THREE.BoxGeometry(size.x + 0.05, 0.05, size.z + 0.05);
    const topMat = new THREE.MeshStandardMaterial({ color: '#E09F3E', roughness: 0.3 });
    const topMesh = new THREE.Mesh(topGeom, topMat);
    topMesh.position.set(pos.x, pos.y + size.y / 2 + 0.025, pos.z);
    this.scene.add(topMesh);

    this.collisionWorld.addBoxFromCenterSize(pos, size, 'Counter');
  }

  private createDiningTable(pos: THREE.Vector3): void {
    // Table Top
    const tableTopGeom = new THREE.CylinderGeometry(0.7, 0.7, 0.05, 16);
    const tableTopMat = new THREE.MeshStandardMaterial({ color: '#E09F3E', roughness: 0.4 });
    const tableTop = new THREE.Mesh(tableTopGeom, tableTopMat);
    tableTop.position.set(pos.x, 0.8, pos.z);
    tableTop.castShadow = true;
    this.scene.add(tableTop);

    // Table Leg
    const legGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8);
    const legMat = new THREE.MeshStandardMaterial({ color: '#1B1C1E', metalness: 0.8 });
    const leg = new THREE.Mesh(legGeom, legMat);
    leg.position.set(pos.x, 0.4, pos.z);
    this.scene.add(leg);

    // Table collision
    this.collisionWorld.addBoxFromCenterSize(new THREE.Vector3(pos.x, 0.4, pos.z), new THREE.Vector3(1.3, 0.8, 1.3), 'DiningTable');

    // Stools around table
    const stoolOffsets = [
      new THREE.Vector3(-0.9, 0, 0),
      new THREE.Vector3(0.9, 0, 0),
      new THREE.Vector3(0, 0, -0.9),
      new THREE.Vector3(0, 0, 0.9),
    ];
    stoolOffsets.forEach((offset) => {
      const stoolPos = pos.clone().add(offset);
      const stoolGeom = new THREE.CylinderGeometry(0.24, 0.24, 0.48, 12);
      const stoolMat = new THREE.MeshStandardMaterial({ color: '#E63946', roughness: 0.5 });
      const stool = new THREE.Mesh(stoolGeom, stoolMat);
      stool.position.set(stoolPos.x, 0.24, stoolPos.z);
      stool.castShadow = true;
      this.scene.add(stool);
    });
  }

  private setupStations(): void {
    // 1. Grill Station (Back kitchen wall left)
    const grillPos = new THREE.Vector3(-2.8, 0, -7.5);
    this.grillStation = new GrillStation(grillPos);
    this.scene.add(this.grillStation.mesh);
    this.collisionWorld.addBoxFromCenterSize(new THREE.Vector3(grillPos.x, 0.45, grillPos.z), new THREE.Vector3(1.3, 0.9, 1.0), 'GrillStation');

    // 2. Assembly Station (Back kitchen wall center)
    const assemblyPos = new THREE.Vector3(0.5, 0, -7.5);
    this.assemblyStation = new AssemblyStation(assemblyPos);
    this.scene.add(this.assemblyStation.mesh);
    this.collisionWorld.addBoxFromCenterSize(new THREE.Vector3(assemblyPos.x, 0.45, assemblyPos.z), new THREE.Vector3(1.4, 0.9, 1.0), 'AssemblyStation');

    // 3. Trash Can (Back kitchen wall right)
    const trashPos = new THREE.Vector3(3.6, 0, -7.5);
    this.trashStation = new TrashStation(trashPos);
    this.scene.add(this.trashStation.mesh);
    this.collisionWorld.addBoxFromCenterSize(new THREE.Vector3(trashPos.x, 0.45, trashPos.z), new THREE.Vector3(0.7, 0.9, 0.7), 'TrashStation');

    // 4. Ingredient Crate Dispensers (Kitchen Side Counters)
    // Left counter dispensers: Bun, Raw Patty, Cheese, Lettuce
    const bunPos = new THREE.Vector3(-5.8, 0, -5.8);
    const bunCrate = new IngredientCrateStation(bunPos, 'bun_bottom');
    this.scene.add(bunCrate.mesh);
    this.crateStations.push(bunCrate);
    this.collisionWorld.addBoxFromCenterSize(new THREE.Vector3(bunPos.x, 0.45, bunPos.z), new THREE.Vector3(0.8, 0.9, 0.8), 'BunCrate');

    const topBunPos = new THREE.Vector3(-5.8, 0, -4.5);
    const topBunCrate = new IngredientCrateStation(topBunPos, 'bun_top');
    this.scene.add(topBunCrate.mesh);
    this.crateStations.push(topBunCrate);
    this.collisionWorld.addBoxFromCenterSize(new THREE.Vector3(topBunPos.x, 0.45, topBunPos.z), new THREE.Vector3(0.8, 0.9, 0.8), 'TopBunCrate');

    const pattyPos = new THREE.Vector3(-5.8, 0, -3.2);
    const pattyCrate = new IngredientCrateStation(pattyPos, 'raw_patty');
    this.scene.add(pattyCrate.mesh);
    this.crateStations.push(pattyCrate);
    this.collisionWorld.addBoxFromCenterSize(new THREE.Vector3(pattyPos.x, 0.45, pattyPos.z), new THREE.Vector3(0.8, 0.9, 0.8), 'PattyCrate');

    const cheesePos = new THREE.Vector3(-5.8, 0, -1.9);
    const cheeseCrate = new IngredientCrateStation(cheesePos, 'cheese');
    this.scene.add(cheeseCrate.mesh);
    this.crateStations.push(cheeseCrate);
    this.collisionWorld.addBoxFromCenterSize(new THREE.Vector3(cheesePos.x, 0.45, cheesePos.z), new THREE.Vector3(0.8, 0.9, 0.8), 'CheeseCrate');

    // Right counter dispensers: Lettuce, Tomato
    const lettucePos = new THREE.Vector3(5.8, 0, -5.5);
    const lettuceCrate = new IngredientCrateStation(lettucePos, 'lettuce');
    this.scene.add(lettuceCrate.mesh);
    this.crateStations.push(lettuceCrate);
    this.collisionWorld.addBoxFromCenterSize(new THREE.Vector3(lettucePos.x, 0.45, lettucePos.z), new THREE.Vector3(0.8, 0.9, 0.8), 'LettuceCrate');

    const tomatoPos = new THREE.Vector3(5.8, 0, -4.0);
    const tomatoCrate = new IngredientCrateStation(tomatoPos, 'tomato');
    this.scene.add(tomatoCrate.mesh);
    this.crateStations.push(tomatoCrate);
    this.collisionWorld.addBoxFromCenterSize(new THREE.Vector3(tomatoPos.x, 0.45, tomatoPos.z), new THREE.Vector3(0.8, 0.9, 0.8), 'TomatoCrate');

    // 5. Cash Register Station (Front service counter center)
    const registerPos = new THREE.Vector3(0, 0, 0);
    this.cashRegisterStation = new CashRegisterStation(registerPos);
    this.scene.add(this.cashRegisterStation.mesh);
    this.collisionWorld.addBoxFromCenterSize(new THREE.Vector3(registerPos.x, 0.45, registerPos.z), new THREE.Vector3(1.7, 0.95, 1.0), 'RegisterStation');
  }
}
