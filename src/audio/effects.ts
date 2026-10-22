import { SOUND } from '../data/sound.ts';

export type Effect = 'start' | 'draw' | 'reveal' | 'keep' | 'discard' | 'point' | 'rare' | 'attack' | 'dodge' | 'impact' | 'win' | 'lose' | 'tie';
const NOTES: Partial<Record<Effect, readonly number[]>> = {
  start:[330,440,660],draw:[150,220],reveal:[440,660],keep:[550,825],discard:[220,130],
  point:[660,990],rare:[660,880,1320,1760],win:[440,550,660,880,1100],lose:[330,260,165],tie:[440,440],
};

export function createEffects() {
  let context:AudioContext|undefined,enabled=true,disposed=false;
  let bus:{input:GainNode;compressor:DynamicsCompressorNode;delay:DelayNode;echo:GainNode}|undefined;
  let noiseBuffer:AudioBuffer|undefined;
  const voices=new Map<AudioScheduledSourceNode,AudioNode[]>();
  function stop():void {
    voices.forEach((nodes,voice)=>{voice.onended=null;try{voice.stop();}catch{/* already ended */}voice.disconnect();nodes.forEach(node=>node.disconnect());});voices.clear();
    if(bus){Object.values(bus).forEach(node=>node.disconnect());bus=undefined;}
  }
  async function unlock():Promise<void> {
    if(!enabled||disposed)return;
    try{context??=new AudioContext();if(context.state==='suspended')await context.resume();}catch{/* Optional audio must not block gameplay. */}
  }
  function output():GainNode {
    if(!bus){
      const input=context!.createGain(),compressor=context!.createDynamicsCompressor(),delay=context!.createDelay(.2),echo=context!.createGain();
      input.gain.value=SOUND.volume;compressor.threshold.value=-16;compressor.knee.value=12;compressor.ratio.value=5;compressor.attack.value=.003;compressor.release.value=.15;
      delay.delayTime.value=.075;echo.gain.value=.16;
      input.connect(compressor);input.connect(delay);delay.connect(echo);echo.connect(compressor);compressor.connect(context!.destination);
      bus={input,compressor,delay,echo};
    }
    return bus.input;
  }
  function track(source:AudioScheduledSourceNode,nodes:AudioNode[],start:number,end:number):void {
    voices.set(source,nodes);
    source.onended=()=>{voices.delete(source);source.disconnect();nodes.forEach(node=>node.disconnect());};
    source.start(start);source.stop(end);
  }
  function tone(frequency:number,endFrequency:number,time:number,length:number,level:number,type:OscillatorType='sine'):void {
    if(voices.size>=SOUND.maxVoices)return;
    const oscillator=context!.createOscillator(),gain=context!.createGain();oscillator.type=type;
    oscillator.frequency.setValueAtTime(frequency,time);oscillator.frequency.exponentialRampToValueAtTime(endFrequency,time+length);
    gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(level,time+.006);gain.gain.exponentialRampToValueAtTime(.0001,time+length);
    oscillator.connect(gain);gain.connect(output());track(oscillator,[gain],time,time+length+.02);
  }
  function noise(time:number,length:number,from:number,to:number,level:number,type:BiquadFilterType='bandpass',attack=.025):void {
    if(voices.size>=SOUND.maxVoices)return;
    if(!noiseBuffer){
      noiseBuffer=context!.createBuffer(1,context!.sampleRate,context!.sampleRate);
      const samples=noiseBuffer.getChannelData(0);let seed=173;
      for(let i=0;i<samples.length;i++){seed=seed*16807%2147483647;samples[i]=seed/1073741824-1;}
    }
    const source=context!.createBufferSource(),filter=context!.createBiquadFilter(),gain=context!.createGain();source.buffer=noiseBuffer;
    filter.type=type;filter.Q.value=.8;filter.frequency.setValueAtTime(from,time);filter.frequency.exponentialRampToValueAtTime(to,time+length);
    gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(level,time+Math.min(attack,length*.15));gain.gain.exponentialRampToValueAtTime(.0001,time+length);
    source.connect(filter);filter.connect(gain);gain.connect(output());track(source,[filter,gain],time,time+length+.02);
  }
  function play(effect:Effect):void {
    if(!enabled||disposed||!context||context.state!=='running')return;
    const start=context.currentTime;
    if(effect==='impact'){
      // Two tight pulses give the hit a compact "dyukushi" punch and snap.
      tone(320,78,start,.075,1.35,'square');
      tone(210,48,start+.035,.105,1.1,'triangle');
      noise(start+.048,.065,2200,650,.95,'bandpass',.001);
      // High, slightly inharmonic partials ring above the punch like a critical metal hit.
      tone(3400,3250,start+.006,.38,.8);
      tone(5270,5030,start+.008,.27,.45);
      tone(7130,6800,start+.01,.17,.2,'triangle');
      tone(170,38,start,.27,1.5,'triangle');tone(80,32,start,.34,.8);
      noise(start,.18,5000,1000,1.25,'highpass');noise(start,.24,1800,180,.9,'lowpass');
      tone(1450,480,start,.13,.18,'square');tone(2270,820,start+.012,.16,.13,'triangle');return;
    }
    if(effect==='attack'){
      // Critical-hit sting: bright metallic partials over a tight cracking impact.
      tone(2800,2450,start,.23,1.05,'triangle');
      tone(4310,3950,start,.16,.65);
      tone(6170,5600,start+.004,.10,.38);
      noise(start+.008,.065,3200,1800,2.4,'highpass',.001);
      noise(start+.008,.10,4400,1500,1.35,'bandpass',.001);
      tone(980,520,start+.008,.055,.45,'triangle');return;
    }
    if(effect==='dodge'){
      // Air-pressure burst followed by a broad, rushing wind tail.
      noise(start,.065,1700,220,.95,'lowpass',.001);
      noise(start,.12,3500,1600,1.15,'highpass',.002);
      noise(start+.012,.34,2400,380,1.6,'bandpass',.006);
      noise(start+.065,.26,4200,1100,.65,'highpass',.015);
      tone(95,32,start,.1,.45);return;
    }
    const celebratory=effect==='win'||effect==='rare'||effect==='start';
    (NOTES[effect]??[]).forEach((frequency,index)=>{
      const time=start+index*(effect==='point'?.035:.075),length=effect==='win'||effect==='lose'?.36:.2;
      tone(frequency,frequency*.98,time,length,.7,'triangle');
      if(celebratory)tone(frequency*2,frequency*2,time+.012,length*.85,.19);
    });
    if(effect==='win'){tone(110,55,start,.32,.65,'triangle');noise(start,.2,2600,700,.3);}
    if(effect==='rare')noise(start,.2,5000,1800,.32,'highpass');
  }
  return {
    unlock,play,stop,
    get enabled(){return enabled;},
    toggle():void{enabled=!enabled;if(!enabled)stop();else void unlock();},
    dispose():void{disposed=true;stop();noiseBuffer=undefined;void context?.close().catch(()=>{});},
  };
}
