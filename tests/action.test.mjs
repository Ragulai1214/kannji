import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTION } from '../src/data/action.ts';
import { createAction, stepAction, invulnerable } from '../src/game/action.ts';
import { convertStats } from '../src/game/combat.ts';
import { createBattle } from '../src/game/battle.ts';
import { scoreTeam } from '../src/game/scoring.ts';
import { KANJI } from '../src/data/kanji.ts';
const stats={hp:1000,atk:100,def:50};
const idle={x:0,z:0,attack:false,dodge:false};
const frame=1/60;
function advance(state,input,seconds,ai=false){const events=[];for(let i=0;i<Math.round(seconds/frame);i++)events.push(...stepAction(state,input,frame,ai));return events;}
function close(state){state.actors.player.position={x:0,z:1};state.actors.enemy.position={x:0,z:-1};}
test('action does not have a predetermined winner; background is four unique catalog characters',()=>{
  const battle=createBattle(Array(4).fill(KANJI[0]),()=>0);
  assert.equal(battle.result,undefined);assert.equal(battle.background.length,4);
  assert.equal(new Set(battle.background.map(c=>c.char)).size,4);
  assert.ok(battle.background.every(c=>KANJI.some(k=>k.char===c.char)));
  assert.equal(KANJI.length,250);
});
test('movement is normalized and stays within the circular arena',()=>{
  const straight=createAction(stats,stats),diagonal=createAction(stats,stats);
  straight.actors.player.position={x:0,z:0};diagonal.actors.player.position={x:0,z:0};
  advance(straight,{...idle,x:1},.5);advance(diagonal,{...idle,x:1,z:1},.5);
  const a=straight.actors.player.position,b=diagonal.actors.player.position;
  assert.ok(Math.abs(Math.hypot(a.x,a.z)-Math.hypot(b.x,b.z))<1e-8);
  advance(diagonal,{...idle,x:1,z:1},20);
  assert.ok(Math.hypot(...Object.values(diagonal.actors.player.position))<=ACTION.radius-ACTION.bodyRadius+1e-8);
  assert.throws(()=>stepAction(diagonal,idle,0));assert.throws(()=>stepAction(diagonal,idle,NaN));
});
test('attack has telegraph, can miss, and deals damage only once per swing',()=>{
  const distant=createAction(stats,stats);
  stepAction(distant,{...idle,attack:true},frame,false);
  assert.equal(distant.actors.player.mode,'windup');
  advance(distant,idle,1);assert.equal(distant.actors.enemy.hp,1000);
  const state=createAction(stats,stats);close(state);
  const events=[...stepAction(state,{...idle,attack:true},frame,false),...advance(state,idle,1)];
  assert.equal(events.filter(e=>e.kind==='hit').length,1);
  assert.ok(state.actors.enemy.hp<1000);assert.equal(state.actors.player.hp,1000);
});
test('an attack behind its locked facing does not hit',()=>{
  const state=createAction(stats,stats);
  state.actors.player.position={x:0,z:0};state.actors.enemy.position={x:0,z:1.8};
  Object.assign(state.actors.player,{mode:'attack',age:0,facing:{x:0,z:-1}});
  assert.equal(stepAction(state,idle,frame,false).filter(e=>e.kind==='hit').length,0);
});
test('dodge moves in requested direction, idle dodge retreats, and has limited invulnerability',()=>{
  const state=createAction(stats,stats);
  stepAction(state,{...idle,x:1,dodge:true},frame,false);
  assert.equal(state.actors.player.mode,'dodge');assert.equal(state.actors.player.facing.x,1);
  assert.equal(invulnerable(state.actors.player),false);
  advance(state,idle,.1);assert.equal(invulnerable(state.actors.player),true);
  advance(state,idle,.3);assert.equal(invulnerable(state.actors.player),false);
  const x=state.actors.player.position.x;advance(state,{...idle,dodge:true},.2);
  assert.equal(state.actors.player.mode,'recovery');assert.ok(state.actors.player.dodgeCooldown>0);
  assert.ok(state.actors.player.position.x>=x);
  const retreat=createAction(stats,stats);stepAction(retreat,{...idle,dodge:true},frame,false);
  assert.equal(retreat.actors.player.facing.z,1);
});
test('a dodge in its invulnerability window avoids a geometrically valid hit',()=>{
  const state=createAction(stats,stats);close(state);
  Object.assign(state.actors.player,{mode:'attack',age:0,facing:{x:0,z:-1}});
  Object.assign(state.actors.enemy,{mode:'dodge',age:.1});
  stepAction(state,idle,frame,false);
  assert.equal(state.actors.enemy.hp,1000);
});
test('mutual lethal contact is a draw, HP never goes negative, and terminal state is immutable',()=>{
  const one={hp:1,atk:1,def:1},state=createAction(one,one);close(state);
  Object.assign(state.actors.player,{mode:'attack',age:0,facing:{x:0,z:-1}});
  Object.assign(state.actors.enemy,{mode:'attack',age:0,facing:{x:0,z:1}});
  stepAction(state,idle,frame,false);
  assert.equal(state.result.outcome,'draw');assert.equal(state.actors.player.hp,0);assert.equal(state.actors.enemy.hp,0);
  const snapshot=JSON.stringify(state);stepAction(state,{...idle,attack:true},frame);assert.equal(JSON.stringify(state),snapshot);
});
test('timeout uses remaining HP ratios, with exact tie as draw',()=>{
  for(const [hp,outcome]of [[80,'win'],[20,'lose'],[50,'draw']]){
    const state=createAction({hp:100,atk:1,def:1},{hp:200,atk:1,def:1});
    state.time=ACTION.timeLimit-.01;state.actors.player.hp=hp;state.actors.enemy.hp=100;
    stepAction(state,idle,.02,false);assert.equal(state.result.outcome,outcome);assert.equal(state.result.reason,'timeout');
  }
});
test('enemy AI approaches and attacks, while a player can actively counterattack',()=>{
  const state=createAction(stats,stats),events=advance(state,idle,15,true);
  assert.ok(events.some(e=>e.kind==='attack'&&e.side==='enemy'));
  assert.ok(events.some(e=>e.kind==='hit'&&e.side==='player'));
  assert.ok(state.actors.player.hp<1000);
});
test('action compression happens before final independent multipliers, preserving filler ones',()=>{
  const score=scoreTeam(Array(4).fill({...KANJI[0],rarity:'N'}),()=>0);
  const low=convertStats(score,()=>0,true),high=convertStats(score,()=>.999999,true);
  for(const key of ['hp','atk','def']){
    assert.equal(low.multipliers[key],1);assert.equal(high.multipliers[key],2);
    assert.ok(Math.abs(high.stats[key]-low.stats[key]*2)<=1);
  }
  const filler=scoreTeam(Array(4).fill({kind:'filler',char:'1'}));
  assert.deepEqual(convertStats(filler,()=>{throw Error('must not roll');},true).stats,{hp:1,atk:1,def:1});
});
