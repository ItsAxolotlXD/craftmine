import { SimplexNoise } from './noise';
import { BlockType } from './blocks';

export const CHUNK_SIZE_X = 16;
export const CHUNK_SIZE_Z = 16;
export const CHUNK_SIZE_Y = 112; // Tall height for towering mountains and deep caves
export const SEA_LEVEL = 38;

export interface BiomeInfo {
  name: string;
  isMountain: boolean;
  isRiver: boolean;
  isPond: boolean;
  isOcean: boolean;
  temperature: number;
}

export class WorldGenerator {
  private noise: SimplexNoise;
  private seed: number;

  constructor(seed: number = 4289) {
    this.seed = seed;
    this.noise = new SimplexNoise(seed);
  }

  public setSeed(seed: number) {
    this.seed = seed;
    this.noise.init(seed);
  }

  /**
   * Fast height calculation at world coordinates (x, z).
   * Incorporates oceans, big mountains, river valleys, and gentle plains.
   */
  public getTerrainHeight(x: number, z: number): { height: number; isRiver: boolean; isPond: boolean; isMountain: boolean; isOcean: boolean } {
    // 1. Continental / biome noise (-1 to 1 => 0 to 1)
    const cont = (this.noise.noise2D(x * 0.0016, z * 0.0016) + 1.0) * 0.5;

    // 2. Base rolling terrain (plains & gentle hills)
    const baseH = 43 + this.noise.fbm2D(x * 0.006, z * 0.006, 3, 2.0, 0.5) * 8;

    let h = baseH;
    let isMountain = false;
    let isOcean = false;

    // 3. Vast Deep Oceans (when cont < 0.32)
    if (cont < 0.32) {
      isOcean = true;
      const oceanDepth = Math.pow((0.32 - cont) / 0.32, 1.3) * 26; // Deep sea trenches down to y ~ 16
      h = Math.max(16, baseH - oceanDepth - 10);
    } else if (cont > 0.44) {
      // 4. Big Mountains Noise (active when cont > 0.44)
      const mWeight = Math.min(1.0, (cont - 0.44) / 0.22);
      // Ridged multifractal creates razor-sharp mountain crests, peaks and ridges
      const ridge = this.noise.ridged2D(x * 0.0055, z * 0.0055, 4, 2.0, 0.55);
      const peaks = Math.pow(Math.max(0, ridge), 1.8) * 58; // Towering peaks up to y ~ 105
      h += peaks * mWeight;
      if (mWeight > 0.3) {
        isMountain = true;
      }
    }

    // 5. Rivers System: Carves serpentine river valleys across plains and between mountains
    const riverVal = Math.abs(this.noise.noise2D(x * 0.0032 + 50, z * 0.0032 + 50));
    const riverWidth = 0.045; // Width of river channel
    let isRiver = false;

    if (!isOcean && riverVal < riverWidth) {
      isRiver = true;
      // Smooth carving factor (0 at river center, 1 at edge)
      const riverT = riverVal / riverWidth;
      const smoothT = riverT * riverT * (3 - 2 * riverT);
      const riverBed = SEA_LEVEL - 4; // River bottom sits under sea level
      h = riverBed + (h - riverBed) * smoothT;
    }

    // 6. Natural Ponds / Lakes (depressions in plains/inland)
    let isPond = false;
    if (!isMountain && !isRiver && !isOcean) {
      const pondNoise = this.noise.noise2D(x * 0.015 + 120, z * 0.015 + 120);
      if (pondNoise > 0.60 && h < SEA_LEVEL + 5) {
        isPond = true;
        const depth = (pondNoise - 0.60) * 12;
        h = Math.max(SEA_LEVEL - 3, h - depth);
      }
    }

    return {
      height: Math.floor(h),
      isRiver,
      isPond,
      isMountain,
      isOcean,
    };
  }

