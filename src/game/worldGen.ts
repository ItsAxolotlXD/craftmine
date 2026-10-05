import { SimplexNoise } from './noise';
import { BlockType } from './blocks';

export const CHUNK_SIZE_X = 16;
export const CHUNK_SIZE_Z = 16;
export const CHUNK_SIZE_Y = 112; // Tall height for towering mountains and deep caves
export const SEA_LEVEL = 38;

export enum BiomeType {
  PLAINS = 'plains',
  DESERT = 'desert',
  FALL_FOREST = 'fall_forest',
  MANGROVE_FOREST = 'mangrove_forest',
  MOUNTAINS = 'mountains',
  OCEAN = 'ocean',
  TAIGA = 'taiga',
}

export enum CaveBiomeType {
  REGULAR = 'caves_regular',
  ICE = 'ice_caves',
  LUSH = 'lush_caves',
}

export interface BiomeInfo {
  name: string;
  type: BiomeType;
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
   * Evaluates the biome at world coordinates (x, z).
   */
  public getBiomeAt(x: number, z: number): BiomeType {
    // Multi-octave continental noise + harmonic wave ensuring truly infinite landmasses & interspersed seas
    const c1 = this.noise.noise2D(x * 0.003, z * 0.003);
    const c2 = this.noise.noise2D(x * 0.0075 + 100, z * 0.0075 + 100) * 0.35;
    const wave = (Math.sin(x * 0.0018) + Math.cos(z * 0.0018)) * 0.20;
    const cont = c1 + c2 + wave;
    if (cont < -0.54) return BiomeType.OCEAN;
    if (cont > 0.42) return BiomeType.MOUNTAINS;

    // Biome climate maps
    const temp = this.noise.noise2D(x * 0.0022 + 200, z * 0.0022 + 200);
    const humidity = this.noise.noise2D(x * 0.0022 - 200, z * 0.0022 - 200);

    // Warm & Dry = Desert
    if (temp > 0.22 && humidity < 0.05) {
      return BiomeType.DESERT;
    }
    // Warm & Wet = Mangrove Forest
    if (temp > 0.08 && humidity > 0.18) {
      return BiomeType.MANGROVE_FOREST;
    }
    // Cool & Moderate = Fall Forest
    if (temp < 0.08 && humidity > -0.25 && humidity < 0.4) {
      return BiomeType.FALL_FOREST;
    }
    // Very cold = Taiga
    if (temp < -0.45) {
      return BiomeType.TAIGA;
    }

    return BiomeType.PLAINS;
  }

  /**
   * Fast height calculation at world coordinates (x, z).
   */
  public getTerrainHeight(x: number, z: number): {
    height: number;
    isRiver: boolean;
    isPond: boolean;
    isMountain: boolean;
    isOcean: boolean;
    biome: BiomeType;
  } {
    const biome = this.getBiomeAt(x, z);
    const c1 = this.noise.noise2D(x * 0.003, z * 0.003);
    const c2 = this.noise.noise2D(x * 0.0075 + 100, z * 0.0075 + 100) * 0.35;
    const wave = (Math.sin(x * 0.0018) + Math.cos(z * 0.0018)) * 0.20;
    const cont = c1 + c2 + wave;
    const baseH = 43 + this.noise.fbm2D(x * 0.006, z * 0.006, 3, 2.0, 0.5) * 8;

    let h = baseH;
    let isMountain = (biome === BiomeType.MOUNTAINS);
    let isOcean = (biome === BiomeType.OCEAN);

    if (isOcean) {
      const oceanDepth = Math.pow(Math.max(0, (-0.54 - cont) / 0.46), 1.2) * 18;
      h = Math.max(22, baseH - oceanDepth - 6);
    } else if (isMountain) {
      const mWeight = Math.min(1.0, (cont - 0.35) / 0.25);
      const ridge = this.noise.ridged2D(x * 0.0055, z * 0.0055, 4, 2.0, 0.55);
      const peaks = Math.pow(Math.max(0, ridge), 1.8) * 58;
      h += peaks * mWeight;
    } else if (biome === BiomeType.DESERT) {
      // Gentle rolling desert dunes
      const dune = Math.sin(x * 0.04) * Math.cos(z * 0.03) * 4;
      h = 42 + dune;
    } else if (biome === BiomeType.MANGROVE_FOREST) {
      // Low swampy delta near sea level
      h = 37 + this.noise.noise2D(x * 0.02, z * 0.02) * 2;
    }

    // Rivers System
    const riverVal = Math.abs(this.noise.noise2D(x * 0.0032 + 50, z * 0.0032 + 50));
    const riverWidth = 0.045;
    let isRiver = false;

    if (!isOcean && biome !== BiomeType.DESERT && riverVal < riverWidth) {
      isRiver = true;
      const riverT = riverVal / riverWidth;
      const smoothT = riverT * riverT * (3 - 2 * riverT);
      const riverBed = SEA_LEVEL - 4;
      h = riverBed + (h - riverBed) * smoothT;
    }

    // Natural Ponds
    let isPond = false;
    if (!isMountain && !isRiver && !isOcean && biome !== BiomeType.DESERT) {
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
      biome,
    };
  }

