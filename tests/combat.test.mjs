import test from 'node:test';
import assert from 'node:assert/strict';
import { KANJI } from '../src/data/kanji.ts';
import { COMMENTS } from '../src/data/comments.ts';
import { ALLOCATION } from '../src/data/combat.ts';
import { createGacha, draw, decide, getTeam } from '../src/game/gacha.ts';
import { scoreTeam } from '../src/game/scoring.ts';
import { convertStats, damage } from '../src/game/combat.ts';
import { createBattle, resultComment } from '../src/game/battle.ts';
const kanji=char=>KANJI.find(k=>k.char===char);
const team=char=>Array(4).fill({...kanji(char),rarity:'N'});
const seq=values=>{let i=0;return()=>{assert.ok(i<values.length,'unexpected reroll');return values[i++];};};
test('gacha fixes rarity and preserves it through acceptance and battle',()=>{
  let state=createGacha();
  for(let i=0;i<4;i++){
    state=draw(state,seq([0,.99999]));assert.equal(state.pending.rarity,'UR');
    state=decide(state,true);
  }
  const chars=getTeam(state);
  const score=scoreTeam(chars,seq([0,0,0,0,0])); // no rarity draws allowed
  assert.deepEqual(score.steps.filter(s=>s.kind==='rarity').map(s=>s.rarity),['UR','UR','UR','UR']);
  assert.ok(createBattle(chars,()=>0).player.steps.filter(s=>s.kind==='rarity').every(s=>s.rarity==='UR'));
  assert.ok(KANJI.every(k=>!k.rarity),'catalog is not mutated');
});
test('normal scoring includes exact lower and upper bounds; cumulative steps match',()=>{
  const minimum=scoreTeam(['心','心','走','走'].map(c=>({...kanji(c),rarity:'N'})),()=>0);
  assert.equal(minimum.total,100);
  const maximum=scoreTeam(team('天').map(c=>({...c,rarity:'UR'})),()=>.999999);
  assert.equal(maximum.total,99999);
  let seed=873;
  const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  for(let i=0;i<300;i++){
    const chars=Array.from({length:4},()=>({...KANJI[Math.floor(random()*250)],rarity:['N','C','R','SR','UR'][i%5]}));
    const score=scoreTeam(chars,random);
    assert.ok(score.total>=100&&score.total<=99999);
    assert.equal(score.total,score.steps.reduce((sum,s)=>sum+s.points,0));
  }
});
test('group allocations sum to one and three final multipliers are independent and inclusive',()=>{
  for(const allocation of Object.values(ALLOCATION))assert.ok(Math.abs(allocation.hp+allocation.atk+allocation.def-1)<1e-12);
  const score={...scoreTeam(team('走'),()=>0),total:10000};
  const ability=convertStats(score,seq([0,.5,.999999]));
  assert.deepEqual(ability.multipliers,{hp:1,atk:1.5,def:2});
  assert.deepEqual(ability.stats,{hp:16000,atk:18000,def:6400});
});
test('all filler combinations force points and every stat to one without rolling',()=>{
  for(let mask=1;mask<16;mask++){
    const chars=team('天').map((c,i)=>mask&(1<<i)?{kind:'filler',char:'1'}:c);
    const noRoll=()=>{throw Error('filler must not roll');};
    const score=scoreTeam(chars,noRoll);
    assert.equal(score.total,1);
    assert.deepEqual(convertStats(score,noRoll).stats,{hp:1,atk:1,def:1});
    for(const outcome of ['win','lose','draw'])assert.equal(resultComment(score,noRoll,outcome),COMMENTS.filler);
  }
});
test('damage rounds the agreed formula and is at least one',()=>{
  assert.equal(damage(100,100),50);assert.equal(damage(10,3),8);assert.equal(damage(1,99999),1);
  assert.ok(damage(100,50)>damage(100,200));
  for(const invalid of [0,-1,Infinity,NaN])assert.throws(()=>damage(invalid,10));
});
test('win / lose / draw use separate pools and a stored battle never changes when viewed',()=>{
  const battle=createBattle(team('天'),()=>0);
  for(const outcome of ['win','lose','draw'])assert.ok(COMMENTS[outcome].includes(resultComment(battle.player,()=>0,outcome)));
  assert.equal(battle.result,undefined); assert.equal(battle.comment,'');
  const saved=JSON.stringify(battle);createBattle(team('山'),()=>.9);assert.equal(JSON.stringify(battle),saved);
});
