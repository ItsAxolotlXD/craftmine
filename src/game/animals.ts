import * as THREE from 'three';
import { WorldManager } from './world';
import { soundEngine } from './audio';
import { BlockType, BLOCK_DEFS } from './blocks';

export type AnimalType =
  | 'pig'
  | 'cow'
  | 'sheep'
  | 'chicken'
  | 'frog'
  // Sift dimension mobs (7 unique ethereal mobs)
  | 'sift_strider'
  | 'willow_wisp'
  | 'sift_golem'
  | 'sift_drake'
  | 'sift_stag'
  | 'sift_fox'
  | 'sift_bunny';

interface AnimalInstance {
  type: AnimalType;
  group: THREE.Group;
  head: THREE.Mesh;
  legs: THREE.Mesh[];
  wings?: THREE.Mesh[];
  tail?: THREE.Mesh;
  antlers?: THREE.Mesh[];
  x: number;
  y: number;
  z: number;
  vy: number;
  isGrounded: boolean;
  targetYaw: number;
  currentYaw: number;
  isWalking: boolean;
  walkTimer: number;
  idleTimer: number;
  animTimer: number;
}

// Fast check for solid obstacle voxel (prevents mobs clipping through blocks)
function isSolidVoxel(world: WorldManager, x: number, y: number, z: number): boolean {
  if (y < 0 || y >= 128) return false;
  const b = world.getBlockAt(Math.floor(x), Math.floor(y), Math.floor(z));
  if (b === BlockType.AIR || b === BlockType.WATER || b === BlockType.LAVA) return false;
  const def = BLOCK_DEFS[b];
  if (!def) return false;
  if (def.isPassable) return false;
  return true;
}

