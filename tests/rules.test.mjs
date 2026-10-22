import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { KANJI } from '../src/data/kanji.ts';
import { GROUPS } from '../src/data/groups.ts';
import { RARITIES } from '../src/data/rarities.ts';
import { RULES } from '../src/data/rules.ts';
import { createGacha, draw, decide, getTeam } from '../src/game/gacha.ts';
import { scoreTeam, combinationPoints } from '../src/game/scoring.ts';
import { createBattle, compareScores, resultComment } from '../src/game/battle.ts';
const kanji = char => KANJI.find(entry => entry.char === char);
const team = [...'風林火山'].map(kanji);
const filler = {kind:'filler',char:'1'};
const sequence = values => { let index = 0; return () => { assert.ok(index < values.length, 'unexpected random roll'); return values[index++]; }; };
function turn(state, char, keep) {
  return decide(draw(state, () => (KANJI.findIndex(entry => entry.char === char) + .5) / KANJI.length), keep);
}
test('250 unique kanji in exactly seven specified groups match the specification and font', () => {
  assert.equal(KANJI.length, 250);
  assert.equal(new Set(KANJI.map(k => k.char)).size, 250);
  assert.equal(Object.keys(GROUPS).length, 7);
  const section = readFileSync(new URL('../docs/specification.md', import.meta.url),'utf8').split('## 6.')[1].split('## 7.')[0];
  const rows = section.split('\n').filter(line => line.split('・').length >= 35).map(line => line.trim().split('・'));
  Object.keys(GROUPS).forEach((id,i) => assert.deepEqual(KANJI.filter(k => k.group === id).map(k => k.char), rows[i]));
  const glyphs = JSON.parse(readFileSync(new URL('../public/fonts/kannji-outline.typeface.json',import.meta.url),'utf8')).glyphs;
  for (const entry of KANJI) { assert.ok(GROUPS[entry.group]); assert.ok(glyphs[entry.char]); }
  for (const char of '田浩所閃光一二三四五六七八九十百千万零') assert.ok(kanji(char));
  assert.equal(kanji('1'), undefined);
});
test('gacha accepts in order and ends immediately at four', () => {
  let state=createGacha();
  for (const char of '風林火山') state=turn(state,char,true);
  assert.equal(state.draws,4); assert.equal(state.complete,true);
  assert.equal(getTeam(state).map(k=>k.char).join(''),'風林火山');
  assert.throws(()=>draw(state)); assert.throws(()=>decide(state,true));
});
test('discard consumes a draw; duplicate acquisition is allowed; pending cannot be overwritten', () => {
  const initial=createGacha(); const pending=draw(initial,()=>0);
  assert.throws(()=>draw(pending)); assert.throws(()=>getTeam(pending)); assert.throws(()=>decide(initial,true));
  let state=decide(pending,false);
  for(let i=0;i<4;i++) state=turn(state,'天',true);
  assert.equal(state.draws,5); assert.equal(getTeam(state).map(k=>k.char).join(''),'天天天天');
  assert.equal(initial.draws,0); assert.deepEqual(initial.selected,[]);
});
test('tenth decision is applied before filling on the right', () => {
  let state=createGacha();
  state=turn(state,'風',true);
  for(let i=0;i<8;i++) state=turn(state,'山',false);
  state=draw(state,()=> (KANJI.findIndex(k=>k.char==='火')+.5)/250);
  assert.equal(state.complete,false); assert.equal(state.draws,10);
  const accepted=decide(state,true); const discarded=decide(state,false);
  assert.equal(getTeam(accepted).map(k=>k.char).join(''),'風火11');
  assert.equal(getTeam(discarded).map(k=>k.char).join(''),'風111');
  assert.throws(()=>draw(accepted));
});
test('ten discards yields 1111, while a fourth acceptance on tenth has no filler', () => {
  let empty=createGacha(); for(let i=0;i<10;i++) empty=turn(empty,'山',false);
  assert.equal(getTeam(empty).map(k=>k.char).join(''),'1111');
  let full=createGacha(); for(const char of '風林火') full=turn(full,char,true);
  for(let i=0;i<6;i++) full=turn(full,'山',false);
  full=turn(full,'山',true); assert.equal(getTeam(full).map(k=>k.char).join(''),'風林火山');
});
test('any filler overrides all scores and comments without rolling normal scores', () => {
  for(let mask=1;mask<16;mask++) {
    const chars=team.map((k,i)=>mask & (1<<i) ? filler:k);
    const score=scoreTeam(chars,()=>{throw Error('must not roll');});
    assert.equal(score.total,1); assert.equal(score.steps.length,1); assert.equal(score.steps[0].kind,'filler');
    assert.equal(resultComment(score,()=>{throw Error('must not roll');}),'もはや漢字じゃない');
  }
});
test('kanji 一 is scored normally, steps follow character / combination / rarity order', () => {
  const score=scoreTeam(Array(4).fill(kanji('一')),()=>0);
  assert.equal(score.hasFiller,false); assert.equal(score.total,136);
  assert.deepEqual(score.steps.map(s=>s.kind),['character','character','character','character','combination','rarity','rarity','rarity','rarity']);
  assert.equal(score.total, score.steps.reduce((sum,s)=>sum+s.points,0));
});
test('character rolls and rarities are independent for repeated characters', () => {
  const score=scoreTeam(Array(4).fill(kanji('天')),sequence([0,.25,.5,.999, .5, 0,.5,.78,.99]));
  assert.deepEqual(score.steps.slice(0,4).map(s=>s.points),[10,32,55,100]);
  assert.deepEqual(score.steps.slice(5).map(s=>s.rarity),['N','C','R','UR']);
});
test('all rarity boundaries and upper-exclusive random range', () => {
  for (const [value,id] of [[0,'N'],[.4999,'N'],[.5,'C'],[.78,'R'],[.93,'SR'],[.99,'UR'],[.999999,'UR']]) {
    assert.equal(scoreTeam(team,sequence([0,0,0,0,0,value,value,value,value])).steps[5].rarity,id);
  }
  for(const invalid of [-1,1,NaN,Infinity]) assert.throws(()=>draw(createGacha(),()=>invalid));
  assert.equal(RARITIES.reduce((sum,r)=>sum+r.weight,0),100);
});
test('six positional pairs, normalized similarity, negative totals clamped', () => {
  assert.equal(combinationPoints(Array(4).fill(kanji('天')),1),120);
  const opposite=[kanji('心'),kanji('心'),kanji('走'),kanji('走')];
  assert.equal(combinationPoints(opposite,1),0);
  assert.equal(combinationPoints(Array(4).fill(kanji('天')),100),RULES.combination.max);
});
test('battle rolls fresh scores, uses normal enemy kanji including duplicates, and stores outcome', () => {
  const first=createBattle(team,()=>0); const second=createBattle(team,()=>.999999);
  assert.notEqual(first.player.total,second.player.total);
  assert.equal(first.enemy.characters.map(k=>k.char).join(''),'天天天天');
  assert.ok(second.enemy.characters.every(k=>k.kind==='kanji'));
  assert.deepEqual(first.player,scoreTeam(team,()=>0));
  assert.equal(first.outcome,compareScores(first.player.total,first.enemy.total));
  assert.equal(compareScores(5,4),'win'); assert.equal(compareScores(4,5),'lose'); assert.equal(compareScores(4,4),'draw');
  const saved=JSON.stringify(first); createBattle(team,()=>.5); assert.equal(JSON.stringify(first),saved);
});
test('fresh gacha state and team snapshots do not retain previous selections', () => {
  let old=createGacha(); for(const char of '風林火山') old=turn(old,char,true);
  const snapshot=getTeam(old); assert.notEqual(snapshot,old.selected);
  assert.deepEqual(createGacha(),{draws:0,selected:[],pending:null,complete:false});
});
