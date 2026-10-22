import { AmbientLight, Color, DirectionalLight, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { KanjiModels } from './kanji-model';

export async function startPrototype(host: HTMLElement, status: HTMLElement): Promise<() => void> {
  const font = await new FontLoader().loadAsync(`${import.meta.env.BASE_URL}fonts/kannji-outline.typeface.json`);
  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.setAttribute('aria-label', '田・目・龍・数字1の立体モデル');
  host.append(renderer.domElement);
  const scene = new Scene();
  scene.background = new Color(0xeee6d4);
  const camera = new PerspectiveCamera(35, 1, 0.1, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 3;
  controls.maxDistance = 25;
  const light = new DirectionalLight(0xfff4dc, 3);
  light.position.set(-3, 4, 6);
  scene.add(light, new AmbientLight(0xffffff, 1.6));
  const models = new KanjiModels(font);
  scene.add(models.create('田目龍1'));
  let front = false;
  const frame = (): void => {
    const width = host.clientWidth;
    const height = host.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const distance = Math.max(5, 2.8 / (Math.tan(35 * Math.PI / 360) * camera.aspect));
    camera.position.set(front ? 0 : 0.6, front ? 0 : 0.5, distance);
    controls.target.set(0, 0, 0);
    controls.update();
  };
  const observer = new ResizeObserver(frame);
  observer.observe(host);
  frame();
  const reset = document.querySelector<HTMLButtonElement>('#reset-view')!;
  const angle = document.querySelector<HTMLButtonElement>('#angle-view')!;
  const resetView = (): void => { front = true; frame(); };
  const angleView = (): void => { front = false; frame(); };
  reset.addEventListener('click', resetView);
  angle.addEventListener('click', angleView);
  renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
  status.textContent = '3D表示完了：田の穴4つ・目の穴3つと、横から見た厚みを確認してください。';
  return () => {
    observer.disconnect();
    reset.removeEventListener('click', resetView);
    angle.removeEventListener('click', angleView);
    renderer.setAnimationLoop(null);
    controls.dispose();
    models.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}

