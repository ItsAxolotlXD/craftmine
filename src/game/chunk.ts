import * as THREE from 'three';
import { BlockType, BLOCK_DEFS, getFaceTextureIndex } from './blocks';
import { CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z } from './worldGen';
import { TextureAtlas } from './textureAtlas';

export interface ChunkNeighborAccessor {
  getVoxelAt(worldX: number, worldY: number, worldZ: number): BlockType;
}

export class Chunk {
  public cx: number;
  public cz: number;
  public voxels: Uint8Array;
  public opaqueMesh: THREE.Mesh | null = null;
  public waterMesh: THREE.Mesh | null = null;
  public isDirty: boolean = true;
  public isDisposed: boolean = false;

  constructor(cx: number, cz: number, voxels: Uint8Array) {
    this.cx = cx;
    this.cz = cz;
    this.voxels = voxels;
  }

  // Get index in 1D array
  private getIndex(x: number, y: number, z: number): number {
    return x + CHUNK_SIZE_X * (y + CHUNK_SIZE_Y * z);
  }

  public getVoxel(x: number, y: number, z: number): BlockType {
    if (x < 0 || x >= CHUNK_SIZE_X || y < 0 || y >= CHUNK_SIZE_Y || z < 0 || z >= CHUNK_SIZE_Z) {
      return BlockType.AIR;
    }
    return this.voxels[this.getIndex(x, y, z)];
  }

  public setVoxel(x: number, y: number, z: number, type: BlockType) {
    if (x < 0 || x >= CHUNK_SIZE_X || y < 0 || y >= CHUNK_SIZE_Y || z < 0 || z >= CHUNK_SIZE_Z) return;
    this.voxels[this.getIndex(x, y, z)] = type;
    this.isDirty = true;
  }

