import './styles.css';

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvasRootElement = document.querySelector<HTMLDivElement>('#canvas-root');

if (!canvasRootElement) {
  throw new Error('The 3D viewer root element is missing.');
}

const canvasRoot: HTMLDivElement = canvasRootElement;

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
controls.minDistance = 2;
controls.maxDistance = 9;
controls.maxPolarAngle = Math.PI * 0.9;

scene.add(new THREE.HemisphereLight(0xf4ead7, 0x29261f, 2.4));

const keyLight = new THREE.DirectionalLight(0xfff4df, 3.2);
keyLight.position.set(3, 4, 2);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x9db4aa, 1.8);
rimLight.position.set(-3, 1.5, -2);
scene.add(rimLight);

// A deliberately abstract stand-in keeps the foundation runnable before the
// heritage asset and its rights/provenance record enter the repository.
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

function resize(): void {
  const { clientWidth, clientHeight } = canvasRoot;

  camera.aspect = clientWidth / Math.max(clientHeight, 1);
  camera.updateProjectionMatrix();
  renderer.setSize(clientWidth, clientHeight, false);
}

function render(timestamp: DOMHighResTimeStamp): void {
  if (!reducedMotion) {
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
  placeholder.geometry.dispose();
  (placeholder.material as THREE.Material).dispose();
  ground.geometry.dispose();
  (ground.material as THREE.Material).dispose();
  renderer.dispose();
});
