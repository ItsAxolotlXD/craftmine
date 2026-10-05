import * as THREE from 'three';
import { Chunk, ChunkNeighborAccessor } from './chunk';
import { WorldGenerator, CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z, SEA_LEVEL } from './worldGen';
import { BlockType, BLOCK_DEFS } from './blocks';
import { TextureAtlas } from './textureAtlas';

export interface RaycastHit {
  hit: boolean;
  block: BlockType;
  point: THREE.Vector3;
  normal: THREE.Vector3;
  blockPos: THREE.Vector3; // Integer (x, y, z) of broken/targeted block
  placePos: THREE.Vector3; // Integer (x, y, z) where new block would be placed
}

export class WorldManager implements ChunkNeighborAccessor {
  public chunks: Map<string, Chunk> = new Map();
  public generator: WorldGenerator;
  public atlas: TextureAtlas;
  public scene: THREE.Scene;

  public opaqueMaterial: THREE.MeshLambertMaterial;
  public waterMaterial: THREE.MeshStandardMaterial;

  public renderDistance: number = 3; // Fast, smooth default radius (7x7 chunks)
  public dimension: 'overworld' | 'nether' | 'sift' = 'overworld';

  // Dynamic Torch PointLights (emit light around 20 blocks)
  public torchLights: Map<string, THREE.PointLight> = new Map();

  // Chunk generation and meshing queue (budgeted per frame to prevent lag)
  private loadQueue: { cx: number; cz: number; distSq: number }[] = [];
  private meshQueue: Chunk[] = [];

  // Wireframe box for targeted block
  public targetBoxMesh: THREE.LineSegments;

  constructor(scene: THREE.Scene, atlas: TextureAtlas, seed: number = 4289) {
    this.scene = scene;
    this.atlas = atlas;
    this.generator = new WorldGenerator(seed);

    // High performance opaque material with double side rendering
    this.opaqueMaterial = new THREE.MeshLambertMaterial({
      map: this.atlas.texture,
      vertexColors: true,
      transparent: true,
      alphaTest: 0.1, // Clean leaf punch-through without sorting issues
      side: THREE.DoubleSide,
    });

    // Realistic water material
    this.waterMaterial = new THREE.MeshStandardMaterial({
      map: this.atlas.texture,
      transparent: true,
      opacity: 0.72,
      roughness: 0.15,
      metalness: 0.05,
      side: THREE.DoubleSide,
      depthWrite: true,
    });

    // Target block outline wireframe
    const boxGeo = new THREE.BoxGeometry(1.004, 1.004, 1.004);
    const edges = new THREE.EdgesGeometry(boxGeo);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
    this.targetBoxMesh = new THREE.LineSegments(edges, lineMat);
    this.targetBoxMesh.visible = false;
    this.scene.add(this.targetBoxMesh);
  }

