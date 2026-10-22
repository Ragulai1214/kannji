import type { ActionInput } from './action.ts';

export function bindActionInput(root:HTMLElement,signal:AbortSignal){
  const keys=new Set<string>();let stickX=0,stickZ=0,attack=false,dodge=false,nudgeX=0,nudgeZ=0,nudgeUntil=0;
  let pointer:number|undefined;
  const clear=():void=>{keys.clear();stickX=stickZ=0;attack=dodge=false;nudgeUntil=0;pointer=undefined;const thumb=root.querySelector<HTMLElement>('.stick-thumb');if(thumb)thumb.style.transform='translate(-50%,-50%)';};
  const codes=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyJ','KeyK','ShiftLeft','ShiftRight'];
  window.addEventListener('keydown',event=>{
    const target=event.target as Element;
    if(target?.closest('input,textarea,select')||root.querySelector<HTMLElement>('.action-controls')?.hidden)return;
    if(event.code==='Space'&&target?.closest('button,a'))return;
    if(!codes.includes(event.code))return;event.preventDefault();keys.add(event.code);
    if(!event.repeat){if(event.code==='Space'||event.code==='KeyJ')attack=true;if(event.code==='KeyK'||event.code.startsWith('Shift'))dodge=true;}
  },{signal});
  window.addEventListener('keyup',event=>{keys.delete(event.code);},{signal});window.addEventListener('blur',clear,{signal});
  const stick=root.querySelector<HTMLElement>('.move-stick')!,thumb=root.querySelector<HTMLElement>('.stick-thumb')!;
  const update=(event:PointerEvent):void=>{
    const rect=stick.getBoundingClientRect(),radius=rect.width*.35;
    let x=(event.clientX-rect.left-rect.width/2)/radius,z=(event.clientY-rect.top-rect.height/2)/radius;
    const length=Math.hypot(x,z);if(length>1){x/=length;z/=length;}
    stickX=x;stickZ=z;thumb.style.transform=`translate(calc(-50% + ${x*radius}px),calc(-50% + ${z*radius}px))`;
  };
  stick.addEventListener('pointerdown',event=>{if(pointer!==undefined)return;event.preventDefault();pointer=event.pointerId;stick.setPointerCapture(pointer);update(event);},{signal});
  stick.addEventListener('pointermove',event=>{if(event.pointerId===pointer)update(event);},{signal});
  const release=(event:PointerEvent):void=>{if(event.pointerId!==pointer)return;pointer=undefined;stickX=stickZ=0;thumb.style.transform='translate(-50%,-50%)';};
  stick.addEventListener('pointerup',release,{signal});stick.addEventListener('pointercancel',release,{signal});stick.addEventListener('lostpointercapture',release,{signal});
  root.querySelectorAll<HTMLButtonElement>('[data-move]').forEach(button=>{
    const [x,z]=button.dataset.move!.split(',').map(Number);
    button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture(event.pointerId);stickX=x;stickZ=z;},{signal});
    const stop=():void=>{stickX=stickZ=0;};
    button.addEventListener('pointerup',stop,{signal});button.addEventListener('pointercancel',stop,{signal});button.addEventListener('lostpointercapture',stop,{signal});
    // A click also provides a short nudge for keyboard/switch activation.
    button.addEventListener('click',()=>{nudgeX=x;nudgeZ=z;nudgeUntil=performance.now()+140;},{signal});
  });
  for(const kind of ['attack','dodge'] as const){
    const button=root.querySelector<HTMLButtonElement>(`[data-combat="${kind}"]`)!;
    const request=():void=>{if(button.disabled)return;if(kind==='attack')attack=true;else dodge=true;};
    button.addEventListener('pointerdown',event=>{event.preventDefault();request();},{signal});
    button.addEventListener('click',event=>{if(event.detail===0)request();},{signal});
  }
  signal.addEventListener('abort',clear,{once:true});
  return{
    clear,
    read():ActionInput{
      let x=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
      let z=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));
      if(Math.hypot(stickX,stickZ)>.08){x=stickX;z=stickZ;}
      else if(performance.now()<nudgeUntil){x=nudgeX;z=nudgeZ;}
      const value={x,z,attack,dodge};attack=dodge=false;return value;
    },
  };
}
