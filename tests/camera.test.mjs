import test from 'node:test';
import assert from 'node:assert/strict';
import { followOrbit, cameraRelativeInput, dodgeRotationY, followCameraPose } from '../src/game/camera.ts';
import { CAMERA } from '../src/data/camera.ts';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('camera input follows the view at each quarter turn without changing speed or action flags',()=>{
  const forward={x:0,z:-1,attack:true,dodge:false};
  for(const [angle,x,z]of [[0,0,-1],[Math.PI/2,-1,0],[Math.PI,0,1],[-Math.PI/2,1,0]]){
    const value=cameraRelativeInput(forward,angle);close(value.x,x);close(value.z,z);assert.equal(value.attack,true);assert.equal(value.dodge,false);
  }
  for(let i=0;i<50;i++){const value=cameraRelativeInput({x:.3,z:.7,attack:false,dodge:true},i*.3);close(Math.hypot(value.x,value.z),Math.hypot(.3,.7));assert.equal(value.dodge,true);}
});
test('camera switches sides smoothly with faster bounded rotation after center crossing',()=>{
  let angle=0;
  for(let i=0;i<60;i++){
    const next=followOrbit(angle,{x:0,z:-2},1/60);
    assert.ok(next>=angle);assert.ok(next-angle<=CAMERA.maxAngularSpeed/60+1e-12);angle=next;
  }
  assert.ok(Math.abs(angle-Math.PI)<.002);
  const wrap=followOrbit(Math.PI-.01,{x:-.04,z:-4},1/60);
  assert.ok(wrap>Math.PI-.01);
});
test('center dead zone avoids input reversal and settled camera faces center from outside player',()=>{
  close(followOrbit(.5,{x:0,z:0},1/60),.5);
  close(followOrbit(.5,{x:.1,z:-.1},1/60),.5);
  assert.ok(followOrbit(0,{x:4,z:0},1/60,true)<followOrbit(0,{x:4,z:0},1/60));
  for(const p of [{x:3,z:4},{x:-3,z:4},{x:-3,z:-4}]){
    let angle=2;for(let i=0;i<180;i++)angle=followOrbit(angle,p,1/60);
    const pose=followCameraPose(p,angle,.5);
    close(pose.position.x*p.z-pose.position.z*p.x,0);
    assert.ok(pose.position.x*p.x+pose.position.z*p.z>p.x*p.x+p.z*p.z);
    close(pose.target.x,0);close(pose.target.z,0);
  }
});
test('dodge makes a full Y-axis turn with direction relative to the camera',()=>{
  close(dodgeRotationY(0,.48,{x:1,z:0},0),0);
  close(dodgeRotationY(.12,.48,{x:1,z:0},0),Math.PI/2);
  close(dodgeRotationY(.48,.48,{x:1,z:0},0),Math.PI*2);
  close(dodgeRotationY(.48,.48,{x:-1,z:0},0),-Math.PI*2);
  close(dodgeRotationY(.48,.48,{x:0,z:-1},Math.PI/2),Math.PI*2);
});
test('close camera stays above and behind the player at all orbit angles and portrait ratios',()=>{
  for(const aspect of [1.8,.5])for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2]){
    const p={x:3,z:-2},pose=followCameraPose(p,angle,aspect);
    const dx=pose.position.x-p.x,dz=pose.position.z-p.z;
    assert.ok(Math.hypot(dx,dz)>=6 && Math.hypot(dx,dz)<=8.71);
    close(dx*Math.cos(angle)-dz*Math.sin(angle),0);
    assert.ok(dx*Math.sin(angle)+dz*Math.cos(angle)>0);
    close(pose.position.y,4);close(pose.target.y,1);
    close(pose.target.x,0);close(pose.target.z,0);
  }
});