  // Deterministic 3D coordinate hash returning [0..1)
  private hash3D(x: number, y: number, z: number, offset: number = 0): number {
    let h = (x * 374761393 + y * 668265263 + z * 1013904223 + this.seed + offset) ^ 0x5bf03635;
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  /**
   * Evaluates the cave biome at world coordinates (x, y, z).
   */
  public getCaveBiome(x: number, y: number, z: number): CaveBiomeType {
    const temp = this.noise.noise2D(x * 0.005 + 500, z * 0.005 + 500);
    const lush = this.noise.noise2D(x * 0.006 + 1200, z * 0.006 + 1200);
    if (temp < -0.22) return CaveBiomeType.ICE;
    if (lush > 0.12) return CaveBiomeType.LUSH;
    return CaveBiomeType.REGULAR;
  }

  /**
   * Deterministic Granite, Andesite, Diorite vein clusters (each group has 20 - 30 blocks).
   */
  public getRockVein(wx: number, y: number, wz: number): BlockType | null {
    if (y < 4 || y > 115) return null;
    const S = 14;
    const cx = Math.floor(wx / S);
    const cy = Math.floor(y / S);
    const cz = Math.floor(wz / S);

    // ~72% of spatial cells contain a rock vein
    const cellHash = this.hash3D(cx, cy, cz, 101);
    if (cellHash > 0.72) return null;

    const ox = (this.hash3D(cx, cy, cz, 102) * 0.6 + 0.2) * S;
    const oy = (this.hash3D(cx, cy, cz, 103) * 0.6 + 0.2) * S;
    const oz = (this.hash3D(cx, cy, cz, 104) * 0.6 + 0.2) * S;
    const centerX = cx * S + ox;
    const centerY = cy * S + oy;
    const centerZ = cz * S + oz;

    const dx = wx - centerX;
    const dy = (y - centerY) * 1.12;
    const dz = wz - centerZ;
    const distSq = dx * dx + dy * dy + dz * dz;

    // Radius tuned to yield 20 to 30 blocks per group
    const targetR = 1.84 + this.hash3D(cx, cy, cz, 105) * 0.12;
    const jitter = this.noise.noise3D(wx * 0.35, y * 0.35, wz * 0.35) * 0.10;
    const effR = targetR + jitter;

    if (distSq <= effR * effR) {
      const typeHash = this.hash3D(cx, cy, cz, 106);
      if (typeHash < 0.34) return BlockType.GRANITE;
      if (typeHash < 0.67) return BlockType.ANDESITE;
      return BlockType.DIORITE;
    }

    return null;
  }

  /**
   * Balanced cave generation with natural caverns, tunnels, and ravines.
   * Decreased from overly massive size to well-proportioned, comfortable grottos and tunnels.
   */
  public isCave(x: number, y: number, z: number, terrainH: number): boolean {
    if (y <= 2) return false;
    if (y >= terrainH) return false;

    const depthBelowSurface = terrainH - y;
    // Cave entrances piercing mountain cliffs, hills, and ravines
    if (depthBelowSurface < 5 && y >= SEA_LEVEL) {
      const entranceNoise = this.noise.noise2D(x * 0.035, z * 0.035);
      if (entranceNoise < 0.72) return false;
    }

    // 1. Vaulted Cavern Rooms (tuned size: spacious 6-12 blocks high, not massive voids)
    if (y >= 8 && y <= 46) {
      const cavern = this.noise.noise3D(x * 0.022, y * 0.028, z * 0.022);
      const depthBonus = Math.max(0, (40 - y) * 0.002);
      if (cavern + depthBonus > 0.52) {
        const pillar = Math.abs(this.noise.noise2D(x * 0.045, z * 0.045));
        if (!(cavern < 0.60 && pillar < 0.05)) {
          return true;
        }
      }
    }

    // 2. Winding Cave Tunnels (Natural 3-5 block wide pathways)
    const c1 = this.noise.noise3D(x * 0.024, y * 0.036, z * 0.024);
    const c2 = this.noise.noise3D(x * 0.024 + 120, y * 0.036 + 120, z * 0.024 + 120);
    const widthNoise = this.noise.noise3D(x * 0.018 + 60, y * 0.018 + 60, z * 0.018 + 60);
    const radiusSq = 0.0034 + Math.max(0, widthNoise * 0.0020);
    if ((c1 * c1 + c2 * c2) < radiusSq) {
      return true;
    }

    // 3. Fissure Ravines
    if (y >= 14 && y < terrainH - 6) {
      const ravine = Math.abs(this.noise.noise3D(x * 0.016, y * 0.012, z * 0.016));
      if (ravine < 0.016) {
        const ravineW = Math.abs(this.noise.noise2D(x * 0.022 + 80, z * 0.022 + 80));
        if (ravineW > 0.38) return true;
      }
    }

    return false;
  }

  /**
   * Generates a 3D overworld chunk.
   */
  public generateChunkData(chunkX: number, chunkZ: number): Uint8Array {
    const voxels = new Uint8Array(CHUNK_SIZE_X * CHUNK_SIZE_Z * CHUNK_SIZE_Y);
    const worldStartX = chunkX * CHUNK_SIZE_X;
    const worldStartZ = chunkZ * CHUNK_SIZE_Z;

    const heights = new Int32Array(CHUNK_SIZE_X * CHUNK_SIZE_Z);
    const biomes: BiomeType[] = new Array(CHUNK_SIZE_X * CHUNK_SIZE_Z);
    const riverFlags = new Uint8Array(CHUNK_SIZE_X * CHUNK_SIZE_Z);

    for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
        const wx = worldStartX + lx;
        const wz = worldStartZ + lz;
        const info = this.getTerrainHeight(wx, wz);
        const colIdx = lx + lz * CHUNK_SIZE_X;
        heights[colIdx] = info.height;
        biomes[colIdx] = info.biome;
        riverFlags[colIdx] = info.isRiver ? 1 : 0;
      }
    }

    for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
        const wx = worldStartX + lx;
        const wz = worldStartZ + lz;
        const colIdx = lx + lz * CHUNK_SIZE_X;
        const surfaceH = heights[colIdx];
        const biome = biomes[colIdx];
        const isRiver = riverFlags[colIdx] === 1;

        // Bedrock floor
        this.setVoxel(voxels, lx, 0, lz, BlockType.BEDROCK);
        if (this.noise.noise2D(wx * 0.2, wz * 0.2) > 0) {
          this.setVoxel(voxels, lx, 1, lz, BlockType.BEDROCK);
        }

        const maxFillY = Math.max(surfaceH, SEA_LEVEL);

