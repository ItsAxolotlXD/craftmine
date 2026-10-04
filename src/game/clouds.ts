import * as THREE from 'three';

/**
 * Procedural Minecraft-style Volumetric Floating Clouds.
 * Renders slightly transparent drifting clouds high above the mountains (Y = 120).
 */

export class CloudSystem {
  public mesh: THREE.Mesh;
  public group: THREE.Group;
  private canvas: HTMLCanvasElement;
  private texture: THREE.CanvasTexture;
  private cloudSize = 1000; // Large coverage across horizon
  private cloudY = 122; // High altitude above mountain peaks

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();

    // Generate 64x64 pixelated procedural cloud texture
    this.canvas = document.createElement('canvas');
    this.canvas.width = 128;
    this.canvas.height = 128;
    const ctx = this.canvas.getContext('2d')!;

    // Transparent background
    ctx.clearRect(0, 0, 128, 128);

    // Generate puffy cloud clusters with pseudo-random cellular automata
    const grid: boolean[][] = Array.from({ length: 32 }, () => Array(32).fill(false));

    // Seeds - dense puffy Minecraft cloud formations
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const n = Math.sin(x * 0.35) * Math.cos(y * 0.35) + Math.sin(x * 0.75 + y * 0.6) * 0.6;
        grid[y][x] = n > 0.15; // Denser cloud coverage
      }
    }

    // Draw 4x4 pixel blocks for authentic Minecraft pixelated cloud appearance
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        if (grid[y][x]) {
          // Cloud core (prominent solid white)
          ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
          ctx.fillRect(x * 4, y * 4, 4, 4);

          // Subtle shadow edge for 3D depth
          ctx.fillStyle = 'rgba(210, 222, 238, 0.9)';
          ctx.fillRect(x * 4, y * 4 + 3, 4, 1);
        }
      }
    }

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.wrapS = THREE.RepeatWrapping;
    this.texture.wrapT = THREE.RepeatWrapping;
    this.texture.repeat.set(10, 10);

    // Cloud Plane Geometry
    const geo = new THREE.PlaneGeometry(this.cloudSize, this.cloudSize);
    geo.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      opacity: 0.92, // Much more visible as requested!
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.cloudY = 105; // Prominent altitude right above trees & hills
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(0, this.cloudY, 0);
    this.group.add(this.mesh);

    // Second layer offset for 3D volumetric cloud underside
    const lowerGeo = new THREE.PlaneGeometry(this.cloudSize, this.cloudSize);
    lowerGeo.rotateX(-Math.PI / 2);
    const lowerMat = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const lowerMesh = new THREE.Mesh(lowerGeo, lowerMat);
    lowerMesh.position.set(12, this.cloudY - 3, 12);
    this.group.add(lowerMesh);

    scene.add(this.group);
  }

  public update(dt: number, playerX: number, playerZ: number) {
    // Follow player horizontally so clouds extend infinitely
    this.group.position.x = playerX;
    this.group.position.z = playerZ;

    // Slowly drift texture offset over time
    this.texture.offset.x = (this.texture.offset.x + dt * 0.0035) % 1.0;
    this.texture.offset.y = (this.texture.offset.y + dt * 0.0018) % 1.0;
  }

  public dispose() {
    this.texture.dispose();
    this.group.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });
  }
}