  public getChunkKey(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  // Fast voxel lookup across all loaded chunks
  public getVoxelAt(worldX: number, worldY: number, worldZ: number): BlockType {
    if (worldY < 0 || worldY >= CHUNK_SIZE_Y) return BlockType.AIR;

    const cx = Math.floor(worldX / CHUNK_SIZE_X);
    const cz = Math.floor(worldZ / CHUNK_SIZE_Z);
    const chunk = this.chunks.get(this.getChunkKey(cx, cz));

    if (!chunk) return BlockType.AIR;

    const lx = ((worldX % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X;
    const lz = ((worldZ % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z;

    return chunk.getVoxel(lx, worldY, lz);
  }

  // Get block in world at coordinates
  public getBlockAt(worldX: number, worldY: number, worldZ: number): BlockType {
    if (worldY < 0 || worldY >= CHUNK_SIZE_Y) return BlockType.AIR;
    const cx = Math.floor(worldX / CHUNK_SIZE_X);
    const cz = Math.floor(worldZ / CHUNK_SIZE_Z);
    const chunk = this.chunks.get(this.getChunkKey(cx, cz));
    if (!chunk) return BlockType.AIR;
    const lx = ((worldX % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X;
    const lz = ((worldZ % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z;
    return chunk.getVoxel(lx, worldY, lz);
  }

  // Set block in world
  public setBlockAt(worldX: number, worldY: number, worldZ: number, type: BlockType) {
    if (worldY < 0 || worldY >= CHUNK_SIZE_Y) return;

    const cx = Math.floor(worldX / CHUNK_SIZE_X);
    const cz = Math.floor(worldZ / CHUNK_SIZE_Z);
    const chunk = this.chunks.get(this.getChunkKey(cx, cz));

    if (!chunk) return;

    const lx = ((worldX % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X;
    const lz = ((worldZ % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z;

    const oldBlock = chunk.getVoxel(lx, worldY, lz);
    chunk.setVoxel(lx, worldY, lz, type);
    this.rebuildChunkMesh(chunk);

    // Manage 20-block Dynamic Torch PointLight
    const torchKey = `${worldX},${worldY},${worldZ}`;
    if (type === BlockType.TORCH) {
      if (!this.torchLights.has(torchKey)) {
        // Torch emits warm glow around 20 blocks
        const torchLight = new THREE.PointLight(0xffa544, 2.6, 20, 1.2);
        torchLight.position.set(worldX + 0.5, worldY + 0.7, worldZ + 0.5);
        this.scene.add(torchLight);
        this.torchLights.set(torchKey, torchLight);
      }
    } else if (oldBlock === BlockType.TORCH) {
      const light = this.torchLights.get(torchKey);
      if (light) {
        this.scene.remove(light);
        light.dispose();
        this.torchLights.delete(torchKey);
      }
    }

    // Rebuild adjacent chunks if block is on border
    if (lx === 0) {
      const neighbor = this.chunks.get(this.getChunkKey(cx - 1, cz));
      if (neighbor) this.rebuildChunkMesh(neighbor);
    } else if (lx === CHUNK_SIZE_X - 1) {
      const neighbor = this.chunks.get(this.getChunkKey(cx + 1, cz));
      if (neighbor) this.rebuildChunkMesh(neighbor);
    }

    if (lz === 0) {
      const neighbor = this.chunks.get(this.getChunkKey(cx, cz - 1));
      if (neighbor) this.rebuildChunkMesh(neighbor);
    } else if (lz === CHUNK_SIZE_Z - 1) {
      const neighbor = this.chunks.get(this.getChunkKey(cx, cz + 1));
      if (neighbor) this.rebuildChunkMesh(neighbor);
    }
  }

  private rebuildChunkMesh(chunk: Chunk) {
    // Remove old meshes from scene
    if (chunk.opaqueMesh) {
      this.scene.remove(chunk.opaqueMesh);
    }
    if (chunk.waterMesh) {
      this.scene.remove(chunk.waterMesh);
    }

    // Build fresh meshes
    const { opaque, water } = chunk.buildMesh(this.atlas, this, this.opaqueMaterial, this.waterMaterial);
    chunk.opaqueMesh = opaque;
    chunk.waterMesh = water;

    if (opaque) this.scene.add(opaque);
    if (water) this.scene.add(water);
  }

  /**
   * Main per-frame update loop.
   * Manages streaming chunks in/out with frame budgeting to eliminate stutter.
   */
  public update(playerPos: THREE.Vector3, frameBudgetMs: number = 5.0) {
    const startT = performance.now();

    const playerChunkX = Math.floor(playerPos.x / CHUNK_SIZE_X);
    const playerChunkZ = Math.floor(playerPos.z / CHUNK_SIZE_Z);

    // 1. Identify missing chunks in radius
    const r = this.renderDistance;
    const activeKeys = new Set<string>();

    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (dx * dx + dz * dz > r * r + 1) continue; // Circular radius
        const cx = playerChunkX + dx;
        const cz = playerChunkZ + dz;
        const key = this.getChunkKey(cx, cz);
        activeKeys.add(key);

        if (!this.chunks.has(key)) {
          // Check if already queued
          const alreadyQueued = this.loadQueue.some(item => item.cx === cx && item.cz === cz);
          if (!alreadyQueued) {
            this.loadQueue.push({ cx, cz, distSq: dx * dx + dz * dz });
          }
        }
      }
    }

    // Sort queue so chunks nearest to player generate first!
    if (this.loadQueue.length > 0) {
      this.loadQueue.sort((a, b) => {
        const da = (a.cx - playerChunkX) ** 2 + (a.cz - playerChunkZ) ** 2;
        const db = (b.cx - playerChunkX) ** 2 + (b.cz - playerChunkZ) ** 2;
        return da - db;
      });
    }

    // 2. Unload far chunks outside render distance + 1
    const unloadDistSq = (r + 1) * (r + 1);
    for (const [key, chunk] of this.chunks.entries()) {
      const distSq = (chunk.cx - playerChunkX) ** 2 + (chunk.cz - playerChunkZ) ** 2;
      if (distSq > unloadDistSq) {
        if (chunk.opaqueMesh) this.scene.remove(chunk.opaqueMesh);
        if (chunk.waterMesh) this.scene.remove(chunk.waterMesh);
        chunk.dispose();
        this.chunks.delete(key);
      }
    }

    // 3. Process chunk generation and meshing with strict 1-per-frame limit to eliminate hitching
    let chunksProcessed = 0;
    while (this.loadQueue.length > 0 && chunksProcessed < 1 && (performance.now() - startT < frameBudgetMs)) {
      const item = this.loadQueue.shift();
      if (!item) break;

      const key = this.getChunkKey(item.cx, item.cz);
      if (this.chunks.has(key)) continue;

      // Generate voxel data based on current dimension
      let voxels: Uint8Array;
      if (this.dimension === 'nether') {
        voxels = this.generator.generateNetherChunk(item.cx, item.cz);
      } else if (this.dimension === 'sift') {
        voxels = this.generator.generateSiftChunk(item.cx, item.cz);
      } else {
        voxels = this.generator.generateChunkData(item.cx, item.cz);
      }
      const chunk = new Chunk(item.cx, item.cz, voxels);
      this.chunks.set(key, chunk);

      // Build mesh immediately and add to scene
      const { opaque, water } = chunk.buildMesh(this.atlas, this, this.opaqueMaterial, this.waterMaterial);
      chunk.opaqueMesh = opaque;
      chunk.waterMesh = water;

      if (opaque) this.scene.add(opaque);
      if (water) this.scene.add(water);

      chunksProcessed++;
    }
  }

  /**
   * Fast Voxel DDA (Digital Differential Analyzer) Raycasting.
   * High-precision block detection from camera ray up to maxDistance.
   */
  public raycastBlock(rayOrigin: THREE.Vector3, rayDirection: THREE.Vector3, maxDistance: number = 6.0): RaycastHit {
    const noHit: RaycastHit = {
      hit: false,
      block: BlockType.AIR,
      point: new THREE.Vector3(),
      normal: new THREE.Vector3(),
      blockPos: new THREE.Vector3(),
      placePos: new THREE.Vector3(),
    };

    let px = rayOrigin.x;
    let py = rayOrigin.y;
    let pz = rayOrigin.z;

    const dx = rayDirection.x;
    const dy = rayDirection.y;
    const dz = rayDirection.z;

    let ix = Math.floor(px);
    let iy = Math.floor(py);
    let iz = Math.floor(pz);

    const stepX = dx > 0 ? 1 : -1;
    const stepY = dy > 0 ? 1 : -1;
    const stepZ = dz > 0 ? 1 : -1;

    const deltaX = dx !== 0 ? Math.abs(1 / dx) : Infinity;
    const deltaY = dy !== 0 ? Math.abs(1 / dy) : Infinity;
    const deltaZ = dz !== 0 ? Math.abs(1 / dz) : Infinity;

    let maxX = dx > 0 ? (ix + 1 - px) * deltaX : (px - ix) * deltaX;
    let maxY = dy > 0 ? (iy + 1 - py) * deltaY : (py - iy) * deltaY;
    let maxZ = dz > 0 ? (iz + 1 - pz) * deltaZ : (pz - iz) * deltaZ;

    let normalX = 0;
    let normalY = 0;
    let normalZ = 0;

    let distance = 0;

    while (distance < maxDistance) {
      const block = this.getVoxelAt(ix, iy, iz);
      // We hit a solid non-air block (excluding water so player can build underwater!)
      if (block !== BlockType.AIR && block !== BlockType.WATER) {
        const hitPos = new THREE.Vector3(ix, iy, iz);
        const hitNorm = new THREE.Vector3(normalX, normalY, normalZ);
        const placePos = hitPos.clone().add(hitNorm);

        return {
          hit: true,
          block,
          point: new THREE.Vector3(px + dx * distance, py + dy * distance, pz + dz * distance),
          normal: hitNorm,
          blockPos: hitPos,
          placePos,
        };
      }

      if (maxX < maxY) {
        if (maxX < maxZ) {
          distance = maxX;
          maxX += deltaX;
          ix += stepX;
          normalX = -stepX;
          normalY = 0;
          normalZ = 0;
        } else {
          distance = maxZ;
          maxZ += deltaZ;
          iz += stepZ;
          normalX = 0;
          normalY = 0;
          normalZ = -stepZ;
        }
      } else {
        if (maxY < maxZ) {
          distance = maxY;
          maxY += deltaY;
          iy += stepY;
          normalX = 0;
          normalY = -stepY;
          normalZ = 0;
        } else {
          distance = maxZ;
          maxZ += deltaZ;
          iz += stepZ;
          normalX = 0;
          normalY = 0;
          normalZ = -stepZ;
        }
      }
    }

    return noHit;
  }

  // Update target wireframe cursor
  public updateTargetCursor(hit: RaycastHit) {
    if (hit.hit) {
      this.targetBoxMesh.position.set(
        hit.blockPos.x + 0.5,
        hit.blockPos.y + 0.5,
        hit.blockPos.z + 0.5
      );
      this.targetBoxMesh.visible = true;
    } else {
      this.targetBoxMesh.visible = false;
    }
  }

  // Find a safe spawn position in a slightly flat plain biome (never in forest or mountains)
  public getSpawnPosition(): THREE.Vector3 {
    if (this.dimension === 'sift') {
      return new THREE.Vector3(8.5, 57.5, 8.5);
    }
    if (this.dimension === 'nether') {
      return new THREE.Vector3(8.5, 33.5, 8.5);
    }
    let bestX = 8;
    let bestZ = 8;
    let bestH = 43;
    let foundFlatPlain = false;

    // Search outward in a grid for a flat plains area
    for (let r = 0; r < 200; r += 8) {
      for (let angle = 0; angle < 8; angle++) {
        const rad = (angle / 8) * Math.PI * 2;
        const testX = Math.round(Math.cos(rad) * r);
        const testZ = Math.round(Math.sin(rad) * r);

        const info = this.generator.getTerrainHeight(testX, testZ);
        if (!info.isMountain && !info.isRiver && !info.isPond && !info.isOcean && info.height >= 40 && info.height <= 48) {
          // Check flatness with nearby points
          const h1 = this.generator.getTerrainHeight(testX + 2, testZ).height;
          const h2 = this.generator.getTerrainHeight(testX - 2, testZ).height;
          const h3 = this.generator.getTerrainHeight(testX, testZ + 2).height;
          const h4 = this.generator.getTerrainHeight(testX, testZ - 2).height;

          const slope = Math.abs(h1 - info.height) + Math.abs(h2 - info.height) + Math.abs(h3 - info.height) + Math.abs(h4 - info.height);
          if (slope <= 1) {
            bestX = testX;
            bestZ = testZ;
            bestH = info.height;
            foundFlatPlain = true;
            break;
          }
        }
      }
      if (foundFlatPlain) break;
    }

    // Spawn 2 blocks above ground
    return new THREE.Vector3(bestX + 0.5, bestH + 2.5, bestZ + 0.5);
  }

  // Clear all chunks (e.g. on new seed or dimension change)
  public clearAll() {
    for (const light of this.torchLights.values()) {
      this.scene.remove(light);
      light.dispose();
    }
    this.torchLights.clear();

    for (const chunk of this.chunks.values()) {
      if (chunk.opaqueMesh) this.scene.remove(chunk.opaqueMesh);
      if (chunk.waterMesh) this.scene.remove(chunk.waterMesh);
      chunk.dispose();
    }
    this.chunks.clear();
    this.loadQueue = [];
  }

  // Switch between Overworld, Nether, and The Sift dimensions
  public switchDimension(target: 'overworld' | 'nether' | 'sift') {
    this.clearAll();
    this.dimension = target;
  }

  // Place a full structure at target coordinates
  public placeStructure(type: string, ox: number, oy: number, oz: number) {
    const norm = type.toLowerCase().trim();
    const set = (x: number, y: number, z: number, b: BlockType) => this.setBlockAt(x, y, z, b);

    if (norm.includes('village')) {
      this.generator.buildVillage(set, ox, oy, oz);
    } else if (norm.includes('temple') || norm.includes('desert')) {
      this.generator.buildDesertTemple(set, ox, oy, oz);
    } else if (norm.includes('dungeon')) {
      this.generator.buildDungeon(set, ox, oy, oz);
    } else if (norm.includes('mineshaft')) {
      this.generator.buildMineshaft(set, ox, oy, oz);
    }
  }

  // Ignite nether portal inside obsidian frame
  public ignitePortal(centerX: number, centerY: number, centerZ: number): boolean {
    // Check for surrounding obsidian frame (either X-aligned or Z-aligned)
    // Try Z-aligned frame first:
    const checkFrameZ = () => {
      // Find air space bounds
      let yBottom = centerY;
      while (yBottom > 0 && this.getBlockAt(centerX, yBottom - 1, centerZ) === BlockType.AIR) {
        yBottom--;
      }
      // Check if floor below is obsidian
      if (this.getBlockAt(centerX, yBottom - 1, centerZ) !== BlockType.OBSIDIAN) return false;

      // Find z bounds
      let zMin = centerZ;
      while (this.getBlockAt(centerX, yBottom, zMin - 1) === BlockType.AIR) zMin--;
      let zMax = centerZ;
      while (this.getBlockAt(centerX, yBottom, zMax + 1) === BlockType.AIR) zMax++;

      const width = zMax - zMin + 1;
      if (width < 1 || width > 6) return false;

      // Check height
      let height = 0;
      while (height < 6 && this.getBlockAt(centerX, yBottom + height, zMin) === BlockType.AIR) {
        height++;
      }
      if (height < 2 || height > 6) return false;

      // Fill inner air with nether portal blocks
      for (let z = zMin; z <= zMax; z++) {
        for (let y = yBottom; y < yBottom + height; y++) {
          this.setBlockAt(centerX, y, z, BlockType.NETHER_PORTAL);
        }
      }
      return true;
    };

    // Try X-aligned frame:
    const checkFrameX = () => {
      let yBottom = centerY;
      while (yBottom > 0 && this.getBlockAt(centerX, yBottom - 1, centerZ) === BlockType.AIR) {
        yBottom--;
      }
      if (this.getBlockAt(centerX, yBottom - 1, centerZ) !== BlockType.OBSIDIAN) return false;

      let xMin = centerX;
      while (this.getBlockAt(xMin - 1, yBottom, centerZ) === BlockType.AIR) xMin--;
      let xMax = centerX;
      while (this.getBlockAt(xMax + 1, yBottom, centerZ) === BlockType.AIR) xMax++;

      const width = xMax - xMin + 1;
      if (width < 1 || width > 6) return false;

      let height = 0;
      while (height < 6 && this.getBlockAt(xMin, yBottom + height, centerZ) === BlockType.AIR) {
        height++;
      }
      if (height < 2 || height > 6) return false;

      for (let x = xMin; x <= xMax; x++) {
        for (let y = yBottom; y < yBottom + height; y++) {
          this.setBlockAt(x, y, centerZ, BlockType.NETHER_PORTAL);
        }
      }
      return true;
    };

    if (checkFrameZ()) return true;
    if (checkFrameX()) return true;

    // Fallback: if clicking obsidian or air right next to obsidian, place portal blocks
    const neighbors = [
      [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]
    ];
    let obsidianNeighborCount = 0;
    for (const [dx, dy, dz] of neighbors) {
      if (this.getBlockAt(centerX + dx, centerY + dy, centerZ + dz) === BlockType.OBSIDIAN) {
        obsidianNeighborCount++;
      }
    }
    // Check for Siftstone frame to create Sift Portal
    let siftNeighborCount = 0;
    for (const [dx, dy, dz] of neighbors) {
      if (this.getBlockAt(centerX + dx, centerY + dy, centerZ + dz) === BlockType.SIFTSTONE) {
        siftNeighborCount++;
      }
    }
    if (siftNeighborCount >= 2) {
      this.setBlockAt(centerX, centerY, centerZ, BlockType.SIFT_PORTAL);
      if (this.getBlockAt(centerX, centerY + 1, centerZ) === BlockType.AIR) {
        this.setBlockAt(centerX, centerY + 1, centerZ, BlockType.SIFT_PORTAL);
      }
      return true;
    }

    if (obsidianNeighborCount >= 2) {
      this.setBlockAt(centerX, centerY, centerZ, BlockType.NETHER_PORTAL);
      if (this.getBlockAt(centerX, centerY + 1, centerZ) === BlockType.AIR) {
        this.setBlockAt(centerX, centerY + 1, centerZ, BlockType.NETHER_PORTAL);
      }
      return true;
    }

    return false;
  }
}