        for (let y = 1; y <= maxFillY; y++) {
          if (y >= CHUNK_SIZE_Y) break;

          const isCarvedCave = (y <= surfaceH) && this.isCave(wx, y, wz, surfaceH);
          if (isCarvedCave) {
            const caveBiome = this.getCaveBiome(wx, y, wz);
            if (y <= 8) {
              if (caveBiome === CaveBiomeType.ICE) {
                this.setVoxel(voxels, lx, y, lz, y <= 7 ? BlockType.BLUE_ICE : BlockType.PACKED_ICE);
              } else if (caveBiome === CaveBiomeType.LUSH) {
                this.setVoxel(voxels, lx, y, lz, BlockType.WATER);
              } else {
                this.setVoxel(voxels, lx, y, lz, BlockType.LAVA);
              }
            } else {
              this.setVoxel(voxels, lx, y, lz, BlockType.AIR);
            }
            continue;
          }

          if (y > surfaceH) {
            if (y <= SEA_LEVEL) {
              this.setVoxel(voxels, lx, y, lz, BlockType.WATER);
            } else {
              this.setVoxel(voxels, lx, y, lz, BlockType.AIR);
            }
            continue;
          }

          // At Surface
          if (y === surfaceH) {
            if (biome === BiomeType.DESERT) {
              this.setVoxel(voxels, lx, y, lz, BlockType.SAND);
            } else if (biome === BiomeType.FALL_FOREST) {
              this.setVoxel(voxels, lx, y, lz, BlockType.FALL_GRASS);
            } else if (biome === BiomeType.MANGROVE_FOREST) {
              // Mangrove muddy swamp surface
              this.setVoxel(voxels, lx, y, lz, BlockType.MUD);
            } else if (y < SEA_LEVEL - 1) {
              this.setVoxel(voxels, lx, y, lz, isRiver ? BlockType.GRAVEL : BlockType.SAND);
            } else if (y <= SEA_LEVEL + 1) {
              this.setVoxel(voxels, lx, y, lz, BlockType.SAND);
            } else if (biome === BiomeType.MOUNTAINS && y >= 76) {
              this.setVoxel(voxels, lx, y, lz, BlockType.SNOW_BLOCK);
            } else if (biome === BiomeType.MOUNTAINS && y >= 64) {
              const cliffNoise = this.noise.noise2D(wx * 0.1, wz * 0.1);
              this.setVoxel(voxels, lx, y, lz, cliffNoise > 0.1 ? BlockType.STONE : BlockType.SNOW_GRASS);
            } else {
              this.setVoxel(voxels, lx, y, lz, BlockType.GRASS);
            }
          } else if (y >= surfaceH - 3) {
            // Sub-surface
            if (biome === BiomeType.DESERT) {
              this.setVoxel(voxels, lx, y, lz, BlockType.SANDSTONE);
            } else if (biome === BiomeType.MANGROVE_FOREST) {
              this.setVoxel(voxels, lx, y, lz, BlockType.MUD);
            } else if (y <= SEA_LEVEL + 1) {
              this.setVoxel(voxels, lx, y, lz, BlockType.SANDSTONE);
            } else if (biome === BiomeType.MOUNTAINS && y >= 72) {
              this.setVoxel(voxels, lx, y, lz, BlockType.STONE);
            } else {
              this.setVoxel(voxels, lx, y, lz, BlockType.DIRT);
            }
          } else {
            // Deep stone, cave perimeter & ores
            const caveBiome = this.getCaveBiome(wx, y, wz);
            const isNearCave = (
              this.isCave(wx, y + 1, wz, surfaceH) ||
              this.isCave(wx, y - 1, wz, surfaceH) ||
              this.isCave(wx + 1, y, wz, surfaceH) ||
              this.isCave(wx - 1, y, wz, surfaceH) ||
              this.isCave(wx, y, wz + 1, surfaceH) ||
              this.isCave(wx, y, wz - 1, surfaceH)
            );

            let block: BlockType = BlockType.STONE;

            if (isNearCave) {
              const isFloor = this.isCave(wx, y + 1, wz, surfaceH);
              if (caveBiome === CaveBiomeType.LUSH) {
                // Lush cave walls and mossy floors
                const mossNoise = this.noise.noise3D(wx * 0.25, y * 0.25, wz * 0.25);
                if (isFloor) {
                  block = mossNoise > -0.25 ? BlockType.MOSS_BLOCK : BlockType.GRASS;
                } else if (mossNoise > 0.08) {
                  block = BlockType.MOSS_BLOCK;
                } else if (mossNoise < -0.42) {
                  block = BlockType.CLAY;
                }
              } else if (caveBiome === CaveBiomeType.ICE) {
                // Ice cave walls and floor
                const iceNoise = this.noise.noise3D(wx * 0.22, y * 0.22, wz * 0.22);
                if (iceNoise > 0.35) {
                  block = BlockType.BLUE_ICE;
                } else if (iceNoise > 0.05) {
                  block = BlockType.PACKED_ICE;
                } else if (iceNoise > -0.28) {
                  block = BlockType.ICE;
                } else {
                  block = BlockType.SNOW_BLOCK;
                }
              }
            }

            // If not transformed by cave biome, check ores and granite/andesite/diorite veins
            if (block === BlockType.STONE) {
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
              } else {
                // Granite, andesite, diorite vein clusters (20 - 30 blocks each group)
                const vein = this.getRockVein(wx, y, wz);
                if (vein) {
                  block = vein;
                }
              }
            }

            this.setVoxel(voxels, lx, y, lz, block);
          }
        }

        // Surface Vegetation & Trees
        if (surfaceH > SEA_LEVEL && surfaceH < CHUNK_SIZE_Y - 12) {
          const topBlock = this.getVoxel(voxels, lx, surfaceH, lz);

          // 1. Desert Vegetation
          if (biome === BiomeType.DESERT && topBlock === BlockType.SAND) {
            const cactusNoise = this.noise.noise2D(wx * 0.3 + 15, wz * 0.3 + 15);
            if (cactusNoise > 0.88 && lx >= 2 && lx <= 13 && lz >= 2 && lz <= 13) {
              const cactusHeight = Math.floor(Math.abs(this.noise.noise2D(wx, wz)) * 2) + 2;
              for (let cy = 1; cy <= cactusHeight; cy++) {
                this.setVoxel(voxels, lx, surfaceH + cy, lz, BlockType.CACTUS);
              }
            } else if (cactusNoise < -0.78) {
              this.setVoxel(voxels, lx, surfaceH + 1, lz, BlockType.DEAD_BUSH);
            }
          }

          // 2. Fall Forest Trees & Foliage
          else if (biome === BiomeType.FALL_FOREST && topBlock === BlockType.FALL_GRASS) {
            const floraNoise = this.noise.noise2D(wx * 0.25, wz * 0.25);
            if (floraNoise > 0.82) {
              this.setVoxel(voxels, lx, surfaceH + 1, lz, BlockType.FLOWER_RED);
            }
            if (lx >= 2 && lx <= 13 && lz >= 2 && lz <= 13) {
              const treeHash = Math.abs(this.noise.noise2D(wx * 0.35 + 20, wz * 0.35 + 20));
              if (treeHash > 0.82) {
                const leafColor = (treeHash > 0.91) ? BlockType.LEAVES_RED : BlockType.LEAVES_ORANGE;
                this.generateDeciduousTree(voxels, lx, surfaceH + 1, lz, leafColor);
              }
            }
          }

          // 3. Mangrove Forest Trees
          else if (biome === BiomeType.MANGROVE_FOREST && (topBlock === BlockType.MUD || topBlock === BlockType.DIRT)) {
            if (lx >= 3 && lx <= 12 && lz >= 3 && lz <= 12) {
              const treeHash = Math.abs(this.noise.noise2D(wx * 0.32 + 80, wz * 0.32 + 80));
              if (treeHash > 0.85) {
                this.generateMangroveTree(voxels, lx, surfaceH + 1, lz);
              }
            }
          }

          // 4. Plains & Mountains Trees
          else if ((topBlock === BlockType.GRASS || topBlock === BlockType.SNOW_BLOCK || topBlock === BlockType.SNOW_GRASS) && lx >= 2 && lx <= 13 && lz >= 2 && lz <= 13) {
            const treeHash = Math.abs(this.noise.noise2D(wx * 0.35 + 20, wz * 0.35 + 20));
            const isTreeSpot = biome === BiomeType.MOUNTAINS
              ? (treeHash > 0.85 && surfaceH < 78)
              : (treeHash > 0.87);

            if (isTreeSpot) {
              if (biome === BiomeType.MOUNTAINS) {
                this.generatePineTree(voxels, lx, surfaceH + 1, lz);
              } else {
                const variantNoise = this.noise.noise2D(wx * 0.1, wz * 0.1);
                let leafType = BlockType.OAK_LEAVES;
                let logType = BlockType.OAK_LOG;
                if (variantNoise > 0.5) {
                  leafType = BlockType.LEAVES_CHERRY;
                  logType = BlockType.CHERRY_LOG;
                }
                this.generateDeciduousTree(voxels, lx, surfaceH + 1, lz, leafType, logType);
              }
            }
          }
        }

        // Subterranean Cave Biome Decoration (Vines, Dripleaf, Ponds, Icicles, Mushrooms)
        for (let y = 4; y < surfaceH - 1; y++) {
          if (this.getVoxel(voxels, lx, y, lz) === BlockType.AIR) {
            const blockBelow = this.getVoxel(voxels, lx, y - 1, lz);
            const blockAbove = this.getVoxel(voxels, lx, y + 1, lz);
            const caveBiome = this.getCaveBiome(wx, y, wz);

            if (caveBiome === CaveBiomeType.LUSH) {
              // 1. Water ponds with clay in depressions
              if ((blockBelow === BlockType.MOSS_BLOCK || blockBelow === BlockType.STONE || blockBelow === BlockType.CLAY || blockBelow === BlockType.DIRT) && y <= 35) {
                const pondNoise = this.noise.noise2D(wx * 0.15 + 40, wz * 0.15 + 40);
                if (pondNoise > 0.65) {
                  this.setVoxel(voxels, lx, y, lz, BlockType.WATER);
                  this.setVoxel(voxels, lx, y - 1, lz, BlockType.CLAY);
                  continue;
                }
              }

              // 2. Glow Berry Vines hanging from ceilings (emits light)
              if (blockAbove === BlockType.MOSS_BLOCK || blockAbove === BlockType.STONE || blockAbove === BlockType.CLAY) {
                const vineNoise = this.noise.noise3D(wx * 0.28, y * 0.28, wz * 0.28);
                if (vineNoise > 0.38) {
                  const vineLen = Math.floor(Math.abs(this.noise.noise2D(wx * 0.5, wz * 0.5)) * 3) + 1;
                  for (let v = 0; v < vineLen; v++) {
                    if (y - v > 4 && this.getVoxel(voxels, lx, y - v, lz) === BlockType.AIR) {
                      this.setVoxel(voxels, lx, y - v, lz, BlockType.CAVE_VINES);
                    } else {
                      break;
                    }
                  }
                  continue;
                }
              }

              // 3. Big Dripleaf plants growing from floor
              if (blockBelow === BlockType.MOSS_BLOCK || blockBelow === BlockType.GRASS || blockBelow === BlockType.CLAY) {
                const dripNoise = this.noise.noise2D(wx * 0.35 + 80, wz * 0.35 + 80);
                if (dripNoise > 0.64) {
                  this.setVoxel(voxels, lx, y, lz, BlockType.DRIPLEAF);
                  if (this.getVoxel(voxels, lx, y + 1, lz) === BlockType.AIR && dripNoise > 0.82) {
                    this.setVoxel(voxels, lx, y + 1, lz, BlockType.DRIPLEAF);
                  }
                  continue;
                }

                // 4. Cave Mushrooms on moss
                const shroomNoise = this.noise.noise2D(wx * 0.4 + 120, wz * 0.4 + 120);
                if (shroomNoise > 0.72) {
                  this.setVoxel(voxels, lx, y, lz, BlockType.MUSHROOM);
                  continue;
                }
              }
            } else if (caveBiome === CaveBiomeType.ICE) {
              // 1. Hanging Stalactite Icicles (1 - 15 blocks long)
              if (blockAbove === BlockType.ICE || blockAbove === BlockType.PACKED_ICE || blockAbove === BlockType.BLUE_ICE || blockAbove === BlockType.STONE || blockAbove === BlockType.SNOW_BLOCK) {
                const icicleNoise = Math.abs(this.noise.noise2D(wx * 0.45 + 11, wz * 0.45 + 11));
                if (icicleNoise > 0.48) {
                  // Measure clear vertical space below
                  let space = 0;
                  while (y - space > 4 && this.getVoxel(voxels, lx, y - space, lz) === BlockType.AIR && space < 16) {
                    space++;
                  }
                  if (space >= 2) {
                    const icicleLen = Math.max(1, Math.min(15, Math.min(space - 1, Math.floor(icicleNoise * 18) - 7)));
                    for (let s = 0; s < icicleLen; s++) {
                      let iceBlock = BlockType.ICE;
                      if (s === 0) iceBlock = (icicleNoise > 0.75) ? BlockType.BLUE_ICE : BlockType.PACKED_ICE;
                      this.setVoxel(voxels, lx, y - s, lz, iceBlock);
                    }
                    continue;
                  }
                }
              }

              // 2. Rising Stalagmite Icicles (1 - 15 blocks long)
              if (blockBelow === BlockType.ICE || blockBelow === BlockType.PACKED_ICE || blockBelow === BlockType.BLUE_ICE || blockBelow === BlockType.STONE || blockBelow === BlockType.SNOW_BLOCK) {
                const stalagNoise = Math.abs(this.noise.noise2D(wx * 0.45 + 88, wz * 0.45 + 88));
                if (stalagNoise > 0.50) {
                  // Measure clear vertical space above
                  let space = 0;
                  while (y + space < surfaceH - 1 && this.getVoxel(voxels, lx, y + space, lz) === BlockType.AIR && space < 16) {
                    space++;
                  }
                  if (space >= 2) {
                    const stalagLen = Math.max(1, Math.min(15, Math.min(space - 1, Math.floor(stalagNoise * 18) - 7)));
                    for (let s = 0; s < stalagLen; s++) {
                      let iceBlock = BlockType.ICE;
                      if (s === 0) iceBlock = (stalagNoise > 0.72) ? BlockType.BLUE_ICE : BlockType.PACKED_ICE;
                      this.setVoxel(voxels, lx, y + s, lz, iceBlock);
                    }
                    continue;
                  }
                }

                // Snow on cold ledges
                const snowNoise = this.noise.noise2D(wx * 0.3, wz * 0.3);
                if (snowNoise > 0.65) {
                  this.setVoxel(voxels, lx, y, lz, BlockType.SNOW_BLOCK);
                  continue;
                }
              }
            } else {
              // Regular Caves: glowing red mushrooms on stone/dirt ledges
              if (blockBelow === BlockType.STONE || blockBelow === BlockType.DIRT || blockBelow === BlockType.COBBLESTONE) {
                const shroomNoise = this.noise.noise3D(wx * 0.4, y * 0.4, wz * 0.4);
                if (shroomNoise > 0.76) {
                  this.setVoxel(voxels, lx, y, lz, BlockType.MUSHROOM);
                  continue;
                }
              }
            }
          }
        }
      }
    }

    // Natural Structure Spawning:
    this.spawnNaturalStructuresInChunk(voxels, chunkX, chunkZ, heights, biomes);

    return voxels;
  }

  /**
   * Generates a 3D Nether dimension chunk.
   */
  public generateNetherChunk(chunkX: number, chunkZ: number): Uint8Array {
    const voxels = new Uint8Array(CHUNK_SIZE_X * CHUNK_SIZE_Z * CHUNK_SIZE_Y);
    const worldStartX = chunkX * CHUNK_SIZE_X;
    const worldStartZ = chunkZ * CHUNK_SIZE_Z;

    const NETHER_LAVA_LEVEL = 28;

    for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
        const wx = worldStartX + lx;
        const wz = worldStartZ + lz;

        // Bedrock floor & ceiling
        this.setVoxel(voxels, lx, 0, lz, BlockType.BEDROCK);
        this.setVoxel(voxels, lx, 1, lz, BlockType.BEDROCK);
        this.setVoxel(voxels, lx, CHUNK_SIZE_Y - 1, lz, BlockType.BEDROCK);
        this.setVoxel(voxels, lx, CHUNK_SIZE_Y - 2, lz, BlockType.BEDROCK);

        for (let y = 2; y < CHUNK_SIZE_Y - 2; y++) {
          // Nether 3D cavernous noise (large open caverns, pillars, overhangs)
          const netherNoise = this.noise.noise3D(wx * 0.025, y * 0.035, wz * 0.025);
          const floorBias = (32 - y) * 0.03;
          const ceilingBias = (y - 85) * 0.03;
          const density = netherNoise + Math.max(floorBias, ceilingBias);

          if (density > 0.05) {
            // Solid Nether terrain
            let b = BlockType.NETHERRACK;
            // Soul sand patches along lower shores
            if (y >= NETHER_LAVA_LEVEL - 2 && y <= NETHER_LAVA_LEVEL + 4) {
              const soulNoise = this.noise.noise2D(wx * 0.08, wz * 0.08);
              if (soulNoise > 0.3) b = BlockType.SOUL_SAND;
            }
            this.setVoxel(voxels, lx, y, lz, b);
          } else {
            // Open air or vast lava sea!
            if (y <= NETHER_LAVA_LEVEL) {
              this.setVoxel(voxels, lx, y, lz, BlockType.LAVA);
            } else {
              this.setVoxel(voxels, lx, y, lz, BlockType.AIR);
            }
          }
        }

        // Hanging Glowstone clusters from ceiling stalactites
        for (let y = 80; y > 40; y--) {
          if (this.getVoxel(voxels, lx, y, lz) === BlockType.AIR &&
              this.getVoxel(voxels, lx, y + 1, lz) === BlockType.NETHERRACK) {
            const glowNoise = this.noise.noise3D(wx * 0.15, y * 0.15, wz * 0.15);
            if (glowNoise > 0.72) {
              const clusterLen = Math.floor(Math.random() * 3) + 1;
              for (let gy = 0; gy < clusterLen; gy++) {
                this.setVoxel(voxels, lx, y - gy, lz, BlockType.GLOWSTONE);
              }
            }
          }
        }
      }
    }

    // Auto-generate spawn portal at (0, 0) in Nether if at origin chunk
    if (chunkX === 0 && chunkZ === 0) {
      this.generatePortalStructure(voxels, 6, 32, 6);
    }

    return voxels;
  }

  /**
   * Generates a 3D "The Sift" dimension chunk with floating archipelago islands.
   */
  public generateSiftChunk(chunkX: number, chunkZ: number): Uint8Array {
    const voxels = new Uint8Array(CHUNK_SIZE_X * CHUNK_SIZE_Z * CHUNK_SIZE_Y);
    const worldStartX = chunkX * CHUNK_SIZE_X;
    const worldStartZ = chunkZ * CHUNK_SIZE_Z;

    for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
        const wx = worldStartX + lx;
        const wz = worldStartZ + lz;

        // Floating Islands 3D noise (centered around y = 52)
        for (let y = 30; y < 80; y++) {
          const islandNoise = this.noise.noise3D(wx * 0.016, (y - 52) * 0.035, wz * 0.016);
          const vDist = Math.abs(y - 52) / 22;
          const density = islandNoise - Math.pow(vDist, 1.85);

          // Center origin chunk (0,0) has guaranteed main island!
          const isOrigin = (chunkX === 0 && chunkZ === 0);
          const originBonus = isOrigin && (y >= 45 && y <= 56) && (lx >= 2 && lx <= 13 && lz >= 2 && lz <= 13) ? 0.35 : 0;

          if (density + originBonus > 0.08) {
            this.setVoxel(voxels, lx, y, lz, BlockType.SIFTSTONE);
          }
        }

        // Top surface conversion: Topmost solid block becomes SIFT_GRASS
        for (let y = 79; y >= 30; y--) {
          if (this.getVoxel(voxels, lx, y, lz) === BlockType.SIFTSTONE) {
            const above = this.getVoxel(voxels, lx, y + 1, lz);
            if (above === BlockType.AIR) {
              this.setVoxel(voxels, lx, y, lz, BlockType.SIFT_GRASS);

              // Flora on top of Sift Grass (Willow Bush)
              const floraNoise = Math.abs(this.noise.noise2D(wx * 0.35 + 50, wz * 0.35 + 50));
              if (floraNoise > 0.62) {
                this.setVoxel(voxels, lx, y + 1, lz, BlockType.WILLOW_BUSH);
              }

              // Willow Trees (White wood and white leaves)
              if (lx >= 2 && lx <= 13 && lz >= 2 && lz <= 13) {
                const treeNoise = Math.abs(this.noise.noise2D(wx * 0.22 + 88, wz * 0.22 + 88));
                if (treeNoise > 0.84) {
                  this.generateWillowTree(voxels, lx, y + 1, lz);
                }
              }
              break;
            }
          }
        }
      }
    }

    // Origin island portal in The Sift
    if (chunkX === 0 && chunkZ === 0) {
      this.generateSiftPortalStructure(voxels, 6, 56, 6);
    }

    return voxels;
  }

  /**
   * Generates a Willow Tree in The Sift (white wood trunk, luminous white leaves).
   */
  public generateWillowTree(voxels: Uint8Array, x: number, y: number, z: number) {
    const trunkHeight = 5;
    for (let ty = 0; ty < trunkHeight; ty++) {
      if (y + ty < CHUNK_SIZE_Y) {
        this.setVoxel(voxels, x, y + ty, z, BlockType.WILLOW_LOG);
      }
    }
    const leafStart = y + trunkHeight - 2;
    for (let ly = leafStart; ly <= leafStart + 3; ly++) {
      if (ly >= CHUNK_SIZE_Y) break;
      const radius = ly >= leafStart + 2 ? 1 : 2;
      for (let ox = -radius; ox <= radius; ox++) {
        for (let oz = -radius; oz <= radius; oz++) {
          const vx = x + ox;
          const vz = z + oz;
          if (ox === 0 && oz === 0 && ly < y + trunkHeight) continue;
          if (Math.abs(ox) === 2 && Math.abs(oz) === 2 && ly === leafStart + 1) continue;
          if (this.getVoxel(voxels, vx, ly, vz) === BlockType.AIR) {
            this.setVoxel(voxels, vx, ly, vz, BlockType.WILLOW_LEAVES);
          }
        }
      }
    }
  }

  /**
   * Generates a Sift Portal structure (Siftstone frame with glowing Sift Portal core).
   */
  public generateSiftPortalStructure(voxels: Uint8Array, ox: number, oy: number, oz: number) {
    // Solid platform under and around the portal
    for (let px = -1; px <= 4; px++) {
      for (let pz = -2; pz <= 2; pz++) {
        this.setVoxel(voxels, ox + px, oy - 1, oz + pz, BlockType.SIFTSTONE);
      }
    }
    for (let dx = 0; dx < 4; dx++) {
      for (let dy = 0; dy < 5; dy++) {
        const isBorder = (dx === 0 || dx === 3 || dy === 0 || dy === 4);
        const block = isBorder ? BlockType.SIFTSTONE : BlockType.SIFT_PORTAL;
        this.setVoxel(voxels, ox + dx, oy + dy, oz, block);
      }
    }
  }

  /**
   * Generates a complete 4x5 Nether Portal structure in a chunk.
   */
  public generatePortalStructure(voxels: Uint8Array, ox: number, oy: number, oz: number) {
    // 4 wide, 5 high vertical obsidian frame with portal in center
    for (let dx = 0; dx < 4; dx++) {
      for (let dy = 0; dy < 5; dy++) {
        const isBorder = (dx === 0 || dx === 3 || dy === 0 || dy === 4);
        const block = isBorder ? BlockType.OBSIDIAN : BlockType.NETHER_PORTAL;
        this.setVoxel(voxels, ox + dx, oy + dy, oz, block);
      }
    }
  }

  // Mangrove Tree with roots
  private generateMangroveTree(voxels: Uint8Array, x: number, y: number, z: number) {
    // 1. Mangrove Stilt Roots (arched down to ground)
    const rootOffsets = [[1, 1], [-1, 1], [1, -1], [-1, -1], [2, 0], [-2, 0], [0, 2], [0, -2]];
    for (const [rx, rz] of rootOffsets) {
      this.setVoxel(voxels, x + rx, y, z + rz, BlockType.MANGROVE_ROOTS);
      this.setVoxel(voxels, x + rx, y + 1, z + rz, BlockType.MANGROVE_ROOTS);
    }

    // 2. Trunk
    const trunkHeight = 6;
    for (let ty = 1; ty <= trunkHeight; ty++) {
      this.setVoxel(voxels, x, y + ty, z, BlockType.MANGROVE_LOG);
    }

    // 3. Dense sprawling canopy
    const leafStart = y + trunkHeight - 2;
    for (let ly = leafStart; ly <= leafStart + 4; ly++) {
      const radius = ly >= leafStart + 3 ? 1 : (ly >= leafStart + 2 ? 2 : 3);
      for (let ox = -radius; ox <= radius; ox++) {
        for (let oz = -radius; oz <= radius; oz++) {
          if (ox === 0 && oz === 0 && ly < y + trunkHeight) continue;
          if (Math.abs(ox) === radius && Math.abs(oz) === radius && Math.random() > 0.4) continue;
          const vx = x + ox;
          const vz = z + oz;
          if (this.getVoxel(voxels, vx, ly, vz) === BlockType.AIR) {
            this.setVoxel(voxels, vx, ly, vz, BlockType.MANGROVE_LEAVES);
          }
        }
      }
    }
  }

  // Standard Deciduous Tree
  private generateDeciduousTree(
    voxels: Uint8Array,
    x: number,
    y: number,
    z: number,
    leafType: BlockType = BlockType.OAK_LEAVES,
    logType: BlockType = BlockType.OAK_LOG
  ) {
    const trunkHeight = 5;
    for (let ty = 0; ty < trunkHeight; ty++) {
      if (y + ty < CHUNK_SIZE_Y) {
        this.setVoxel(voxels, x, y + ty, z, logType);
      }
    }
    const leafStart = y + trunkHeight - 2;
    for (let ly = leafStart; ly <= leafStart + 3; ly++) {
      if (ly >= CHUNK_SIZE_Y) break;
      const radius = ly >= leafStart + 2 ? 1 : 2;
      for (let ox = -radius; ox <= radius; ox++) {
        for (let oz = -radius; oz <= radius; oz++) {
          const vx = x + ox;
          const vz = z + oz;
          if (ox === 0 && oz === 0 && ly < y + trunkHeight) continue;
          if (Math.abs(ox) === 2 && Math.abs(oz) === 2 && ly === leafStart + 1) continue;
          if (this.getVoxel(voxels, vx, ly, vz) === BlockType.AIR) {
            this.setVoxel(voxels, vx, ly, vz, leafType);
          }
        }
      }
    }
  }

  // Conical Pine Tree (pine wood changed to Oak Log)
  private generatePineTree(voxels: Uint8Array, x: number, y: number, z: number) {
    const trunkHeight = 7;
    for (let ty = 0; ty < trunkHeight; ty++) {
      if (y + ty < CHUNK_SIZE_Y) {
        this.setVoxel(voxels, x, y + ty, z, BlockType.OAK_LOG);
      }
    }
    const leafStart = y + 2;
    for (let ly = leafStart; ly <= y + trunkHeight + 1; ly++) {
      if (ly >= CHUNK_SIZE_Y) break;
      const progress = (ly - leafStart) / trunkHeight;
      const radius = progress < 0.4 ? 2 : (progress < 0.8 ? 1 : 0);
      for (let ox = -radius; ox <= radius; ox++) {
        for (let oz = -radius; oz <= radius; oz++) {
          const vx = x + ox;
          const vz = z + oz;
          if (ox === 0 && oz === 0 && ly < y + trunkHeight) continue;
          if (this.getVoxel(voxels, vx, ly, vz) === BlockType.AIR) {
            this.setVoxel(voxels, vx, ly, vz, BlockType.PINE_LEAVES);
          }
        }
      }
    }
  }

  /**
   * Spawns natural structures in chunks based on deterministic coordinate hashing.
   */
  private spawnNaturalStructuresInChunk(
    voxels: Uint8Array,
    chunkX: number,
    chunkZ: number,
    heights: Int32Array,
    biomes: BiomeType[]
  ) {
    const hash = Math.abs(Math.sin(chunkX * 12.9898 + chunkZ * 78.233 + this.seed) * 43758.5453);
    const centerIdx = 8 + 8 * CHUNK_SIZE_X;
    const surfaceH = heights[centerIdx];
    const centerBiome = biomes[centerIdx];

    // 1. Desert Temple (rare in Desert biome)
    if (centerBiome === BiomeType.DESERT && Math.floor(hash) % 14 === 0 && surfaceH > SEA_LEVEL + 2) {
      this.buildDesertTemple((x, y, z, b) => this.setVoxel(voxels, x, y, z, b), 0, surfaceH - 1, 0);
    }

    // 2. Village House (in Plains / Fall Forest)
    else if ((centerBiome === BiomeType.PLAINS || centerBiome === BiomeType.FALL_FOREST) &&
             Math.floor(hash) % 16 === 0 && surfaceH > SEA_LEVEL + 2 && surfaceH < 60) {
      this.buildVillage((x, y, z, b) => this.setVoxel(voxels, x, y, z, b), 3, surfaceH, 3);
    }

    // 3. Underground Dungeon (Cobblestone room with spawner & chests)
    if (Math.floor(hash * 3) % 18 === 0) {
      const dungeonY = 16 + (Math.floor(hash * 7) % 18);
      this.buildDungeon((x, y, z, b) => this.setVoxel(voxels, x, y, z, b), 4, dungeonY, 4);
    }

    // 4. Underground Mineshaft
    else if (Math.floor(hash * 5) % 15 === 0) {
      const mineshaftY = 22 + (Math.floor(hash * 11) % 16);
      this.buildMineshaft((x, y, z, b) => this.setVoxel(voxels, x, y, z, b), 2, mineshaftY, 2);
    }

    // 5. Mystical Sift Portal Shrine (near spawn at chunk 1,0 or scattered across overworld)
    if ((chunkX === 1 && chunkZ === 0) || (Math.floor(hash * 7) % 24 === 0 && surfaceH > SEA_LEVEL + 1 && surfaceH < 65)) {
      this.generateSiftPortalStructure(voxels, 4, surfaceH + 1, 4);
    }
  }

  // --- STRUCTURE BUILDERS ---

  /**
   * Village House & Farm
   */
  public buildVillage(setBlock: (x: number, y: number, z: number, b: BlockType) => void, ox: number, oy: number, oz: number) {
    const w = 6;
    const d = 6;
    const h = 5;

    // Cobblestone foundation & gravel pathway
    for (let x = -1; x <= w; x++) {
      for (let z = -1; z <= d; z++) {
        setBlock(ox + x, oy, oz + z, BlockType.COBBLESTONE);
      }
    }

    // Walls (Wood planks with Oak log corners)
    for (let y = 1; y <= h; y++) {
      for (let x = 0; x < w; x++) {
        for (let z = 0; z < d; z++) {
          const isCorner = (x === 0 || x === w - 1) && (z === 0 || z === d - 1);
          const isWall = (x === 0 || x === w - 1 || z === 0 || z === d - 1);

          if (isCorner) {
            setBlock(ox + x, oy + y, oz + z, BlockType.OAK_LOG);
          } else if (isWall) {
            // Door opening on front
            if (z === 0 && x === 2 && y <= 2) {
              setBlock(ox + x, oy + y, oz + z, BlockType.AIR);
            }
            // Glass windows
            else if (y === 2 && ((x === 4 && z === 0) || (x === 2 && z === d - 1) || (z === 3 && x === 0))) {
              setBlock(ox + x, oy + y, oz + z, BlockType.GLASS);
            } else {
              setBlock(ox + x, oy + y, oz + z, BlockType.WOOD_PLANK);
            }
          } else {
            // Interior hollow
            setBlock(ox + x, oy + y, oz + z, BlockType.AIR);
          }
        }
      }
    }

    // Wood Plank Roof
    for (let x = -1; x <= w; x++) {
      for (let z = -1; z <= d; z++) {
        setBlock(ox + x, oy + h + 1, oz + z, BlockType.WOOD_PLANK);
      }
    }

    // Furniture: Chest, Bookshelf, Torch
    setBlock(ox + 4, oy + 1, oz + 4, BlockType.CHEST);
    setBlock(ox + 1, oy + 1, oz + 4, BlockType.BOOKSHELF);
    setBlock(ox + 2, oy + 3, oz + 1, BlockType.TORCH);
  }

  /**
   * Desert Temple
   */
  public buildDesertTemple(setBlock: (x: number, y: number, z: number, b: BlockType) => void, ox: number, oy: number, oz: number) {
    const size = 15;
    const height = 8;

    // Sandstone Pyramid Body
    for (let y = 0; y < height; y++) {
      const inset = Math.floor(y / 2);
      for (let x = inset; x < size - inset; x++) {
        for (let z = inset; z < size - inset; z++) {
          setBlock(ox + x, oy + y, oz + z, BlockType.SANDSTONE);
        }
      }
    }

    // Hollow out grand center entrance hall
    for (let y = 1; y <= 5; y++) {
      for (let x = 4; x <= 10; x++) {
        for (let z = 4; z <= 10; z++) {
          setBlock(ox + x, oy + y, oz + z, BlockType.AIR);
        }
      }
    }

    // Decorative front entry opening
    for (let y = 1; y <= 3; y++) {
      for (let x = 6; x <= 8; x++) {
        setBlock(ox + x, oy + y, oz + 0, BlockType.AIR);
      }
    }

    // Center decorative floor & Secret Trap Chamber
    // Secret pit below center floor
    const trapY = oy - 8;
    for (let y = oy; y >= trapY; y--) {
      for (let x = 6; x <= 8; x++) {
        for (let z = 6; z <= 8; z++) {
          setBlock(ox + x, y, oz + z, BlockType.AIR);
        }
      }
    }

    // Floor of trap pit: TNT + 4 Chests!
    for (let x = 6; x <= 8; x++) {
      for (let z = 6; z <= 8; z++) {
        setBlock(ox + x, trapY - 1, oz + z, BlockType.TNT);
        setBlock(ox + x, trapY, oz + z, BlockType.STONE);
      }
    }
    // 4 Loot Chests in the corners of the secret chamber
    setBlock(ox + 6, trapY + 1, oz + 6, BlockType.CHEST);
    setBlock(ox + 8, trapY + 1, oz + 6, BlockType.CHEST);
    setBlock(ox + 6, trapY + 1, oz + 8, BlockType.CHEST);
    setBlock(ox + 8, trapY + 1, oz + 8, BlockType.CHEST);

    // Torches in temple
    setBlock(ox + 5, oy + 3, oz + 5, BlockType.TORCH);
    setBlock(ox + 9, oy + 3, oz + 5, BlockType.TORCH);
  }

  /**
   * Underground Dungeon
   */
  public buildDungeon(setBlock: (x: number, y: number, z: number, b: BlockType) => void, ox: number, oy: number, oz: number) {
    const size = 7;
    const h = 5;

    // Cobblestone walls and floor
    for (let y = 0; y <= h; y++) {
      for (let x = 0; x < size; x++) {
        for (let z = 0; z < size; z++) {
          const isBorder = (x === 0 || x === size - 1 || z === 0 || z === size - 1 || y === 0 || y === h);
          if (isBorder) {
            setBlock(ox + x, oy + y, oz + z, BlockType.COBBLESTONE);
          } else {
            setBlock(ox + x, oy + y, oz + z, BlockType.AIR);
          }
        }
      }
    }

    // Monster Spawner in exact center
    const cx = ox + Math.floor(size / 2);
    const cz = oz + Math.floor(size / 2);
    setBlock(cx, oy + 1, cz, BlockType.SPAWNER);

    // Loot Chests on perimeter
    setBlock(ox + 1, oy + 1, cz, BlockType.CHEST);
    setBlock(ox + size - 2, oy + 1, cz, BlockType.CHEST);

    // Torches
    setBlock(ox + 1, oy + 3, oz + 1, BlockType.TORCH);
    setBlock(ox + size - 2, oy + 3, oz + size - 2, BlockType.TORCH);
  }

  /**
   * Underground Abandoned Mineshaft
   */
  public buildMineshaft(setBlock: (x: number, y: number, z: number, b: BlockType) => void, ox: number, oy: number, oz: number) {
    const length = 14;

    // Dig 3x3 tunnel
    for (let z = 0; z < length; z++) {
      for (let x = 0; x < 3; x++) {
        for (let y = 0; y < 4; y++) {
          if (y === 0) {
            setBlock(ox + x, oy + y, oz + z, (x + z) % 3 === 0 ? BlockType.GRAVEL : BlockType.COBBLESTONE);
          } else {
            setBlock(ox + x, oy + y, oz + z, BlockType.AIR);
          }
        }
      }

      // Oak wooden arch support every 4 blocks
      if (z % 4 === 0) {
        setBlock(ox + 0, oy + 1, oz + z, BlockType.WOOD_PLANK);
        setBlock(ox + 0, oy + 2, oz + z, BlockType.WOOD_PLANK);
        setBlock(ox + 2, oy + 1, oz + z, BlockType.WOOD_PLANK);
        setBlock(ox + 2, oy + 2, oz + z, BlockType.WOOD_PLANK);
        setBlock(ox + 0, oy + 3, oz + z, BlockType.WOOD_PLANK);
        setBlock(ox + 1, oy + 3, oz + z, BlockType.WOOD_PLANK);
        setBlock(ox + 2, oy + 3, oz + z, BlockType.WOOD_PLANK);

        // Torch on support beam
        setBlock(ox + 1, oy + 2, oz + z, BlockType.TORCH);
      }
    }

    // Mineshaft treasure chest
    setBlock(ox + 1, oy + 1, oz + Math.floor(length / 2), BlockType.CHEST);
  }

  /**
   * Locates the nearest occurrence of a specified surface or cave biome.
   */
  public locateBiome(biomeName: string, startX: number, startZ: number): { x: number; z: number; dist: number; y?: number } | null {
    const target = biomeName.toLowerCase().trim();
    const step = 24;
    const maxDist = 1200;

    // Check for cave biomes
    if (target.includes('lush')) {
      for (let r = step; r <= maxDist; r += step) {
        for (let angle = 0; angle < Math.PI * 2; angle += 0.35) {
          const x = Math.round(startX + Math.cos(angle) * r);
          const z = Math.round(startZ + Math.sin(angle) * r);
          if (this.getCaveBiome(x, 25, z) === CaveBiomeType.LUSH) {
            return { x, z, dist: Math.round(r), y: 25 };
          }
        }
      }
      return null;
    }

    if (target.includes('ice_cave') || target.includes('ice cave') || (target.includes('ice') && target.includes('cave'))) {
      for (let r = step; r <= maxDist; r += step) {
        for (let angle = 0; angle < Math.PI * 2; angle += 0.35) {
          const x = Math.round(startX + Math.cos(angle) * r);
          const z = Math.round(startZ + Math.sin(angle) * r);
          if (this.getCaveBiome(x, 25, z) === CaveBiomeType.ICE) {
            return { x, z, dist: Math.round(r), y: 25 };
          }
        }
      }
      return null;
    }

    let targetType: BiomeType | null = null;

    if (target.includes('desert')) targetType = BiomeType.DESERT;
    else if (target.includes('fall')) targetType = BiomeType.FALL_FOREST;
    else if (target.includes('mangrove') || target.includes('swamp')) targetType = BiomeType.MANGROVE_FOREST;
    else if (target.includes('mountain')) targetType = BiomeType.MOUNTAINS;
    else if (target.includes('ocean')) targetType = BiomeType.OCEAN;
    else if (target.includes('taiga') || target.includes('snow')) targetType = BiomeType.TAIGA;
    else if (target.includes('plain')) targetType = BiomeType.PLAINS;

    if (!targetType) return null;

    // Spiral search outward in 24-block steps up to radius 1200
    for (let r = step; r <= maxDist; r += step) {
      for (let angle = 0; angle < Math.PI * 2; angle += 0.35) {
        const x = Math.round(startX + Math.cos(angle) * r);
        const z = Math.round(startZ + Math.sin(angle) * r);
        const b = this.getBiomeAt(x, z);
        if (b === targetType) {
          return { x, z, dist: Math.round(r) };
        }
      }
    }

    return null;
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
