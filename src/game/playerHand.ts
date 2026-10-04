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

    // 4. Flint and Steel tool model (metallic curved plate + flint striker)
    const toolGeo = new THREE.BoxGeometry(0.04, 0.22, 0.16);
    const toolMat = new THREE.MeshLambertMaterial({
      color: 0x9e9e9e,
      depthTest: false,
    });
    this.toolMesh = new THREE.Mesh(toolGeo, toolMat);
    this.toolMesh.renderOrder = 1000;
    this.toolMesh.position.set(-0.06, -0.28, -0.12);
    this.toolMesh.visible = false;
    this.armGroup.add(this.toolMesh);

    // Prominent resting position in lower-right viewport
    this.armGroup.position.set(0.32, -0.26, -0.48);
    this.armGroup.rotation.set(-0.35, -0.38, 0.12);

    this.group.add(this.armGroup);
    this.camera.add(this.group);
  }

  // Trigger punch swing when clicking
  public triggerSwing() {
    this.isSwinging = true;
    this.swingProgress = 0;
  }

  // Update held block / item model
  public updateHeldBlock(type: BlockType) {
    if (type === BlockType.FLINT_AND_STEEL) {
      this.blockMesh.visible = false;
      this.toolMesh.visible = true;
    } else {
      this.blockMesh.visible = true;
      this.toolMesh.visible = false;
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