  /**
   * Builds high-performance culled voxel mesh.
   * Uses ambient occlusion calculation and texture atlas UV mapping.
   */
  public buildMesh(
    atlas: TextureAtlas,
    world: ChunkNeighborAccessor,
    opaqueMat: THREE.Material,
    waterMat: THREE.Material
  ): { opaque: THREE.Mesh | null; water: THREE.Mesh | null } {
    const worldStartX = this.cx * CHUNK_SIZE_X;
    const worldStartZ = this.cz * CHUNK_SIZE_Z;

    // Buffers for opaque blocks
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    // Buffers for water blocks
    const waterPositions: number[] = [];
    const waterNormals: number[] = [];
    const waterUvs: number[] = [];
    const waterColors: number[] = [];
    const waterIndices: number[] = [];

    let opaqueVertCount = 0;
    let waterVertCount = 0;

    // Helper to get voxel across chunk borders
    const sampleVoxel = (lx: number, ly: number, lz: number): BlockType => {
      if (ly < 0 || ly >= CHUNK_SIZE_Y) return BlockType.AIR;
      if (lx >= 0 && lx < CHUNK_SIZE_X && lz >= 0 && lz < CHUNK_SIZE_Z) {
        return this.voxels[this.getIndex(lx, ly, lz)];
      }
      return world.getVoxelAt(worldStartX + lx, ly, worldStartZ + lz);
    };

    // Fast check for solidness (blocks light for AO and face culling)
    const isSolid = (b: BlockType): boolean => {
      if (b === BlockType.AIR) return false;
      const def = BLOCK_DEFS[b];
      return def ? !def.transparent : false;
    };

    // Calculate vertex ambient occlusion (0 = darkest in corner, 3 = brightest exposed)
    const vertexAO = (side1: boolean, side2: boolean, corner: boolean): number => {
      if (side1 && side2) return 0; // Completely enclosed corner
      return 3 - ((side1 ? 1 : 0) + (side2 ? 1 : 0) + (corner ? 1 : 0));
    };

    // Ambient occlusion brightness multipliers
    const aoMultipliers = [0.45, 0.65, 0.82, 1.0];

    // Iterate through all voxels in the chunk
    for (let y = 0; y < CHUNK_SIZE_Y; y++) {
      for (let z = 0; z < CHUNK_SIZE_Z; z++) {
        for (let x = 0; x < CHUNK_SIZE_X; x++) {
          const block = this.voxels[this.getIndex(x, y, z)] as BlockType;
          if (block === BlockType.AIR) continue;

          const def = BLOCK_DEFS[block];
          if (!def) continue;

          const isWater = (block === BlockType.WATER);

          // Handle special non-cube blocks (flowers, mushrooms, torches, cave vines, dripleaf, willow bush)
          if (block === BlockType.FLOWER_RED || block === BlockType.FLOWER_YELLOW ||
              block === BlockType.MUSHROOM || block === BlockType.TORCH ||
              block === BlockType.CAVE_VINES || block === BlockType.DRIPLEAF ||
              block === BlockType.WILLOW_BUSH) {
            this.buildCrossedQuad(
              x, y, z, block, atlas,
              positions, normals, uvs, colors, indices,
              opaqueVertCount
            );
            opaqueVertCount += 8;
            continue;
          }

          // Check 6 adjacent directions
          // 0: +Y (Top)
          // 1: -Y (Bottom)
          // 2: +Z (North / Front)
          // 3: -Z (South / Back)
          // 4: +X (East / Right)
          // 5: -X (West / Left)

          // 1. TOP FACE (+Y)
          const nTop = sampleVoxel(x, y + 1, z);
          const drawTop = isWater ? (nTop !== BlockType.WATER) : (!isSolid(nTop) || BLOCK_DEFS[nTop]?.transparent);
          if (drawTop) {
            const tileIdx = getFaceTextureIndex(block, 'top');
            const [u0, v0, u1, v1] = atlas.getUVs(tileIdx);

            let ao0 = 1, ao1 = 1, ao2 = 1, ao3 = 1;
            if (!isWater) {
              const sW = isSolid(sampleVoxel(x - 1, y + 1, z));
              const sE = isSolid(sampleVoxel(x + 1, y + 1, z));
              const sN = isSolid(sampleVoxel(x, y + 1, z + 1));
              const sS = isSolid(sampleVoxel(x, y + 1, z - 1));
              ao0 = aoMultipliers[vertexAO(sW, sS, isSolid(sampleVoxel(x - 1, y + 1, z - 1)))];
              ao1 = aoMultipliers[vertexAO(sE, sS, isSolid(sampleVoxel(x + 1, y + 1, z - 1)))];
              ao2 = aoMultipliers[vertexAO(sE, sN, isSolid(sampleVoxel(x + 1, y + 1, z + 1)))];
              ao3 = aoMultipliers[vertexAO(sW, sN, isSolid(sampleVoxel(x - 1, y + 1, z + 1)))];
            }

            // Sunlight multiplier for top face
            const topLight = 1.0;

            if (isWater) {
              // Water top sits slightly below full block for realistic river/pond surface
              const wy = y + 0.9;
              waterPositions.push(
                x, wy, z + 1,
                x + 1, wy, z + 1,
                x + 1, wy, z,
                x, wy, z
              );
              waterNormals.push(0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0);
              waterUvs.push(u0, v0,  u1, v0,  u1, v1,  u0, v1);
              waterColors.push(
                topLight, topLight, topLight,
                topLight, topLight, topLight,
                topLight, topLight, topLight,
                topLight, topLight, topLight
              );
              waterIndices.push(
                waterVertCount, waterVertCount + 1, waterVertCount + 2,
                waterVertCount, waterVertCount + 2, waterVertCount + 3
              );
              waterVertCount += 4;
            } else {
              positions.push(
                x, y + 1, z + 1,
                x + 1, y + 1, z + 1,
                x + 1, y + 1, z,
                x, y + 1, z
              );
              normals.push(0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0);
              uvs.push(u0, v0,  u1, v0,  u1, v1,  u0, v1);
              colors.push(
                ao3 * topLight, ao3 * topLight, ao3 * topLight,
                ao2 * topLight, ao2 * topLight, ao2 * topLight,
                ao1 * topLight, ao1 * topLight, ao1 * topLight,
                ao0 * topLight, ao0 * topLight, ao0 * topLight
              );
              indices.push(
                opaqueVertCount, opaqueVertCount + 1, opaqueVertCount + 2,
                opaqueVertCount, opaqueVertCount + 2, opaqueVertCount + 3
              );
              opaqueVertCount += 4;
            }
          }

          // 2. BOTTOM FACE (-Y)
          const nBottom = sampleVoxel(x, y - 1, z);
          const drawBottom = isWater ? (nBottom !== BlockType.WATER) : (!isSolid(nBottom) || BLOCK_DEFS[nBottom]?.transparent);
          if (drawBottom && y > 0) {
            const tileIdx = getFaceTextureIndex(block, 'bottom');
            const [u0, v0, u1, v1] = atlas.getUVs(tileIdx);
            const botLight = 0.55; // Shadowed bottom

            const targetPos = isWater ? waterPositions : positions;
            const targetNorm = isWater ? waterNormals : normals;
            const targetUv = isWater ? waterUvs : uvs;
            const targetCol = isWater ? waterColors : colors;
            const targetInd = isWater ? waterIndices : indices;
            const curVert = isWater ? waterVertCount : opaqueVertCount;

            targetPos.push(
              x, y, z + 1,
              x + 1, y, z + 1,
              x + 1, y, z,
              x, y, z
            );
            targetNorm.push(0, -1, 0,  0, -1, 0,  0, -1, 0,  0, -1, 0);
            targetUv.push(u0, v0,  u1, v0,  u1, v1,  u0, v1);
            targetCol.push(
              botLight, botLight, botLight,
              botLight, botLight, botLight,
              botLight, botLight, botLight,
              botLight, botLight, botLight
            );
            // Counter-clockwise winding when viewed from below so -Y normal is not culled
            targetInd.push(
              curVert, curVert + 2, curVert + 1,
              curVert, curVert + 3, curVert + 2
            );

            if (isWater) waterVertCount += 4;
            else opaqueVertCount += 4;
          }

          // 3. NORTH FACE (+Z)
          const nNorth = sampleVoxel(x, y, z + 1);
          const drawNorth = isWater ? (nNorth !== BlockType.WATER && nNorth !== BlockType.AIR) : (!isSolid(nNorth) || (BLOCK_DEFS[nNorth]?.transparent && nNorth !== block));
          if (drawNorth) {
            const tileIdx = getFaceTextureIndex(block, 'north');
            const [u0, v0, u1, v1] = atlas.getUVs(tileIdx);
            const sideLight = 0.8;

            const targetPos = isWater ? waterPositions : positions;
            const targetNorm = isWater ? waterNormals : normals;
            const targetUv = isWater ? waterUvs : uvs;
            const targetCol = isWater ? waterColors : colors;
            const targetInd = isWater ? waterIndices : indices;
            const curVert = isWater ? waterVertCount : opaqueVertCount;

            targetPos.push(
              x, y, z + 1,
              x + 1, y, z + 1,
              x + 1, y + 1, z + 1,
              x, y + 1, z + 1
            );
            targetNorm.push(0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1);
            targetUv.push(u0, v0,  u1, v0,  u1, v1,  u0, v1);
            targetCol.push(
              sideLight, sideLight, sideLight,
              sideLight, sideLight, sideLight,
              sideLight, sideLight, sideLight,
              sideLight, sideLight, sideLight
            );
            targetInd.push(
              curVert, curVert + 1, curVert + 2,
              curVert, curVert + 2, curVert + 3
            );

            if (isWater) waterVertCount += 4;
            else opaqueVertCount += 4;
          }

          // 4. SOUTH FACE (-Z)
          const nSouth = sampleVoxel(x, y, z - 1);
          const drawSouth = isWater ? (nSouth !== BlockType.WATER && nSouth !== BlockType.AIR) : (!isSolid(nSouth) || (BLOCK_DEFS[nSouth]?.transparent && nSouth !== block));
          if (drawSouth) {
            const tileIdx = getFaceTextureIndex(block, 'south');
            const [u0, v0, u1, v1] = atlas.getUVs(tileIdx);
            const sideLight = 0.8;

            const targetPos = isWater ? waterPositions : positions;
            const targetNorm = isWater ? waterNormals : normals;
            const targetUv = isWater ? waterUvs : uvs;
            const targetCol = isWater ? waterColors : colors;
            const targetInd = isWater ? waterIndices : indices;
            const curVert = isWater ? waterVertCount : opaqueVertCount;

            targetPos.push(
              x + 1, y, z,
              x, y, z,
              x, y + 1, z,
              x + 1, y + 1, z
            );
            targetNorm.push(0, 0, -1,  0, 0, -1,  0, 0, -1,  0, 0, -1);
            targetUv.push(u0, v0,  u1, v0,  u1, v1,  u0, v1);
            targetCol.push(
              sideLight, sideLight, sideLight,
              sideLight, sideLight, sideLight,
              sideLight, sideLight, sideLight,
              sideLight, sideLight, sideLight
            );
            targetInd.push(
              curVert, curVert + 1, curVert + 2,
              curVert, curVert + 2, curVert + 3
            );

            if (isWater) waterVertCount += 4;
            else opaqueVertCount += 4;
          }

          // 5. EAST FACE (+X)
          const nEast = sampleVoxel(x + 1, y, z);
          const drawEast = isWater ? (nEast !== BlockType.WATER && nEast !== BlockType.AIR) : (!isSolid(nEast) || (BLOCK_DEFS[nEast]?.transparent && nEast !== block));
          if (drawEast) {
            const tileIdx = getFaceTextureIndex(block, 'east');
            const [u0, v0, u1, v1] = atlas.getUVs(tileIdx);
            const sideLight = 0.7;

            const targetPos = isWater ? waterPositions : positions;
            const targetNorm = isWater ? waterNormals : normals;
            const targetUv = isWater ? waterUvs : uvs;
            const targetCol = isWater ? waterColors : colors;
            const targetInd = isWater ? waterIndices : indices;
            const curVert = isWater ? waterVertCount : opaqueVertCount;

            targetPos.push(
              x + 1, y, z + 1,
              x + 1, y, z,
              x + 1, y + 1, z,
              x + 1, y + 1, z + 1
            );
            targetNorm.push(1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0);
            targetUv.push(u0, v0,  u1, v0,  u1, v1,  u0, v1);
            targetCol.push(
              sideLight, sideLight, sideLight,
              sideLight, sideLight, sideLight,
              sideLight, sideLight, sideLight,
              sideLight, sideLight, sideLight
            );
            targetInd.push(
              curVert, curVert + 1, curVert + 2,
              curVert, curVert + 2, curVert + 3
            );

            if (isWater) waterVertCount += 4;
            else opaqueVertCount += 4;
          }

          // 6. WEST FACE (-X)
          const nWest = sampleVoxel(x - 1, y, z);
          const drawWest = isWater ? (nWest !== BlockType.WATER && nWest !== BlockType.AIR) : (!isSolid(nWest) || (BLOCK_DEFS[nWest]?.transparent && nWest !== block));
          if (drawWest) {
            const tileIdx = getFaceTextureIndex(block, 'west');
            const [u0, v0, u1, v1] = atlas.getUVs(tileIdx);
            const sideLight = 0.7;

            const targetPos = isWater ? waterPositions : positions;
            const targetNorm = isWater ? waterNormals : normals;
            const targetUv = isWater ? waterUvs : uvs;
            const targetCol = isWater ? waterColors : colors;
            const targetInd = isWater ? waterIndices : indices;
            const curVert = isWater ? waterVertCount : opaqueVertCount;

            targetPos.push(
              x, y, z,
              x, y, z + 1,
              x, y + 1, z + 1,
              x, y + 1, z
            );
            targetNorm.push(-1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0);
            targetUv.push(u0, v0,  u1, v0,  u1, v1,  u0, v1);
            targetCol.push(
              sideLight, sideLight, sideLight,
              sideLight, sideLight, sideLight,
              sideLight, sideLight, sideLight,
              sideLight, sideLight, sideLight
            );
            targetInd.push(
              curVert, curVert + 1, curVert + 2,
              curVert, curVert + 2, curVert + 3
            );

            if (isWater) waterVertCount += 4;
            else opaqueVertCount += 4;
          }
        }
      }
    }

    // Build or update Opaque Mesh
    let opaqueResult: THREE.Mesh | null = null;
    if (positions.length > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geo.setIndex(indices);

      opaqueResult = new THREE.Mesh(geo, opaqueMat);
      opaqueResult.position.set(worldStartX, 0, worldStartZ);
      opaqueResult.castShadow = true;
      opaqueResult.receiveShadow = true;
    }

    // Build or update Water Mesh
    let waterResult: THREE.Mesh | null = null;
    if (waterPositions.length > 0) {
      const waterGeo = new THREE.BufferGeometry();
      waterGeo.setAttribute('position', new THREE.Float32BufferAttribute(waterPositions, 3));
      waterGeo.setAttribute('normal', new THREE.Float32BufferAttribute(waterNormals, 3));
      waterGeo.setAttribute('uv', new THREE.Float32BufferAttribute(waterUvs, 2));
      waterGeo.setAttribute('color', new THREE.Float32BufferAttribute(waterColors, 3));
      waterGeo.setIndex(waterIndices);

      waterResult = new THREE.Mesh(waterGeo, waterMat);
      waterResult.position.set(worldStartX, 0, worldStartZ);
    }

    this.isDirty = false;
    return { opaque: opaqueResult, water: waterResult };
  }