export class AnimalManager {
  public animals: AnimalInstance[] = [];
  public group: THREE.Group;
  private maxAnimals = 20;
  private spawnCheckTimer = 0;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    scene.add(this.group);
  }

  // Create a voxel model for an animal or Sift mob
  private createAnimalModel(type: AnimalType): {
    group: THREE.Group;
    head: THREE.Mesh;
    legs: THREE.Mesh[];
    wings?: THREE.Mesh[];
    tail?: THREE.Mesh;
    antlers?: THREE.Mesh[];
  } {
    const group = new THREE.Group();
    const legs: THREE.Mesh[] = [];
    let wings: THREE.Mesh[] | undefined;
    let tail: THREE.Mesh | undefined;
    let antlers: THREE.Mesh[] | undefined;
    let head: THREE.Mesh;

    switch (type) {
      case 'pig': {
        const pinkMat = new THREE.MeshLambertMaterial({ color: 0xf0a0a0 });
        const snoutMat = new THREE.MeshLambertMaterial({ color: 0xe08080 });

        const bodyGeo = new THREE.BoxGeometry(0.9, 0.6, 1.2);
        const body = new THREE.Mesh(bodyGeo, pinkMat);
        body.position.y = 0.55;
        group.add(body);

        const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        head = new THREE.Mesh(headGeo, pinkMat);
        head.position.set(0, 0.75, 0.65);
        group.add(head);

        const snoutGeo = new THREE.BoxGeometry(0.24, 0.16, 0.1);
        const snout = new THREE.Mesh(snoutGeo, snoutMat);
        snout.position.set(0, -0.05, 0.28);
        head.add(snout);

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
        const cowMat = new THREE.MeshLambertMaterial({ color: 0x4a3728 });
        const hornMat = new THREE.MeshLambertMaterial({ color: 0xd0c090 });

        const bodyGeo = new THREE.BoxGeometry(1.0, 0.8, 1.4);
        const body = new THREE.Mesh(bodyGeo, cowMat);
        body.position.y = 0.75;
        group.add(body);

        const headGeo = new THREE.BoxGeometry(0.5, 0.55, 0.5);
        head = new THREE.Mesh(headGeo, cowMat);
        head.position.set(0, 1.05, 0.75);
        group.add(head);

        const hornGeo = new THREE.BoxGeometry(0.12, 0.2, 0.12);
        const hornL = new THREE.Mesh(hornGeo, hornMat);
        hornL.position.set(-0.28, 0.28, 0);
        head.add(hornL);
        const hornR = new THREE.Mesh(hornGeo, hornMat);
        hornR.position.set(0.28, 0.28, 0);
        head.add(hornR);

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

        const bodyGeo = new THREE.BoxGeometry(1.05, 0.85, 1.35);
        const body = new THREE.Mesh(bodyGeo, woolMat);
        body.position.y = 0.7;
        group.add(body);

        const headGeo = new THREE.BoxGeometry(0.42, 0.45, 0.5);
        head = new THREE.Mesh(headGeo, skinMat);
        head.position.set(0, 0.95, 0.75);
        group.add(head);

        const woolCapGeo = new THREE.BoxGeometry(0.44, 0.25, 0.4);
        const woolCap = new THREE.Mesh(woolCapGeo, woolMat);
        woolCap.position.set(0, 0.2, -0.05);
        head.add(woolCap);

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

      case 'chicken': {
        const featherMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
        const beakMat = new THREE.MeshLambertMaterial({ color: 0xf59e0b });
        const wattleMat = new THREE.MeshLambertMaterial({ color: 0xdc2626 });

        const bodyGeo = new THREE.BoxGeometry(0.4, 0.4, 0.45);
        const body = new THREE.Mesh(bodyGeo, featherMat);
        body.position.y = 0.35;
        group.add(body);

        const headGeo = new THREE.BoxGeometry(0.24, 0.3, 0.24);
        head = new THREE.Mesh(headGeo, featherMat);
        head.position.set(0, 0.55, 0.22);
        group.add(head);

        const beakGeo = new THREE.BoxGeometry(0.12, 0.08, 0.14);
        const beak = new THREE.Mesh(beakGeo, beakMat);
        beak.position.set(0, -0.04, 0.16);
        head.add(beak);

        const wattleGeo = new THREE.BoxGeometry(0.08, 0.12, 0.08);
        const wattle = new THREE.Mesh(wattleGeo, wattleMat);
        wattle.position.set(0, -0.12, 0.1);
        head.add(wattle);

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

      case 'frog': {
        const frogGreenMat = new THREE.MeshLambertMaterial({ color: 0x557a2b });
        const frogBellyMat = new THREE.MeshLambertMaterial({ color: 0x8fad3d });
        const eyeMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
        const eyeRimMat = new THREE.MeshLambertMaterial({ color: 0xfacc15 });

        const bodyGeo = new THREE.BoxGeometry(0.5, 0.3, 0.55);
        const body = new THREE.Mesh(bodyGeo, frogGreenMat);
        body.position.y = 0.22;
        group.add(body);

        const bellyGeo = new THREE.BoxGeometry(0.38, 0.08, 0.42);
        const belly = new THREE.Mesh(bellyGeo, frogBellyMat);
        belly.position.set(0, 0.12, 0);
        group.add(belly);

        const headGeo = new THREE.BoxGeometry(0.44, 0.22, 0.35);
        head = new THREE.Mesh(headGeo, frogGreenMat);
        head.position.set(0, 0.32, 0.28);
        group.add(head);

        const eyeBulgeGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
        const eyePupilGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);

        const eyeL = new THREE.Mesh(eyeBulgeGeo, eyeRimMat);
        eyeL.position.set(-0.16, 0.12, 0.05);
        const pupilL = new THREE.Mesh(eyePupilGeo, eyeMat);
        pupilL.position.set(0, 0, 0.04);
        eyeL.add(pupilL);
        head.add(eyeL);

        const eyeR = new THREE.Mesh(eyeBulgeGeo, eyeRimMat);
        eyeR.position.set(0.16, 0.12, 0.05);
        const pupilR = new THREE.Mesh(eyePupilGeo, eyeMat);
        pupilR.position.set(0, 0, 0.04);
        eyeR.add(pupilR);
        head.add(eyeR);

        const frontLegGeo = new THREE.BoxGeometry(0.08, 0.18, 0.08);
        const flL = new THREE.Mesh(frontLegGeo, frogGreenMat);
        flL.position.set(-0.2, 0.1, 0.2);
        group.add(flL);
        legs.push(flL);

        const flR = new THREE.Mesh(frontLegGeo, frogGreenMat);
        flR.position.set(0.2, 0.1, 0.2);
        group.add(flR);
        legs.push(flR);

        const hindLegGeo = new THREE.BoxGeometry(0.14, 0.22, 0.22);
        const hlL = new THREE.Mesh(hindLegGeo, frogGreenMat);
        hlL.position.set(-0.24, 0.14, -0.16);
        group.add(hlL);
        legs.push(hlL);

        const hlR = new THREE.Mesh(hindLegGeo, frogGreenMat);
        hlR.position.set(0.24, 0.14, -0.16);
        group.add(hlR);
        legs.push(hlR);
        break;
      }

      // --- 7 UNIQUE SIFT MOBS ---

      // 1. Sift Strider: Tall, long-legged bipedal creature traversing floating islands
      case 'sift_strider': {
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0xf472b6 });
        const crestMat = new THREE.MeshLambertMaterial({ color: 0xdb2777 });
        const legMat = new THREE.MeshLambertMaterial({ color: 0x9d174d });
        const eyeMat = new THREE.MeshLambertMaterial({ color: 0xffffff });

        const bodyGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 1.25;
        group.add(body);

        head = body;

        // Crest on top
        const crestGeo = new THREE.BoxGeometry(0.18, 0.35, 0.5);
        const crest = new THREE.Mesh(crestGeo, crestMat);
        crest.position.set(0, 0.45, 0);
        head.add(crest);

        // Eyes
        const eyeGeo = new THREE.BoxGeometry(0.12, 0.12, 0.08);
        const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
        eyeL.position.set(-0.24, 0.1, 0.36);
        head.add(eyeL);
        const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
        eyeR.position.set(0.24, 0.1, 0.36);
        head.add(eyeR);

        // Two long striding legs
        const legGeo = new THREE.BoxGeometry(0.18, 1.1, 0.18);
        const legL = new THREE.Mesh(legGeo, legMat);
        legL.position.set(-0.25, 0.55, 0);
        group.add(legL);
        legs.push(legL);

        const legR = new THREE.Mesh(legGeo, legMat);
        legR.position.set(0.25, 0.55, 0);
        group.add(legR);
        legs.push(legR);
        break;
      }

      // 2. Willow Wisp: Ethereal floating glowing orb with fluttering crystal wings
      case 'willow_wisp': {
        const coreMat = new THREE.MeshLambertMaterial({ color: 0xfdf4ff, emissive: 0xf472b6, emissiveIntensity: 0.6 });
        const outerMat = new THREE.MeshLambertMaterial({ color: 0xfbcfe8, transparent: true, opacity: 0.75 });
        const eyeMat = new THREE.MeshLambertMaterial({ color: 0xd946ef });

        const bodyGeo = new THREE.BoxGeometry(0.45, 0.45, 0.45);
        const body = new THREE.Mesh(bodyGeo, coreMat);
        body.position.y = 0.55;
        group.add(body);
        head = body;

        const haloGeo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
        const halo = new THREE.Mesh(haloGeo, outerMat);
        head.add(halo);

        const eyeGeo = new THREE.BoxGeometry(0.1, 0.1, 0.06);
        const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
        eyeL.position.set(-0.12, 0.05, 0.24);
        head.add(eyeL);
        const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
        eyeR.position.set(0.12, 0.05, 0.24);
        head.add(eyeR);

        wings = [];
        const wingGeo = new THREE.BoxGeometry(0.05, 0.3, 0.4);
        const wingL = new THREE.Mesh(wingGeo, outerMat);
        wingL.position.set(-0.32, 0.55, 0);
        group.add(wingL);
        wings.push(wingL);

        const wingR = new THREE.Mesh(wingGeo, outerMat);
        wingR.position.set(0.32, 0.55, 0);
        group.add(wingR);
        wings.push(wingR);
        break;
      }

      // 3. Sift Golem: Ancient carved stone protector of The Sift with glowing magenta eyes
      case 'sift_golem': {
        const stoneMat = new THREE.MeshLambertMaterial({ color: 0xd89aa8 });
        const vineMat = new THREE.MeshLambertMaterial({ color: 0xf1f5f9 });
        const eyeMat = new THREE.MeshLambertMaterial({ color: 0xec4899, emissive: 0xec4899, emissiveIntensity: 0.8 });

        const bodyGeo = new THREE.BoxGeometry(0.9, 0.85, 0.7);
        const body = new THREE.Mesh(bodyGeo, stoneMat);
        body.position.y = 0.85;
        group.add(body);

        const headGeo = new THREE.BoxGeometry(0.55, 0.5, 0.5);
        head = new THREE.Mesh(headGeo, stoneMat);
        head.position.set(0, 1.35, 0.15);
        group.add(head);

        // Glowing visor eye
        const eyeGeo = new THREE.BoxGeometry(0.36, 0.1, 0.08);
        const eyes = new THREE.Mesh(eyeGeo, eyeMat);
        eyes.position.set(0, 0.04, 0.26);
        head.add(eyes);

        // White willow vine tendrils on shoulders
        const vineGeo = new THREE.BoxGeometry(0.2, 0.45, 0.2);
        const vineL = new THREE.Mesh(vineGeo, vineMat);
        vineL.position.set(-0.55, 0.95, 0);
        group.add(vineL);
        const vineR = new THREE.Mesh(vineGeo, vineMat);
        vineR.position.set(0.55, 0.95, 0);
        group.add(vineR);

        // 2 Sturdy Stone Legs
        const legGeo = new THREE.BoxGeometry(0.28, 0.55, 0.28);
        const legL = new THREE.Mesh(legGeo, stoneMat);
        legL.position.set(-0.25, 0.275, 0);
        group.add(legL);
        legs.push(legL);

        const legR = new THREE.Mesh(legGeo, stoneMat);
        legR.position.set(0.25, 0.275, 0);
        group.add(legR);
        legs.push(legR);
        break;
      }

      // 4. Sift Drake: Winged pastel pink drake with pale horns and fluttering wings
      case 'sift_drake': {
        const scaleMat = new THREE.MeshLambertMaterial({ color: 0xf472b6 });
        const hornMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
        const wingMat = new THREE.MeshLambertMaterial({ color: 0xfce7f3 });

        const bodyGeo = new THREE.BoxGeometry(0.65, 0.45, 1.1);
        const body = new THREE.Mesh(bodyGeo, scaleMat);
        body.position.y = 0.5;
        group.add(body);

        const headGeo = new THREE.BoxGeometry(0.4, 0.35, 0.45);
        head = new THREE.Mesh(headGeo, scaleMat);
        head.position.set(0, 0.72, 0.65);
        group.add(head);

        // Pale horns
        const hornGeo = new THREE.BoxGeometry(0.08, 0.22, 0.08);
        const hornL = new THREE.Mesh(hornGeo, hornMat);
        hornL.position.set(-0.15, 0.22, -0.05);
        head.add(hornL);
        const hornR = new THREE.Mesh(hornGeo, hornMat);
        hornR.position.set(0.15, 0.22, -0.05);
        head.add(hornR);

        // Tail
        const tailGeo = new THREE.BoxGeometry(0.18, 0.18, 0.5);
        tail = new THREE.Mesh(tailGeo, scaleMat);
        tail.position.set(0, 0.5, -0.75);
        group.add(tail);

        // Flapping Wings
        wings = [];
        const wingGeo = new THREE.BoxGeometry(0.06, 0.35, 0.55);
        const wingL = new THREE.Mesh(wingGeo, wingMat);
        wingL.position.set(-0.4, 0.6, 0.1);
        group.add(wingL);
        wings.push(wingL);

        const wingR = new THREE.Mesh(wingGeo, wingMat);
        wingR.position.set(0.4, 0.6, 0.1);
        group.add(wingR);
        wings.push(wingR);

        // 4 Legs
        const legGeo = new THREE.BoxGeometry(0.15, 0.35, 0.15);
        const legPos = [
          [-0.24, 0.175, 0.35],
          [0.24, 0.175, 0.35],
          [-0.24, 0.175, -0.35],
          [0.24, 0.175, -0.35],
        ];
        for (const [lx, ly, lz] of legPos) {
          const leg = new THREE.Mesh(legGeo, scaleMat);
          leg.position.set(lx, ly, lz);
          group.add(leg);
          legs.push(leg);
        }
        break;
      }

      // 5. Sift Stag / Willow Deer: Majestic deer with luminous branching white willow antlers
      case 'sift_stag': {
        const coatMat = new THREE.MeshLambertMaterial({ color: 0xf0abfc });
        const antlerMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.25 });
        const hoofMat = new THREE.MeshLambertMaterial({ color: 0xd946ef });

        const bodyGeo = new THREE.BoxGeometry(0.85, 0.75, 1.3);
        const body = new THREE.Mesh(bodyGeo, coatMat);
        body.position.y = 0.85;
        group.add(body);

        const neckGeo = new THREE.BoxGeometry(0.32, 0.55, 0.35);
        const neck = new THREE.Mesh(neckGeo, coatMat);
        neck.position.set(0, 1.25, 0.55);
        group.add(neck);

        const headGeo = new THREE.BoxGeometry(0.38, 0.38, 0.45);
        head = new THREE.Mesh(headGeo, coatMat);
        head.position.set(0, 1.55, 0.72);
        group.add(head);

        // Branching white willow antlers
        antlers = [];
        const mainAntlerGeo = new THREE.BoxGeometry(0.08, 0.5, 0.08);
        const branchAntlerGeo = new THREE.BoxGeometry(0.24, 0.08, 0.08);

        const aL = new THREE.Mesh(mainAntlerGeo, antlerMat);
        aL.position.set(-0.2, 0.35, 0);
        const bL = new THREE.Mesh(branchAntlerGeo, antlerMat);
        bL.position.set(-0.08, 0.15, 0);
        aL.add(bL);
        head.add(aL);
        antlers.push(aL);

        const aR = new THREE.Mesh(mainAntlerGeo, antlerMat);
        aR.position.set(0.2, 0.35, 0);
        const bR = new THREE.Mesh(branchAntlerGeo, antlerMat);
        bR.position.set(0.08, 0.15, 0);
        aR.add(bR);
        head.add(aR);
        antlers.push(aR);

        // 4 Slender Legs
        const legGeo = new THREE.BoxGeometry(0.18, 0.75, 0.18);
        const legPos = [
          [-0.3, 0.375, 0.45],
          [0.3, 0.375, 0.45],
          [-0.3, 0.375, -0.45],
          [0.3, 0.375, -0.45],
        ];
        for (const [lx, ly, lz] of legPos) {
          const leg = new THREE.Mesh(legGeo, hoofMat);
          leg.position.set(lx, ly, lz);
          group.add(leg);
          legs.push(leg);
        }
        break;
      }

      // 6. Sift Fox: Playful white-and-pink fox with a large bushy tail
      case 'sift_fox': {
        const furMat = new THREE.MeshLambertMaterial({ color: 0xfb7185 });
        const whiteMat = new THREE.MeshLambertMaterial({ color: 0xfff1f2 });
        const noseMat = new THREE.MeshLambertMaterial({ color: 0x111111 });

        const bodyGeo = new THREE.BoxGeometry(0.5, 0.4, 0.85);
        const body = new THREE.Mesh(bodyGeo, furMat);
        body.position.y = 0.4;
        group.add(body);

        const bellyGeo = new THREE.BoxGeometry(0.38, 0.08, 0.7);
        const belly = new THREE.Mesh(bellyGeo, whiteMat);
        belly.position.set(0, 0.22, 0);
        group.add(belly);

        const headGeo = new THREE.BoxGeometry(0.38, 0.35, 0.4);
        head = new THREE.Mesh(headGeo, furMat);
        head.position.set(0, 0.6, 0.48);
        group.add(head);

        const snoutGeo = new THREE.BoxGeometry(0.2, 0.15, 0.18);
        const snout = new THREE.Mesh(snoutGeo, whiteMat);
        snout.position.set(0, -0.08, 0.24);
        const nose = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.06), noseMat);
        nose.position.set(0, 0.04, 0.09);
        snout.add(nose);
        head.add(snout);

        // Pointy ears
        const earGeo = new THREE.BoxGeometry(0.1, 0.16, 0.08);
        const earL = new THREE.Mesh(earGeo, furMat);
        earL.position.set(-0.14, 0.22, -0.05);
        head.add(earL);
        const earR = new THREE.Mesh(earGeo, furMat);
        earR.position.set(0.14, 0.22, -0.05);
        head.add(earR);

        // Big Bushy Tail
        const tailGeo = new THREE.BoxGeometry(0.25, 0.25, 0.65);
        tail = new THREE.Mesh(tailGeo, furMat);
        tail.position.set(0, 0.45, -0.6);
        const tailTip = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), whiteMat);
        tailTip.position.set(0, 0, -0.25);
        tail.add(tailTip);
        group.add(tail);

        // 4 Legs
        const legGeo = new THREE.BoxGeometry(0.12, 0.35, 0.12);
        const legPos = [
          [-0.18, 0.175, 0.3],
          [0.18, 0.175, 0.3],
          [-0.18, 0.175, -0.3],
          [0.18, 0.175, -0.3],
        ];
        for (const [lx, ly, lz] of legPos) {
          const leg = new THREE.Mesh(legGeo, whiteMat);
          leg.position.set(lx, ly, lz);
          group.add(leg);
          legs.push(leg);
        }
        break;
      }

      // 7. Sift Bunny: Cute fluffy hopping creature with long pink-lined ears
      case 'sift_bunny': {
        const whiteFurMat = new THREE.MeshLambertMaterial({ color: 0xfdf4ff });
        const pinkEarMat = new THREE.MeshLambertMaterial({ color: 0xf472b6 });

        const bodyGeo = new THREE.BoxGeometry(0.38, 0.35, 0.45);
        const body = new THREE.Mesh(bodyGeo, whiteFurMat);
        body.position.y = 0.25;
        group.add(body);

        const headGeo = new THREE.BoxGeometry(0.28, 0.28, 0.3);
        head = new THREE.Mesh(headGeo, whiteFurMat);
        head.position.set(0, 0.45, 0.22);
        group.add(head);

        // Long upright ears with pink interior
        const earGeo = new THREE.BoxGeometry(0.08, 0.32, 0.06);
        const earL = new THREE.Mesh(earGeo, pinkEarMat);
        earL.position.set(-0.1, 0.25, 0);
        head.add(earL);
        const earR = new THREE.Mesh(earGeo, pinkEarMat);
        earR.position.set(0.1, 0.25, 0);
        head.add(earR);

        // Tail puff
        const puffGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
        tail = new THREE.Mesh(puffGeo, whiteFurMat);
        tail.position.set(0, 0.28, -0.26);
        group.add(tail);

        // 4 Tiny Legs
        const legGeo = new THREE.BoxGeometry(0.1, 0.16, 0.12);
        const legPos = [
          [-0.12, 0.08, 0.15],
          [0.12, 0.08, 0.15],
          [-0.14, 0.08, -0.15],
          [0.14, 0.08, -0.15],
        ];
        for (const [lx, ly, lz] of legPos) {
          const leg = new THREE.Mesh(legGeo, whiteFurMat);
          leg.position.set(lx, ly, lz);
          group.add(leg);
          legs.push(leg);
        }
        break;
      }
    }

    return { group, head, legs, wings, tail, antlers };
  }

  // Spawn an animal near coordinates
  public spawnAnimal(type: AnimalType, x: number, y: number, z: number) {
    if (this.animals.length >= this.maxAnimals) {
      const oldest = this.animals.shift();
      if (oldest) {
        this.group.remove(oldest.group);
      }
    }

    const { group, head, legs, wings, tail, antlers } = this.createAnimalModel(type);
    group.position.set(x, y, z);
    this.group.add(group);

    this.animals.push({
      type,
      group,
      head,
      legs,
      wings,
      tail,
      antlers,
      x,
      y,
      z,
      vy: 0,
      isGrounded: true,
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
        const angle = Math.random() * Math.PI * 2;
        const dist = 16 + Math.random() * 24;
        const sx = Math.floor(playerPos.x + Math.cos(angle) * dist);
        const sz = Math.floor(playerPos.z + Math.sin(angle) * dist);

        if (world.dimension === 'sift') {
          // In The Sift: Spawn the 7 Sift mobs on Sift Grass floating islands!
          for (let y = 78; y >= 32; y--) {
            if (world.getBlockAt(sx, y, sz) === BlockType.SIFT_GRASS &&
                world.getBlockAt(sx, y + 1, sz) === BlockType.AIR) {
              const siftTypes: AnimalType[] = [
                'sift_strider',
                'willow_wisp',
                'sift_golem',
                'sift_drake',
                'sift_stag',
                'sift_fox',
                'sift_bunny',
              ];
              const randomType = siftTypes[Math.floor(Math.random() * siftTypes.length)];
              this.spawnAnimal(randomType, sx + 0.5, y + 1.0, sz + 0.5);
              break;
            }
          }
        } else if (world.dimension === 'overworld') {
          // Overworld Animals
          const info = world.generator.getTerrainHeight(sx, sz);
          if (!info.isOcean && !info.isRiver && info.height >= 36) {
            let randomType: AnimalType;
            if (info.biome === 'mangrove_forest') {
              randomType = Math.random() < 0.75 ? 'frog' : 'pig';
            } else {
              const types: AnimalType[] = ['pig', 'cow', 'sheep', 'chicken'];
              randomType = types[Math.floor(Math.random() * types.length)];
            }
            this.spawnAnimal(randomType, sx + 0.5, info.height, sz + 0.5);
          }
        }
      }
    }

    // 2. Update each animal AI, Animation & Voxel Collision Physics
    for (let i = this.animals.length - 1; i >= 0; i--) {
      const a = this.animals[i];

      // Despawn if too far (> 70 blocks) or fallen into void
      const distSq = (a.x - playerPos.x) ** 2 + (a.z - playerPos.z) ** 2;
      if (distSq > 72 * 72 || a.y < 4) {
        this.group.remove(a.group);
        this.animals.splice(i, 1);
        continue;
      }

      // State machine (walking vs idling)
      if (a.isWalking) {
        a.walkTimer -= dt;
        a.animTimer += dt * 6.5;

        // Determine animal speed
        let speed = 0.9;
        if (a.type === 'chicken') speed = 1.1;
        else if (a.type === 'frog' || a.type === 'sift_bunny') speed = 1.3;
        else if (a.type === 'sift_fox') speed = 1.4;
        else if (a.type === 'sift_strider') speed = 1.25;
        else if (a.type === 'sift_golem') speed = 0.7;
        else if (a.type === 'willow_wisp') speed = 1.1;

        let moveX = -Math.sin(a.currentYaw) * speed * dt;
        let moveZ = -Math.cos(a.currentYaw) * speed * dt;

        // Collision radius & height based on mob size
        const r = (a.type === 'chicken' || a.type === 'sift_bunny' || a.type === 'frog' || a.type === 'willow_wisp') ? 0.22 : 0.38;
        const mobH = (a.type === 'sift_strider') ? 1.5 : (a.type === 'sift_golem' || a.type === 'sift_stag' || a.type === 'cow') ? 1.1 : 0.6;

        if (a.type === 'willow_wisp') {
          // Willow Wisp hovers gracefully, never clips into solid blocks
          const targetY = 54 + Math.sin(a.animTimer * 0.8) * 1.5;
          a.y += (targetY - a.y) * Math.min(1.0, 3.0 * dt);
          // Gently push up if solid block directly below or ahead
          if (isSolidVoxel(world, a.x + moveX, a.y - 0.2, a.z + moveZ)) {
            a.y += 1.5 * dt;
          }
          a.x += moveX;
          a.z += moveZ;
        } else {
          // --- VOXEL COLLISION PHYSICS (NO CLIPPING THROUGH BLOCKS) ---

          // Avoid stepping off floating island precipice / void
          const aheadX = a.x + moveX * 4;
          const aheadZ = a.z + moveZ * 4;
          const drop1 = isSolidVoxel(world, aheadX, a.y - 1, aheadZ);
          const drop2 = isSolidVoxel(world, aheadX, a.y - 2, aheadZ);
          const drop3 = isSolidVoxel(world, aheadX, a.y - 3, aheadZ);
          if (!drop1 && !drop2 && !drop3 && world.dimension === 'sift') {
            // Edge of floating island detected! Turn around immediately
            a.targetYaw = Math.random() * Math.PI * 2;
            moveX = 0;
            moveZ = 0;
          }

          // 1. Move along X axis with solid block collision & 1-block step-up
          if (moveX !== 0) {
            const testX = a.x + moveX + (moveX > 0 ? r : -r);
            const blockedFoot = isSolidVoxel(world, testX, a.y + 0.15, a.z);
            const blockedBody = isSolidVoxel(world, testX, a.y + Math.min(0.8, mobH), a.z);

            if (blockedFoot || blockedBody) {
              // Test if it's a 1-block step up
              const canStepUp = !isSolidVoxel(world, testX, a.y + 1.15, a.z) &&
                                !isSolidVoxel(world, a.x, a.y + mobH + 0.3, a.z);
              if (canStepUp && a.isGrounded) {
                a.x += moveX;
                a.y += 1.0;
              } else {
                // Collided with solid wall: stop at block edge and pick new direction
                a.targetYaw = Math.random() * Math.PI * 2;
              }
            } else {
              a.x += moveX;
            }
          }

          // 2. Move along Z axis with solid block collision & 1-block step-up
          if (moveZ !== 0) {
            const testZ = a.z + moveZ + (moveZ > 0 ? r : -r);
            const blockedFoot = isSolidVoxel(world, a.x, a.y + 0.15, testZ);
            const blockedBody = isSolidVoxel(world, a.x, a.y + Math.min(0.8, mobH), testZ);

            if (blockedFoot || blockedBody) {
              const canStepUp = !isSolidVoxel(world, a.x, a.y + 1.15, testZ) &&
                                !isSolidVoxel(world, a.x, a.y + mobH + 0.3, a.z);
              if (canStepUp && a.isGrounded) {
                a.z += moveZ;
                a.y += 1.0;
              } else {
                a.targetYaw = Math.random() * Math.PI * 2;
              }
            } else {
              a.z += moveZ;
            }
          }

          // 3. Gravity & Solid Ground Support
          const isFootGrounded = isSolidVoxel(world, a.x, a.y - 0.08, a.z);
          if (isFootGrounded) {
            a.isGrounded = true;
            a.vy = 0;
            // Snug alignment to surface of solid block
            const solidBlockY = Math.floor(a.y - 0.08);
            a.y = solidBlockY + 1.0;
          } else {
            a.isGrounded = false;
            a.vy -= 18.0 * dt; // Gravity
            a.y += a.vy * dt;

            // Check if landed on solid block during this frame
            if (isSolidVoxel(world, a.x, a.y, a.z)) {
              a.y = Math.floor(a.y) + 1.0;
              a.vy = 0;
              a.isGrounded = true;
            }
          }
        }

        // Animation logic based on creature type
        if (a.type === 'frog' || a.type === 'sift_bunny') {
          // Bouncy hopping animation
          const hop = Math.abs(Math.sin(a.animTimer * 1.8)) * 0.35;
          a.group.position.set(a.x, a.y + hop, a.z);
          if (a.legs.length >= 4) {
            a.legs[0].rotation.x = -hop;
            a.legs[1].rotation.x = -hop;
            a.legs[2].rotation.x = hop * 1.2;
            a.legs[3].rotation.x = hop * 1.2;
          }
        } else if (a.type === 'willow_wisp') {
          // Bobbing ethereal wisp
          const bob = Math.sin(a.animTimer * 2.0) * 0.15;
          a.group.position.set(a.x, a.y + bob, a.z);
          if (a.wings) {
            const flap = Math.sin(a.animTimer * 4.0) * 0.45;
            a.wings[0].rotation.y = -flap;
            a.wings[1].rotation.y = flap;
          }
        } else {
          // Regular quad/biped walk swing
          a.group.position.set(a.x, a.y, a.z);
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
        }

        // Flapping wings for chicken & sift drake
        if (a.wings && a.type !== 'willow_wisp') {
          const flap = Math.abs(Math.sin(a.animTimer * 2.2)) * 0.4;
          a.wings[0].rotation.z = -flap;
          a.wings[1].rotation.z = flap;
        }

        // Tail wagging for fox & drake
        if (a.tail) {
          a.tail.rotation.y = Math.sin(a.animTimer * 1.5) * 0.25;
        }

        if (a.walkTimer <= 0) {
          a.isWalking = false;
          a.idleTimer = 2.0 + Math.random() * 4.0;
          for (const leg of a.legs) leg.rotation.x = 0;

          // Ambient sound if near player
          if (distSq < 22 * 22 && Math.random() < 0.45) {
            soundEngine.playAnimalSound(a.type);
          }
        }
      } else {
        // Idling / grazing / looking around
        a.idleTimer -= dt;
        a.head.rotation.y = Math.sin(dt * 0.5) * 0.2;

        if (a.tail) {
          a.tail.rotation.y = Math.sin(dt * 1.2) * 0.1;
        }

        // Ensure mob stays properly grounded even when idle
        if (a.type !== 'willow_wisp') {
          const isFootGrounded = isSolidVoxel(world, a.x, a.y - 0.08, a.z);
          if (isFootGrounded) {
            a.isGrounded = true;
            a.vy = 0;
            a.y = Math.floor(a.y - 0.08) + 1.0;
          } else {
            a.isGrounded = false;
            a.vy -= 18.0 * dt;
            a.y += a.vy * dt;
            if (isSolidVoxel(world, a.x, a.y, a.z)) {
              a.y = Math.floor(a.y) + 1.0;
              a.vy = 0;
              a.isGrounded = true;
            }
          }
        }

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
