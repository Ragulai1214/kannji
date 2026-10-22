import { BufferGeometry, Color, Float32BufferAttribute, Group, Line, LineBasicMaterial, Mesh, MeshBasicMaterial, Points, PointsMaterial, Scene, TorusGeometry } from 'three';
import type { ActionState } from '../game/action.ts';
import type { dodgeVisual } from '../game/camera.ts';
import type { Side } from '../game/types.ts';
import { ACTION } from '../data/action.ts';

export type DodgeVisual = ReturnType<typeof dodgeVisual>;

export function createBattleEffects(scene: Scene, reduced: boolean) {
  // A small pool lets simultaneous and consecutive hits retain their own burst.
  const bursts = Array.from({length:6},()=>{
    const geometry=new BufferGeometry();
    geometry.setAttribute('position',new Float32BufferAttribute(new Float32Array(48*3),3));
    const colors:number[]=[];
    for(let i=0;i<48;i++){const c=new Color(i%2?0xffd52a:0xf12c20);colors.push(c.r,c.g,c.b);}
    geometry.setAttribute('color',new Float32BufferAttribute(colors,3));
    const material=new PointsMaterial({vertexColors:true,size:.12,transparent:true,depthWrite:false});
    const points=new Points(geometry,material);points.visible=false;points.frustumCulled=false;scene.add(points);
    return {geometry,material,points,start:-100,seed:0};
  });
  let next=0;
  const ringGeometry=new TorusGeometry(1,.035,6,64);
  const tornadoes=(['player','enemy'] as const).map(side=>{
    const group=new Group(),spin=new Group();group.add(spin);scene.add(group);group.visible=false;
    const material=new MeshBasicMaterial({color:0x58d9ff,transparent:true,opacity:.7,depthWrite:false});
    const lineMaterial=new LineBasicMaterial({color:0x58d9ff,transparent:true,opacity:.7,depthWrite:false});
    const geometries:BufferGeometry[]=[];
    const rings:Mesh[]=[];
    for(let strand=0;strand<3;strand++){
      const vertices:number[]=[];
      for(let i=0;i<=180;i++){
        const t=i/180,a=t*Math.PI*6+strand*Math.PI*2/3,r=.7+t*.8;
        vertices.push(Math.cos(a)*r,(t-.5)*1.8,Math.sin(a)*r);
      }
      const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(vertices,3));geometries.push(geometry);spin.add(new Line(geometry,lineMaterial));
    }
    for(let i=0;i<5;i++){
      const ring=new Mesh(ringGeometry,material);ring.rotation.x=Math.PI/2;ring.position.y=(i/3-.5)*1.8;ring.scale.setScalar(.7+i/3*.8);ring.visible=i<4;spin.add(ring);rings.push(ring);
    }
    return {side,group,spin,material,lineMaterial,geometries,rings,visual:{axis:'y',sign:1,angle:0} as DodgeVisual};
  });
  return {
    hit(side:Side,state:ActionState){
      if(reduced)return;
      const burst=bursts[next++%bursts.length],actor=state.actors[side];
      burst.start=state.time;burst.seed=next*.7;burst.points.position.set(actor.position.x,side==='player'?1:1.55,actor.position.z);
    },
    dodge(side:Side,visual:DodgeVisual){
      const tornado=tornadoes.find(t=>t.side===side)!;tornado.visual=visual;
      const radius=(t:number):number=>.7+.8*(visual.axis==='x'?Math.sin(Math.PI*t):t);
      tornado.geometries.forEach((geometry,strand)=>{
        const positions=geometry.attributes.position;
        for(let i=0;i<=180;i++){
          const t=i/180,a=t*Math.PI*6+strand*Math.PI*2/3,r=radius(t);
          positions.setXYZ(i,Math.cos(a)*r,(t-.5)*1.8,Math.sin(a)*r);
        }
        positions.needsUpdate=true;geometry.computeBoundingSphere();
      });
      const count=visual.axis==='x'?5:4;
      tornado.rings.forEach((ring,i)=>{
        ring.visible=i<count;if(!ring.visible)return;
        const t=i/(count-1);ring.position.y=(t-.5)*1.8;ring.scale.setScalar(radius(t));
      });
    },
    update(state:ActionState){
      bursts.forEach(b=>{
        const age=state.time-b.start;b.points.visible=!reduced&&age>=0&&age<.55;if(!b.points.visible)return;
        b.material.opacity=1-age/.55;
        const positions=b.geometry.attributes.position;
        for(let i=0;i<48;i++){
          const y=1-2*(i+.5)/48,a=i*2.39996+b.seed,r=Math.sqrt(1-y*y),speed=3+i%5*.8;
          positions.setXYZ(i,Math.cos(a)*r*age*speed,y*age*speed-age*age*3,Math.sin(a)*r*age*speed);
        }
        positions.needsUpdate=true;
      });
      tornadoes.forEach(t=>{
        const actor=state.actors[t.side];t.group.visible=!reduced&&actor.mode==='dodge';if(!t.group.visible)return;
        const progress=actor.age/ACTION.dodge.duration;
        t.group.position.set(actor.position.x,t.side==='player'?1:1.55,actor.position.z);
        t.group.rotation.set(0,t.visual.angle,t.visual.axis==='x'?-Math.PI/2:0);
        t.spin.rotation.y=progress*Math.PI*4*t.visual.sign;
        t.group.scale.setScalar(.8+Math.sin(progress*Math.PI)*.25);
        t.material.opacity=Math.min(1,progress*10,(1-progress)*6)*.75;
        t.lineMaterial.opacity=t.material.opacity;
      });
    },
    dispose(){
      bursts.forEach(b=>{scene.remove(b.points);b.geometry.dispose();b.material.dispose();});
      tornadoes.forEach(t=>{scene.remove(t.group);t.material.dispose();t.lineMaterial.dispose();t.geometries.forEach(g=>g.dispose());});ringGeometry.dispose();
    },
  };
}