  // Cross quads for flowers, torches and mushrooms
  private buildCrossedQuad(
    x: number, y: number, z: number, block: BlockType, atlas: TextureAtlas,
    positions: number[], normals: number[], uvs: number[], colors: number[], indices: number[],
    vertCount: number
  ) {
    const tileIdx = getFaceTextureIndex(block, 'north');
    const [u0, v0, u1, v1] = atlas.getUVs(tileIdx);

    // Quad 1: Diagonal (0, 0) to (1, 1)
    positions.push(
      x, y, z,
      x + 1, y, z + 1,
      x + 1, y + 1, z + 1,
      x, y + 1, z
    );
    normals.push(0.7, 0, 0.7,  0.7, 0, 0.7,  0.7, 0, 0.7,  0.7, 0, 0.7);
    uvs.push(u0, v0,  u1, v0,  u1, v1,  u0, v1);
    colors.push(1, 1, 1,  1, 1, 1,  1, 1, 1,  1, 1, 1);
    indices.push(
      vertCount, vertCount + 1, vertCount + 2,
      vertCount, vertCount + 2, vertCount + 3,
      vertCount, vertCount + 2, vertCount + 1,
      vertCount, vertCount + 3, vertCount + 2
    );

    // Quad 2: Diagonal (1, 0) to (0, 1)
    positions.push(
      x + 1, y, z,
      x, y, z + 1,
      x, y + 1, z + 1,
      x + 1, y + 1, z
    );
    normals.push(-0.7, 0, 0.7,  -0.7, 0, 0.7,  -0.7, 0, 0.7,  -0.7, 0, 0.7);
    uvs.push(u0, v0,  u1, v0,  u1, v1,  u0, v1);
    colors.push(1, 1, 1,  1, 1, 1,  1, 1, 1,  1, 1, 1);
    indices.push(
      vertCount + 4, vertCount + 5, vertCount + 6,
      vertCount + 4, vertCount + 6, vertCount + 7,
      vertCount + 4, vertCount + 6, vertCount + 5,
      vertCount + 4, vertCount + 7, vertCount + 6
    );
  }

  // Cleanup geometries from GPU memory
  public dispose() {
    this.isDisposed = true;
    if (this.opaqueMesh) {
      this.opaqueMesh.geometry.dispose();
      this.opaqueMesh = null;
    }
    if (this.waterMesh) {
      this.waterMesh.geometry.dispose();
      this.waterMesh = null;
    }
  }
}
