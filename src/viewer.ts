import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { computeNormalizationTransform } from './annotation-utils';
import type { Annotation, CameraPose, Vec3Tuple } from './heritage-data';

export type ViewerState = 'loading' | 'ready' | 'error';

interface ViewerOptions {
  canvasRoot: HTMLDivElement;
  markerLayer: HTMLDivElement;
  annotations: readonly Annotation[];
  modelUrl: string;
  reducedMotion: boolean;
  onStatus: (message: string, state: ViewerState) => void;
  onAnnotationSelect: (id: string) => void;
}

interface CameraAnimation {
  startedAt: number;
  duration: number;
  startEye: THREE.Vector3;
  startTarget: THREE.Vector3;
  endEye: THREE.Vector3;
  endTarget: THREE.Vector3;
}

interface MarkerRecord {
  annotation: Annotation;
  element: HTMLButtonElement;
  worldPosition: THREE.Vector3;
}

const DEFAULT_CAMERA_OFFSET: Vec3Tuple = [-8.948471, 3.57456, 1.041276];

function tupleToVector(tuple: Vec3Tuple): THREE.Vector3 {
  return new THREE.Vector3(tuple[0], tuple[1], tuple[2]);
}

function disposeMaterial(material: THREE.Material): void {
  for (const value of Object.values(material)) {
    if (value instanceof THREE.Texture) {
      value.dispose();
    }
  }
  material.dispose();
}

function disposeObject(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    if (Array.isArray(object.material)) {
      object.material.forEach(disposeMaterial);
    } else {
      disposeMaterial(object.material);
    }
  });
}

