import * as THREE from 'three';
import { ATLAS_COLS, ATLAS_ROWS, ATLAS_INDEX, BlockType, BLOCK_DEFS, getFaceTextureIndex } from './blocks';

/**
 * Procedural 16x16 Pixel Texture Atlas Generator.
 * Creates an authentic, nostalgic Minecraft-style texture atlas with crisp NearestFilter.
 */

export class TextureAtlas {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  public texture: THREE.CanvasTexture;
  public readonly tileSize = 16;
  public readonly atlasWidth = ATLAS_COLS * 16; // 256
  public readonly atlasHeight = ATLAS_ROWS * 16; // 256

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.atlasWidth;
    this.canvas.height = this.atlasHeight;
    const context = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Could not get 2D canvas context');
    this.ctx = context;

    this.generateAllTextures();

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.generateMipmaps = false;
    this.texture.colorSpace = THREE.SRGBColorSpace;
  }

  // Calculate UV coordinates for a given tile index
  public getUVs(tileIndex: number): [number, number, number, number] {
    const col = tileIndex % ATLAS_COLS;
    const row = Math.floor(tileIndex / ATLAS_COLS);

    const uMin = col / ATLAS_COLS;
    const uMax = (col + 1) / ATLAS_COLS;
    // In Three.js UV space, Y starts at bottom (0) to top (1)
    const vMax = 1 - row / ATLAS_ROWS;
    const vMin = 1 - (row + 1) / ATLAS_ROWS;

    return [uMin, vMin, uMax, vMax];
  }

  private generateAllTextures() {
    // Fill transparent background
    this.ctx.clearRect(0, 0, this.atlasWidth, this.atlasHeight);

    // Render each block tile
    this.renderDirt(ATLAS_INDEX.DIRT);
    this.renderGrassTop(ATLAS_INDEX.GRASS_TOP);
    this.renderGrassSide(ATLAS_INDEX.GRASS_SIDE);
    this.renderStone(ATLAS_INDEX.STONE);
    this.renderCobblestone(ATLAS_INDEX.COBBLESTONE);
    this.renderBedrock(ATLAS_INDEX.BEDROCK);
    this.renderSand(ATLAS_INDEX.SAND);
    this.renderSandstoneSide(ATLAS_INDEX.SANDSTONE_SIDE);
    this.renderSandstoneTop(ATLAS_INDEX.SANDSTONE_TOP);
    this.renderWater(ATLAS_INDEX.WATER);
    this.renderOakLogSide(ATLAS_INDEX.OAK_LOG_SIDE);
    this.renderOakLogTop(ATLAS_INDEX.OAK_LOG_TOP);
    this.renderLeaves(ATLAS_INDEX.OAK_LEAVES, '#3f7c22', '#2d5e16', '#599a32');
    this.renderSnow(ATLAS_INDEX.SNOW_BLOCK);
    this.renderIce(ATLAS_INDEX.ICE);
    this.renderOre(ATLAS_INDEX.COAL_ORE, '#222222', '#333333');
    this.renderOre(ATLAS_INDEX.IRON_ORE, '#d8af97', '#b88972');
    this.renderOre(ATLAS_INDEX.GOLD_ORE, '#fcee4b', '#e2a61d');
    this.renderOre(ATLAS_INDEX.DIAMOND_ORE, '#5be7ea', '#2fb8cc');
    this.renderOre(ATLAS_INDEX.EMERALD_ORE, '#17dd62', '#0fa848');
    this.renderWoodPlank(ATLAS_INDEX.WOOD_PLANK);
    this.renderBrick(ATLAS_INDEX.BRICK);
    this.renderGlass(ATLAS_INDEX.GLASS);
    this.renderGravel(ATLAS_INDEX.GRAVEL);
    this.renderGlowstone(ATLAS_INDEX.GLOWSTONE);
    this.renderObsidian(ATLAS_INDEX.OBSIDIAN);
    this.renderFlower(ATLAS_INDEX.FLOWER_RED, '#e53935', '#b71c1c');
    this.renderFlower(ATLAS_INDEX.FLOWER_YELLOW, '#ffeb3b', '#f57f17');
    this.renderMushroom(ATLAS_INDEX.MUSHROOM);
    this.renderLava(ATLAS_INDEX.LAVA);
    this.renderTorch(ATLAS_INDEX.TORCH);
    this.renderClay(ATLAS_INDEX.CLAY);
    this.renderBookshelf(ATLAS_INDEX.BOOKSHELF);
    this.renderTNTSide(ATLAS_INDEX.TNT_SIDE);
    this.renderTNTTop(ATLAS_INDEX.TNT_TOP);
    this.renderPineLogSide(ATLAS_INDEX.PINE_LOG_SIDE);
    this.renderPineLogTop(ATLAS_INDEX.PINE_LOG_TOP);
    this.renderLeaves(ATLAS_INDEX.PINE_LEAVES, '#22482e', '#173621', '#346142');
    this.renderLeaves(ATLAS_INDEX.LEAVES_RED, '#b22222', '#7f1d1d', '#dc2626');
    this.renderLeaves(ATLAS_INDEX.LEAVES_ORANGE, '#d97706', '#b45309', '#f59e0b');
    this.renderLeaves(ATLAS_INDEX.LEAVES_CHERRY, '#f472b6', '#db2777', '#fbcfe8');

    // New Biome Blocks & Tools
    this.renderCactus(ATLAS_INDEX.CACTUS_SIDE, ATLAS_INDEX.CACTUS_TOP);
    this.renderDeadBush(ATLAS_INDEX.DEAD_BUSH);
    this.renderFallGrassTop(ATLAS_INDEX.FALL_GRASS_TOP);
    this.renderFallGrassSide(ATLAS_INDEX.FALL_GRASS_SIDE);
    this.renderMud(ATLAS_INDEX.MUD);
    this.renderMangroveLogSide(ATLAS_INDEX.MANGROVE_LOG_SIDE);
    this.renderMangroveLogTop(ATLAS_INDEX.MANGROVE_LOG_TOP);
    this.renderLeaves(ATLAS_INDEX.MANGROVE_LEAVES, '#2b5e28', '#1c421a', '#3e7d3a');
    this.renderMangroveRoots(ATLAS_INDEX.MANGROVE_ROOTS);
    this.renderFarmlandTop(ATLAS_INDEX.FARMLAND_TOP);
    this.renderFarmlandSide(ATLAS_INDEX.FARMLAND_SIDE);
    this.renderNetherrack(ATLAS_INDEX.NETHERRACK);
    this.renderSoulSand(ATLAS_INDEX.SOUL_SAND);
    this.renderNetherPortal(ATLAS_INDEX.NETHER_PORTAL);
    this.renderChest(ATLAS_INDEX.CHEST_SIDE, ATLAS_INDEX.CHEST_TOP, ATLAS_INDEX.CHEST_FRONT);
    this.renderSpawner(ATLAS_INDEX.SPAWNER);

    // Tools
    this.renderTool(ATLAS_INDEX.TOOL_SWORD, 'sword');
    this.renderTool(ATLAS_INDEX.TOOL_PICKAXE, 'pickaxe');
    this.renderTool(ATLAS_INDEX.TOOL_SHOVEL, 'shovel');
    this.renderTool(ATLAS_INDEX.TOOL_AXE, 'axe');
    this.renderTool(ATLAS_INDEX.TOOL_HOE, 'hoe');
    this.renderTool(ATLAS_INDEX.FLINT_AND_STEEL, 'flint_and_steel');

    // Load authentic Minecraft textures from official source
    this.loadOfficialTextures();
  }

  // Load and blit official Minecraft textures with biome grass tint
  private loadOfficialTextures() {
    const texturesToLoad: { url: string; idx: number; isGrassTop?: boolean }[] = [
      { url: '/textures/stone.png', idx: ATLAS_INDEX.STONE },
      { url: '/textures/dirt.png', idx: ATLAS_INDEX.DIRT },
      { url: '/textures/grass_side.png', idx: ATLAS_INDEX.GRASS_SIDE },
      { url: '/textures/grass_top.png', idx: ATLAS_INDEX.GRASS_TOP, isGrassTop: true },
      { url: '/textures/leaves_oak.png', idx: ATLAS_INDEX.OAK_LEAVES },
      { url: '/textures/leaves_red.png', idx: ATLAS_INDEX.LEAVES_RED },
      { url: '/textures/leaves_orange.png', idx: ATLAS_INDEX.LEAVES_ORANGE },
      { url: '/textures/leaves_cherry.png', idx: ATLAS_INDEX.LEAVES_CHERRY },
      { url: '/textures/cobblestone.png', idx: ATLAS_INDEX.COBBLESTONE },
      { url: '/textures/bedrock.png', idx: ATLAS_INDEX.BEDROCK },
      { url: '/textures/sand.png', idx: ATLAS_INDEX.SAND },
      { url: '/textures/wood_plank.png', idx: ATLAS_INDEX.WOOD_PLANK },
      { url: '/textures/oak_log_side.png', idx: ATLAS_INDEX.OAK_LOG_SIDE },
      { url: '/textures/oak_log_top.png', idx: ATLAS_INDEX.OAK_LOG_TOP },
      { url: '/textures/glass.png', idx: ATLAS_INDEX.GLASS },
      { url: '/textures/brick.png', idx: ATLAS_INDEX.BRICK },
      { url: '/textures/coal_ore.png', idx: ATLAS_INDEX.COAL_ORE },
      { url: '/textures/iron_ore.png', idx: ATLAS_INDEX.IRON_ORE },
      { url: '/textures/gold_ore.png', idx: ATLAS_INDEX.GOLD_ORE },
      { url: '/textures/diamond_ore.png', idx: ATLAS_INDEX.DIAMOND_ORE },
      { url: '/textures/emerald_ore.png', idx: ATLAS_INDEX.EMERALD_ORE },
      { url: '/textures/glowstone.png', idx: ATLAS_INDEX.GLOWSTONE },
      { url: '/textures/obsidian.png', idx: ATLAS_INDEX.OBSIDIAN },
      { url: '/textures/snow.png', idx: ATLAS_INDEX.SNOW_BLOCK },
      { url: '/textures/tnt_side.png', idx: ATLAS_INDEX.TNT_SIDE },
      { url: '/textures/tnt_top.png', idx: ATLAS_INDEX.TNT_TOP },
      { url: '/textures/torch.png', idx: ATLAS_INDEX.TORCH },
    ];

    for (const item of texturesToLoad) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const [tx, ty] = this.getTileCoord(item.idx);
        this.ctx.clearRect(tx, ty, 16, 16);
        this.ctx.drawImage(img, tx, ty, 16, 16);

        if (item.isGrassTop) {
          // Apply biome color overlay to grayscale grass_top (Plains green: #79c05a)
          const imgData = this.ctx.getImageData(tx, ty, 16, 16);
          const data = imgData.data;
          const tintR = 121 / 255;
          const tintG = 192 / 255;
          const tintB = 90 / 255;
          for (let p = 0; p < data.length; p += 4) {
            data[p] = Math.round(data[p] * tintR);
            data[p + 1] = Math.round(data[p + 1] * tintG);
            data[p + 2] = Math.round(data[p + 2] * tintB);
          }
          this.ctx.putImageData(imgData, tx, ty);
        }

        this.texture.needsUpdate = true;
      };
      img.src = item.url;
    }
  }

  private getTileCoord(idx: number): [number, number] {
    const col = idx % ATLAS_COLS;
    const row = Math.floor(idx / ATLAS_COLS);
    return [col * this.tileSize, row * this.tileSize];
  }

  // Deterministic pseudo-random for pixel art consistency
  private hash2(x: number, y: number, seed: number = 42): number {
    let h = (x * 374761393 + y * 668265263 + seed * 1013904223) ^ 0x5bf03635;
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  // --- Tile Renderers ---

  private renderDirt(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const n = this.hash2(x, y, 1);
        let c = '#866043';
        if (n < 0.25) c = '#735137';
        else if (n > 0.8) c = '#966e4f';
        else if (n > 0.65) c = '#604128';
        this.ctx.fillStyle = c;
        this.ctx.fillRect(tx + x, ty + y, 1, 1);
      }
    }
  }

  private renderGrassTop(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const n = this.hash2(x, y, 2);
        let c = '#598f39';
        if (n < 0.2) c = '#4c7a30';
        else if (n > 0.8) c = '#6aa844';
        else if (n > 0.6) c = '#538435';
        this.ctx.fillStyle = c;
        this.ctx.fillRect(tx + x, ty + y, 1, 1);
      }
    }
  }

  private renderGrassSide(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    // Draw dirt base first
    this.renderDirt(idx);
    // Draw jagged grass hanging down
    for (let x = 0; x < 16; x++) {
      const drop = Math.floor(this.hash2(x, 0, 3) * 3) + 2; // 2..4 px
      for (let y = 0; y <= drop; y++) {
        const n = this.hash2(x, y, 4);
        let c = '#598f39';
        if (y === drop) c = '#47732c';
        else if (n > 0.6) c = '#6aa844';
        this.ctx.fillStyle = c;
        this.ctx.fillRect(tx + x, ty + y, 1, 1);
      }
    }
  }

  private renderStone(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const n = this.hash2(x, y, 5);
        let c = '#757575';
        if (n < 0.2) c = '#616161';
        else if (n > 0.8) c = '#8a8a8a';
        else if (n > 0.65) c = '#6e6e6e';
        this.ctx.fillStyle = c;
        this.ctx.fillRect(tx + x, ty + y, 1, 1);
      }
    }
  }

  private renderCobblestone(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const n = this.hash2(x, y, 6);
        // Mortar lines
        const isBorder = (x % 5 === 0 || y % 4 === 0) && n > 0.3;
        let c = isBorder ? '#3c3c3c' : (n > 0.7 ? '#828282' : (n < 0.3 ? '#4f4f4f' : '#696969'));
        this.ctx.fillStyle = c;
        this.ctx.fillRect(tx + x, ty + y, 1, 1);
      }
    }
  }

  private renderBedrock(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const n = this.hash2(x, y, 7);
        let c = '#1e1e1e';
        if (n < 0.25) c = '#111111';
        else if (n > 0.75) c = '#3d3d3d';
        else if (n > 0.5) c = '#292929';
        this.ctx.fillStyle = c;
        this.ctx.fillRect(tx + x, ty + y, 1, 1);
      }
    }
  }

  private renderSand(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const n = this.hash2(x, y, 8);
        let c = '#dbce93';
        if (n < 0.2) c = '#c9bc82';
        else if (n > 0.8) c = '#e8dc9f';
        else if (n > 0.6) c = '#d1c38b';
        this.ctx.fillStyle = c;
        this.ctx.fillRect(tx + x, ty + y, 1, 1);
      }
    }
  }

  private renderSandstoneSide(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const n = this.hash2(x, y, 9);
        // Layered sandstone strata
        const layer = y < 4 ? '#d8cc8f' : (y < 9 ? '#c6b677' : (y < 12 ? '#baaa6b' : '#caba7d'));
        this.ctx.fillStyle = n > 0.7 ? '#ded399' : (n < 0.2 ? '#b09f61' : layer);
        this.ctx.fillRect(tx + x, ty + y, 1, 1);
      }
    }
  }

  private renderSandstoneTop(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const n = this.hash2(x, y, 10);
        let c = '#d5c789';
        if (n < 0.2) c = '#c2b376';
        else if (n > 0.8) c = '#dfd294';
        this.ctx.fillStyle = c;
        this.ctx.fillRect(tx + x, ty + y, 1, 1);
      }
    }
  }

  private renderWater(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const wave = Math.sin(x * 0.8 + y * 0.4);
        let c = 'rgba(38, 124, 236, 0.75)';
        if (wave > 0.6) c = 'rgba(74, 153, 255, 0.82)';
        else if (wave < -0.6) c = 'rgba(23, 98, 206, 0.75)';
        this.ctx.fillStyle = c;
        this.ctx.fillRect(tx + x, ty + y, 1, 1);
      }
    }
  }

  private renderOakLogSide(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const n = this.hash2(x, y, 11);
        // Vertical bark grooves
        const stripe = (x % 3 === 0);
        let c = stripe ? '#543d24' : '#6b4f30';
        if (n > 0.75) c = '#7d5c38';
        else if (n < 0.2) c = '#46311b';
        this.ctx.fillStyle = c;
        this.ctx.fillRect(tx + x, ty + y, 1, 1);
      }
    }
  }

  private renderOakLogTop(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const dx = x - 7.5;
        const dy = y - 7.5;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let c = '#b38c5b'; // Inner rings
        if (dist > 6.2) c = '#543d24'; // Bark ring
        else if (Math.abs(dist - 4) < 0.7 || Math.abs(dist - 2) < 0.7) c = '#9b764b';
        this.ctx.fillStyle = c;
        this.ctx.fillRect(tx + x, ty + y, 1, 1);
      }
    }
  }

  private renderLeaves(idx: number, base: string, dark: string, light: string) {
    const [tx, ty] = this.getTileCoord(idx);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const n = this.hash2(x, y, 12);
        if (n < 0.18) {
          // Transparent cutout hole for authentic leaves!
          this.ctx.clearRect(tx + x, ty + y, 1, 1);
        } else if (n < 0.45) {
          this.ctx.fillStyle = dark;
          this.ctx.fillRect(tx + x, ty + y, 1, 1);
        } else if (n > 0.8) {
          this.ctx.fillStyle = light;
          this.ctx.fillRect(tx + x, ty + y, 1, 1);
        } else {
          this.ctx.fillStyle = base;
          this.ctx.fillRect(tx + x, ty + y, 1, 1);
        }
      }
    }
  }

  private renderSnow(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const n = this.hash2(x, y, 13);
        let c = '#f2f5f9';
        if (n < 0.2) c = '#e2e9f2';
        else if (n > 0.8) c = '#ffffff';
        this.ctx.fillStyle = c;
        this.ctx.fillRect(tx + x, ty + y, 1, 1);
      }
    }
  }

  private renderIce(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const n = this.hash2(x, y, 14);
        let c = '#8ec3f8';
        if (n < 0.2) c = '#73b2f5';
        else if (n > 0.8) c = '#a9d4fb';
        this.ctx.fillStyle = c;
        this.ctx.fillRect(tx + x, ty + y, 1, 1);
      }
    }
  }

  private renderOre(idx: number, gemColor: string, gemShadow: string) {
    // Render base stone first
    this.renderStone(idx);
    const [tx, ty] = this.getTileCoord(idx);
    // Draw ore crystal clusters
    const spots = [
      [3, 3], [4, 3], [3, 4],
      [11, 4], [12, 4], [11, 5],
      [6, 8], [7, 8], [6, 9], [7, 9],
      [12, 11], [13, 11], [12, 12],
      [3, 12], [4, 12]
    ];
    for (const [ox, oy] of spots) {
      this.ctx.fillStyle = gemShadow;
      this.ctx.fillRect(tx + ox + 1, ty + oy, 1, 1);
      this.ctx.fillStyle = gemColor;
      this.ctx.fillRect(tx + ox, ty + oy, 1, 1);
    }
  }

  private renderWoodPlank(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    for (let y = 0; y < 16; y++) {
      const plankRow = Math.floor(y / 4);
      const isSeam = y % 4 === 3;
      for (let x = 0; x < 16; x++) {
        const n = this.hash2(x, y, 15);
        if (isSeam) {
          this.ctx.fillStyle = '#6b5030';
        } else {
          let c = plankRow % 2 === 0 ? '#9b764b' : '#906d44';
          if (n > 0.75) c = '#a68053';
          else if (n < 0.25) c = '#82613b';
          this.ctx.fillStyle = c;
        }
        this.ctx.fillRect(tx + x, ty + y, 1, 1);
      }
    }
  }

  private renderBrick(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    for (let y = 0; y < 16; y++) {
      const row = Math.floor(y / 4);
      const isHorizontalMortar = y % 4 === 3;
      const xOffset = (row % 2) * 4;
      for (let x = 0; x < 16; x++) {
        const isVerticalMortar = (x + xOffset) % 8 === 7;
        if (isHorizontalMortar || isVerticalMortar) {
          this.ctx.fillStyle = '#dcdcdc';
        } else {
          const n = this.hash2(x, y, 16);
          let c = '#a44431';
          if (n > 0.7) c = '#b64f3a';
          else if (n < 0.3) c = '#8d3523';
          this.ctx.fillStyle = c;
        }
        this.ctx.fillRect(tx + x, ty + y, 1, 1);
      }
    }
  }

  private renderGlass(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    this.ctx.clearRect(tx, ty, 16, 16);
    // Draw outer glass frame border
    this.ctx.fillStyle = '#d6f0f7';
    this.ctx.strokeRect(tx + 0.5, ty + 0.5, 15, 15);
    // Subtle diagonal reflection highlights
    this.ctx.fillRect(tx + 3, ty + 3, 2, 1);
    this.ctx.fillRect(tx + 4, ty + 4, 2, 1);
    this.ctx.fillRect(tx + 5, ty + 5, 2, 1);
    this.ctx.fillRect(tx + 11, ty + 10, 2, 1);
    this.ctx.fillRect(tx + 12, ty + 11, 2, 1);
  }

  private renderGravel(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const n = this.hash2(x, y, 17);
        let c = '#8c8680';
        if (n < 0.25) c = '#6b6660';
        else if (n > 0.75) c = '#aca59e';
        else if (n > 0.5) c = '#7c7670';
        this.ctx.fillStyle = c;
        this.ctx.fillRect(tx + x, ty + y, 1, 1);
      }
    }
  }

  private renderGlowstone(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const n = this.hash2(x, y, 18);
        let c = '#fed965';
        if (n < 0.2) c = '#cf8c2c';
        else if (n > 0.8) c = '#fff29e';
        else if (n > 0.5) c = '#e8b846';
        this.ctx.fillStyle = c;
        this.ctx.fillRect(tx + x, ty + y, 1, 1);
      }
    }
  }

  private renderObsidian(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const n = this.hash2(x, y, 19);
        let c = '#1b1227';
        if (n < 0.2) c = '#110b1a';
        else if (n > 0.75) c = '#3c2957';
        else if (n > 0.5) c = '#291b3b';
        this.ctx.fillStyle = c;
        this.ctx.fillRect(tx + x, ty + y, 1, 1);
      }
    }
  }

  private renderFlower(idx: number, petal: string, center: string) {
    const [tx, ty] = this.getTileCoord(idx);
    this.ctx.clearRect(tx, ty, 16, 16);
    // Stem
    this.ctx.fillStyle = '#4c8427';
    this.ctx.fillRect(tx + 7, ty + 8, 2, 8);
    this.ctx.fillRect(tx + 6, ty + 12, 1, 2);
    this.ctx.fillRect(tx + 9, ty + 10, 1, 2);
    // Petals
    this.ctx.fillStyle = petal;
    this.ctx.fillRect(tx + 6, ty + 3, 4, 5);
    this.ctx.fillRect(tx + 5, ty + 4, 6, 3);
    // Center
    this.ctx.fillStyle = center;
    this.ctx.fillRect(tx + 7, ty + 5, 2, 2);
  }

  private renderMushroom(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    this.ctx.clearRect(tx, ty, 16, 16);
    // Stem
    this.ctx.fillStyle = '#d2c9b6';
    this.ctx.fillRect(tx + 7, ty + 9, 2, 7);
    // Cap
    this.ctx.fillStyle = '#b72222';
    this.ctx.fillRect(tx + 5, ty + 5, 6, 4);
    this.ctx.fillRect(tx + 6, ty + 4, 4, 1);
    // White specks
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(tx + 6, ty + 6, 1, 1);
    this.ctx.fillRect(tx + 9, ty + 7, 1, 1);
  }

  private renderLava(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const n = this.hash2(x, y, 20);
        let c = '#d83b01';
        if (n < 0.25) c = '#a82400';
        else if (n > 0.8) c = '#fed965';
        else if (n > 0.6) c = '#ff8c00';
        this.ctx.fillStyle = c;
        this.ctx.fillRect(tx + x, ty + y, 1, 1);
      }
    }
  }

  private renderTorch(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    this.ctx.clearRect(tx, ty, 16, 16);
    // Stick
    this.ctx.fillStyle = '#654321';
    this.ctx.fillRect(tx + 7, ty + 6, 2, 9);
    // Flame
    this.ctx.fillStyle = '#ff9800';
    this.ctx.fillRect(tx + 6, ty + 3, 4, 3);
    this.ctx.fillStyle = '#ffeb3b';
    this.ctx.fillRect(tx + 7, ty + 2, 2, 3);
  }

  private renderClay(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const n = this.hash2(x, y, 21);
        let c = '#9fa4ad';
        if (n < 0.2) c = '#8a909b';
        else if (n > 0.8) c = '#b2b7bf';
        this.ctx.fillStyle = c;
        this.ctx.fillRect(tx + x, ty + y, 1, 1);
      }
    }
  }

  private renderBookshelf(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    // Wood borders
    this.ctx.fillStyle = '#8b6940';
    this.ctx.fillRect(tx, ty, 16, 16);
    this.ctx.fillStyle = '#4c351b';
    this.ctx.fillRect(tx, ty + 7, 16, 2);
    // Books top shelf
    const bookColors = ['#8d2828', '#2b4d8d', '#2b8d4e', '#8d7a2b', '#6b2b8d'];
    for (let x = 1; x < 15; x += 2) {
      this.ctx.fillStyle = bookColors[(x * 3) % bookColors.length];
      this.ctx.fillRect(tx + x, ty + 1, 2, 6);
    }
    // Books bottom shelf
    for (let x = 1; x < 15; x += 2) {
      this.ctx.fillStyle = bookColors[(x * 7) % bookColors.length];
      this.ctx.fillRect(tx + x, ty + 9, 2, 6);
    }
  }

  private renderTNTSide(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    // Red dynamite sticks
    this.ctx.fillStyle = '#bf2415';
    this.ctx.fillRect(tx, ty, 16, 16);
    // White band
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(tx, ty + 5, 16, 6);
    // Black "TNT" text
    this.ctx.fillStyle = '#111111';
    // T
    this.ctx.fillRect(tx + 2, ty + 6, 3, 1);
    this.ctx.fillRect(tx + 3, ty + 7, 1, 3);
    // N
    this.ctx.fillRect(tx + 6, ty + 6, 1, 4);
    this.ctx.fillRect(tx + 7, ty + 7, 1, 1);
    this.ctx.fillRect(tx + 8, ty + 8, 1, 1);
    this.ctx.fillRect(tx + 9, ty + 6, 1, 4);
    // T
    this.ctx.fillRect(tx + 11, ty + 6, 3, 1);
    this.ctx.fillRect(tx + 12, ty + 7, 1, 3);
  }

  private renderTNTTop(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    this.ctx.fillStyle = '#9e1c10';
    this.ctx.fillRect(tx, ty, 16, 16);
    // Center fuse
    this.ctx.fillStyle = '#e8d8b0';
    this.ctx.fillRect(tx + 6, ty + 6, 4, 4);
    this.ctx.fillStyle = '#444444';
    this.ctx.fillRect(tx + 7, ty + 7, 2, 2);
  }

  private renderPineLogSide(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const n = this.hash2(x, y, 22);
        let c = '#342318';
        if (n < 0.25) c = '#23160e';
        else if (n > 0.75) c = '#473224';
        this.ctx.fillStyle = c;
        this.ctx.fillRect(tx + x, ty + y, 1, 1);
      }
    }
  }

  private renderPineLogTop(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const dx = x - 7.5;
        const dy = y - 7.5;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let c = '#8c704f';
        if (dist > 6) c = '#342318';
        else if (Math.abs(dist - 3.5) < 0.6) c = '#735a3d';
        this.ctx.fillStyle = c;
        this.ctx.fillRect(tx + x, ty + y, 1, 1);
      }
    }
  }

  private renderCactus(sideIdx: number, topIdx: number) {
    const [sx, sy] = this.getTileCoord(sideIdx);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const isRidge = x % 4 === 0 || x % 4 === 3;
        const isSpike = (x % 4 === 1 || x % 4 === 2) && (y % 4 === 1);
        let c = isRidge ? '#1e5e22' : '#2e7d32';
        if (isSpike) c = '#111111';
        this.ctx.fillStyle = c;
        this.ctx.fillRect(sx + x, sy + y, 1, 1);
      }
    }

    const [tx, ty] = this.getTileCoord(topIdx);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const dx = Math.abs(x - 7.5);
        const dy = Math.abs(y - 7.5);
        let c = (dx < 2 && dy < 2) ? '#184c1b' : '#2e7d32';
        if (x === 0 || x === 15 || y === 0 || y === 15) c = '#1b521e';
        this.ctx.fillStyle = c;
        this.ctx.fillRect(tx + x, ty + y, 1, 1);
      }
    }
  }

  private renderDeadBush(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    this.ctx.clearRect(tx, ty, 16, 16);
    this.ctx.fillStyle = '#8d6e4f';
    const branches = [
      [7, 15], [7, 14], [8, 14], [7, 13], [6, 12], [8, 12],
      [5, 11], [9, 11], [4, 10], [10, 10], [3, 9], [11, 9],
      [5, 8], [9, 8], [6, 7], [8, 7], [7, 6], [7, 5],
      [4, 6], [11, 7], [2, 8], [13, 8], [7, 4], [8, 4]
    ];
    for (const [bx, by] of branches) {
      this.ctx.fillRect(tx + bx, ty + by, 1, 1);
    }
  }

  private renderFallGrassTop(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const n = this.hash2(x, y, 31);
        let c = '#c2410c'; // rich autumn rust-red/orange
        if (n < 0.25) c = '#9a3412';
        else if (n > 0.75) c = '#ea580c';
        else if (n > 0.5) c = '#b45309';
        this.ctx.fillStyle = c;
        this.ctx.fillRect(tx + x, ty + y, 1, 1);
      }
    }
  }

  private renderFallGrassSide(idx: number) {
    this.renderDirt(idx);
    const [tx, ty] = this.getTileCoord(idx);
    for (let x = 0; x < 16; x++) {
      const drop = Math.floor(this.hash2(x, 0, 32) * 3) + 2;
      for (let y = 0; y <= drop; y++) {
        const n = this.hash2(x, y, 33);
        let c = '#c2410c';
        if (y === drop) c = '#9a3412';
        else if (n > 0.6) c = '#ea580c';
        this.ctx.fillStyle = c;
        this.ctx.fillRect(tx + x, ty + y, 1, 1);
      }
    }
  }

  private renderMud(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const n = this.hash2(x, y, 34);
        let c = '#3d3028';
        if (n < 0.2) c = '#2b221c';
        else if (n > 0.75) c = '#4d3d34';
        else if (n > 0.5) c = '#362a23';
        this.ctx.fillStyle = c;
        this.ctx.fillRect(tx + x, ty + y, 1, 1);
      }
    }
  }

  private renderMangroveLogSide(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const n = this.hash2(x, y, 35);
        const stripe = (x % 3 === 0);
        let c = stripe ? '#4d231e' : '#69322b';
        if (n > 0.75) c = '#7d3d35';
        else if (n < 0.2) c = '#3d1c18';
        this.ctx.fillStyle = c;
        this.ctx.fillRect(tx + x, ty + y, 1, 1);
      }
    }
  }

  private renderMangroveLogTop(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const dx = x - 7.5;
        const dy = y - 7.5;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let c = '#8e483e';
        if (dist > 6) c = '#4d231e';
        else if (Math.abs(dist - 3.5) < 0.7) c = '#75372e';
        this.ctx.fillStyle = c;
        this.ctx.fillRect(tx + x, ty + y, 1, 1);
      }
    }
  }

  private renderMangroveRoots(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    this.ctx.clearRect(tx, ty, 16, 16);
    // Muddy tangled root mesh with transparent holes
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const n = this.hash2(x, y, 36);
        const isRoot = ((x + y * 2) % 5 < 3) || (n > 0.45);
        if (isRoot) {
          let c = '#4d291e';
          if (n < 0.3) c = '#361c14';
          else if (n > 0.8) c = '#66392c';
          this.ctx.fillStyle = c;
          this.ctx.fillRect(tx + x, ty + y, 1, 1);
        }
      }
    }
  }

  private renderFarmlandTop(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const isFurrow = (y % 4 === 0);
        let c = isFurrow ? '#332115' : '#4a3321';
        const n = this.hash2(x, y, 37);
        if (n > 0.7) c = '#593d28';
        this.ctx.fillStyle = c;
        this.ctx.fillRect(tx + x, ty + y, 1, 1);
      }
    }
  }

  private renderFarmlandSide(idx: number) {
    this.renderDirt(idx);
    const [tx, ty] = this.getTileCoord(idx);
    // Top 2px dried tilled crest
    this.ctx.fillStyle = '#4a3321';
    this.ctx.fillRect(tx, ty, 16, 2);
  }

  private renderNetherrack(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const n = this.hash2(x, y, 38);
        let c = '#681c1c';
        if (n < 0.2) c = '#470f0f';
        else if (n > 0.8) c = '#8a2b2b';
        else if (n > 0.6) c = '#792424';
        this.ctx.fillStyle = c;
        this.ctx.fillRect(tx + x, ty + y, 1, 1);
      }
    }
  }

  private renderSoulSand(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const n = this.hash2(x, y, 39);
        let c = '#49372d';
        if (n < 0.2) c = '#35271f';
        else if (n > 0.75) c = '#5c4639';
        this.ctx.fillStyle = c;
        this.ctx.fillRect(tx + x, ty + y, 1, 1);
      }
    }
    // Subtle ghostly soul faces
    this.ctx.fillStyle = '#261b15';
    this.ctx.fillRect(tx + 4, ty + 4, 2, 2);
    this.ctx.fillRect(tx + 8, ty + 4, 2, 2);
    this.ctx.fillRect(tx + 5, ty + 8, 4, 2);
  }

  private renderNetherPortal(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const wave = Math.sin(x * 0.7 + y * 0.5);
        let c = '#6b21a8';
        if (wave > 0.5) c = '#a855f7';
        else if (wave < -0.5) c = '#4c1d95';
        else if (wave > 0.2) c = '#8b5cf6';
        this.ctx.fillStyle = c;
        this.ctx.fillRect(tx + x, ty + y, 1, 1);
      }
    }
  }

  private renderChest(sideIdx: number, topIdx: number, frontIdx: number) {
    // Top
    const [tx, ty] = this.getTileCoord(topIdx);
    this.ctx.fillStyle = '#8d5a2d';
    this.ctx.fillRect(tx, ty, 16, 16);
    this.ctx.fillStyle = '#3a2310';
    this.ctx.strokeRect(tx + 0.5, ty + 0.5, 15, 15);

    // Side
    const [sx, sy] = this.getTileCoord(sideIdx);
    this.ctx.fillStyle = '#8d5a2d';
    this.ctx.fillRect(sx, sy, 16, 16);
    this.ctx.fillStyle = '#3a2310';
    this.ctx.strokeRect(sx + 0.5, sy + 0.5, 15, 15);
    this.ctx.fillRect(sx, sy + 5, 16, 1);

    // Front (with lock clasp)
    const [fx, fy] = this.getTileCoord(frontIdx);
    this.ctx.fillStyle = '#8d5a2d';
    this.ctx.fillRect(fx, fy, 16, 16);
    this.ctx.fillStyle = '#3a2310';
    this.ctx.strokeRect(fx + 0.5, fy + 0.5, 15, 15);
    this.ctx.fillRect(fx, fy + 5, 16, 1);
    // Silver clasp
    this.ctx.fillStyle = '#e2e8f0';
    this.ctx.fillRect(fx + 7, fy + 4, 2, 4);
    this.ctx.fillStyle = '#1e293b';
    this.ctx.fillRect(fx + 7.5, fy + 5.5, 1, 1.5);
  }

  private renderSpawner(idx: number) {
    const [tx, ty] = this.getTileCoord(idx);
    this.ctx.fillStyle = '#1e293b';
    this.ctx.fillRect(tx, ty, 16, 16);
    // Iron cage bars
    this.ctx.fillStyle = '#475569';
    this.ctx.strokeRect(tx + 0.5, ty + 0.5, 15, 15);
    for (let i = 3; i < 15; i += 3) {
      this.ctx.fillRect(tx + i, ty, 1, 16);
      this.ctx.fillRect(tx, ty + i, 16, 1);
    }
    // Glowing fiery core inside
    this.ctx.fillStyle = '#ea580c';
    this.ctx.fillRect(tx + 6, ty + 6, 4, 4);
    this.ctx.fillStyle = '#fde047';
    this.ctx.fillRect(tx + 7, ty + 7, 2, 2);
  }

  private renderTool(idx: number, tool: 'sword' | 'pickaxe' | 'shovel' | 'axe' | 'hoe' | 'flint_and_steel') {
    const [tx, ty] = this.getTileCoord(idx);
    this.ctx.clearRect(tx, ty, 16, 16);

    const stick = '#78350f';
    const stickDark = '#451a03';
    const dia = '#38bdf8';
    const diaLight = '#e0f2fe';
    const diaDark = '#0284c7';

    if (tool === 'sword') {
      // Handle
      this.ctx.fillStyle = stickDark;
      this.ctx.fillRect(tx + 2, ty + 13, 2, 2);
      this.ctx.fillStyle = stick;
      this.ctx.fillRect(tx + 3, ty + 12, 2, 2);
      // Guard
      this.ctx.fillStyle = diaDark;
      this.ctx.fillRect(tx + 3, ty + 11, 4, 2);
      this.ctx.fillRect(tx + 4, ty + 10, 2, 4);
      // Blade
      for (let i = 0; i < 8; i++) {
        this.ctx.fillStyle = dia;
        this.ctx.fillRect(tx + 5 + i, ty + 9 - i, 2, 2);
        this.ctx.fillStyle = diaLight;
        this.ctx.fillRect(tx + 5 + i, ty + 9 - i, 1, 1);
      }
      this.ctx.fillStyle = diaLight;
      this.ctx.fillRect(tx + 13, ty + 1, 2, 2);
    } else if (tool === 'pickaxe') {
      // Diagonal Handle
      for (let i = 0; i < 9; i++) {
        this.ctx.fillStyle = (i % 2 === 0) ? stick : stickDark;
        this.ctx.fillRect(tx + 2 + i, ty + 13 - i, 2, 2);
      }
      // Pick Head Arc
      this.ctx.fillStyle = diaDark;
      this.ctx.fillRect(tx + 8, ty + 2, 6, 2);
      this.ctx.fillRect(tx + 13, ty + 3, 2, 5);
      this.ctx.fillStyle = dia;
      this.ctx.fillRect(tx + 6, ty + 3, 6, 2);
      this.ctx.fillRect(tx + 12, ty + 4, 2, 6);
      this.ctx.fillStyle = diaLight;
      this.ctx.fillRect(tx + 5, ty + 4, 2, 2);
      this.ctx.fillRect(tx + 13, ty + 9, 2, 2);
    } else if (tool === 'shovel') {
      for (let i = 0; i < 9; i++) {
        this.ctx.fillStyle = stick;
        this.ctx.fillRect(tx + 2 + i, ty + 13 - i, 2, 2);
      }
      // Spade Head
      this.ctx.fillStyle = diaDark;
      this.ctx.fillRect(tx + 9, ty + 3, 4, 4);
      this.ctx.fillStyle = dia;
      this.ctx.fillRect(tx + 10, ty + 2, 4, 4);
      this.ctx.fillStyle = diaLight;
      this.ctx.fillRect(tx + 11, ty + 2, 2, 2);
    } else if (tool === 'axe') {
      for (let i = 0; i < 9; i++) {
        this.ctx.fillStyle = stick;
        this.ctx.fillRect(tx + 2 + i, ty + 13 - i, 2, 2);
      }
      // Axe Blade
      this.ctx.fillStyle = diaDark;
      this.ctx.fillRect(tx + 8, ty + 2, 5, 5);
      this.ctx.fillStyle = dia;
      this.ctx.fillRect(tx + 9, ty + 1, 4, 4);
      this.ctx.fillRect(tx + 7, ty + 3, 3, 3);
      this.ctx.fillStyle = diaLight;
      this.ctx.fillRect(tx + 10, ty + 1, 2, 2);
    } else if (tool === 'hoe') {
      for (let i = 0; i < 9; i++) {
        this.ctx.fillStyle = stick;
        this.ctx.fillRect(tx + 2 + i, ty + 13 - i, 2, 2);
      }
      // Hoe Blade
      this.ctx.fillStyle = diaDark;
      this.ctx.fillRect(tx + 9, ty + 3, 5, 3);
      this.ctx.fillStyle = dia;
      this.ctx.fillRect(tx + 8, ty + 2, 6, 2);
      this.ctx.fillStyle = diaLight;
      this.ctx.fillRect(tx + 8, ty + 2, 2, 1);
    } else if (tool === 'flint_and_steel') {
      // Steel striker curve
      this.ctx.fillStyle = '#cbd5e1';
      this.ctx.fillRect(tx + 4, ty + 4, 8, 2);
      this.ctx.fillRect(tx + 10, ty + 6, 2, 6);
      this.ctx.fillRect(tx + 4, ty + 10, 8, 2);
      // Flint piece
      this.ctx.fillStyle = '#1e293b';
      this.ctx.fillRect(tx + 5, ty + 6, 4, 4);
    }
  }

  // Caching 16x16 data URLs for UI icons
  private dataUrlCache = new Map<number, string>();

  public getTileDataUrl(tileIndex: number): string {
    const cached = this.dataUrlCache.get(tileIndex);
    if (cached) return cached;

    const [tx, ty] = this.getTileCoord(tileIndex);
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 16;
    tempCanvas.height = 16;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.imageSmoothingEnabled = false;
      tempCtx.drawImage(this.canvas, tx, ty, 16, 16, 0, 0, 16, 16);
      const url = tempCanvas.toDataURL('image/png');
      this.dataUrlCache.set(tileIndex, url);
      return url;
    }
    return '';
  }
}

// Global singleton texture atlas
let globalAtlasInstance: TextureAtlas | null = null;

export function getTextureAtlas(): TextureAtlas {
  if (!globalAtlasInstance) {
    globalAtlasInstance = new TextureAtlas();
  }
  return globalAtlasInstance;
}

export function getBlockSprite(blockId: BlockType): string {
  const atlas = getTextureAtlas();
  const faceIdx = getFaceTextureIndex(blockId, 'north');
  return atlas.getTileDataUrl(faceIdx);
}
