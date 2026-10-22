import { AdditiveBlending, AmbientLight, BufferGeometry, CanvasTexture, CircleGeometry, Color, CylinderGeometry, DirectionalLight, DoubleSide, Float32BufferAttribute, Fog, Group, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, PlaneGeometry, Points, PointsMaterial, RingGeometry, Scene, TorusGeometry, Vector3, WebGLRenderer } from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { KanjiModels } from './kanji-model';
import { RARITIES } from '../data/rarities.ts';
import { PRESENTATION } from '../data/presentation.ts';
import { ACTION } from '../data/action.ts';
import { CAMERA } from '../data/camera.ts';
import { cameraRelativeInput, dodgeRotationY, followCameraPose, followOrbit } from '../game/camera.ts';
import { invulnerable } from '../game/action.ts';
import type { ActionInput, ActionState } from '../game/action.ts';
import type { Battle } from '../screens/result.ts';
import type { Outcome, ScoreStep, Side } from '../game/types.ts';

export interface BattleVisual {
  pulse(side:Side,step:ScoreStep):void;
  source(side:Side,index?:number):{x:number;y:number};
  startAction(state:ActionState):void;
  movement(input:ActionInput):ActionInput;
  impact(side:Side):void;
  finish(outcome:Outcome):void;
  dispose():void;
}
export async function createBattleScene(host:HTMLElement,battle:Battle,reduced:boolean,signal:AbortSignal):Promise<BattleVisual|undefined>{
  const loading=new AbortController();
  const cancel=():void=>loading.abort();
  signal.addEventListener('abort',cancel,{once:true});
  const timer=setTimeout(cancel,PRESENTATION.modelLoadTimeoutMs);
  let font;
  try{
    if(signal.aborted)return;
    const response=await fetch(`${import.meta.env.BASE_URL}fonts/kannji-outline.typeface.json`,{signal:loading.signal});
    if(!response.ok)throw Error(`フォント読み込み失敗: ${response.status}`);
    font=new FontLoader().parse(await response.json());
  }finally{clearTimeout(timer);signal.removeEventListener('abort',cancel);}
  if(signal.aborted)return;
  const renderer=new WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.domElement.setAttribute('aria-label','円形闘技場で戦う四文字と、独立して漂う4字の墨文字');
  host.append(renderer.domElement);
  const scene=new Scene();scene.background=new Color(0xe8e2d5);scene.fog=new Fog(0xe8e2d5,30,85);
  const camera=new PerspectiveCamera(CAMERA.fieldOfView,1,.1,150);
  const light=new DirectionalLight(0xfff2d9,3);light.position.set(-5,12,8);
  scene.add(light,new AmbientLight(0xffffff,1.8),camera);
  const models=new KanjiModels(font);
  const groups:Record<Side,Group>={player:models.create(battle.player.characters.map(c=>c.char).join('')),enemy:models.create(battle.enemy.characters.map(c=>c.char).join(''))};
  const materials:MeshStandardMaterial[]=[];
  for(const side of ['player','enemy'] as const){
    groups[side].scale.setScalar(.8);
    groups[side].children.forEach(child=>{const mesh=child as Mesh;const material=(mesh.material as MeshStandardMaterial).clone();material.color.set(side==='player'?0x23495a:0x713c30);material.transparent=true;mesh.material=material;materials.push(material);});
    scene.add(groups[side]);
  }
  const floorGeometry=new CylinderGeometry(ACTION.radius,ACTION.radius,.32,96);
  const floorMaterial=new MeshStandardMaterial({color:0xd7c7a4,roughness:.95});
  const floor=new Mesh(floorGeometry,floorMaterial);floor.position.y=-.2;scene.add(floor);
  const rimGeometry=new TorusGeometry(ACTION.radius,.095,8,96);
  const rimMaterial=new MeshStandardMaterial({color:0x554737,roughness:.55,metalness:.25});
  const rim=new Mesh(rimGeometry,rimMaterial);rim.rotation.x=Math.PI/2;scene.add(rim);
  const groundGeometry=new CircleGeometry(36,96),groundMaterial=new MeshStandardMaterial({color:0xb9b09d,roughness:1});
  const ground=new Mesh(groundGeometry,groundMaterial);ground.rotation.x=-Math.PI/2;ground.position.y=-.85;scene.add(ground);
  const baseGeometry=new CylinderGeometry(9.2,9.6,.5,96),baseMaterial=new MeshStandardMaterial({color:0x796b56,roughness:.9});
  const base=new Mesh(baseGeometry,baseMaterial);base.position.y=-.55;scene.add(base);
  const columnGeometry=new CylinderGeometry(.18,.25,2.8,8),columnMaterial=new MeshStandardMaterial({color:0x807763,roughness:.85});
  for(let i=0;i<12;i++){const a=i*Math.PI/6;const column=new Mesh(columnGeometry,columnMaterial);column.position.set(Math.sin(a)*11, .55,Math.cos(a)*11);scene.add(column);}
  const innerGeometry=new RingGeometry(6.65,6.7,96);
  const innerMaterial=new MeshBasicMaterial({color:0x9d8664,side:DoubleSide,transparent:true,opacity:.55});
  const inner=new Mesh(innerGeometry,innerMaterial);inner.rotation.x=-Math.PI/2;inner.position.y=.005;scene.add(inner);
  const lines:number[]=[];
  for(let i=0;i<12;i++){const a=i*Math.PI/6;lines.push(Math.cos(a)*6.7,.008,Math.sin(a)*6.7,Math.cos(a)*7.8,.008,Math.sin(a)*7.8);}
  const lineGeometry=new BufferGeometry();lineGeometry.setAttribute('position',new Float32BufferAttribute(lines,3));
  const lineMaterial=new LineBasicMaterial({color:0x968264,transparent:true,opacity:.5});scene.add(new LineSegments(lineGeometry,lineMaterial));
  const markers:Record<Side,Mesh>={} as Record<Side,Mesh>;
  const markerGeometry=new RingGeometry(.8,.9,40);
  const markerMaterials:MeshBasicMaterial[]=[];
  for(const side of ['player','enemy'] as const){const material=new MeshBasicMaterial({color:side==='player'?0x3185b6:0xb84332,transparent:true,opacity:.7,side:DoubleSide});markerMaterials.push(material);const marker=new Mesh(markerGeometry,material);marker.rotation.x=-Math.PI/2;marker.position.y=.03;scene.add(marker);markers[side]=marker;}
  // Four independent ink planes anchored in world space, not parented to the camera.
  const textures:CanvasTexture[]=[],inkMaterials:MeshBasicMaterial[]=[],inks:Mesh[]=[];
  const inkGeometry=new PlaneGeometry(6,6);
  const inkPositions=[[-11,4,-12],[12,7,-13],[-13,5,10],[14,8,12]];
  battle.background.forEach((entry,index)=>{
    const canvas=document.createElement('canvas');canvas.width=canvas.height=320;
    const context=canvas.getContext('2d')!;
    context.font='700 250px "Noto Serif JP",serif';context.textAlign='center';context.textBaseline='middle';
    context.fillStyle='#29251f';context.globalAlpha=.65;context.fillText(entry.char,160,168);
    context.globalAlpha=.15;context.fillText(entry.char,162,169);context.fillText(entry.char,158,167);
    for(let i=0;i<44;i++){context.globalAlpha=.05;context.beginPath();context.arc((i*73+19)%320,(i*47+11)%320,1+(i%3),0,Math.PI*2);context.fill();}
    const texture=new CanvasTexture(canvas);textures.push(texture);
    const material=new MeshBasicMaterial({map:texture,transparent:true,opacity:.28,depthWrite:false,depthTest:true,side:DoubleSide});inkMaterials.push(material);
    const ink=new Mesh(inkGeometry,material);ink.position.set(...inkPositions[index] as [number,number,number]);ink.lookAt(0,2,0);scene.add(ink);inks.push(ink);
  });
  const ringGeometry=new RingGeometry(.3,.37,48),ringMaterial=new MeshBasicMaterial({color:0xffa735,side:DoubleSide,transparent:true,depthWrite:false,blending:AdditiveBlending});
  const ring=new Mesh(ringGeometry,ringMaterial);scene.add(ring);
  const sparkGeometry=new BufferGeometry();sparkGeometry.setAttribute('position',new Float32BufferAttribute(new Float32Array(72),3));
  const sparkMaterial=new PointsMaterial({color:0xffd454,size:.14,transparent:true,depthWrite:false,blending:AdditiveBlending});
  const sparks=new Points(sparkGeometry,sparkMaterial);sparks.frustumCulled=false;scene.add(sparks);
  ring.visible=sparks.visible=false;
  const pulses={player:{time:-10000,index:-1,rainbow:false},enemy:{time:-10000,index:-1,rainbow:false}};
  let action:ActionState|undefined,burstTime=-10000,finishTime=0,outcome:Outcome|undefined;
  let orbit=0,viewAngle=0,lastFrame=performance.now();
  const verticalAxis=new Vector3(0,1,0);
  const resize=():void=>{renderer.setSize(host.clientWidth,host.clientHeight,false);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();};
  const observer=new ResizeObserver(resize);observer.observe(host);resize();
  renderer.setAnimationLoop(()=>{
    const now=performance.now(),time=now/1000;
    const dt=Math.min(.05,Math.max(0,(now-lastFrame)/1000));lastFrame=now;
    if(action)orbit=followOrbit(orbit,action.actors.player.position,dt,reduced);
    const fit=Math.max(1,.95/camera.aspect);
    if(action){
      const pose=followCameraPose(action.actors.player.position,orbit,camera.aspect);
      camera.position.set(pose.position.x,pose.position.y,pose.position.z);
      camera.lookAt(pose.target.x,pose.target.y,pose.target.z);
    }else{
      camera.position.set(Math.sin(orbit)*CAMERA.radius*fit,CAMERA.height*fit,Math.cos(orbit)*CAMERA.radius*fit);
      camera.lookAt(0,CAMERA.targetHeight,0);
    }
    viewAngle=Math.atan2(camera.position.x,camera.position.z);
    for(const side of ['player','enemy'] as const){
      const group=groups[side],actor=action?.actors[side],pulse=pulses[side];
      group.position.set(actor?.position.x??0,(side==='enemy'?1.55:1)+(reduced?0:Math.sin(time*2+(side==='enemy'?2:0))*.06),actor?.position.z??(side==='player'?4:-4));
      group.quaternion.copy(camera.quaternion);
      if(actor?.mode==='dodge'&&!reduced){group.rotateOnWorldAxis(verticalAxis,dodgeRotationY(actor.age,ACTION.dodge.duration,actor.facing,viewAngle));}
      if(actor?.mode==='windup'&&!reduced)group.scale.setScalar(.8*(1+Math.sin(time*38)*.035));else group.scale.setScalar(.8);
      markers[side].position.set(group.position.x,.03,group.position.z);
      const markerMaterial=markers[side].material as MeshBasicMaterial;
      markerMaterial.opacity=actor?.mode==='windup'?.65+Math.sin(time*25)*.3:.55;
      markers[side].scale.setScalar(actor?.mode==='windup'?1.3:1);
      const strength=Math.max(0,1-(now-pulse.time)/450);
      group.children.forEach((child,index)=>{
        const material=(child as Mesh).material as MeshStandardMaterial;
        material.opacity=actor && invulnerable(actor) ? .55 : 1;
        if(pulse.rainbow&&strength>0)material.emissive.setHSL((time+index*.16)%1,.8,.5);
        material.emissiveIntensity=(pulse.index===-1||pulse.index===index)?strength*.6:0;
      });
      if(outcome&&!reduced&&outcome!=='draw'){
        const loser=(outcome==='win'?'enemy':'player')===side;
        const t=Math.min(1,(now-finishTime)/1000);
        if(loser){group.position.y+=t*4;group.position.x+=(side==='enemy'?-1:1)*t*10;group.rotateZ(t*3);}
      }
    }
    inks.forEach((ink,i)=>{const base=inkPositions[i];ink.position.set(base[0]+(reduced?0:Math.sin(time*.2+i)*.35),base[1]+(reduced?0:Math.cos(time*.3+i)*.4),base[2]);const towardCamera=(base[0]*Math.sin(orbit)+base[2]*Math.cos(orbit))/Math.hypot(base[0],base[2]);const frontFade=towardCamera>.25?.25:1;inkMaterials[i].opacity=(reduced?.2:.18+(Math.sin(time*.45+i*1.7)+1)*.045)*frontFade;});
    const burst=(now-burstTime)/500;ring.visible=sparks.visible=!reduced&&burst>=0&&burst<1;
    if(ring.visible){ring.quaternion.copy(camera.quaternion);ring.scale.setScalar(1+burst*4);ringMaterial.opacity=1-burst;sparkMaterial.opacity=1-burst;const positions=sparkGeometry.attributes.position;for(let i=0;i<24;i++){const a=i*Math.PI/12,r=burst*(1.1+i%3*.25);positions.setXYZ(i,Math.cos(a)*r,Math.sin(a)*r,(i%3-1)*burst*.5);}positions.needsUpdate=true;}
    renderer.render(scene,camera);
  });
  let disposed=false;
  const dispose=():void=>{
    if(disposed)return;disposed=true;observer.disconnect();renderer.setAnimationLoop(null);
    materials.forEach(m=>m.dispose());models.dispose();textures.forEach(t=>t.dispose());inkMaterials.forEach(m=>m.dispose());markerMaterials.forEach(m=>m.dispose());
    for(const resource of [groundGeometry,groundMaterial,baseGeometry,baseMaterial,columnGeometry,columnMaterial,inkGeometry,floorGeometry,floorMaterial,rimGeometry,rimMaterial,innerGeometry,innerMaterial,lineGeometry,lineMaterial,markerGeometry,ringGeometry,ringMaterial,sparkGeometry,sparkMaterial])resource.dispose();
    renderer.dispose();renderer.domElement.remove();signal.removeEventListener('abort',dispose);
  };
  signal.addEventListener('abort',dispose,{once:true});
  return{
    startAction(state){action=state;},
    movement(input){return cameraRelativeInput(input,viewAngle);},
    source(side,index){scene.updateMatrixWorld(true);camera.updateMatrixWorld();const object=index===undefined?groups[side]:groups[side].children[index];const position=object.getWorldPosition(new Vector3()).project(camera),rect=host.getBoundingClientRect();return{x:rect.left+(position.x+1)*rect.width/2,y:rect.top+(1-position.y)*rect.height/2};},
    impact(side){burstTime=performance.now();groups[side].getWorldPosition(ring.position);sparks.position.copy(ring.position);pulses[side]={time:burstTime,index:-1,rainbow:false};},
    pulse(side,step){pulses[side]={time:performance.now(),index:step.index??-1,rainbow:step.rarity==='UR'};const rarity=RARITIES.find(r=>r.id===step.rarity);groups[side].children.forEach((child,index)=>{if(step.index!==undefined&&index!==step.index)return;const material=(child as Mesh).material as MeshStandardMaterial;material.emissive.set(rarity&&rarity.id!=='UR'?rarity.color:'#d59b44');if(rarity?.id==='UR')material.color.setHSL(index/4,.7,.5);else if(rarity)material.color.set(rarity.color);});},
    finish(result){outcome=result;finishTime=performance.now();},dispose,
  };
}
