import { PRESENTATION } from '../data/presentation.ts';
import { RARITIES } from '../data/rarities.ts';
import { scoreAt, stepAt } from '../game/timeline.ts';
import { homeButton } from './shared.ts';
import { OUTCOME } from './result.ts';
import { number, statsMarkup } from './stats.ts';
import { flyPoints } from './point-flight.ts';
import type { Battle } from './result.ts';
import type { BattleVisual } from '../three/battle-scene.ts';
import type { createEffects } from '../audio/effects.ts';
import { ACTION } from '../data/action.ts';
import { bindActionInput } from '../game/action-input.ts';
import { createAction, stepAction } from '../game/action.ts';
import type { ActionResult } from '../game/action.ts';

export function battleScreen(battle: Battle): string {
  return `<section class="screen battle-screen" aria-labelledby="screen-title"><header class="screen-header"><div><p class="eyebrow">四文字、相まみえる</p><h1 id="screen-title" tabindex="-1">試合</h1></div>${homeButton}</header>
    <div class="arena"><div id="battle-stage"></div>${(['enemy','player'] as const).map(side=>`<div class="fighter ${side}"><p class="fighter-label">${side==='player'?'あなた':'相手'}</p><p class="fighter-word">${battle[side].characters.map(c=>`<span>${c.char}</span>`).join('')}</p><p class="fighter-score"><strong id="${side}-score">${number(scoreAt(battle[side],0))}</strong>点</p><div class="ability-panel" hidden>${statsMarkup(battle.abilities[side].stats,battle.abilities[side].stats.hp,side)}</div></div>`).join('')}<p class="duel-mark" id="turn-label" aria-hidden="true">集計</p><div id="damage-label" aria-hidden="true"></div></div>
    <div class="action-hud" hidden><strong id="match-clock">90秒</strong><span id="action-state">待機</span><button class="quiet" data-combat="pause">一時停止</button></div>
    <div class="action-controls" hidden><div class="movement-controls"><div class="move-stick" aria-label="移動スティック"><span class="stick-thumb"></span></div><div class="direction-pad"><button data-move="0,-1" aria-label="前へ移動">↑</button><button data-move="-1,0" aria-label="左へ移動">←</button><button data-move="0,1" aria-label="後ろへ移動">↓</button><button data-move="1,0" aria-label="右へ移動">→</button></div></div><div class="combat-buttons"><button data-combat="attack">攻撃</button><button data-combat="dodge">回転回避</button></div></div>
    <p class="control-help" hidden>PC：WASD／方向キーで移動、J／Spaceで攻撃、K／Shiftで回転回避、Escで一時停止。スマホ：移動スティック＋右のボタン。静止中の回避は敵から離れます。</p>
    <p id="battle-status" role="status">モデルを読み込み中…</p><div class="score-details">${(['enemy','player'] as const).map(side=>`<p><span>${side==='player'?'あなた':'相手'}</span><strong id="${side}-step">${battle[side].hasFiller?'数字「1」が含まれるため、合計1点':'加点を待っています'}</strong></p>`).join('')}</div><p class="background-caption">背景の墨文字：${battle.background.map(char=>`<span>${char.char}</span>`).join('・')}</p><p id="visual-notice" class="note"></p></section>`;
}
function pause(ms: number, signal: AbortSignal): Promise<boolean> {
  return new Promise(resolve=>{
    if(signal.aborted){resolve(false);return;}
    const abort=():void=>{clearTimeout(timer);resolve(false);};
    const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve(true);},ms);
    signal.addEventListener('abort',abort,{once:true});
  });
}
export function playBattle(root: HTMLElement, battle: Battle, onComplete:(result:ActionResult)=>void, audio: ReturnType<typeof createEffects>):()=>void {
  const controller=new AbortController(), {signal}=controller;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let visual: BattleVisual|undefined;
  let frame = 0;
  const status=root.querySelector<HTMLElement>('#battle-status')!;
  const stage=root.querySelector<HTMLElement>('#battle-stage')!;
  async function run():Promise<void>{
    try{
      const {createBattleScene}=await import('../three/battle-scene.ts');
      if(signal.aborted)return;
      visual=await createBattleScene(stage,battle,reduced,signal);
    }catch(error){
      if(signal.aborted)return;
      console.error(error);status.textContent='3D表示を開始できませんでした。ホームからやり直してください。';return;
    }
    if(signal.aborted||!visual)return;
    status.textContent='文字点 → 組み合わせ点 → レアリティ点を集計します。';
    if(!await pause(PRESENTATION.battleIntroMs,signal))return;
    const length=Math.max(battle.player.steps.length,battle.enemy.steps.length);
    for(let index=0;index<length;index++){
      const messages:string[]=[];
      const flights:Promise<boolean>[]=[];
      for(const side of ['enemy','player'] as const){
        const step=stepAt(battle[side],index);if(!step)continue;
        const text=`${step.label} ${step.points<0?'−':'＋'}${number(Math.abs(step.points))}点`;
        const line=root.querySelector<HTMLElement>(`#${side}-step`)!;
        line.textContent=text;line.className=step.rarity==='UR'?'rainbow-text':'';
        const rarity=RARITIES.find(r=>r.id===step.rarity);
        line.style.background=rarity&&rarity.id!=='UR'?rarity.color:'';
        visual?.pulse(side,step);
        flights.push(flyPoints(root,side,`${step.points<0?'−':'＋'}${number(Math.abs(step.points))}`,step.index,visual?.source(side,step.index),PRESENTATION.pointFlightMs,reduced,signal));
        messages.push(`${side==='player'?'あなた':'相手'}：${text}`);
      }
      status.textContent=messages.join(' ／ ');
      if(!(await Promise.all(flights)).every(Boolean)||signal.aborted)return;
      // 到着してから加算。演出の再描画では抽選しない。
      for(const side of ['enemy','player'] as const){
        if(!stepAt(battle[side],index))continue;
        const total=root.querySelector<HTMLElement>(`#${side}-score`)!;
        total.textContent=number(scoreAt(battle[side],index+1));
        if(!reduced)total.animate([{filter:'brightness(1)',transform:'scale(1)'},{filter:'brightness(1.8)',transform:'scale(1.18)'},{filter:'brightness(1)',transform:'scale(1)'}],{duration:300});
      }
      audio.play(index>=5?'rare':'point');
      if(!await pause(PRESENTATION.scoreStepMs,signal))return;
    }
    root.querySelectorAll<HTMLElement>('.ability-panel').forEach(el=>{el.hidden=false;});
    root.querySelector<HTMLElement>('.arena')!.classList.add('combat-active');
    root.querySelector<HTMLElement>('#turn-label')!.textContent='準備';
    status.textContent='能力確定。円形闘技場で戦います。';
    for(const side of ['enemy','player'] as const){const line=root.querySelector<HTMLElement>(`#${side}-step`)!;line.style.background='';line.className='';line.textContent=side==='player'&&battle.player.hasFiller?'補填のため能力はすべて1':'アクション用に能力差を圧縮・最後に1.0〜2.0倍で確定';}
    if(!await pause(PRESENTATION.statRevealMs,signal))return;
    const state=createAction(battle.abilities.player.stats,battle.abilities.enemy.stats);
    visual.startAction(state);
    const controls=bindActionInput(root,signal);
    root.querySelectorAll<HTMLElement>('.action-controls,.action-hud,.control-help').forEach(el=>{el.hidden=false;});
    root.querySelector<HTMLElement>('.battle-screen')!.classList.add('action-live');
    root.querySelector<HTMLElement>('#turn-label')!.hidden=true;
    root.querySelector<HTMLElement>('.score-details')!.hidden=true;
    stage.tabIndex=0;stage.focus({preventScroll:true});
    status.textContent='準備完了。操作を確認し「戦闘開始」を押してください。';
    let started=false,manualPaused=true,hidden=document.hidden,last=performance.now(),accumulator=0,finished=false;
    const pauseButton=root.querySelector<HTMLButtonElement>('[data-combat="pause"]')!;
    pauseButton.textContent='戦闘開始';
    const setPause=():void=>{controls.clear();accumulator=0;last=performance.now();pauseButton.textContent=manualPaused?(started?'再開':'戦闘開始'):'一時停止';if(!started)status.textContent='準備完了。「戦闘開始」で始めます。';else if(manualPaused||hidden)status.textContent='一時停止中';else status.textContent='相手の予備動作を見て攻撃・回転回避！';};
    pauseButton.addEventListener('click',()=>{started=true;manualPaused=!manualPaused;setPause();},{signal});
    window.addEventListener('keydown',event=>{if(event.code==='Escape'&&started){event.preventDefault();manualPaused=!manualPaused;setPause();}},{signal});
    document.addEventListener('visibilitychange',()=>{hidden=document.hidden;setPause();},{signal});
    const updateHUD=():void=>{
      for(const side of ['enemy','player'] as const){const actor=state.actors[side];root.querySelector<HTMLElement>(`#${side}-hp`)!.textContent=number(actor.hp);root.querySelector<HTMLProgressElement>(`#${side}-bar`)!.value=actor.hp;}
      root.querySelector<HTMLElement>('#match-clock')!.textContent=`${Math.max(0,Math.ceil(ACTION.timeLimit-state.time))}秒`;
      const player=state.actors.player;
      root.querySelector<HTMLElement>('#action-state')!.textContent=!started?'準備完了':manualPaused||hidden?'一時停止':player.mode==='dodge'?'回転回避中':player.mode==='windup'?'攻撃準備':player.mode==='attack'?'突進中':player.mode==='recovery'?'硬直':player.mode==='stunned'?'被弾':'移動・攻撃できます';
      const attack=root.querySelector<HTMLButtonElement>('[data-combat="attack"]')!,dodge=root.querySelector<HTMLButtonElement>('[data-combat="dodge"]')!;
      attack.disabled=manualPaused||hidden||player.mode!=='idle'||player.attackCooldown>0;
      dodge.disabled=manualPaused||hidden||player.mode!=='idle'||player.dodgeCooldown>0;
      dodge.textContent=player.dodgeCooldown>0?`回避 ${player.dodgeCooldown.toFixed(1)}秒`:'回転回避';
    };
    const tick=(now:number):void=>{
      if(signal.aborted||finished)return;
      const dt=Math.min(.05,(now-last)/1000);last=now;
      if(!manualPaused&&!hidden){
        accumulator+=dt;
        while(accumulator>=1/60&&!state.result){
          const events=stepAction(state,visual!.movement(controls.read()),1/60);accumulator-=1/60;
          for(const event of events){
            if(event.kind==='hit'){
              visual!.impact(event.side);audio.play('impact');
              const target=visual!.source(event.side),rect=root.querySelector<HTMLElement>('.arena')!.getBoundingClientRect(),label=root.querySelector<HTMLElement>('#damage-label')!;
              label.style.left=`${target.x-rect.left}px`;label.style.top=`${target.y-rect.top}px`;label.textContent=`−${number(event.damage)}`;
              label.animate(reduced?[{opacity:1},{opacity:0}]:[{opacity:1,transform:'translate(-50%,-70%) scale(1.2)'},{opacity:0,transform:'translate(-50%,-160%)'}],{duration:500,fill:'forwards'});
              status.textContent=`${event.side==='player'?'あなた':'相手'}に${number(event.damage)}ダメージ。`;
            }else if(event.side==='player'){audio.play(event.kind==='dodge'?'reveal':'draw');}
          }
        }
      }
      updateHUD();
      if(state.result){
        finished=true;controls.clear();status.textContent=`決着：${OUTCOME[state.result.outcome]}${state.result.reason==='timeout'?'（時間切れ・残り体力の割合で判定）':''}`;
        visual!.finish(state.result.outcome);
        root.querySelectorAll<HTMLButtonElement>('[data-combat]').forEach(el=>el.disabled=true);
        void pause(PRESENTATION.finishMs,signal).then(ok=>{if(ok)onComplete(state.result!);});return;
      }
      frame=requestAnimationFrame(tick);
    };
    updateHUD();frame=requestAnimationFrame(tick);
  }

  void run();
  return()=>{controller.abort();cancelAnimationFrame(frame);visual?.dispose();};
}
