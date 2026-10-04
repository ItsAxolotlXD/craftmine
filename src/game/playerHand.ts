import * as THREE from 'three';
import { BlockType, BLOCK_DEFS } from './blocks';
import { TextureAtlas } from './textureAtlas';

export class PlayerHand {
  public group: THREE.Group;
  private camera: THREE.PerspectiveCamera;
  private armGroup: THREE.Group;
  private armMesh: THREE.Mesh;
  private sleeveMesh: THREE.Mesh;
  private blockMesh: THREE.Mesh;
  private toolMesh: THREE.Mesh;

  private isSwinging: boolean = false;
  private swingProgress: number = 0;
  private swingSpeed: number = 8.5; // Crisp, fast punch animation

  private bobTimer: number = 0;

  constructor(camera: THREE.PerspectiveCamera, atlas: TextureAtlas) {
    this.camera = camera;
    this.group = new THREE.Group();

    // The entire arm group
    this.armGroup = new THREE.Group();

    // 1. Steve Arm Skin (tan color #c28966) - renders on top so it never clips into blocks
    const armGeo = new THREE.BoxGeometry(0.16, 0.42, 0.16);
    const skinMat = new THREE.MeshLambertMaterial({
      color: 0xc28966,
      depthTest: false,
    });
    this.armMesh = new THREE.Mesh(armGeo, skinMat);
    this.armMesh.renderOrder = 999;
    this.armMesh.position.set(0, -0.15, 0);
    this.armGroup.add(this.armMesh);

    // 2. Steve Shirt Sleeve (teal cyan #008282)
    const sleeveGeo = new THREE.BoxGeometry(0.17, 0.16, 0.17);
    const sleeveMat = new THREE.MeshLambertMaterial({
      color: 0x008282,
      depthTest: false,
    });
    this.sleeveMesh = new THREE.Mesh(sleeveGeo, sleeveMat);
    this.sleeveMesh.renderOrder = 999;
    this.sleeveMesh.position.set(0, 0.05, 0);
    this.armGroup.add(this.sleeveMesh);

    // 3. Held Block (miniature textured 3D block in hand)
    const blockGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
    const blockMat = new THREE.MeshLambertMaterial({
      color: 0x5b8e3a,
      map: atlas.texture,
      transparent: true,
      depthTest: false,
    });
    this.blockMesh = new THREE.Mesh(blockGeo, blockMat);
    this.blockMesh.renderOrder = 1000;
    this.blockMesh.position.set(-0.06, -0.28, -0.12);
    this.armGroup.add(this.blockMesh);

    // 4. Tool Group for handheld tools
    this.toolMesh = new THREE.Mesh(new THREE.BufferGeometry()); // dummy for backwards compat
    this.createToolModels();

    // Prominent resting position in lower-right viewport
    this.armGroup.position.set(0.32, -0.26, -0.48);
    this.armGroup.rotation.set(-0.35, -0.38, 0.12);

    this.group.add(this.armGroup);
    this.camera.add(this.group);
  }

  private toolModels = new Map<BlockType, THREE.Group>();

