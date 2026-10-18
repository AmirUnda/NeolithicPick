import './styles.css';

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvasRootElement = document.querySelector<HTMLDivElement>('#canvas-root');
const statusElement = document.querySelector<HTMLDivElement>('#viewer-status');
const statusTextElement = document.querySelector<HTMLSpanElement>('#viewer-status-text');

if (!canvasRootElement || !statusElement || !statusTextElement) {
  throw new Error('A required viewer element is missing.');
}

const canvasRoot: HTMLDivElement = canvasRootElement;
const viewerStatus: HTMLDivElement = statusElement;
const viewerStatusText: HTMLSpanElement = statusTextElement;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x181712);
scene.fog = new THREE.Fog(0x181712, 6, 14);

const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100);
camera.position.set(3.4, 2.2, 4.6);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
canvasRoot.append(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0.35, 0);
controls.maxPolarAngle = Math.PI * 0.9;

scene.add(new THREE.HemisphereLight(0xf4ead7, 0x29261f, 2.4));

const keyLight = new THREE.DirectionalLight(0xfff4df, 3.2);
keyLight.position.set(3, 4, 2);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x9db4aa, 1.8);
rimLight.position.set(-3, 1.5, -2);
scene.add(rimLight);

const placeholder = new THREE.Mesh(
  new THREE.IcosahedronGeometry(0.82, 2),
  new THREE.MeshStandardMaterial({
    color: 0x9a6847,
    metalness: 0,
    roughness: 0.82,
    wireframe: true,
  }),
);
placeholder.position.y = 0.45;
placeholder.rotation.set(-0.2, 0.15, 0.08);
scene.add(placeholder);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(2.4, 64),
  new THREE.MeshBasicMaterial({ color: 0x222019, transparent: true, opacity: 0.8 }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.4;
scene.add(ground);

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let loadedModel: THREE.Object3D | null = null;

function updateStatus(
  message: string,
  state: 'loading' | 'ready' | 'error' = 'loading',
): void {
  viewerStatus.dataset.state = state;
  viewerStatusText.textContent = message;
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
    if (!(object instanceof THREE.Mesh)) {
      return;
    }

    object.geometry.dispose();

    if (Array.isArray(object.material)) {
      object.material.forEach(disposeMaterial);
    } else {
      disposeMaterial(object.material);
    }
  });
}

function frameModel(model: THREE.Object3D): void {
  const sourceBounds = new THREE.Box3().setFromObject(model);
  const sourceSize = sourceBounds.getSize(new THREE.Vector3());
  const longestSide = Math.max(sourceSize.x, sourceSize.y, sourceSize.z);

  if (!Number.isFinite(longestSide) || longestSide <= 0) {
    throw new Error('The model has invalid spatial bounds.');
  }

  model.scale.multiplyScalar(3.4 / longestSide);
  model.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(model);
  const centre = bounds.getCenter(new THREE.Vector3());
  model.position.x -= centre.x;
  model.position.z -= centre.z;
  model.position.y += ground.position.y - bounds.min.y + 0.02;
  model.updateMatrixWorld(true);

  const framedBounds = new THREE.Box3().setFromObject(model);
  const framedSize = framedBounds.getSize(new THREE.Vector3());
  const framedCentre = framedBounds.getCenter(new THREE.Vector3());
  const radius = framedSize.length() * 0.5;

  controls.target.copy(framedCentre);
  controls.minDistance = Math.max(radius * 0.55, 0.5);
  controls.maxDistance = Math.max(radius * 5, 8);

  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const distance = radius / Math.sin(verticalFov * 0.5);
  camera.near = Math.max(distance / 100, 0.01);
  camera.far = Math.max(distance * 20, 100);
  camera.position
    .set(0.72, 0.42, 1)
    .normalize()
    .multiplyScalar(distance * 1.08)
    .add(framedCentre);
  camera.updateProjectionMatrix();
  controls.update();
}

const modelUrl = `${import.meta.env.BASE_URL}models/antler_pick/scene.gltf`;
const loader = new GLTFLoader();

loader.load(
  modelUrl,
  (gltf) => {
    try {
      loadedModel = gltf.scene;
      frameModel(loadedModel);
      scene.add(loadedModel);

      scene.remove(placeholder);
      disposeObject(placeholder);
      updateStatus('Model loaded · 67,998 triangles', 'ready');
    } catch (error) {
      loadedModel = null;
      updateStatus('Model could not be prepared', 'error');
      console.error('Failed to prepare the antler-pick model.', error);
    }
  },
  ({ loaded, total }) => {
    if (total > 0) {
      const percentage = Math.min(Math.round((loaded / total) * 100), 100);
      updateStatus(`Loading model · ${percentage}%`);
    } else {
      updateStatus('Loading model…');
    }
  },
  (error) => {
    updateStatus('Model could not be loaded', 'error');
    console.error('Failed to load the antler-pick model.', error);
  },
);

function resize(): void {
  const { clientWidth, clientHeight } = canvasRoot;

  camera.aspect = clientWidth / Math.max(clientHeight, 1);
  camera.updateProjectionMatrix();
  renderer.setSize(clientWidth, clientHeight, false);
}

function render(timestamp: DOMHighResTimeStamp): void {
  if (!reducedMotion && placeholder.parent) {
    placeholder.rotation.y = timestamp * 0.00008;
  }

  controls.update();
  renderer.render(scene, camera);
}

const resizeObserver = new ResizeObserver(resize);
resizeObserver.observe(canvasRoot);
renderer.setAnimationLoop(render);

window.addEventListener('pagehide', () => {
  resizeObserver.disconnect();
  controls.dispose();
  if (placeholder.parent) {
    disposeObject(placeholder);
  }
  if (loadedModel) {
    disposeObject(loadedModel);
  }
  ground.geometry.dispose();
  (ground.material as THREE.Material).dispose();
  renderer.dispose();
});
