import { EdgesGeometry, ExtrudeGeometry, Group, LineBasicMaterial, LineSegments, Mesh, MeshStandardMaterial } from 'three';
import type { Font } from 'three/addons/loaders/FontLoader.js';

export class KanjiModels {
  private readonly cache = new Map<string, ExtrudeGeometry>();
  private readonly edges = new Map<string, EdgesGeometry>();
  private readonly outline = new LineBasicMaterial({ color: 0x302820, transparent: true, opacity: .38 });
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
      let edge = this.edges.get(char);
      if (!edge) { edge = new EdgesGeometry(geometry, 35); this.edges.set(char, edge); }
      mesh.add(new LineSegments(edge, this.outline));
      mesh.position.x = (index - (chars.length - 1) / 2) * 1.15;
      group.add(mesh);
    });
    return group;
  }
  dispose(): void {
    this.cache.forEach((geometry) => geometry.dispose());
    this.cache.clear();
    this.edges.forEach(geometry => geometry.dispose()); this.edges.clear();
    this.outline.dispose();
    this.material.dispose();
  }
}