  private createToolModels() {
    const handleMat = new THREE.MeshLambertMaterial({ color: 0x78350f, depthTest: false });
    const diaMat = new THREE.MeshLambertMaterial({ color: 0x38bdf8, depthTest: false });
    const steelMat = new THREE.MeshLambertMaterial({ color: 0xcbd5e1, depthTest: false });

    // 1. Sword
    const swordGroup = new THREE.Group();
    swordGroup.renderOrder = 1000;
    // Handle
    const swordHandle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.04), handleMat);
    swordHandle.position.set(0, -0.25, 0);
    swordGroup.add(swordHandle);
    // Guard
    const swordGuard = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.06), diaMat);
    swordGuard.position.set(0, -0.17, 0);
    swordGroup.add(swordGuard);
    // Blade
    const swordBlade = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.38, 0.02), diaMat);
    swordBlade.position.set(0, 0.03, 0);
    swordGroup.add(swordBlade);
    swordGroup.visible = false;
    this.armGroup.add(swordGroup);
    this.toolModels.set(BlockType.SWORD, swordGroup);

    // 2. Pickaxe
    const pickGroup = new THREE.Group();
    pickGroup.renderOrder = 1000;
    const pickHandle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.38, 0.04), handleMat);
    pickHandle.position.set(0, -0.14, 0);
    pickGroup.add(pickHandle);
    const pickHead = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.06, 0.05), diaMat);
    pickHead.position.set(0, 0.06, 0);
    pickGroup.add(pickHead);
    pickGroup.visible = false;
    this.armGroup.add(pickGroup);
    this.toolModels.set(BlockType.PICKAXE, pickGroup);

    // 3. Shovel
    const shovelGroup = new THREE.Group();
    shovelGroup.renderOrder = 1000;
    const shovelHandle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.36, 0.04), handleMat);
    shovelHandle.position.set(0, -0.14, 0);
    shovelGroup.add(shovelHandle);
    const shovelHead = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.03), diaMat);
    shovelHead.position.set(0, 0.07, 0);
    shovelGroup.add(shovelHead);
    shovelGroup.visible = false;
    this.armGroup.add(shovelGroup);
    this.toolModels.set(BlockType.SHOVEL, shovelGroup);

    // 4. Axe
    const axeGroup = new THREE.Group();
    axeGroup.renderOrder = 1000;
    const axeHandle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.38, 0.04), handleMat);
    axeHandle.position.set(0, -0.14, 0);
    axeGroup.add(axeHandle);
    const axeHead = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.05), diaMat);
    axeHead.position.set(0.06, 0.05, 0);
    axeGroup.add(axeHead);
    axeGroup.visible = false;
    this.armGroup.add(axeGroup);
    this.toolModels.set(BlockType.AXE, axeGroup);

    // 5. Hoe
    const hoeGroup = new THREE.Group();
    hoeGroup.renderOrder = 1000;
    const hoeHandle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.38, 0.04), handleMat);
    hoeHandle.position.set(0, -0.14, 0);
    hoeGroup.add(hoeHandle);
    const hoeHead = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.05), diaMat);
    hoeHead.position.set(0.05, 0.06, 0);
    hoeGroup.add(hoeHead);
    hoeGroup.visible = false;
    this.armGroup.add(hoeGroup);
    this.toolModels.set(BlockType.HOE, hoeGroup);

    // 6. Flint and Steel
    const fnsGroup = new THREE.Group();
    fnsGroup.renderOrder = 1000;
    const fnsMesh = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.16), steelMat);
    fnsMesh.position.set(-0.06, -0.28, -0.12);
    fnsGroup.add(fnsMesh);
    fnsGroup.visible = false;
    this.armGroup.add(fnsGroup);
    this.toolModels.set(BlockType.FLINT_AND_STEEL, fnsGroup);
  }

  // Trigger punch swing when clicking
  public triggerSwing() {
    this.isSwinging = true;
    this.swingProgress = 0;
  }

  // Update held block / item model
  public updateHeldBlock(type: BlockType) {
    // Hide all tools first
    for (const model of this.toolModels.values()) {
      model.visible = false;
    }

    const toolModel = this.toolModels.get(type);
    if (toolModel) {
      this.blockMesh.visible = false;
      toolModel.visible = true;
    } else {
      this.blockMesh.visible = true;
      const def = BLOCK_DEFS[type];
      if (def && this.blockMesh.material instanceof THREE.MeshLambertMaterial) {
        this.blockMesh.material.color.set(def.colorHex || '#ffffff');
      }
    }
  }

  public update(dt: number, isMoving: boolean) {
    // 1. Swing animation
    let swingAngleX = 0;
    let swingAngleY = 0;
    let swingPosZ = 0;

    if (this.isSwinging) {
      this.swingProgress += dt * this.swingSpeed;
      if (this.swingProgress >= 1.0) {
        this.isSwinging = false;
        this.swingProgress = 0;
      } else {
        // Fast energetic Minecraft punch motion
        const s = Math.sin(this.swingProgress * Math.PI);
        swingAngleX = s * 0.95;
        swingAngleY = s * 0.55;
        swingPosZ = s * -0.18;
      }
    }

    // 2. Walking / Flying Bobbing motion
    if (isMoving) {
      this.bobTimer += dt * 8.5;
    } else {
      this.bobTimer += dt * 1.8; // Gentle breathing idle
    }

    const bobY = Math.sin(this.bobTimer) * (isMoving ? 0.022 : 0.004);
    const bobX = Math.cos(this.bobTimer * 0.5) * (isMoving ? 0.018 : 0.003);

    // Apply combined transform
    this.armGroup.position.set(
      0.32 + bobX,
      -0.26 + bobY,
      -0.48 + swingPosZ
    );
    this.armGroup.rotation.set(
      -0.35 - swingAngleX,
      -0.38 + swingAngleY,
      0.12 + swingAngleX * 0.4
    );
  }

  public dispose() {
    this.camera.remove(this.group);
    this.armMesh.geometry.dispose();
    this.sleeveMesh.geometry.dispose();
    this.blockMesh.geometry.dispose();
    this.toolMesh.geometry.dispose();
  }
}
