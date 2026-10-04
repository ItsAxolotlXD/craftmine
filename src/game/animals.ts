import * as THREE from 'three';
import { WorldManager } from './world';
import { soundEngine } from './audio';

export type AnimalType = 'pig' | 'cow' | 'sheep' | 'chicken';

interface AnimalInstance {
  type: AnimalType;
  group: THREE.Group;
  head: THREE.Mesh;
  legs: THREE.Mesh[];
  wings?: THREE.Mesh[];
  x: number;
  y: number;
  z: number;
  targetYaw: number;
  currentYaw: number;
  isWalking: boolean;
  walkTimer: number;
  idleTimer: number;
  animTimer: number;
}

export class AnimalManager {
  public animals: AnimalInstance[] = [];
  public group: THREE.Group;
  private maxAnimals = 18;
  private spawnCheckTimer = 0;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    scene.add(this.group);
  }

  // Create a voxel model for an animal
  private createAnimalModel(type: AnimalType): { group: THREE.Group; head: THREE.Mesh; legs: THREE.Mesh[]; wings?: THREE.Mesh[] } {
    const group = new THREE.Group();
    const legs: THREE.Mesh[] = [];
    let wings: THREE.Mesh[] | undefined;
    let head: THREE.Mesh;

    switch (type) {
      case 'pig': {
        const pinkMat = new THREE.MeshLambertMaterial({ color: 0xf0a0a0 });
        const snoutMat = new THREE.MeshLambertMaterial({ color: 0xe08080 });
        const hoofMat = new THREE.MeshLambertMaterial({ color: 0x3a2525 });

        // Body
        const bodyGeo = new THREE.BoxGeometry(0.9, 0.6, 1.2);
        const body = new THREE.Mesh(bodyGeo, pinkMat);
        body.position.y = 0.55;
        group.add(body);

        // Head
        const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        head = new THREE.Mesh(headGeo, pinkMat);
        head.position.set(0, 0.75, 0.65);
        group.add(head);

        // Snout
        const snoutGeo = new THREE.BoxGeometry(0.24, 0.16, 0.1);
        const snout = new THREE.Mesh(snoutGeo, snoutMat);
        snout.position.set(0, -0.05, 0.28);
        head.add(snout);

        // 4 Legs
        const legGeo = new THREE.BoxGeometry(0.22, 0.45, 0.22);
        const legPositions = [
          [-0.3, 0.225, 0.4],
          [0.3, 0.225, 0.4],
          [-0.3, 0.225, -0.4],
          [0.3, 0.225, -0.4],
        ];
        for (const [lx, ly, lz] of legPositions) {
          const leg = new THREE.Mesh(legGeo, pinkMat);
          leg.position.set(lx, ly, lz);
          group.add(leg);
          legs.push(leg);
        }
        break;
      }

      case 'cow': {
        const cowMat = new THREE.MeshLambertMaterial({ color: 0x4a3728 }); // Brown-black
        const whiteMat = new THREE.MeshLambertMaterial({ color: 0xe0e0e0 });
        const hornMat = new THREE.MeshLambertMaterial({ color: 0xd0c090 });

        // Body
        const bodyGeo = new THREE.BoxGeometry(1.0, 0.8, 1.4);
        const body = new THREE.Mesh(bodyGeo, cowMat);
        body.position.y = 0.75;
        group.add(body);

        // Head
        const headGeo = new THREE.BoxGeometry(0.5, 0.55, 0.5);
        head = new THREE.Mesh(headGeo, cowMat);
        head.position.set(0, 1.05, 0.75);
        group.add(head);

        // Horns
        const hornGeo = new THREE.BoxGeometry(0.12, 0.2, 0.12);
        const hornL = new THREE.Mesh(hornGeo, hornMat);
        hornL.position.set(-0.28, 0.28, 0);
        head.add(hornL);
        const hornR = new THREE.Mesh(hornGeo, hornMat);
        hornR.position.set(0.28, 0.28, 0);
        head.add(hornR);

        // 4 Legs
        const legGeo = new THREE.BoxGeometry(0.24, 0.65, 0.24);
        const legPositions = [
          [-0.35, 0.32, 0.5],
          [0.35, 0.32, 0.5],
          [-0.35, 0.32, -0.5],
          [0.35, 0.32, -0.5],
        ];
        for (const [lx, ly, lz] of legPositions) {
          const leg = new THREE.Mesh(legGeo, cowMat);
          leg.position.set(lx, ly, lz);
          group.add(leg);
          legs.push(leg);
        }
        break;
      }

      case 'sheep': {
        const woolMat = new THREE.MeshLambertMaterial({ color: 0xf5f5f5 });
        const skinMat = new THREE.MeshLambertMaterial({ color: 0xd2b48c });

        // Fluffy Wool Body
        const bodyGeo = new THREE.BoxGeometry(1.05, 0.85, 1.35);
        const body = new THREE.Mesh(bodyGeo, woolMat);
        body.position.y = 0.7;
        group.add(body);

        // Head
        const headGeo = new THREE.BoxGeometry(0.42, 0.45, 0.5);
        head = new THREE.Mesh(headGeo, skinMat);
        head.position.set(0, 0.95, 0.75);
        group.add(head);

        // Wool cap on head
        const woolCapGeo = new THREE.BoxGeometry(0.44, 0.25, 0.4);
        const woolCap = new THREE.Mesh(woolCapGeo, woolMat);
        woolCap.position.set(0, 0.2, -0.05);
        head.add(woolCap);

        // 4 Legs
        const legGeo = new THREE.BoxGeometry(0.2, 0.55, 0.2);
        const legPositions = [
          [-0.32, 0.275, 0.45],
          [0.32, 0.275, 0.45],
          [-0.32, 0.275, -0.45],
          [0.32, 0.275, -0.45],
        ];
        for (const [lx, ly, lz] of legPositions) {
          const leg = new THREE.Mesh(legGeo, skinMat);
          leg.position.set(lx, ly, lz);
          group.add(leg);
          legs.push(leg);
        }
        break;
      }

      case 'chicken':
      default: {
        const featherMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
        const beakMat = new THREE.MeshLambertMaterial({ color: 0xf59e0b });
        const wattleMat = new THREE.MeshLambertMaterial({ color: 0xdc2626 });

        // Tiny body
        const bodyGeo = new THREE.BoxGeometry(0.4, 0.4, 0.45);
        const body = new THREE.Mesh(bodyGeo, featherMat);
        body.position.y = 0.35;
        group.add(body);

        // Head
        const headGeo = new THREE.BoxGeometry(0.24, 0.3, 0.24);
        head = new THREE.Mesh(headGeo, featherMat);
        head.position.set(0, 0.55, 0.22);
        group.add(head);

        // Beak
        const beakGeo = new THREE.BoxGeometry(0.12, 0.08, 0.14);
        const beak = new THREE.Mesh(beakGeo, beakMat);
        beak.position.set(0, -0.04, 0.16);
        head.add(beak);

        // Wattle
        const wattleGeo = new THREE.BoxGeometry(0.08, 0.12, 0.08);
        const wattle = new THREE.Mesh(wattleGeo, wattleMat);
        wattle.position.set(0, -0.12, 0.1);
        head.add(wattle);

        // 2 Wings
        wings = [];
        const wingGeo = new THREE.BoxGeometry(0.06, 0.25, 0.35);
        const wingL = new THREE.Mesh(wingGeo, featherMat);
        wingL.position.set(-0.22, 0.36, 0.02);
        group.add(wingL);
        wings.push(wingL);

        const wingR = new THREE.Mesh(wingGeo, featherMat);
        wingR.position.set(0.22, 0.36, 0.02);
        group.add(wingR);
        wings.push(wingR);

        // 2 Legs
        const legGeo = new THREE.BoxGeometry(0.08, 0.25, 0.12);
        const legL = new THREE.Mesh(legGeo, beakMat);
        legL.position.set(-0.1, 0.12, 0);
        group.add(legL);
        legs.push(legL);

        const legR = new THREE.Mesh(legGeo, beakMat);
        legR.position.set(0.1, 0.12, 0);
        group.add(legR);
        legs.push(legR);
        break;
      }
    }

    return { group, head, legs, wings };
  }

  // Spawn an animal near player
  public spawnAnimal(type: AnimalType, x: number, y: number, z: number) {
    if (this.animals.length >= this.maxAnimals) {
      // Remove oldest far animal
      const oldest = this.animals.shift();
      if (oldest) {
        this.group.remove(oldest.group);
      }
    }

    const { group, head, legs, wings } = this.createAnimalModel(type);
    group.position.set(x, y, z);
    this.group.add(group);

    this.animals.push({
      type,
      group,
      head,
      legs,
      wings,
      x,
      y,
      z,
      targetYaw: Math.random() * Math.PI * 2,
      currentYaw: 0,
      isWalking: false,
      walkTimer: 0,
      idleTimer: 1 + Math.random() * 3,
      animTimer: 0,
    });
  }

  public update(dt: number, playerPos: THREE.Vector3, world: WorldManager) {
    // 1. Periodic Spawn Check around player
    this.spawnCheckTimer += dt;
    if (this.spawnCheckTimer > 2.0) {
      this.spawnCheckTimer = 0;
      if (this.animals.length < this.maxAnimals) {
        // Find safe spawn on nearby land
        const angle = Math.random() * Math.PI * 2;
        const dist = 18 + Math.random() * 26;
        const sx = Math.floor(playerPos.x + Math.cos(angle) * dist);
        const sz = Math.floor(playerPos.z + Math.sin(angle) * dist);

        const info = world.generator.getTerrainHeight(sx, sz);
        if (!info.isOcean && !info.isRiver && info.height >= 38) {
          const types: AnimalType[] = ['pig', 'cow', 'sheep', 'chicken'];
          const randomType = types[Math.floor(Math.random() * types.length)];
          this.spawnAnimal(randomType, sx + 0.5, info.height, sz + 0.5);
        }
      }
    }

    // 2. Update each animal AI & Animation
    for (let i = this.animals.length - 1; i >= 0; i--) {
      const a = this.animals[i];

      // Despawn if too far (> 70 blocks)
      const distSq = (a.x - playerPos.x) ** 2 + (a.z - playerPos.z) ** 2;
      if (distSq > 70 * 70) {
        this.group.remove(a.group);
        this.animals.splice(i, 1);
        continue;
      }

      // State machine (walking vs idling)
      if (a.isWalking) {
        a.walkTimer -= dt;
        a.animTimer += dt * 6.5;

        // Move forward
        const speed = a.type === 'chicken' ? 1.2 : 0.9;
        a.x += -Math.sin(a.currentYaw) * speed * dt;
        a.z += -Math.cos(a.currentYaw) * speed * dt;

        // Follow terrain height smoothly
        const h = world.generator.getTerrainHeight(Math.floor(a.x), Math.floor(a.z)).height;
        a.y += (h - a.y) * Math.min(1.0, 10.0 * dt);

        // Leg swing animation
        const swing = Math.sin(a.animTimer) * 0.45;
        if (a.legs.length >= 4) {
          a.legs[0].rotation.x = swing;
          a.legs[1].rotation.x = -swing;
          a.legs[2].rotation.x = -swing;
          a.legs[3].rotation.x = swing;
        } else if (a.legs.length === 2) {
          a.legs[0].rotation.x = swing;
          a.legs[1].rotation.x = -swing;
        }

        // Flapping wings for chicken
        if (a.wings) {
          const flap = Math.abs(Math.sin(a.animTimer * 2)) * 0.35;
          a.wings[0].rotation.z = -flap;
          a.wings[1].rotation.z = flap;
        }

        if (a.walkTimer <= 0) {
          a.isWalking = false;
          a.idleTimer = 2.0 + Math.random() * 4.0;
          // Reset legs
          for (const leg of a.legs) leg.rotation.x = 0;

          // Ambient sound if near player
          if (distSq < 22 * 22 && Math.random() < 0.45) {
            soundEngine.playAnimalSound(a.type);
          }
        }
      } else {
        // Idling / grazing
        a.idleTimer -= dt;
        // Subtle head peck / look around
        a.head.rotation.y = Math.sin(dt * 0.5) * 0.2;

        if (a.idleTimer <= 0) {
          a.isWalking = true;
          a.walkTimer = 2.0 + Math.random() * 3.5;
          a.targetYaw = Math.random() * Math.PI * 2;
        }
      }

      // Smoothly rotate towards target yaw
      a.currentYaw += (a.targetYaw - a.currentYaw) * Math.min(1.0, 4.0 * dt);

      // Apply transform to group
      a.group.position.set(a.x, a.y, a.z);
      a.group.rotation.y = a.currentYaw;
    }
  }

  public dispose() {
    for (const a of this.animals) {
      this.group.remove(a.group);
    }
    this.animals = [];
  }
}
