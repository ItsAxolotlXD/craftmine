import * as THREE from 'three';
import { WorldManager } from './world';
import { BlockType, BLOCK_DEFS } from './blocks';
import { soundEngine } from './audio';

export interface PlayerInput {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  crouch: boolean;
  sprint: boolean;
  flyUp: boolean;
  flyDown: boolean;
}

export class Player {
  public position: THREE.Vector3;
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public camera: THREE.PerspectiveCamera;

  public pitch: number = 0; // Look up/down (-PI/2 to PI/2)
  public yaw: number = 0;   // Look left/right

  // Player physical dimensions (Minecraft Steve: 0.6 x 1.8 x 0.6)
  public readonly width = 0.6;
  public readonly height = 1.8;
  public readonly eyeHeight = 1.62;

  // State flags
  public isGrounded: boolean = false;
  public isUnderwater: boolean = false;
  public isCreative: boolean = true;
  public isFlying: boolean = true;
  public health: number = 20; // 10 hearts
  public hunger: number = 20; // 10 drumsticks

  // Audio timers
  private footstepTimer: number = 0;

  // Selected block type from hotbar
  public selectedBlock: BlockType = BlockType.STONE;

  // Sensitivities
  public mouseSensitivity: number = 0.0022;

  constructor(camera: THREE.PerspectiveCamera, spawnPos: THREE.Vector3) {
    this.camera = camera;
    this.position = spawnPos.clone();
    this.updateCameraTransform();
  }

