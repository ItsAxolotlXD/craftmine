import * as THREE from 'three';
import { WorldManager, RaycastHit } from './world';
import { Player, PlayerInput } from './player';
import { ParticleSystem } from './particles';
import { getTextureAtlas, TextureAtlas } from './textureAtlas';
import { BlockType, BLOCK_DEFS } from './blocks';
import { soundEngine } from './audio';
import { CloudSystem } from './clouds';
import { PlayerHand } from './playerHand';
import { AnimalManager } from './animals';
import { TNTManager } from './tnt';

export interface GameSettings {
  fov: number;
  renderDistance: number;
  daySpeed: number; // 1 = normal, 0 = paused
  isCreative: boolean;
  soundVolume: number;
}

export class GameEngine {
  public container: HTMLElement;
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;

  public world: WorldManager;
  public player: Player;
  public particles: ParticleSystem;
  public atlas: TextureAtlas;
  public clouds: CloudSystem;
  public hand: PlayerHand;
  public animals: AnimalManager;
  public tnt: TNTManager;
  private footstepTimer: number = 0;

  // Sky & Lighting
  public sunLight: THREE.DirectionalLight;
  public ambientLight: THREE.AmbientLight;
  public sunMesh: THREE.Mesh;
  public moonMesh: THREE.Mesh;
  public starsMesh: THREE.Points;

  // Day / Night state (0 to 1, 0 = sunrise, 0.25 = noon, 0.5 = sunset, 0.75 = midnight)
  public timeOfDay: number = 0.25; // Start at vibrant noon
  public daySpeed: number = 0.005; // ~200 seconds per full cycle

