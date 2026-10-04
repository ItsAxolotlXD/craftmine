/**
 * Block types, properties and texture atlas indices.
 */

export enum BlockType {
  AIR = 0,
  GRASS = 1,
  DIRT = 2,
  STONE = 3,
  COBBLESTONE = 4,
  BEDROCK = 5,
  SAND = 6,
  SANDSTONE = 7,
  WATER = 8,
  OAK_LOG = 9,
  OAK_LEAVES = 10,
  SNOW_BLOCK = 11,
  ICE = 12,
  COAL_ORE = 13,
  IRON_ORE = 14,
  GOLD_ORE = 15,
  DIAMOND_ORE = 16,
  EMERALD_ORE = 17,
  WOOD_PLANK = 18,
  BRICK = 19,
  GLASS = 20,
  GRAVEL = 21,
  GLOWSTONE = 22,
  OBSIDIAN = 23,
  FLOWER_RED = 24,
  FLOWER_YELLOW = 25,
  MUSHROOM = 26,
  LAVA = 27,
  TORCH = 28,
  CLAY = 29,
  BOOKSHELF = 30,
  TNT = 31,
  PINE_LOG = 32,
  PINE_LEAVES = 33,
  LEAVES_RED = 34,
  LEAVES_ORANGE = 35,
  LEAVES_CHERRY = 36,
  FLINT_AND_STEEL = 37,
}

export interface BlockFaceTextures {
  top: number;
  bottom: number;
  north: number;
  south: number;
  west: number;
  east: number;
}

export interface BlockDef {
  id: BlockType;
  name: string;
  transparent: boolean;
  isLiquid?: boolean;
  isPassable?: boolean;
  lightEmission?: number; // 0 - 15
  textures: BlockFaceTextures | number; // single index or 6 sides
  soundType: 'grass' | 'stone' | 'wood' | 'sand' | 'water' | 'glass' | 'snow';
  colorHex: string; // for UI hotbar icon preview
}

// Atlas Texture indices (16x16 grid on a 256x256 atlas = 0..255)
export const ATLAS_COLS = 16;
export const ATLAS_ROWS = 16;

export const ATLAS_INDEX = {
  GRASS_TOP: 0,
  GRASS_SIDE: 1,
  DIRT: 2,
  STONE: 3,
  COBBLESTONE: 4,
  BEDROCK: 5,
  SAND: 6,
  SANDSTONE_SIDE: 7,
  SANDSTONE_TOP: 8,
  WATER: 9,
  OAK_LOG_SIDE: 10,
  OAK_LOG_TOP: 11,
  OAK_LEAVES: 12,
  SNOW_BLOCK: 13,
  SNOW_SIDE: 14,
  ICE: 15,
  COAL_ORE: 16,
  IRON_ORE: 17,
  GOLD_ORE: 18,
  DIAMOND_ORE: 19,
  EMERALD_ORE: 20,
  WOOD_PLANK: 21,
  BRICK: 22,
  GLASS: 23,
  GRAVEL: 24,
  GLOWSTONE: 25,
  OBSIDIAN: 26,
  FLOWER_RED: 27,
  FLOWER_YELLOW: 28,
  MUSHROOM: 29,
  LAVA: 30,
  TORCH: 31,
  CLAY: 32,
  BOOKSHELF: 33,
  TNT_SIDE: 34,
  TNT_TOP: 35,
  PINE_LOG_SIDE: 36,
  PINE_LOG_TOP: 37,
  PINE_LEAVES: 38,
  LEAVES_RED: 39,
  LEAVES_ORANGE: 40,
  LEAVES_CHERRY: 41,
};

function sideUniform(idx: number): BlockFaceTextures {
  return { top: idx, bottom: idx, north: idx, south: idx, west: idx, east: idx };
}

function topSideBottom(top: number, side: number, bottom: number): BlockFaceTextures {
  return { top, bottom, north: side, south: side, west: side, east: side };
}

