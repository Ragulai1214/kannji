import test from 'node:test';
import assert from 'node:assert/strict';
import { KANJI } from '../src/data/kanji.ts';
import { scoreTeam } from '../src/game/scoring.ts';
import { scoreAt, stepAt } from '../src/game/timeline.ts';
import { resultScreen } from '../src/screens/result.ts';
import { battleScreen } from '../src/screens/battle.ts';
import { createBattle } from '../src/game/battle.ts';
const team = [...'風林火山'].map(char => KANJI.find(k=>k.char===char));
test('normal timeline starts at zero and each displayed total matches its earned steps',()=>{
  const score=scoreTeam(team,()=>.99);
  assert.equal(scoreAt(score,0),0);
  for(let n=1;n<=score.steps.length;n++) {
    assert.equal(scoreAt(score,n)-scoreAt(score,n-1),score.steps[n-1].points);
    assert.equal(stepAt(score,n-1),score.steps[n-1]);
  }
  assert.equal(scoreAt(score,score.steps.length),score.total);
});
test('filler stays at one for all animation frames, without normal score steps',()=>{
  const score=scoreTeam([team[0],team[1],team[2],{kind:'filler',char:'1'}]);
  for(let n=0;n<10;n++) { assert.equal(scoreAt(score,n),1); assert.equal(stepAt(score,n),undefined); }
  const battle=createBattle(score.characters,()=>0);
  assert.match(battleScreen(battle),/id="player-score">1</);
  assert.match(battleScreen(battle),/数字「1」が含まれるため、合計1点/);
  assert.match(resultScreen(battle),/もはや漢字じゃない/);
});
test('result renders win, lose, draw and offers restart and home without rerolling',()=>{
  const battle=createBattle(team,()=>0);
  const snapshot=JSON.stringify(battle);
  for(const [outcome,label] of [['win','勝利'],['lose','敗北'],['draw','引き分け']]) {
    const html=resultScreen({...battle,outcome});
    assert.ok(html.includes(label)); assert.ok(html.includes(`${battle.player.total}<span>点`));
    assert.match(html,/data-action="start">もう一度書く/); assert.match(html,/data-action="home"/);
  }
  battleScreen(battle); resultScreen(battle); assert.equal(JSON.stringify(battle),snapshot);
});
