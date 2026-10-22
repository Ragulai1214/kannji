import { AmbientLight, Color, DirectionalLight, Mesh, MeshStandardMaterial, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { KanjiModels } from './kanji-model';
import { RARITIES } from '../data/rarities.ts';
import type { Battle } from '../screens/result.ts';
import type { ScoreStep } from '../game/types.ts';

export type Side = 'player' | 'enemy';
export interface BattleVisual {
  pulse(side: Side, step: ScoreStep): void;
  finish(outcome: Battle['outcome']): void;
  dispose(): void;
}

export async function createBattleScene(host: HTMLElement, battle: Battle, reduced: boolean, signal: AbortSignal): Promise<BattleVisual | undefined> {
  const response = await fetch(`${import.meta.env.BASE_URL}fonts/kannji-outline.typeface.json`, { signal });
  if (!response.ok) throw new Error(`フォント読み込み失敗: ${response.status}`);
  const font = new FontLoader().parse(await response.json());
  if (signal.aborted) return;
  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.domElement.setAttribute('aria-label', '左上の敵と右下の自分の四文字立体モデル');
  host.append(renderer.domElement);
  const scene = new Scene();
  const camera = new PerspectiveCamera(35, 1, .1, 100);
  const light = new DirectionalLight(0xfff4dd, 3);
  light.position.set(-3, 4, 6);
  scene.add(light, new AmbientLight(0xffffff, 1.7));
  const models = new KanjiModels(font);
  const groups = { player: models.create(battle.player.characters.map(c => c.char).join('')), enemy: models.create(battle.enemy.characters.map(c => c.char).join('')) };
  const ownedMaterials: MeshStandardMaterial[] = [];
  for (const side of ['player', 'enemy'] as const) {
    groups[side].scale.setScalar(.8);
    groups[side].children.forEach(child => {
      const mesh = child as Mesh;
      const material = (mesh.material as MeshStandardMaterial).clone();
      material.color.set(side === 'player' ? 0x332d25 : 0x59382f);
      mesh.material = material;
      ownedMaterials.push(material);
    });
    scene.add(groups[side]);
  }
  const pulses = { player: { time: -10000, index: -1, rainbow: false }, enemy: { time: -10000, index: -1, rainbow: false } };
  let finishTime = 0;
  let outcome: Battle['outcome'] | undefined;
  let compact = false;
  const resize = (): void => {
    const width = host.clientWidth, height = host.clientHeight;
    compact = width < 600;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.z = Math.max(7, 3.3 / (Math.tan(35 * Math.PI / 360) * camera.aspect));
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host); resize();
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    for (const side of ['player', 'enemy'] as const) {
      const group = groups[side];
      const direction = side === 'player' ? 1 : -1;
      const pulse = pulses[side];
      const strength = reduced ? 0 : Math.max(0, 1 - (now - pulse.time) / 500);
      group.position.set(direction * .2, -direction * (compact ? 1.3 : .65) + (reduced ? 0 : Math.sin(now / 800 + direction) * .035), 0);
      group.rotation.set(.05, -.06 * direction, Math.sin(now / 45) * strength * .035);
      group.children.forEach((child, index) => {
        const mesh = child as Mesh;
        const material = mesh.material as MeshStandardMaterial;
        const active = index === pulse.index || pulse.index === -1;
        if (active && pulse.rainbow && strength > 0) material.emissive.setHSL((now / 700 + index * .15) % 1, .9, .5);
        material.emissiveIntensity = active ? strength * .7 : 0;
      });
      if (outcome && !reduced) {
        const t = Math.min(1, (now - finishTime) / 1100);
        if (outcome === 'draw') group.rotation.z = direction * Math.sin(t * Math.PI * 2) * .08;
        else {
          const winner = (outcome === 'win' ? 'player' : 'enemy') === side;
          if (winner) { group.position.x -= direction * Math.sin(Math.min(1, t * 3) * Math.PI) * .8; }
          else { const fly = Math.max(0, (t - .25) / .75); group.position.x += direction * fly * 12; group.position.y += fly * 3; group.rotation.z += direction * fly * 2; }
        }
      }
    }
    renderer.render(scene, camera);
  });
  let disposed = false;
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    observer.disconnect(); renderer.setAnimationLoop(null);
    ownedMaterials.forEach(material => material.dispose());
    models.dispose(); renderer.dispose(); renderer.domElement.remove();
    signal.removeEventListener('abort', dispose);
  };
  signal.addEventListener('abort', dispose, { once: true });
  return {
    pulse(side, step) {
      const pulse = pulses[side];
      pulse.time = performance.now(); pulse.index = step.index ?? -1; pulse.rainbow = step.rarity === 'UR';
      const rarity = RARITIES.find(entry => entry.id === step.rarity);
      groups[side].children.forEach((child, index) => {
        if (pulse.index !== -1 && index !== pulse.index) return;
        const material = (child as Mesh).material as MeshStandardMaterial;
        material.emissive.copy(new Color(rarity && rarity.id !== 'UR' ? rarity.color : '#c08e51'));
        if (rarity && rarity.id !== 'UR') material.color.set(rarity.color);
      });
    },
    finish(result) { outcome = result; finishTime = performance.now(); },
    dispose,
  };
}