export const BLOCK_DEFS: Record<BlockType, BlockDef> = {
  [BlockType.AIR]: {
    id: BlockType.AIR,
    name: 'Air',
    transparent: true,
    isPassable: true,
    textures: 0,
    soundType: 'grass',
    colorHex: 'transparent',
  },
  [BlockType.GRASS]: {
    id: BlockType.GRASS,
    name: 'Grass Block',
    transparent: false,
    textures: topSideBottom(ATLAS_INDEX.GRASS_TOP, ATLAS_INDEX.GRASS_SIDE, ATLAS_INDEX.DIRT),
    soundType: 'grass',
    colorHex: '#5b8e3a',
  },
  [BlockType.DIRT]: {
    id: BlockType.DIRT,
    name: 'Dirt',
    transparent: false,
    textures: sideUniform(ATLAS_INDEX.DIRT),
    soundType: 'grass',
    colorHex: '#866043',
  },
  [BlockType.STONE]: {
    id: BlockType.STONE,
    name: 'Stone',
    transparent: false,
    textures: sideUniform(ATLAS_INDEX.STONE),
    soundType: 'stone',
    colorHex: '#737373',
  },
  [BlockType.COBBLESTONE]: {
    id: BlockType.COBBLESTONE,
    name: 'Cobblestone',
    transparent: false,
    textures: sideUniform(ATLAS_INDEX.COBBLESTONE),
    soundType: 'stone',
    colorHex: '#5a5a5a',
  },
  [BlockType.BEDROCK]: {
    id: BlockType.BEDROCK,
    name: 'Bedrock',
    transparent: false,
    textures: sideUniform(ATLAS_INDEX.BEDROCK),
    soundType: 'stone',
    colorHex: '#262626',
  },
  [BlockType.SAND]: {
    id: BlockType.SAND,
    name: 'Sand',
    transparent: false,
    textures: sideUniform(ATLAS_INDEX.SAND),
    soundType: 'sand',
    colorHex: '#d8cc8e',
  },
  [BlockType.SANDSTONE]: {
    id: BlockType.SANDSTONE,
    name: 'Sandstone',
    transparent: false,
    textures: topSideBottom(ATLAS_INDEX.SANDSTONE_TOP, ATLAS_INDEX.SANDSTONE_SIDE, ATLAS_INDEX.SANDSTONE_TOP),
    soundType: 'stone',
    colorHex: '#c2b27a',
  },
  [BlockType.WATER]: {
    id: BlockType.WATER,
    name: 'Water',
    transparent: true,
    isLiquid: true,
    isPassable: true,
    textures: sideUniform(ATLAS_INDEX.WATER),
    soundType: 'water',
    colorHex: '#2979ff',
  },
  [BlockType.OAK_LOG]: {
    id: BlockType.OAK_LOG,
    name: 'Oak Wood',
    transparent: false,
    textures: topSideBottom(ATLAS_INDEX.OAK_LOG_TOP, ATLAS_INDEX.OAK_LOG_SIDE, ATLAS_INDEX.OAK_LOG_TOP),
    soundType: 'wood',
    colorHex: '#6d5334',
  },
  [BlockType.OAK_LEAVES]: {
    id: BlockType.OAK_LEAVES,
    name: 'Oak Leaves',
    transparent: true,
    textures: sideUniform(ATLAS_INDEX.OAK_LEAVES),
    soundType: 'grass',
    colorHex: '#41732a',
  },
  [BlockType.SNOW_BLOCK]: {
    id: BlockType.SNOW_BLOCK,
    name: 'Snow Block',
    transparent: false,
    textures: sideUniform(ATLAS_INDEX.SNOW_BLOCK),
    soundType: 'snow',
    colorHex: '#f0f4f8',
  },
  [BlockType.ICE]: {
    id: BlockType.ICE,
    name: 'Ice',
    transparent: true,
    textures: sideUniform(ATLAS_INDEX.ICE),
    soundType: 'glass',
    colorHex: '#90caf9',
  },
  [BlockType.COAL_ORE]: {
    id: BlockType.COAL_ORE,
    name: 'Coal Ore',
    transparent: false,
    textures: sideUniform(ATLAS_INDEX.COAL_ORE),
    soundType: 'stone',
    colorHex: '#383838',
  },
  [BlockType.IRON_ORE]: {
    id: BlockType.IRON_ORE,
    name: 'Iron Ore',
    transparent: false,
    textures: sideUniform(ATLAS_INDEX.IRON_ORE),
    soundType: 'stone',
    colorHex: '#bc8f8f',
  },
  [BlockType.GOLD_ORE]: {
    id: BlockType.GOLD_ORE,
    name: 'Gold Ore',
    transparent: false,
    textures: sideUniform(ATLAS_INDEX.GOLD_ORE),
    soundType: 'stone',
    colorHex: '#ffd700',
  },
  [BlockType.DIAMOND_ORE]: {
    id: BlockType.DIAMOND_ORE,
    name: 'Diamond Ore',
    transparent: false,
    textures: sideUniform(ATLAS_INDEX.DIAMOND_ORE),
    soundType: 'stone',
    colorHex: '#4dd0e1',
  },
  [BlockType.EMERALD_ORE]: {
    id: BlockType.EMERALD_ORE,
    name: 'Emerald Ore',
    transparent: false,
    textures: sideUniform(ATLAS_INDEX.EMERALD_ORE),
    soundType: 'stone',
    colorHex: '#00e676',
  },
  [BlockType.WOOD_PLANK]: {
    id: BlockType.WOOD_PLANK,
    name: 'Wooden Planks',
    transparent: false,
    textures: sideUniform(ATLAS_INDEX.WOOD_PLANK),
    soundType: 'wood',
    colorHex: '#9c7a4b',
  },
  [BlockType.BRICK]: {
    id: BlockType.BRICK,
    name: 'Brick',
    transparent: false,
    textures: sideUniform(ATLAS_INDEX.BRICK),
    soundType: 'stone',
    colorHex: '#964b38',
  },
  [BlockType.GLASS]: {
    id: BlockType.GLASS,
    name: 'Glass',
    transparent: true,
    textures: sideUniform(ATLAS_INDEX.GLASS),
    soundType: 'glass',
    colorHex: '#b2ebf2',
  },
  [BlockType.GRAVEL]: {
    id: BlockType.GRAVEL,
    name: 'Gravel',
    transparent: false,
    textures: sideUniform(ATLAS_INDEX.GRAVEL),
    soundType: 'sand',
    colorHex: '#808080',
  },
  [BlockType.GLOWSTONE]: {
    id: BlockType.GLOWSTONE,
    name: 'Glowstone',
    transparent: false,
    lightEmission: 15,
    textures: sideUniform(ATLAS_INDEX.GLOWSTONE),
    soundType: 'glass',
    colorHex: '#ffea00',
  },
  [BlockType.OBSIDIAN]: {
    id: BlockType.OBSIDIAN,
    name: 'Obsidian',
    transparent: false,
    textures: sideUniform(ATLAS_INDEX.OBSIDIAN),
    soundType: 'stone',
    colorHex: '#1a102f',
  },
  [BlockType.FLOWER_RED]: {
    id: BlockType.FLOWER_RED,
    name: 'Poppy Flower',
    transparent: true,
    isPassable: true,
    textures: sideUniform(ATLAS_INDEX.FLOWER_RED),
    soundType: 'grass',
    colorHex: '#e53935',
  },
  [BlockType.FLOWER_YELLOW]: {
    id: BlockType.FLOWER_YELLOW,
    name: 'Dandelion',
    transparent: true,
    isPassable: true,
    textures: sideUniform(ATLAS_INDEX.FLOWER_YELLOW),
    soundType: 'grass',
    colorHex: '#fdd835',
  },
  [BlockType.MUSHROOM]: {
    id: BlockType.MUSHROOM,
    name: 'Cave Mushroom',
    transparent: true,
    isPassable: true,
    lightEmission: 6,
    textures: sideUniform(ATLAS_INDEX.MUSHROOM),
    soundType: 'grass',
    colorHex: '#a52a2a',
  },
  [BlockType.LAVA]: {
    id: BlockType.LAVA,
    name: 'Lava',
    transparent: false,
    isLiquid: true,
    lightEmission: 15,
    textures: sideUniform(ATLAS_INDEX.LAVA),
    soundType: 'water',
    colorHex: '#ff5722',
  },
  [BlockType.TORCH]: {
    id: BlockType.TORCH,
    name: 'Torch',
    transparent: true,
    isPassable: true,
    lightEmission: 14,
    textures: sideUniform(ATLAS_INDEX.TORCH),
    soundType: 'wood',
    colorHex: '#ffb300',
  },
  [BlockType.CLAY]: {
    id: BlockType.CLAY,
    name: 'Clay',
    transparent: false,
    textures: sideUniform(ATLAS_INDEX.CLAY),
    soundType: 'sand',
    colorHex: '#9fa8a3',
  },
  [BlockType.BOOKSHELF]: {
    id: BlockType.BOOKSHELF,
    name: 'Bookshelf',
    transparent: false,
    textures: topSideBottom(ATLAS_INDEX.WOOD_PLANK, ATLAS_INDEX.BOOKSHELF, ATLAS_INDEX.WOOD_PLANK),
    soundType: 'wood',
    colorHex: '#8d6e63',
  },
  [BlockType.TNT]: {
    id: BlockType.TNT,
    name: 'TNT',
    transparent: false,
    textures: topSideBottom(ATLAS_INDEX.TNT_TOP, ATLAS_INDEX.TNT_SIDE, ATLAS_INDEX.TNT_TOP),
    soundType: 'grass',
    colorHex: '#d32f2f',
  },
  [BlockType.PINE_LOG]: {
    id: BlockType.PINE_LOG,
    name: 'Pine Wood',
    transparent: false,
    textures: topSideBottom(ATLAS_INDEX.PINE_LOG_TOP, ATLAS_INDEX.PINE_LOG_SIDE, ATLAS_INDEX.PINE_LOG_TOP),
    soundType: 'wood',
    colorHex: '#3e2723',
  },
  [BlockType.PINE_LEAVES]: {
    id: BlockType.PINE_LEAVES,
    name: 'Pine Needles',
    transparent: true,
    textures: sideUniform(ATLAS_INDEX.PINE_LEAVES),
    soundType: 'grass',
    colorHex: '#2e4933',
  },
  [BlockType.LEAVES_RED]: {
    id: BlockType.LEAVES_RED,
    name: 'Red Leaves',
    transparent: true,
    textures: sideUniform(ATLAS_INDEX.LEAVES_RED),
    soundType: 'grass',
    colorHex: '#b22222',
  },
  [BlockType.LEAVES_ORANGE]: {
    id: BlockType.LEAVES_ORANGE,
    name: 'Orange Leaves',
    transparent: true,
    textures: sideUniform(ATLAS_INDEX.LEAVES_ORANGE),
    soundType: 'grass',
    colorHex: '#d97706',
  },
  [BlockType.LEAVES_CHERRY]: {
    id: BlockType.LEAVES_CHERRY,
    name: 'Cherry Leaves',
    transparent: true,
    textures: sideUniform(ATLAS_INDEX.LEAVES_CHERRY),
    soundType: 'grass',
    colorHex: '#f472b6',
  },
  [BlockType.FLINT_AND_STEEL]: {
    id: BlockType.FLINT_AND_STEEL,
    name: 'Flint and Steel',
    transparent: true,
    textures: sideUniform(ATLAS_INDEX.DIRT), // Tool item
    soundType: 'stone',
    colorHex: '#888888',
  },
};

