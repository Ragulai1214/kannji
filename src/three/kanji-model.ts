import { ExtrudeGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import type { Font } from 'three/addons/loaders/FontLoader.js';

export class KanjiModels {
  private readonly cache = new Map<string, ExtrudeGeometry>();
  private readonly material = new MeshStandardMaterial({ color: 0x302c28, roughness: 0.62, metalness: 0.12 });
  constructor(private readonly font: Font) {}
  create(text: string): Group {
    const group = new Group();
    const chars = [...text];
    chars.forEach((char, index) => {
      if (!this.font.data.glyphs[char]) throw new Error(`未対応の文字：${char}`);
      let geometry = this.cache.get(char);
      if (!geometry) {
        geometry = new ExtrudeGeometry(this.font.generateShapes(char, 1), {
          depth: 0.16, bevelEnabled: false, curveSegments: 12,
        });
        geometry.center();
        this.cache.set(char, geometry);
      }
      const mesh = new Mesh(geometry, this.material);
      mesh.position.x = (index - (chars.length - 1) / 2) * 1.15;
      group.add(mesh);
    });
    return group;
  }
  dispose(): void {
    this.cache.forEach((geometry) => geometry.dispose());
    this.cache.clear();
    this.material.dispose();
  }
}