export class HeritageViewer {
  private readonly canvasRoot: HTMLDivElement;
  private readonly markerLayer: HTMLDivElement;
  private readonly annotations: readonly Annotation[];
  private readonly modelUrl: string;
  private readonly reducedMotion: boolean;
  private readonly onStatus: ViewerOptions['onStatus'];
  private readonly onAnnotationSelect: ViewerOptions['onAnnotationSelect'];
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100);
  private readonly renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  private readonly controls: OrbitControls;
  private readonly resizeObserver: ResizeObserver;
  private readonly raycaster = new THREE.Raycaster();
  private readonly markerRecords = new Map<string, MarkerRecord>();
  private readonly cameraDirection = new THREE.Vector3();
  private readonly rayDirection = new THREE.Vector3();
  private readonly projectedPoint = new THREE.Vector3();
  private readonly placeholder: THREE.Mesh;
  private readonly ground: THREE.Mesh;
  private loadedModel: THREE.Object3D | null = null;
  private activeAnnotationId: string | null = null;
  private cameraAnimation: CameraAnimation | null = null;
  private defaultPose: CameraPose | null = null;
  private disposed = false;

  constructor(options: ViewerOptions) {
    this.canvasRoot = options.canvasRoot;
    this.markerLayer = options.markerLayer;
    this.annotations = options.annotations;
    this.modelUrl = options.modelUrl;
    this.reducedMotion = options.reducedMotion;
    this.onStatus = options.onStatus;
    this.onAnnotationSelect = options.onAnnotationSelect;

    this.scene.background = new THREE.Color(0x181712);
    this.scene.fog = new THREE.Fog(0x181712, 6, 14);
    this.camera.position.set(3.4, 2.2, 4.6);

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.canvasRoot.append(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0.35, 0);
    this.controls.maxPolarAngle = Math.PI * 0.9;
    this.controls.addEventListener('start', () => {
      this.cameraAnimation = null;
    });

    this.scene.add(new THREE.HemisphereLight(0xf4ead7, 0x29261f, 2.4));
    const keyLight = new THREE.DirectionalLight(0xfff4df, 3.2);
    keyLight.position.set(3, 4, 2);
    this.scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x9db4aa, 1.8);
    rimLight.position.set(-3, 1.5, -2);
    this.scene.add(rimLight);

    this.placeholder = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.82, 2),
      new THREE.MeshStandardMaterial({
        color: 0x9a6847,
        metalness: 0,
        roughness: 0.82,
        wireframe: true,
      }),
    );
    this.placeholder.position.y = 0.45;
    this.placeholder.rotation.set(-0.2, 0.15, 0.08);
    this.scene.add(this.placeholder);

    this.ground = new THREE.Mesh(
      new THREE.CircleGeometry(2.4, 64),
      new THREE.MeshBasicMaterial({ color: 0x222019, transparent: true, opacity: 0.68 }),
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -0.4;
    this.scene.add(this.ground);

    this.createMarkers();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.canvasRoot);
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.addEventListener(
      'webglcontextrestored',
      this.handleContextRestored,
    );
    this.renderer.setAnimationLoop((timestamp) => this.render(timestamp));
    this.resize();
  }

  async load(): Promise<void> {
    this.onStatus('Loading model…', 'loading');

    try {
      const gltf = await new GLTFLoader().loadAsync(
        this.modelUrl,
        ({ loaded, total }) => {
          if (total > 0) {
            const percentage = Math.min(Math.round((loaded / total) * 100), 100);
            this.onStatus(`Loading model · ${percentage}%`, 'loading');
          }
        },
      );

      if (this.disposed) {
        disposeObject(gltf.scene);
        return;
      }

      this.loadedModel = gltf.scene;
      this.frameModel(this.loadedModel);
      this.scene.add(this.loadedModel);
      this.updateMarkerWorldPositions();

      this.scene.remove(this.placeholder);
      disposeObject(this.placeholder);
      this.onStatus('Model ready · 67,998 triangles', 'ready');
    } catch (error) {
      this.loadedModel = null;
      this.onStatus('Model could not be loaded', 'error');
      console.error('Failed to load the antler-pick model.', error);
      throw error;
    }
  }

  setActiveAnnotation(id: string | null, moveCamera = true): void {
    this.activeAnnotationId = id;
    for (const [markerId, marker] of this.markerRecords) {
      const isActive = markerId === id;
      marker.element.dataset.active = String(isActive);
      marker.element.setAttribute('aria-pressed', String(isActive));
    }

    if (!id || !moveCamera || !this.loadedModel) return;
    const annotation = this.annotations.find((candidate) => candidate.id === id);
    if (annotation) this.moveToPose(annotation.camera);
  }

  resetView(): void {
    if (this.defaultPose) this.moveToPose(this.defaultPose);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.renderer.domElement.removeEventListener(
      'webglcontextlost',
      this.handleContextLost,
    );
    this.renderer.domElement.removeEventListener(
      'webglcontextrestored',
      this.handleContextRestored,
    );
    this.renderer.setAnimationLoop(null);
    if (this.placeholder.parent) disposeObject(this.placeholder);
    if (this.loadedModel) disposeObject(this.loadedModel);
    this.ground.geometry.dispose();
    (this.ground.material as THREE.Material).dispose();
    this.renderer.dispose();
  }

  private readonly handleContextLost = (event: Event): void => {
    event.preventDefault();
    this.onStatus('3D context lost · waiting to recover', 'error');
  };

  private readonly handleContextRestored = (): void => {
    this.onStatus('3D context restored', 'ready');
  };

  private createMarkers(): void {
    for (const annotation of this.annotations) {
      const marker = document.createElement('button');
      marker.type = 'button';
      marker.className = 'annotation-marker';
      marker.dataset.annotationId = annotation.id;
      marker.dataset.annotationType = annotation.type;
      marker.dataset.placementOrigin = annotation.anchor.placementOrigin;
      marker.dataset.visible = 'false';
      marker.dataset.active = 'false';
      const placementLabel =
        annotation.anchor.placementOrigin === 'editorial'
          ? 'Editorial placement'
          : 'Source-derived placement';
      marker.setAttribute(
        'aria-label',
        `Annotation ${annotation.index}: ${annotation.title}. ${placementLabel}.`,
      );
      marker.setAttribute('aria-pressed', 'false');
      marker.textContent = String(annotation.index);
      marker.addEventListener('click', () => this.onAnnotationSelect(annotation.id));
      this.markerLayer.append(marker);
      this.markerRecords.set(annotation.id, {
        annotation,
        element: marker,
        worldPosition: new THREE.Vector3(),
      });
    }
  }

  private frameModel(model: THREE.Object3D): void {
    const sourceBounds = new THREE.Box3().setFromObject(model);
    const sourceCentre = sourceBounds.getCenter(new THREE.Vector3());
    const transform = computeNormalizationTransform({
      min: sourceBounds.min.toArray() as unknown as Vec3Tuple,
      max: sourceBounds.max.toArray() as unknown as Vec3Tuple,
    });

    model.scale.multiplyScalar(transform.scale);
    model.position.add(tupleToVector(transform.translation));
    model.updateMatrixWorld(true);

    const framedBounds = new THREE.Box3().setFromObject(model);
    const framedSize = framedBounds.getSize(new THREE.Vector3());
    const radius = framedSize.length() * 0.5;

    this.controls.minDistance = Math.max(radius * 0.55, 0.5);
    this.controls.maxDistance = Math.max(radius * 5, 8);

    this.defaultPose = {
      eye: sourceCentre
        .clone()
        .add(tupleToVector(DEFAULT_CAMERA_OFFSET))
        .toArray() as unknown as Vec3Tuple,
      target: sourceCentre.toArray() as unknown as Vec3Tuple,
    };
    this.camera.position
      .copy(tupleToVector(this.defaultPose.eye))
      .applyMatrix4(model.matrixWorld);
    this.controls.target
      .copy(tupleToVector(this.defaultPose.target))
      .applyMatrix4(model.matrixWorld);

    const distance = this.camera.position.distanceTo(this.controls.target);
    this.camera.near = Math.max(distance / 100, 0.01);
    this.camera.far = Math.max(distance * 20, 100);
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  private updateMarkerWorldPositions(): void {
    if (!this.loadedModel) return;
    this.loadedModel.updateMatrixWorld(true);
    for (const marker of this.markerRecords.values()) {
      marker.worldPosition
        .copy(tupleToVector(marker.annotation.anchor.displayPosition))
        .applyMatrix4(this.loadedModel.matrixWorld);
    }
  }

  private moveToPose(pose: CameraPose): void {
    if (!this.loadedModel) return;
    const endEye = tupleToVector(pose.eye).applyMatrix4(this.loadedModel.matrixWorld);
    const endTarget = tupleToVector(pose.target).applyMatrix4(
      this.loadedModel.matrixWorld,
    );

    if (this.reducedMotion) {
      this.camera.position.copy(endEye);
      this.controls.target.copy(endTarget);
      this.controls.update();
      return;
    }

    this.cameraAnimation = {
      startedAt: performance.now(),
      duration: 780,
      startEye: this.camera.position.clone(),
      startTarget: this.controls.target.clone(),
      endEye,
      endTarget,
    };
  }

  private resize(): void {
    const { clientWidth, clientHeight } = this.canvasRoot;
    this.camera.aspect = clientWidth / Math.max(clientHeight, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight, false);
  }

  private updateCameraAnimation(timestamp: number): void {
    if (!this.cameraAnimation) return;
    const elapsed = timestamp - this.cameraAnimation.startedAt;
    const progress = THREE.MathUtils.clamp(elapsed / this.cameraAnimation.duration, 0, 1);
    const eased = progress * progress * (3 - 2 * progress);
    this.camera.position.lerpVectors(
      this.cameraAnimation.startEye,
      this.cameraAnimation.endEye,
      eased,
    );
    this.controls.target.lerpVectors(
      this.cameraAnimation.startTarget,
      this.cameraAnimation.endTarget,
      eased,
    );
    if (progress === 1) this.cameraAnimation = null;
  }

  private updateMarkers(): void {
    if (!this.loadedModel) return;
    const width = this.canvasRoot.clientWidth;
    const height = this.canvasRoot.clientHeight;
    this.camera.getWorldDirection(this.cameraDirection);

    for (const marker of this.markerRecords.values()) {
      this.rayDirection.copy(marker.worldPosition).sub(this.camera.position);
      const distance = this.rayDirection.length();
      const isBehind = this.rayDirection.dot(this.cameraDirection) <= 0;
      this.projectedPoint.copy(marker.worldPosition).project(this.camera);
      const inFrustum =
        !isBehind &&
        this.projectedPoint.z >= -1 &&
        this.projectedPoint.z <= 1 &&
        Math.abs(this.projectedPoint.x) <= 1.08 &&
        Math.abs(this.projectedPoint.y) <= 1.08;

      let occluded = false;
      if (inFrustum && marker.annotation.id !== this.activeAnnotationId) {
        this.raycaster.set(this.camera.position, this.rayDirection.normalize());
        const firstHit = this.raycaster.intersectObject(this.loadedModel, true)[0];
        occluded = Boolean(firstHit && firstHit.distance < distance - 0.14);
      }

      const visible = inFrustum && !occluded;
      marker.element.dataset.visible = String(visible);
      if (visible) {
        const x = (this.projectedPoint.x * 0.5 + 0.5) * width;
        const y = (-this.projectedPoint.y * 0.5 + 0.5) * height;
        marker.element.style.setProperty('--marker-x', `${x.toFixed(1)}px`);
        marker.element.style.setProperty('--marker-y', `${y.toFixed(1)}px`);
      }
    }
  }

  private render(timestamp: number): void {
    if (!this.reducedMotion && this.placeholder.parent) {
      this.placeholder.rotation.y = timestamp * 0.00008;
    }
    this.updateCameraAnimation(timestamp);
    this.controls.update();
    // Keep HTML markers on the exact camera matrix used by this frame. Without
    // this explicit update, projection can use the previous frame's inverse
    // matrix while OrbitControls is moving or damping the camera.
    this.camera.updateMatrixWorld();
    this.updateMarkers();
    this.renderer.render(this.scene, this.camera);
  }
}
