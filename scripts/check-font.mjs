import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { ExtrudeGeometry, Mesh, MeshBasicMaterial, Raycaster, Vector3, DoubleSide } from 'three';
const data = JSON.parse(readFileSync(new URL('../public/fonts/kannji-outline.typeface.json', import.meta.url), 'utf8'));
const font = new FontLoader().parse(data);
assert.equal(Object.keys(data.glyphs).length, 251);
for (const char of Object.keys(data.glyphs)) {
  const geometry = new ExtrudeGeometry(font.generateShapes(char, 1), { depth: .16, bevelEnabled: false, curveSegments: 12 });
  assert.ok(geometry.attributes.position.count > 0, char);
  assert.ok(geometry.attributes.position.array.every(Number.isFinite), char);
  if (char === '田' || char === '目') {
    // This font builds these glyphs from separate strokes. Test the actual
    // empty spaces in the triangulated mesh, rather than Shape.holes counts.
    const material = new MeshBasicMaterial({ side: DoubleSide });
    const mesh = new Mesh(geometry, material);
    mesh.updateMatrixWorld();
    const spaces = char === '田' ? [[.3,.6],[.65,.6],[.3,.2],[.65,.2]] : [[.5,.65],[.5,.4],[.5,.15]];
    for (const [x,y] of spaces) {
      const ray = new Raycaster(new Vector3(x, y, 1), new Vector3(0, 0, -1));
      assert.equal(ray.intersectObject(mesh).length, 0, `${char}: blocked space ${x},${y}`);
    }
    const stroke = new Raycaster(new Vector3(char === '田' ? .18 : .25, .6, 1), new Vector3(0,0,-1));
    assert.ok(stroke.intersectObject(mesh).length > 0, `${char}: missing stroke`);
    material.dispose();
  }
  geometry.dispose();
}
console.log('PASS: 251 finite extruded glyphs; 田: 4 open spaces, 目: 3 open spaces, solid strokes present.');
