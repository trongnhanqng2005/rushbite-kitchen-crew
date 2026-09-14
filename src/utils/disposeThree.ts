import * as THREE from 'three';

/**
 * Three.js Resource Ownership Strategy:
 *
 * 1. Globally Shared Geometries (FoodItem primitives):
 *    - Cached at module scope with `geometry.userData.isShared = true`.
 *    - Reused across multiple FoodItem instances and game sessions.
 *    - MUST NOT be disposed during game disposal or object subtree disposal.
 *
 * 2. Per-Entity Materials (FoodItem, Customer):
 *    - Unique to each entity (e.g. food cook progression lerp, customer mood canvas).
 *    - Disposed explicitly in FoodItem.dispose() and Customer.dispose().
 *
 * 3. Station Geometries & Materials:
 *    - Owned by their respective Station instances (GrillStation, AssemblyStation, etc.).
 *    - Disposed in Station.dispose() alongside any items sitting on them.
 *
 * 4. Architectural & World Meshes:
 *    - Owned by RestaurantWorld. Disposed when RestaurantWorld.dispose() runs.
 *
 * 5. Scene & Lights:
 *    - Directional light shadow maps and materials are disposed in disposeObject3D.
 */
export function disposeObject3D(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry && !mesh.geometry.userData?.isShared) {
        mesh.geometry.dispose();
      }
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    } else if ((child as THREE.Light).isLight) {
      const light = child as THREE.Light;
      if (light.dispose) {
        light.dispose();
      }
      if ((light as THREE.DirectionalLight).shadow?.map) {
        (light as THREE.DirectionalLight).shadow.map?.dispose();
      }
    }
  });

  while (obj.children.length > 0) {
    obj.remove(obj.children[0]);
  }
}
