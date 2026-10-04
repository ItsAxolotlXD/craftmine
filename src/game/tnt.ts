import * as THREE from 'three';
import { BlockType } from './blocks';
import { TextureAtlas } from './textureAtlas';
import { WorldManager } from './world';
import { ParticleSystem } from './particles';
import { soundEngine } from './audio';

interface PrimedTNT {
  group: THREE.Group;
  mesh: THREE.Mesh;
  whiteMat: THREE.MeshBasicMaterial;
  tntMat: THREE.MeshLambertMaterial;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  fuseTimer: number; // 2.5s fuse
  flashTimer: number;
  isFlashingWhite: boolean;
}

export class TNTManager {
  private primedTNTs: PrimedTNT[] = [];
  public group: THREE.Group;
  private atlas: TextureAtlas;
  private world: WorldManager;
  private particles: ParticleSystem;

  constructor(scene: THREE.Scene, atlas: TextureAtlas, world: WorldManager, particles: ParticleSystem) {
    this.group = new THREE.Group();
    scene.add(this.group);
    this.atlas = atlas;
    this.world = world;
    this.particles = particles;
  }

  // Ignite a TNT block at world coordinates
  public igniteTNT(bx: number, by: number, bz: number) {
    // 1. Remove the static block from world immediately
    this.world.setBlockAt(bx, by, bz, BlockType.AIR);

    // 2. Play flint & steel spark and fuse hiss
    soundEngine.playFlintAndSteel();
    soundEngine.playFuseHiss();

    // 3. Create Primed TNT mesh
    const geo = new THREE.BoxGeometry(0.98, 0.98, 0.98);
    const tntMat = new THREE.MeshLambertMaterial({
      map: this.atlas.texture,
      color: 0xffffff,
    });
    const whiteMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });

    const mesh = new THREE.Mesh(geo, tntMat);
    const primedGroup = new THREE.Group();
    primedGroup.position.set(bx + 0.5, by, bz + 0.5);
    primedGroup.add(mesh);
    this.group.add(primedGroup);

    this.primedTNTs.push({
      group: primedGroup,
      mesh,
      whiteMat,
      tntMat,
      x: bx + 0.5,
      y: by,
      z: bz + 0.5,
      vx: (Math.random() - 0.5) * 0.8,
      vy: 2.2, // Small upward hop when ignited
      vz: (Math.random() - 0.5) * 0.8,
      fuseTimer: 2.5,
      flashTimer: 0,
      isFlashingWhite: false,
    });
  }

  public update(dt: number, playerPos: THREE.Vector3, onPlayerKnockback?: (kx: number, ky: number, kz: number) => void) {
    const gravity = -14.0;

    for (let i = this.primedTNTs.length - 1; i >= 0; i--) {
      const tnt = this.primedTNTs[i];
      tnt.fuseTimer -= dt;
      tnt.flashTimer += dt;

      // Physics (hop & fall)
      tnt.vy += gravity * dt;
      tnt.x += tnt.vx * dt;
      tnt.y += tnt.vy * dt;
      tnt.z += tnt.vz * dt;

      // Floor collision check with world
      const groundH = this.world.generator.getTerrainHeight(Math.floor(tnt.x), Math.floor(tnt.z)).height;
      if (tnt.y < groundH) {
        tnt.y = groundH;
        tnt.vy = 0;
        tnt.vx *= 0.8;
        tnt.vz *= 0.8;
      }

      tnt.group.position.set(tnt.x, tnt.y, tnt.z);

      // Flashing white animation & swelling
      if (tnt.flashTimer >= 0.22) {
        tnt.flashTimer = 0;
        tnt.isFlashingWhite = !tnt.isFlashingWhite;
        tnt.mesh.material = tnt.isFlashingWhite ? tnt.whiteMat : tnt.tntMat;
      }

      // Swell slightly as fuse ticks down
      const swell = 1.0 + (1.0 - tnt.fuseTimer / 2.5) * 0.15;
      tnt.mesh.scale.set(swell, swell, swell);

      // EXPLOSION!
      if (tnt.fuseTimer <= 0) {
        this.explode(tnt.x, tnt.y, tnt.z, playerPos, onPlayerKnockback);
        this.group.remove(tnt.group);
        tnt.mesh.geometry.dispose();
        tnt.whiteMat.dispose();
        tnt.tntMat.dispose();
        this.primedTNTs.splice(i, 1);
      }
    }
  }

  // Execute crater blast (10 blocks wide, 5 blocks deep)
  private explode(
    ex: number,
    ey: number,
    ez: number,
    playerPos: THREE.Vector3,
    onPlayerKnockback?: (kx: number, ky: number, kz: number) => void
  ) {
    // 1. Play massive explosion sound
    soundEngine.playExplosion();

    const originX = Math.floor(ex);
    const originY = Math.floor(ey);
    const originZ = Math.floor(ez);

    const radiusH = 5; // 10 blocks wide diameter = radius 5
    const depthV = 5;  // 5 blocks deep

    // 2. Clear crater blocks
    for (let dy = -depthV; dy <= 2; dy++) {
      for (let dx = -radiusH; dx <= radiusH; dx++) {
        for (let dz = -radiusH; dz <= radiusH; dz++) {
          const distH = Math.sqrt(dx * dx + dz * dz);
          // Ellipsoidal blast profile: 10 blocks wide, 5 blocks deep
          const normalizedDist = (distH / radiusH) ** 2 + ((dy < 0 ? Math.abs(dy) / depthV : dy / 2)) ** 2;

          if (normalizedDist <= 1.05 + Math.random() * 0.15) {
            const bx = originX + dx;
            const by = originY + dy;
            const bz = originZ + dz;

            const existingBlock = this.world.getBlockAt(bx, by, bz);
            // Never break Bedrock or Air
            if (existingBlock !== BlockType.AIR && existingBlock !== BlockType.BEDROCK) {
              this.world.setBlockAt(bx, by, bz, BlockType.AIR);

              // Burst debris for edge blocks
              if (Math.random() < 0.25) {
                this.particles.spawnBlockBreak(bx, by, bz, existingBlock);
              }
            }
          }
        }
      }
    }

    // 3. Huge explosive particle burst
    for (let i = 0; i < 3; i++) {
      this.particles.spawnBlockBreak(originX, originY + i, originZ, BlockType.TNT);
      this.particles.spawnBlockBreak(originX + (Math.random() - 0.5) * 3, originY, originZ + (Math.random() - 0.5) * 3, BlockType.DIRT);
    }

    // 4. Knockback on player if nearby
    const dx = playerPos.x - ex;
    const dy = playerPos.y - ey;
    const dz = playerPos.z - ez;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist < 9.0 && onPlayerKnockback) {
      const force = Math.max(0, (9.0 - dist) / 9.0) * 16.0;
      const kx = (dx / Math.max(0.1, dist)) * force;
      const ky = Math.max(6.0, (dy / Math.max(0.1, dist)) * force + 4.0);
      const kz = (dz / Math.max(0.1, dist)) * force;
      onPlayerKnockback(kx, ky, kz);
    }
  }

  public dispose() {
    for (const tnt of this.primedTNTs) {
      this.group.remove(tnt.group);
      tnt.mesh.geometry.dispose();
      tnt.whiteMat.dispose();
      tnt.tntMat.dispose();
    }
    this.primedTNTs = [];
  }
}