export function getFaceTextureIndex(blockId: BlockType, face: 'top' | 'bottom' | 'north' | 'south' | 'west' | 'east'): number {
  const def = BLOCK_DEFS[blockId];
  if (!def) return 0;
  if (typeof def.textures === 'number') return def.textures;
  return def.textures[face];
}

export function getBlockTextureUrl(id: BlockType): string {
  switch (id) {
    case BlockType.GRASS: return '/textures/grass_side.png';
    case BlockType.DIRT: return '/textures/dirt.png';
    case BlockType.STONE: return '/textures/stone.png';
    case BlockType.COBBLESTONE: return '/textures/cobblestone.png';
    case BlockType.BEDROCK: return '/textures/bedrock.png';
    case BlockType.SAND: return '/textures/sand.png';
    case BlockType.WOOD_PLANK: return '/textures/wood_plank.png';
    case BlockType.OAK_LOG: return '/textures/oak_log_side.png';
    case BlockType.OAK_LEAVES: return '/textures/leaves_oak.png';
    case BlockType.LEAVES_RED: return '/textures/leaves_red.png';
    case BlockType.LEAVES_ORANGE: return '/textures/leaves_orange.png';
    case BlockType.LEAVES_CHERRY: return '/textures/leaves_cherry.png';
    case BlockType.BRICK: return '/textures/brick.png';
    case BlockType.GLASS: return '/textures/glass.png';
    case BlockType.COAL_ORE: return '/textures/coal_ore.png';
    case BlockType.IRON_ORE: return '/textures/iron_ore.png';
    case BlockType.GOLD_ORE: return '/textures/gold_ore.png';
    case BlockType.DIAMOND_ORE: return '/textures/diamond_ore.png';
    case BlockType.EMERALD_ORE: return '/textures/emerald_ore.png';
    case BlockType.GLOWSTONE: return '/textures/glowstone.png';
    case BlockType.OBSIDIAN: return '/textures/obsidian.png';
    case BlockType.SNOW_BLOCK: return '/textures/snow.png';
    case BlockType.TNT: return '/textures/tnt_side.png';
    case BlockType.FLINT_AND_STEEL: return '/textures/flint_and_steel.png';
    case BlockType.TORCH: return '/textures/torch.png';
    default: return '/textures/dirt.png';
  }
}

