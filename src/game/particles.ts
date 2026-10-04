import * as THREE from 'three';
import { BLOCK_DEFS, BlockType } from './blocks';

interface VoxelParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  vrx: number;
  vry: number;
  vrz: number;
  life: number;
  maxLife: number;
  scale: number;
  color: THREE.Color;
}

export class ParticleSystem {
  private readonly maxParticles = 180;
  private particles: VoxelParticle[] = [];
  public mesh: THREE.InstancedMesh;
  private dummy: THREE.Object3D = new THREE.Object3D();
  private colorHelper: THREE.Color = new THREE.Color();

  constructor(scene: THREE.Scene) {
    // 3D miniature cube geometry for authentic Minecraft break debris!
    const cubeGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
    const mat = new THREE.MeshLambertMaterial({
      vertexColors: false,
      transparent: true,
      opacity: 0.95,
    });

    this.mesh = new THREE.InstancedMesh(cubeGeo, mat, this.maxParticles);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);

    // Initialize particle pool
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -9999,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        rx: 0,
        ry: 0,
        rz: 0,
        vrx: 0,
        vry: 0,
        vrz: 0,
        life: 0,
        maxLife: 1,
        scale: 1,
        color: new THREE.Color(0xffffff),
      });

      this.dummy.position.set(0, -9999, 0);
      this.dummy.scale.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      this.mesh.setColorAt(i, new THREE.Color(0xffffff));
    }

    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  // Spawn vigorous 3D miniature block debris
  public spawnBlockBreak(x: number, y: number, z: number, blockType: BlockType) {
    const def = BLOCK_DEFS[blockType];
    const hex = def ? def.colorHex : '#777777';
    const baseColor = new THREE.Color(hex);

    const burstCount = 28;
    let spawned = 0;

    for (let i = 0; i < this.maxParticles && spawned < burstCount; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.x = x + 0.5 + (Math.random() - 0.5) * 0.7;
        p.y = y + 0.5 + (Math.random() - 0.5) * 0.7;
        p.z = z + 0.5 + (Math.random() - 0.5) * 0.7;

        // Explosive burst velocity
        const angle = Math.random() * Math.PI * 2;
        const speed = 2.5 + Math.random() * 3.5;
        p.vx = Math.cos(angle) * speed;
        p.vy = 2.5 + Math.random() * 4.0; // Upward jump
        p.vz = Math.sin(angle) * speed;

        // Tumble rotation
        p.rx = Math.random() * Math.PI;
        p.ry = Math.random() * Math.PI;
        p.rz = Math.random() * Math.PI;
        p.vrx = (Math.random() - 0.5) * 12;
        p.vry = (Math.random() - 0.5) * 12;
        p.vrz = (Math.random() - 0.5) * 12;

        p.life = 0;
        p.maxLife = 0.7 + Math.random() * 0.4;
        p.scale = 0.8 + Math.random() * 0.6;

        // Color jitter
        p.color.copy(baseColor);
        p.color.offsetHSL(0, 0, (Math.random() - 0.5) * 0.2);

        this.mesh.setColorAt(i, p.color);
        spawned++;
      }
    }

    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
  }

  public update(dt: number) {
    const gravity = -18.0;
    let anyNeedsUpdate = false;

    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        this.dummy.position.set(0, -9999, 0);
        this.dummy.scale.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);
        anyNeedsUpdate = true;
        continue;
      }

      // Physics
      p.vy += gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      // Air drag
      p.vx *= 0.95;
      p.vz *= 0.95;

      // Rotation
      p.rx += p.vrx * dt;
      p.ry += p.vry * dt;
      p.rz += p.vrz * dt;

      // Shrink slightly near end of life
      const progress = p.life / p.maxLife;
      const currentScale = progress > 0.6 ? p.scale * (1 - (progress - 0.6) / 0.4) : p.scale;

      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.rotation.set(p.rx, p.ry, p.rz);
      this.dummy.scale.set(currentScale, currentScale, currentScale);
      this.dummy.updateMatrix();

      this.mesh.setMatrixAt(i, this.dummy.matrix);
      anyNeedsUpdate = true;
    }

    if (anyNeedsUpdate) {
      this.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  public dispose() {
    this.mesh.geometry.dispose();
    if (this.mesh.material instanceof THREE.Material) {
      this.mesh.material.dispose();
    }
  }
}