  public updateCameraTransform() {
    this.camera.position.set(
      this.position.x,
      this.position.y + this.eyeHeight,
      this.position.z
    );

    // Apply rotation (Euler order YXZ)
    const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);
  }

  // Handle mouse movement (when pointer locked)
  public onMouseMove(dx: number, dy: number) {
    this.yaw -= dx * this.mouseSensitivity;
    this.pitch -= dy * this.mouseSensitivity;

    // Clamp pitch between -89° and +89°
    const maxPitch = Math.PI / 2 - 0.01;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));

    this.updateCameraTransform();
  }

  public update(dt: number, input: PlayerInput, world: WorldManager) {
    // Clamp delta time to avoid large physics steps
    const safeDt = Math.min(dt, 0.1);

    // 1. Water check
    const headBlock = world.getVoxelAt(
      Math.floor(this.position.x),
      Math.floor(this.position.y + this.eyeHeight),
      Math.floor(this.position.z)
    );
    const feetBlock = world.getVoxelAt(
      Math.floor(this.position.x),
      Math.floor(this.position.y + 0.1),
      Math.floor(this.position.z)
    );

    const wasUnderwater = this.isUnderwater;
    this.isUnderwater = (headBlock === BlockType.WATER);
    const isInWater = (feetBlock === BlockType.WATER || headBlock === BlockType.WATER);

    if (!wasUnderwater && this.isUnderwater) {
      soundEngine.playSplash();
    } else if (wasUnderwater && !this.isUnderwater) {
      soundEngine.playSplash();
    }

    // 2. Movement vectors based on camera yaw
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();

    let moveDir = new THREE.Vector3();
    if (input.forward) moveDir.add(forward);
    if (input.backward) moveDir.sub(forward);
    if (input.right) moveDir.add(right);
    if (input.left) moveDir.sub(right);

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
    }

    // 3. Movement Physics (Creative flying vs Survival)
    if (this.isCreative && this.isFlying) {
      // Free 3D flight
      const flySpeed = input.sprint ? 24.0 : 12.0;
      this.velocity.x = moveDir.x * flySpeed;
      this.velocity.z = moveDir.z * flySpeed;

      let vy = 0;
      if (input.jump || input.flyUp) vy += flySpeed;
      if (input.crouch || input.flyDown) vy -= flySpeed;
      this.velocity.y = vy;

      // Integrate position directly in fly mode
      this.position.addScaledVector(this.velocity, safeDt);
      this.isGrounded = false;
    } else {
      // Survival / Walk Mode with AABB Collision
      let baseSpeed = 4.3; // Standard Steve walk speed (m/s)
      if (input.sprint) baseSpeed = 6.6;
      if (isInWater) baseSpeed = 2.4;

      // Target horizontal velocity
      const targetVx = moveDir.x * baseSpeed;
      const targetVz = moveDir.z * baseSpeed;

      // Accelerate / Friction
      const accel = this.isGrounded ? 15.0 : 4.0;
      this.velocity.x += (targetVx - this.velocity.x) * Math.min(1.0, accel * safeDt);
      this.velocity.z += (targetVz - this.velocity.z) * Math.min(1.0, accel * safeDt);

      // Vertical physics (Gravity / Jump / Water)
      if (isInWater) {
        // Swimming physics
        this.velocity.y -= 7.0 * safeDt; // Reduced gravity
        this.velocity.y *= Math.pow(0.85, safeDt * 60); // Water drag

        if (input.jump) {
          this.velocity.y = 3.2; // Swim up
        }
      } else {
        // Air / Ground gravity
        const gravity = -26.0;
        this.velocity.y += gravity * safeDt;
        this.velocity.y = Math.max(-45.0, this.velocity.y); // Terminal velocity

        // Jump
        if (input.jump && this.isGrounded) {
          this.velocity.y = 8.5; // Enough to jump 1.25 blocks
          this.isGrounded = false;
          soundEngine.playJump();
        }
      }

      // 4. AABB Collision Resolution against Voxel World
      this.moveWithCollision(safeDt, world);

      // Footstep sound generation
      const horizontalSpeedSq = this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z;
      if (this.isGrounded && horizontalSpeedSq > 1.0) {
        this.footstepTimer += safeDt * (input.sprint ? 1.6 : 1.0);
        if (this.footstepTimer > 0.38) {
          this.footstepTimer = 0;
          const underBlock = world.getVoxelAt(
            Math.floor(this.position.x),
            Math.floor(this.position.y - 0.2),
            Math.floor(this.position.z)
          );
          const def = BLOCK_DEFS[underBlock];
          soundEngine.playFootstep(def ? def.soundType : 'grass');
        }
      }
    }

    this.updateCameraTransform();
  }

  /**
   * Swept AABB Collision resolution against voxel blocks.
   * Resolves axes independently (Y first, then X, then Z) for smooth sliding.
   */
  private moveWithCollision(dt: number, world: WorldManager) {
    const halfW = this.width / 2;

    // Helper: is block solid for collision
    const isSolid = (bx: number, by: number, bz: number): boolean => {
      const b = world.getVoxelAt(bx, by, bz);
      if (b === BlockType.AIR || b === BlockType.WATER) return false;
      const def = BLOCK_DEFS[b];
      return def ? !def.isPassable : true;
    };

    // Helper: check if player box intersects any solid block at test position
    const boxCollides = (testPos: THREE.Vector3): boolean => {
      const minX = Math.floor(testPos.x - halfW);
      const maxX = Math.floor(testPos.x + halfW);
      const minY = Math.floor(testPos.y);
      const maxY = Math.floor(testPos.y + this.height);
      const minZ = Math.floor(testPos.z - halfW);
      const maxZ = Math.floor(testPos.z + halfW);

      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          for (let x = minX; x <= maxX; x++) {
            if (isSolid(x, y, z)) {
              return true;
            }
          }
        }
      }
      return false;
    };

    // 1. Resolve Y axis
    const dy = this.velocity.y * dt;
    this.position.y += dy;
    this.isGrounded = false;

    if (boxCollides(this.position)) {
      if (dy < 0) {
        // Hit ground
        this.position.y = Math.floor(this.position.y) + 1;
        this.isGrounded = true;
      } else {
        // Hit ceiling
        this.position.y = Math.floor(this.position.y + this.height) - this.height;
      }
      this.velocity.y = 0;
    }

    // 2. Resolve X axis
    const dx = this.velocity.x * dt;
    this.position.x += dx;
    if (boxCollides(this.position)) {
      // Step climbing: try stepping up 0.5 block if moving against low obstacle
      if (this.isGrounded) {
        const stepPos = this.position.clone();
        stepPos.y += 0.55;
        if (!boxCollides(stepPos)) {
          this.position.y += 0.55;
          return;
        }
      }
      this.position.x -= dx;
      this.velocity.x = 0;
    }

    // 3. Resolve Z axis
    const dz = this.velocity.z * dt;
    this.position.z += dz;
    if (boxCollides(this.position)) {
      // Step climbing: try stepping up 0.5 block
      if (this.isGrounded) {
        const stepPos = this.position.clone();
        stepPos.y += 0.55;
        if (!boxCollides(stepPos)) {
          this.position.y += 0.55;
          return;
        }
      }
      this.position.z -= dz;
      this.velocity.z = 0;
    }
  }

  // Teleport to position safely
  public teleport(x: number, y: number, z: number) {
    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
    this.updateCameraTransform();
  }
}
