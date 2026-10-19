/** Dependency-free, interactive 3D canvas renderer for the recovery-time surface. */
import {DEFAULTS,stochastic} from './model.mjs';

const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const COLOR={bg:'#081324',grid:'#1b354f',label:'#a6bfd9',edge:'#5ba7df',cyan:'#7bdeff',orange:'#ff9678'};
export class LandscapeViewer {
  constructor(root){
    this.root=root;
    this.camera={yaw:-0.74,pitch:0.66,zoom:1};
    this.showThreshold=true;
    this.showNoise=false;
    this.seed=42;
    this.p=DEFAULTS;
    this.surfaces=[];
    this.panels=[];
    this.resizeObserver=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>this.draw()):null;
  }
  configure({surfaces,showThreshold=true,showNoise=false,seed=42,p=DEFAULTS}){
    this.surfaces=surfaces;this.showThreshold=showThreshold;this.showNoise=showNoise;this.seed=seed;this.p=p;
    this.root.innerHTML='';this.panels=[];
    this.root.classList.toggle('comparing',surfaces.length===2);
    for(const [index,surface] of surfaces.entries()){
      const panel=document.createElement('div'); panel.className='landscape-panel';
      const label=document.createElement('div');label.className='landscape-panel-head';label.innerHTML=`<span>${surfaces.length>1?'LANDSCAPE '+(index+1):'3D RECOVERY-TIME SURFACE'}</span><strong>λ = ${surface.lambda.toFixed(2)}</strong>`;
      const canvas=document.createElement('canvas');canvas.className='landscape-canvas';canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`Interactive three-dimensional deterministic recovery-time landscape for chronic load ${surface.lambda.toFixed(2)}. Drag to rotate, scroll to zoom.`);
      const footer=document.createElement('div');footer.className='landscape-panel-foot';
      const n=surface.counts;footer.textContent=surface.valid?`${n.recovered} grid points recovered · ${n.censored} exceeded ${surface.options.maxTime} units · ${n.failure} entered failure region`:'No viable positive equilibrium outside the chosen failure thresholds.';
      panel.append(label,canvas,footer);this.root.append(panel);this.panels.push({canvas,surface});
      this.bindDrag(canvas);
    }
    this.resizeObserver?.disconnect();for(const p of this.panels)this.resizeObserver?.observe(p.canvas);
    this.draw();
  }
  bindDrag(canvas){
    let last=null;
    canvas.addEventListener('pointerdown',e=>{last={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId)});
    canvas.addEventListener('pointermove',e=>{
      if(!last)return;
      this.camera.yaw+=(e.clientX-last.x)*.009;
      this.camera.pitch=clamp(this.camera.pitch+(e.clientY-last.y)*.006,.16,1.26);
      last={x:e.clientX,y:e.clientY};this.draw();
    });
    const end=()=>last=null;canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
    canvas.addEventListener('wheel',e=>{e.preventDefault();this.camera.zoom=clamp(this.camera.zoom*(e.deltaY>0?.90:1.10),.55,1.9);this.draw()},{passive:false});
    canvas.addEventListener('keydown',e=>{
      if(e.key==='ArrowLeft')this.camera.yaw-=.10;else if(e.key==='ArrowRight')this.camera.yaw+=.10;
      else if(e.key==='ArrowUp')this.camera.pitch=clamp(this.camera.pitch-.08,.16,1.26);
      else if(e.key==='ArrowDown')this.camera.pitch=clamp(this.camera.pitch+.08,.16,1.26);else return;
      this.draw();e.preventDefault();
    });
    canvas.tabIndex=0;
  }
  resetCamera(){this.camera={yaw:-.74,pitch:.66,zoom:1};this.draw()}
  projection(M,S,time,options,width,height){
    const o=options;
    const x=2.42*(M-(o.Mmin+o.Mmax)/2)/(o.Mmax-o.Mmin);
    const y=2.54*(S-(o.Smin+o.Smax)/2)/(o.Smax-o.Smin);
    const z=time/o.maxTime*1.62;
    const c=Math.cos(this.camera.yaw),s=Math.sin(this.camera.yaw);
    const xr=c*x-s*y,yr=s*x+c*y;
    const q=this.camera.pitch;
    const horizontal=xr,vertical=yr*Math.sin(q)-z*Math.cos(q);
    const depth=yr*Math.cos(q)+z*Math.sin(q);
    const scale=Math.min(width/4.5,height/3.6)*this.camera.zoom;
    return {x:width*.50+scale*horizontal,y:height*.58+scale*vertical,depth};
  }
  draw(){for(const pane of this.panels)this.drawOne(pane)}
  drawOne({canvas,surface}){
    const rect=canvas.getBoundingClientRect(),w=Math.max(200,rect.width||650),h=Math.max(180,rect.height||440);
    const ratio=Math.min(devicePixelRatio||1,2);
    if(canvas.width!==Math.floor(w*ratio)||canvas.height!==Math.floor(h*ratio)){
      canvas.width=Math.floor(w*ratio);canvas.height=Math.floor(h*ratio);
    }
    const ctx=canvas.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);
    ctx.clearRect(0,0,w,h);ctx.fillStyle=COLOR.bg;ctx.fillRect(0,0,w,h);
    const {options:o,cells,eq}=surface,project=(M,S,t)=>this.projection(M,S,t,o,w,h);
    const line=(points,color,width=1,dash=[])=>{
      ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);
      for(const [i,p] of points.entries()){if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y)}
      ctx.stroke();ctx.setLineDash([]);
    };
    // Ground plane with scientifically defined state-space boundaries.
    const corners=[project(o.Mmin,o.Smin,0),project(o.Mmax,o.Smin,0),project(o.Mmax,o.Smax,0),project(o.Mmin,o.Smax,0)];
    ctx.beginPath();corners.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();
    ctx.fillStyle='#0e253c';ctx.fill();ctx.strokeStyle='#376086';ctx.stroke();
    for(let k=1;k<=5;k++){
      let M=o.Mmin+(o.Mmax-o.Mmin)*k/6,S=o.Smin+(o.Smax-o.Smin)*k/6;
      line([project(M,o.Smin,0),project(M,o.Smax,0)],COLOR.grid);
      line([project(o.Mmin,S,0),project(o.Mmax,S,0)],COLOR.grid);
    }
    // Exact operational failure set: BOTH conditions, not a separatrix or single line.
    if(this.showThreshold){
      const Mthr=clamp(this.p.Mc,o.Mmin,o.Mmax),Sthr=clamp(this.p.Sc,o.Smin,o.Smax);
      const red=[project(o.Mmin,Sthr,-2),project(Mthr,Sthr,-2),project(Mthr,o.Smax,-2),project(o.Mmin,o.Smax,-2)];
      ctx.beginPath();red.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();
      ctx.fillStyle='rgba(255,106,101,.33)';ctx.fill();ctx.strokeStyle='rgba(255,156,129,.85)';ctx.lineWidth=1.5;ctx.stroke();
    }
    // Draw mesh patches back-to-front with a consistent physical vertical scale.
    if(surface.valid){
      const patches=[];
      const zpoint=c=>c.status==='recovered'?c.time:c.status==='censored'?o.maxTime:null;
      for(let j=0;j<cells.length-1;j++)for(let i=0;i<cells[j].length-1;i++){
        const samples=[cells[j][i],cells[j][i+1],cells[j+1][i+1],cells[j+1][i]];
        if(samples.some(c=>zpoint(c)===null))continue;
        const points=samples.map(c=>project(c.M,c.S,zpoint(c)));
        const meanTime=samples.reduce((sum,c)=>sum+zpoint(c),0)/4;
        const censored=samples.some(c=>c.status==='censored');
        patches.push({points,depth:points.reduce((sum,p)=>sum+p.depth,0)/4,meanTime,censored});
      }
      patches.sort((a,b)=>a.depth-b.depth);
      for(const patch of patches){
        const q=clamp(patch.meanTime/o.maxTime,0,1);
        // Blue only for computed recovery and censored values; reddish color is reserved for failure.
        const hue=208-q*19,sat=64+q*22,lum=17+q*43;
        ctx.fillStyle=patch.censored?'rgba(100,130,194,.72)':`hsla(${hue},${sat}%,${lum}%,.94)`;
        ctx.strokeStyle='rgba(107,186,244,.19)';ctx.lineWidth=.53;
        ctx.beginPath();patch.points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fill();ctx.stroke();
      }
    } else {
      ctx.font='14px system-ui,sans-serif';ctx.fillStyle='#ffb1a6';ctx.fillText('No viable reference equilibrium for these parameters',22,35);
    }
    // Draw a stochastic state-space path on the ground plane (NOT an energy path).
    if(this.showNoise&&surface.valid){
      const result=stochastic(surface.lambda,{p:this.p,T:140,dt:.04,seed:this.seed,recordEvery:45});
      const pts=result.points.filter(q=>!Number.isFinite(result.escape)||q.t<=result.escape).filter(q=>q.M>=o.Mmin&&q.M<=o.Mmax&&q.S>=o.Smin&&q.S<=o.Smax).map(q=>project(q.M,q.S,-8));
      if(pts.length>1){line(pts,'rgba(3,9,20,.88)',4.5);line(pts,COLOR.cyan,2.5);const end=pts.at(-1);ctx.beginPath();ctx.arc(end.x,end.y,4.5,0,2*Math.PI);ctx.fillStyle=Number.isFinite(result.escape)?COLOR.orange:COLOR.cyan;ctx.fill()}
    }
    // Draw equilibrium at recovery time zero, distinguishing it from first-passage set.
    if(surface.valid){const star=project(eq[0],eq[1],0);ctx.save();ctx.shadowColor=COLOR.cyan;ctx.shadowBlur=14;ctx.beginPath();ctx.arc(star.x,star.y,6.4,0,2*Math.PI);ctx.fillStyle='#daf8ff';ctx.fill();ctx.restore();ctx.strokeStyle='#0b1f32';ctx.lineWidth=2;ctx.stroke();
      ctx.fillStyle='#e0f7ff';ctx.font='bold 12px system-ui,sans-serif';ctx.fillText('equilibrium',star.x+11,star.y-10);
    }
    // Axis labels are in actual M and S coordinates, and z is a FIRST-ARRIVAL TIME.
    const text=(s,pt,dx=0,dy=0,color=COLOR.label)=>{ctx.font='12px system-ui,sans-serif';ctx.fillStyle=color;ctx.fillText(s,pt.x+dx,pt.y+dy)};
    const base=project(o.Mmin,o.Smin,0);
    line([base,project(o.Mmin,o.Smin,o.maxTime)],'#6e9ab8',1.2);
    text('M · mitochondrial reserve',project(o.Mmax,o.Smin,0),-78,22);
    text('S · composite stress',project(o.Mmin,o.Smax,0),-32,23);
    text('Recovery time',project(o.Mmin,o.Smin,o.maxTime),-30,-12);
    text('0',base,-15,15);
    text(String(o.maxTime),project(o.Mmin,o.Smin,o.maxTime),-28,5);
    // Top-left caption describes height unambiguously.
    ctx.font='11px system-ui,sans-serif';ctx.fillStyle='#8ca8c5';ctx.fillText('HEIGHT = time to reach equilibrium neighborhood',16,22);
  }
}
