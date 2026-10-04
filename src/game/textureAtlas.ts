import * as THREE from 'three';
import { ATLAS_COLS, ATLAS_ROWS, ATLAS_INDEX } from './blocks';

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
}

// Global singleton texture atlas
let globalAtlasInstance: TextureAtlas | null = null;

export function getTextureAtlas(): TextureAtlas {
  if (!globalAtlasInstance) {
    globalAtlasInstance = new TextureAtlas();
  }
  return globalAtlasInstance;
}