  // Input state
  public input: PlayerInput = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    crouch: false,
    sprint: false,
    flyUp: false,
    flyDown: false,
  };

  // Targeting state
  public currentHit: RaycastHit = {
    hit: false,
    block: BlockType.AIR,
    point: new THREE.Vector3(),
    normal: new THREE.Vector3(),
    blockPos: new THREE.Vector3(),
    placePos: new THREE.Vector3(),
  };

  // Settings
  public settings: GameSettings = {
    fov: 75,
    renderDistance: 4,
    daySpeed: 1,
    isCreative: true,
    soundVolume: 0.5,
  };

  // Diagnostics
  public fps: number = 60;
  private frameCount: number = 0;
  private lastFpsTime: number = performance.now();
  private isRunning: boolean = false;
  private animFrameId: number | null = null;
  private lastTime: number = performance.now();

  // Callbacks for UI updates
  public onFpsUpdate?: (fps: number) => void;
  public onUnderwaterChange?: (isUnderwater: boolean) => void;

  constructor(container: HTMLElement, seed: number = 4289) {
    this.container = container;

    // 1. Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x78a7ff);
    this.scene.fog = new THREE.FogExp2(0x78a7ff, 0.016);

    // 2. Camera setup
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(this.settings.fov, width / height, 0.1, 1000);
    this.scene.add(this.camera); // Critical: allows camera children (first person hand) to render!

    // 3. Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: false,
      alpha: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);

    // 4. Texture Atlas & Particles & Clouds & Hand & Animals
    this.atlas = getTextureAtlas();
    this.particles = new ParticleSystem(this.scene);
    this.clouds = new CloudSystem(this.scene);
    this.hand = new PlayerHand(this.camera, this.atlas);
    this.animals = new AnimalManager(this.scene);

    // 5. World Manager & TNT Manager
    this.world = new WorldManager(this.scene, this.atlas, seed);
    this.world.renderDistance = this.settings.renderDistance;
    this.tnt = new TNTManager(this.scene, this.atlas, this.world, this.particles);

    // 6. Player
    const spawn = this.world.getSpawnPosition();
    this.player = new Player(this.camera, spawn);

    // 7. Lighting & Sky Objects
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfffaed, 1.25);
    this.sunLight.position.set(50, 100, 50);
    this.scene.add(this.sunLight);

    // Sun Cube Mesh
    const sunGeo = new THREE.BoxGeometry(16, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.scene.add(this.sunMesh);

    // Moon Cube Mesh
    const moonGeo = new THREE.BoxGeometry(12, 12, 12);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xe0e6ff });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.scene.add(this.moonMesh);

    // Starfield Mesh
    this.starsMesh = this.createStarfield();
    this.scene.add(this.starsMesh);

    // Initial world generation around spawn
    this.world.update(this.player.position, 50); // initial burst

    // Event listeners
    window.addEventListener('resize', this.onWindowResize);
  }

  private createStarfield(): THREE.Points {
    const starCount = 800;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 380;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)); // Upper hemisphere
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.4,
      transparent: true,
      opacity: 0,
    });
    return new THREE.Points(starGeo, starMat);
  }

  // Window Resize
  public onWindowResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  // Start Animation Loop
  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.lastFpsTime = performance.now();
    this.frameCount = 0;
    this.loop();
  }

  // Stop Animation Loop
  public stop() {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private loop = () => {
    if (!this.isRunning) return;
    this.animFrameId = requestAnimationFrame(this.loop);

    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    // Update FPS
    this.frameCount++;
    if (now - this.lastFpsTime >= 500) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsTime));
      this.frameCount = 0;
      this.lastFpsTime = now;
      if (this.onFpsUpdate) this.onFpsUpdate(this.fps);
    }

    // 1. Day/Night progression
    if (this.settings.daySpeed > 0) {
      this.timeOfDay = (this.timeOfDay + dt * this.daySpeed * 0.05 * this.settings.daySpeed) % 1.0;
    }
    this.updateAtmosphere();

    // 2. Player Physics & Controls
    this.player.update(dt, this.input, this.world);
    if (this.onUnderwaterChange) {
      this.onUnderwaterChange(this.player.isUnderwater);
    }

    // 3. Voxel Raycasting from Camera (longer reach in creative mode)
    const rayDir = new THREE.Vector3();
    this.camera.getWorldDirection(rayDir);
    const reachDistance = this.player.isCreative ? 8.0 : 6.0;
    this.currentHit = this.world.raycastBlock(this.camera.position, rayDir, reachDistance);
    this.world.updateTargetCursor(this.currentHit);

    // 4. Infinite World streaming with frame budget (max 4.5ms per frame)
    this.world.update(this.player.position, 4.5);

    // 5. Particles, Clouds, Animals, TNT & Hand Update
    this.particles.update(dt);
    this.clouds.update(dt, this.player.position.x, this.player.position.z);
    this.animals.update(dt, this.player.position, this.world);
    this.tnt.update(dt, this.player.position, (kx, ky, kz) => {
      this.player.velocity.x += kx;
      this.player.velocity.y += ky;
      this.player.velocity.z += kz;
    });

    const isMoving = this.input.forward || this.input.backward || this.input.left || this.input.right || this.input.jump;
    this.hand.update(dt, isMoving);

    // Footstep audio when moving on ground in survival/walking mode
    if (isMoving && this.player.isGrounded && !this.player.isFlying) {
      this.footstepTimer += dt;
      if (this.footstepTimer > 0.36) {
        this.footstepTimer = 0;
        soundEngine.playFootstep('grass');
      }
    }

    // 6. Render
    this.renderer.render(this.scene, this.camera);
  };

  // Atmospheric lighting, sun/moon orbit, and dynamic sky colors
  private updateAtmosphere() {
    const angle = this.timeOfDay * Math.PI * 2;
    const sunDistance = 250;

    // Orbit coordinates
    const sunX = Math.cos(angle) * sunDistance + this.player.position.x;
    const sunY = Math.sin(angle) * sunDistance;
    const sunZ = this.player.position.z;

    this.sunLight.position.set(sunX, Math.max(10, sunY), sunZ);
    this.sunMesh.position.set(sunX, sunY, sunZ);

    const moonX = -Math.cos(angle) * sunDistance + this.player.position.x;
    const moonY = -Math.sin(angle) * sunDistance;
    const moonZ = this.player.position.z;
    this.moonMesh.position.set(moonX, moonY, moonZ);

    // Sky Color Interpolation
    let skyColor: THREE.Color;
    let fogDensity = 0.012;

    if (this.player.isUnderwater) {
      // Underwater deep oceanic view
      skyColor = new THREE.Color(0x0f3e6d);
      fogDensity = 0.075;
      this.ambientLight.intensity = 0.35;
      this.sunLight.intensity = 0.4;
      (this.starsMesh.material as THREE.PointsMaterial).opacity = 0;
    } else {
      // Atmospheric sky transitions
      const noonColor = new THREE.Color(0x78a7ff);
      const sunsetColor = new THREE.Color(0xeb6b34);
      const nightColor = new THREE.Color(0x070b19);
      const starsMat = this.starsMesh.material as THREE.PointsMaterial;

      // sin(angle) > 0 is day, < 0 is night
      const sunHeight = Math.sin(angle);

      if (sunHeight > 0.2) {
        // Full Day
        skyColor = noonColor;
        this.ambientLight.intensity = 0.65;
        this.sunLight.intensity = 1.35;
        this.sunLight.color.setHex(0xfffaed);
        starsMat.opacity = 0;
      } else if (sunHeight > -0.15) {
        // Sunrise / Sunset transition
        const t = (sunHeight + 0.15) / 0.35;
        skyColor = nightColor.clone().lerp(sunsetColor, 1 - Math.abs(t - 0.5) * 2).lerp(noonColor, t);
        this.ambientLight.intensity = 0.45;
        this.sunLight.intensity = 0.8;
        this.sunLight.color.setHex(0xffaa55);
        starsMat.opacity = (1 - t) * 0.8;
      } else {
        // Night
        skyColor = nightColor;
        this.ambientLight.intensity = 0.22;
        this.sunLight.intensity = 0.2;
        this.sunLight.color.setHex(0x99aacc);
        starsMat.opacity = 0.95;
      }
    }

    this.scene.background = skyColor;
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color = skyColor;
      this.scene.fog.density = fogDensity;
    }
  }

  // Break targeted block
  public breakTargetedBlock() {
    this.hand.triggerSwing();
    if (!this.currentHit.hit) return;
    const { blockPos, block } = this.currentHit;

    // Never break bedrock
    if (block === BlockType.BEDROCK) return;

    // Igniting TNT if hit directly
    if (block === BlockType.TNT) {
      this.tnt.igniteTNT(blockPos.x, blockPos.y, blockPos.z);
      return;
    }

    // Spawn block crumble debris
    this.particles.spawnBlockBreak(blockPos.x, blockPos.y, blockPos.z, block);
    soundEngine.playBlockBreak();

    // Set to air
    this.world.setBlockAt(blockPos.x, blockPos.y, blockPos.z, BlockType.AIR);
  }

  // Place block on targeted face
  public placeBlockOnTarget(blockType: BlockType) {
    this.hand.triggerSwing();
    if (!this.currentHit.hit) return;
    const { placePos, blockPos, block } = this.currentHit;

    // Flint and Steel ignites TNT or strikes spark!
    if (blockType === BlockType.FLINT_AND_STEEL) {
      if (block === BlockType.TNT) {
        this.tnt.igniteTNT(blockPos.x, blockPos.y, blockPos.z);
      } else {
        soundEngine.playFlintAndSteel();
      }
      return;
    }

    // Check if place position overlaps player bounding box
    const halfW = this.player.width / 2;
    const pMinX = this.player.position.x - halfW;
    const pMaxX = this.player.position.x + halfW;
    const pMinY = this.player.position.y;
    const pMaxY = this.player.position.y + this.player.height;
    const pMinZ = this.player.position.z - halfW;
    const pMaxZ = this.player.position.z + halfW;

    const bMinX = placePos.x;
    const bMaxX = placePos.x + 1;
    const bMinY = placePos.y;
    const bMaxY = placePos.y + 1;
    const bMinZ = placePos.z;
    const bMaxZ = placePos.z + 1;

    // Intersect check
    const overlaps = (
      pMinX < bMaxX && pMaxX > bMinX &&
      pMinY < bMaxY && pMaxY > bMinY &&
      pMinZ < bMaxZ && pMaxZ > bMinZ
    );

    if (overlaps && !this.player.isFlying) {
      return; // Cannot place block inside player!
    }

    const def = BLOCK_DEFS[blockType];
    soundEngine.playBlockPlace(def ? def.soundType : 'stone');

    this.world.setBlockAt(placePos.x, placePos.y, placePos.z, blockType);
  }

  // Apply settings
  public updateSettings(newSettings: Partial<GameSettings>) {
    Object.assign(this.settings, newSettings);

    if (newSettings.fov !== undefined) {
      this.camera.fov = newSettings.fov;
      this.camera.updateProjectionMatrix();
    }
    if (newSettings.renderDistance !== undefined) {
      this.world.renderDistance = newSettings.renderDistance;
    }
    if (newSettings.isCreative !== undefined) {
      this.player.isCreative = newSettings.isCreative;
      if (!newSettings.isCreative) {
        this.player.isFlying = false;
      }
    }
    if (newSettings.soundVolume !== undefined) {
      soundEngine.setVolume(newSettings.soundVolume);
    }
  }

  // Set time of day directly (e.g. 0.25 = noon, 0.5 = sunset, 0.75 = night, 0.0 = dawn)
  public setTime(val: number) {
    this.timeOfDay = ((val % 1.0) + 1.0) % 1.0;
  }

  // Teleport helper to famous landmarks in this world
  public teleportToLandmark(landmark: 'mountain' | 'river' | 'caves' | 'pond' | 'ocean' | 'spawn') {
    let targetX = 8;
    let targetZ = 8;

    switch (landmark) {
      case 'ocean':
        // Search vast ocean basin
        for (let r = 20; r < 400; r += 16) {
          const info = this.world.generator.getTerrainHeight(-r, -r);
          if (info.isOcean && info.height <= 26) {
            targetX = -r;
            targetZ = -r;
            break;
          }
        }
        break;

      case 'mountain':
        // Search nearby mountain peak
        for (let r = 20; r < 200; r += 16) {
          const info = this.world.generator.getTerrainHeight(r, r);
          if (info.isMountain && info.height >= 75) {
            targetX = r;
            targetZ = r;
            break;
          }
        }
        break;

      case 'river':
        // Search winding river valley
        for (let r = 10; r < 250; r += 8) {
          const info = this.world.generator.getTerrainHeight(r, -r);
          if (info.isRiver) {
            targetX = r;
            targetZ = -r;
            break;
          }
        }
        break;

      case 'pond':
        // Search pond / lake basin
        for (let r = 15; r < 250; r += 10) {
          const info = this.world.generator.getTerrainHeight(-r, r);
          if (info.isPond) {
            targetX = -r;
            targetZ = r;
            break;
          }
        }
        break;

      case 'caves':
        // Teleport deep underground into big cavern chambers (y = 18)
        targetX = Math.floor(this.player.position.x);
        targetZ = Math.floor(this.player.position.z);
        this.player.teleport(targetX + 0.5, 18, targetZ + 0.5);
        this.world.update(this.player.position, 30);
        return;

      case 'spawn':
      default:
        targetX = 8;
        targetZ = 8;
        break;
    }

    const info = this.world.generator.getTerrainHeight(targetX, targetZ);
    const safeY = Math.max(info.height + 2, 40);
    this.player.teleport(targetX + 0.5, safeY, targetZ + 0.5);
    this.world.update(this.player.position, 30);
  }

  // Update held block for player and first-person hand
  public setHeldBlock(type: BlockType) {
    this.player.selectedBlock = type;
    this.hand.updateHeldBlock(type);
  }

  // Cleanup
  public dispose() {
    this.stop();
    window.removeEventListener('resize', this.onWindowResize);
    this.tnt.dispose();
    this.hand.dispose();
    this.animals.dispose();
    this.clouds.dispose();
    this.particles.dispose();
    this.world.clearAll();
    this.renderer.dispose();
    if (this.renderer.domElement && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