  /**
   * 3D Cave evaluation at (x, y, z).
   * Returns true if the block is hollowed out by caves.
   */
  public isCave(x: number, y: number, z: number, terrainH: number): boolean {
    // Bedrock floor is solid
    if (y <= 2) return false;
    // Don't hollow out the sky
    if (y >= terrainH) return false;

    // Prevent caves from completely obliterating shallow surface dirt unless it's a deep mountain ravine
    const depthBelowSurface = terrainH - y;
    if (depthBelowSurface < 3 && y >= SEA_LEVEL) {
      // Rare surface entrance (1 in 40)
      const entranceNoise = this.noise.noise2D(x * 0.04, z * 0.04);
      if (entranceNoise < 0.7) return false;
    }

    // 1. Winding "Spaghetti / Worm" Caves (long 3D subterranean tunnels)
    const c1 = Math.abs(this.noise.noise3D(x * 0.024, y * 0.038, z * 0.024));
    const c2 = Math.abs(this.noise.noise3D(x * 0.024 + 100, y * 0.038 + 100, z * 0.024 + 100));
    const isWormCave = (c1 < 0.065 && c2 < 0.065);

    if (isWormCave) return true;

    // 2. Big Cavern Chambers ("Swiss Cheese" cave halls deep underground)
    if (y < 46 && y > 6) {
      const cavern = this.noise.noise3D(x * 0.014, y * 0.02, z * 0.014);
      if (cavern > 0.48) {
        return true;
      }
    }

    // 3. Huge Mountain Ravines & Chasm Caverns (inside massive mountains)
    if (y >= 45 && y < terrainH - 4) {
      const ravine = Math.abs(this.noise.noise3D(x * 0.018, y * 0.012, z * 0.018));
      if (ravine < 0.035) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generates a 3D chunk voxel array of size 16x16x112.
   * Returns Uint8Array of block IDs.
   */
  public generateChunkData(chunkX: number, chunkZ: number): Uint8Array {
    const voxels = new Uint8Array(CHUNK_SIZE_X * CHUNK_SIZE_Z * CHUNK_SIZE_Y);
    const worldStartX = chunkX * CHUNK_SIZE_X;
    const worldStartZ = chunkZ * CHUNK_SIZE_Z;

    // Cache 2D terrain heights for this chunk column to avoid repeated calculations
    const heights = new Int32Array(CHUNK_SIZE_X * CHUNK_SIZE_Z);
    const riverFlags = new Uint8Array(CHUNK_SIZE_X * CHUNK_SIZE_Z);
    const pondFlags = new Uint8Array(CHUNK_SIZE_X * CHUNK_SIZE_Z);
    const mountainFlags = new Uint8Array(CHUNK_SIZE_X * CHUNK_SIZE_Z);

    for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
        const wx = worldStartX + lx;
        const wz = worldStartZ + lz;
        const info = this.getTerrainHeight(wx, wz);
        const colIdx = lx + lz * CHUNK_SIZE_X;
        heights[colIdx] = info.height;
        riverFlags[colIdx] = info.isRiver ? 1 : 0;
        pondFlags[colIdx] = info.isPond ? 1 : 0;
        mountainFlags[colIdx] = info.isMountain ? 1 : 0;
      }
    }

    // Fill column by column
    for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
        const wx = worldStartX + lx;
        const wz = worldStartZ + lz;
        const colIdx = lx + lz * CHUNK_SIZE_X;
        const surfaceH = heights[colIdx];
        const isRiver = riverFlags[colIdx] === 1;
        const isPond = pondFlags[colIdx] === 1;
        const isMountain = mountainFlags[colIdx] === 1;

        // Bedrock at very bottom
        this.setVoxel(voxels, lx, 0, lz, BlockType.BEDROCK);
        if (this.noise.noise2D(wx * 0.2, wz * 0.2) > 0) {
          this.setVoxel(voxels, lx, 1, lz, BlockType.BEDROCK);
        }

        const maxFillY = Math.max(surfaceH, SEA_LEVEL);

        for (let y = 1; y <= maxFillY; y++) {
          if (y >= CHUNK_SIZE_Y) break;

          // Check if carved by big cave system
          const isCarvedCave = (y <= surfaceH) && this.isCave(wx, y, wz, surfaceH);

          if (isCarvedCave) {
            // Underground lava pools in deep cave floors!
            if (y <= 8) {
              this.setVoxel(voxels, lx, y, lz, BlockType.LAVA);
            } else {
              this.setVoxel(voxels, lx, y, lz, BlockType.AIR);
            }
            continue;
          }

          // If above solid terrain surface:
          if (y > surfaceH) {
            // Water fills up to SEA_LEVEL in riverbeds, ponds, and oceans!
            if (y <= SEA_LEVEL) {
              this.setVoxel(voxels, lx, y, lz, BlockType.WATER);
            } else {
              this.setVoxel(voxels, lx, y, lz, BlockType.AIR);
            }
            continue;
          }

          // Below or at surface: Solid block placement
          if (y === surfaceH) {
            // Surface layer
            if (y < SEA_LEVEL - 1) {
              // Underwater floor (riverbed, pond bottom)
              this.setVoxel(voxels, lx, y, lz, isRiver ? BlockType.GRAVEL : BlockType.SAND);
            } else if (y <= SEA_LEVEL + 1) {
              // Beach / shoreline
              this.setVoxel(voxels, lx, y, lz, BlockType.SAND);
            } else if (isMountain && y >= 76) {
              // Mountain high peaks: Snow blocks!
              this.setVoxel(voxels, lx, y, lz, BlockType.SNOW_BLOCK);
            } else if (isMountain && y >= 64) {
              // Mountain steep slopes: Exposed stone cliffs or snow
              const cliffNoise = this.noise.noise2D(wx * 0.1, wz * 0.1);
              this.setVoxel(voxels, lx, y, lz, cliffNoise > 0.1 ? BlockType.STONE : BlockType.SNOW_BLOCK);
            } else {
              // Normal lush grass surface
              this.setVoxel(voxels, lx, y, lz, BlockType.GRASS);
            }
          } else if (y >= surfaceH - 3) {
            // Sub-surface layer (dirt or sandstone or stone)
            if (y <= SEA_LEVEL + 1) {
              this.setVoxel(voxels, lx, y, lz, BlockType.SANDSTONE);
            } else if (isMountain && y >= 72) {
              this.setVoxel(voxels, lx, y, lz, BlockType.STONE);
            } else {
              this.setVoxel(voxels, lx, y, lz, BlockType.DIRT);
            }
          } else {
            // Deep subterranean strata: Stone + Mineral Ores!
            let block = BlockType.STONE;

            // Ore generation based on depth & seeded noise
            const oreNoise = this.noise.noise3D(wx * 0.12, y * 0.12, wz * 0.12);

            if (y <= 16 && oreNoise > 0.68) {
              block = BlockType.DIAMOND_ORE;
            } else if (y <= 24 && oreNoise > 0.65) {
              block = BlockType.GOLD_ORE;
            } else if (y <= 32 && oreNoise > 0.62) {
              block = BlockType.EMERALD_ORE;
            } else if (y <= 50 && oreNoise > 0.54) {
              block = BlockType.IRON_ORE;
            } else if (oreNoise > 0.52) {
              block = BlockType.COAL_ORE;
            }

            this.setVoxel(voxels, lx, y, lz, block);
          }
        }

        // Surface flora and decorations (flowers, mushrooms, trees)
        if (surfaceH > SEA_LEVEL && surfaceH < CHUNK_SIZE_Y - 12) {
          const topBlock = this.getVoxel(voxels, lx, surfaceH, lz);

          // Red & Yellow Flowers on grass
          if (topBlock === BlockType.GRASS) {
            const flowerNoise = this.noise.noise2D(wx * 0.25, wz * 0.25);
            if (flowerNoise > 0.72) {
              this.setVoxel(voxels, lx, surfaceH + 1, lz, flowerNoise > 0.84 ? BlockType.FLOWER_RED : BlockType.FLOWER_YELLOW);
            }
          }

          // Trees placement (isolated by spacing)
          if ((topBlock === BlockType.GRASS || topBlock === BlockType.SNOW_BLOCK) && lx >= 2 && lx <= 13 && lz >= 2 && lz <= 13) {
            const treeHash = Math.abs(this.noise.noise2D(wx * 0.35 + 20, wz * 0.35 + 20));
            // Density depends on biome - spaced out for spacious open meadows & fields
            const isTreeSpot = isMountain
              ? (treeHash > 0.85 && surfaceH < 78) // Mountain pine trees
              : (treeHash > 0.87 && !isRiver && !isPond); // Spacious deciduous trees

            if (isTreeSpot) {
              if (isMountain) {
                this.generatePineTree(voxels, lx, surfaceH + 1, lz);
              } else {
                // Select tree leaf variant based on noise (Oak, Cherry, Red Poplar, Orange Poplar)
                const variantNoise = this.noise.noise2D(wx * 0.1, wz * 0.1);
                let leafType = BlockType.OAK_LEAVES;
                if (variantNoise > 0.5) {
                  leafType = BlockType.LEAVES_CHERRY;
                } else if (variantNoise > 0.2) {
                  leafType = BlockType.LEAVES_ORANGE;
                } else if (variantNoise < -0.3) {
                  leafType = BlockType.LEAVES_RED;
                }
                this.generateDeciduousTree(voxels, lx, surfaceH + 1, lz, leafType);
              }
            }
          }
        }

        // Subterranean glowing mushrooms inside caves
        for (let y = 6; y < 40; y++) {
          if (this.getVoxel(voxels, lx, y, lz) === BlockType.AIR) {
            const blockBelow = this.getVoxel(voxels, lx, y - 1, lz);
            if (blockBelow === BlockType.STONE || blockBelow === BlockType.DIRT) {
              const shroomNoise = this.noise.noise3D(wx * 0.4, y * 0.4, wz * 0.4);
              if (shroomNoise > 0.76) {
                this.setVoxel(voxels, lx, y, lz, BlockType.MUSHROOM);
              }
            }
          }
        }
      }
    }

    return voxels;
  }

  // Deciduous Tree generation with customizable leaf block (Oak, Cherry, Red, Orange)
  private generateDeciduousTree(voxels: Uint8Array, x: number, y: number, z: number, leafType: BlockType = BlockType.OAK_LEAVES) {
    const trunkHeight = 5;
    // Oak trunk
    for (let ty = 0; ty < trunkHeight; ty++) {
      if (y + ty < CHUNK_SIZE_Y) {
        this.setVoxel(voxels, x, y + ty, z, BlockType.OAK_LOG);
      }
    }
    // Leaves canopy
    const leafStart = y + trunkHeight - 2;
    for (let ly = leafStart; ly <= leafStart + 3; ly++) {
      if (ly >= CHUNK_SIZE_Y) break;
      const radius = ly >= leafStart + 2 ? 1 : 2;
      for (let ox = -radius; ox <= radius; ox++) {
        for (let oz = -radius; oz <= radius; oz++) {
          const vx = x + ox;
          const vz = z + oz;
          if (vx >= 0 && vx < CHUNK_SIZE_X && vz >= 0 && vz < CHUNK_SIZE_Z) {
            if (ox === 0 && oz === 0 && ly < y + trunkHeight) continue; // Trunk
            if (Math.abs(ox) === 2 && Math.abs(oz) === 2 && ly === leafStart + 1) continue; // Corner rounding
            if (this.getVoxel(voxels, vx, ly, vz) === BlockType.AIR) {
              this.setVoxel(voxels, vx, ly, vz, leafType);
            }
          }
        }
      }
    }
  }

  // Conical Mountain Pine Tree generation
  private generatePineTree(voxels: Uint8Array, x: number, y: number, z: number) {
    const trunkHeight = 7;
    // Pine trunk
    for (let ty = 0; ty < trunkHeight; ty++) {
      if (y + ty < CHUNK_SIZE_Y) {
        this.setVoxel(voxels, x, y + ty, z, BlockType.PINE_LOG);
      }
    }
    // Conical pine needles
    const leafStart = y + 2;
    for (let ly = leafStart; ly <= y + trunkHeight + 1; ly++) {
      if (ly >= CHUNK_SIZE_Y) break;
      const progress = (ly - leafStart) / (trunkHeight);
      const radius = progress < 0.4 ? 2 : (progress < 0.8 ? 1 : 0);
      for (let ox = -radius; ox <= radius; ox++) {
        for (let oz = -radius; oz <= radius; oz++) {
          const vx = x + ox;
          const vz = z + oz;
          if (vx >= 0 && vx < CHUNK_SIZE_X && vz >= 0 && vz < CHUNK_SIZE_Z) {
            if (ox === 0 && oz === 0 && ly < y + trunkHeight) continue;
            if (this.getVoxel(voxels, vx, ly, vz) === BlockType.AIR) {
              this.setVoxel(voxels, vx, ly, vz, BlockType.PINE_LEAVES);
            }
          }
        }
      }
    }
  }

  private setVoxel(voxels: Uint8Array, x: number, y: number, z: number, val: BlockType) {
    if (x < 0 || x >= CHUNK_SIZE_X || y < 0 || y >= CHUNK_SIZE_Y || z < 0 || z >= CHUNK_SIZE_Z) return;
    voxels[x + CHUNK_SIZE_X * (y + CHUNK_SIZE_Y * z)] = val;
  }

  private getVoxel(voxels: Uint8Array, x: number, y: number, z: number): BlockType {
    if (x < 0 || x >= CHUNK_SIZE_X || y < 0 || y >= CHUNK_SIZE_Y || z < 0 || z >= CHUNK_SIZE_Z) return BlockType.AIR;
    return voxels[x + CHUNK_SIZE_X * (y + CHUNK_SIZE_Y * z)];
  }
}
