import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Vector3 } from 'three';
import { createBattleEffects } from '../src/three/battle-effects.ts';
import { createAction } from '../src/game/action.ts';

const stats={hp:1000,atk:100,def:100};
test('independent red/yellow hit bursts spread, freeze with battle time, expire and clean up',()=>{
  const scene=new Scene(),effects=createBattleEffects(scene,false),state=createAction(stats,stats);
  effects.hit('player',state);effects.hit('enemy',state);state.time=.2;effects.update(state);
  const bursts=scene.children.filter(o=>o.isPoints&&o.visible);assert.equal(bursts.length,2);
  assert.notEqual(bursts[0].position.z,bursts[1].position.z);
  const colors=bursts[0].geometry.attributes.color;
  assert.ok(colors.getX(0)>colors.getY(0));assert.ok(colors.getY(1)>colors.getY(0));
  const positions=Array.from(bursts[0].geometry.attributes.position.array);
  assert.ok(positions.some(v=>Math.abs(v)>.1));effects.update(state);
  assert.deepEqual(Array.from(bursts[0].geometry.attributes.position.array),positions);
  state.time=.6;effects.update(state);assert.ok(bursts.every(b=>!b.visible));effects.dispose();assert.equal(scene.children.length,0);
});
test('tornado shares frozen dodge axis, follows actor, disappears after dodge and honors reduced motion',()=>{
  for(const axis of ['x','y']){
    const scene=new Scene(),effects=createBattleEffects(scene,false),state=createAction(stats,stats);
    const actor=state.actors.player;actor.mode='dodge';actor.age=.2;actor.position={x:2,z:3};
    effects.dodge('player',{axis,sign:1,angle:Math.PI/2});effects.update(state);
    const tornado=scene.children.find(o=>o.isGroup&&o.visible);assert.ok(tornado);assert.equal(tornado.position.x,2);assert.equal(tornado.position.z,3);
    const pole=new Vector3(0,1,0).applyQuaternion(tornado.quaternion);
    if(axis==='x'){assert.ok(Math.abs(pole.z+1)<1e-8);assert.ok(Math.abs(pole.y)<1e-8);}else assert.ok(Math.abs(pole.y-1)<1e-8);
    const rings=tornado.children[0].children.filter(o=>o.isMesh&&o.visible);
    if(axis==='x'){
      assert.equal(rings.length,5);
      assert.ok(rings[2].scale.x>rings[1].scale.x&&rings[1].scale.x>rings[0].scale.x);
      assert.ok(Math.abs(rings[0].scale.x-rings[4].scale.x)<1e-8);
      assert.ok(Math.abs(rings[1].scale.x-rings[3].scale.x)<1e-8);
      const spiral=tornado.children[0].children.find(o=>o.isLine).geometry.attributes.position;
      const radius=i=>Math.hypot(spiral.getX(i),spiral.getZ(i));
      assert.ok(radius(90)>radius(45)&&radius(45)>radius(0));assert.ok(Math.abs(radius(0)-radius(180))<1e-6);
    }else{
      assert.equal(rings.length,4);assert.ok(rings.every((r,i)=>!i||r.scale.x>rings[i-1].scale.x));
    }
    actor.mode='recovery';effects.update(state);assert.equal(tornado.visible,false);effects.dispose();
  }
  const scene=new Scene(),effects=createBattleEffects(scene,true),state=createAction(stats,stats);state.actors.player.mode='dodge';state.actors.player.age=.2;
  effects.hit('player',state);effects.update(state);assert.ok(scene.children.every(o=>!o.visible));effects.dispose();
});
