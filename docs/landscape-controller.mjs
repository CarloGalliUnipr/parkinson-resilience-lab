import {computeRecoverySurface,surfaceCsv,LANDSCAPE_SETTINGS,isFailure} from './landscape-data.mjs';
import {equilibrium,eigen,limit} from './model.mjs';
import {LandscapeViewer} from './landscape-view.mjs';
const $=id=>document.getElementById(id);
const fmt=(v,n=3)=>Number.isFinite(v)?v.toFixed(n):'—';
const parameterDefs={
  lambda:['Chronic load λ',0.60,1.45,.01,'Raises stress generation and reserve erosion.'],
  lambdaB:['Comparison load λ₂',0.60,1.45,.01,'Second surface; same coordinates and height scale.'],
  am:['Reserve recovery aM',.1,1,.05,'Recovery toward baseline mitochondrial reserve.'],
  bm:['Stress erosion bM',.1,1,.05,'Load-dependent erosion of reserve.'],
  as:['Stress generation aS',.1,.8,.05,'Source of composite stress.'],
  bs:['Stress clearance bS',.1,1,.05,'Mitochondrial reserve–dependent stress removal.'],
  seed:['Random seed',1,1000,1,'Changes the stochastic path overlay.'],
  sigmaScale:['Noise intensity multiplier',0,2,.1,'1 = reference model noise; does not alter deterministic recovery.']
};
export function createLandscapeController({state,parameter}){
  const view=new LandscapeViewer($('landscapePlot'));
  const ls={compare:false,threshold:true,noise:false,lambdaB:1.4,seed:42};
  let active=false,timer=0,token=0,lastSurfaces=[],lastKey='';
  const cache=new Map();
  const slider=(key,value)=>{
    const [title,min,max,step,help]=parameterDefs[key];
    return `<div class="field"><label for="l-${key}">${title}<output id="lout-${key}">${value}</output></label><input id="l-${key}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"><small>${help}</small></div>`;
  };
  const get=(key)=>key==='lambdaB'||key==='seed'?ls[key]:state[key];
  const input=(key)=>{
    const el=$('l-'+key),out=$('lout-'+key);if(!el)return;
    el.oninput=()=>{
      const value=Number(el.value);if(key==='lambdaB'||key==='seed')ls[key]=value;else state[key]=value;
      out.textContent=key==='seed'?String(value):value.toFixed(2);
      if(key==='seed'){
        if(lastSurfaces.length) view.configure({surfaces:lastSurfaces,showThreshold:ls.threshold,showNoise:ls.noise,seed:ls.seed,p:parameter()});
      } else schedule();
    };
  };
  const cacheKey=(lambda,p)=>[lambda,p.aM,p.bM,p.Mrest,p.aS,p.bS,p.Sc,p.Mc].map(v=>Number(v).toFixed(6)).join('|');
  function surface(lambda,p){
    const key=cacheKey(lambda,p);
    if(cache.has(key))return cache.get(key);
    const result=computeRecoverySurface(lambda,p);
    cache.set(key,result);
    if(cache.size>8)cache.delete(cache.keys().next().value);
    return result;
  }
  function explain(surfaces,p){
    const parts=[];
    for(const s of surfaces){
      const [M,S]=s.eq;
      const mu=eigen(s.lambda,p);
      let explanation=`λ = ${s.lambda.toFixed(2)}: M* = ${fmt(M)}, S* = ${fmt(S)}, dominant eigenvalue = ${fmt(mu,4)}.`;
      if(!s.valid) explanation+=' Reference equilibrium lies within the operational failure region, or the positive equilibrium is absent. No recovery surface is defined for these settings.';
      else explanation+=mu<0?' The equilibrium remains locally linearly stable.':' Stability requires separate interpretation for these parameters.';
      parts.push(explanation);
    }
    const eps=LANDSCAPE_SETTINGS.tolerance;
    if(surfaces.length===2)parts.push(`Both surfaces use the same M, S, and recovery-time axes. A fixed Euclidean target radius ε = ${eps} is used for comparability.`);
    if(ls.noise)parts.push('Noise affects only the sample trajectory on the state-space floor; it does not change this deterministic surface.');
    $('landscape-warning').textContent=parts.join(' ');
  }
  function compute(){
    if(!active)return;
    const p=parameter(),lambdas=ls.compare?[state.lambda,ls.lambdaB]:[state.lambda];
    $('landscape-warning').textContent='Computing deterministic recovery from the state-space grid…';
    const myToken=++token;
    // Permit one paint so the controls don't appear frozen on slower devices.
    requestAnimationFrame(()=>setTimeout(()=>{
      if(!active||myToken!==token)return;
      try{
        lastSurfaces=lambdas.map(lam=>surface(lam,p));
        view.configure({surfaces:lastSurfaces,showThreshold:ls.threshold,showNoise:ls.noise,seed:ls.seed,p});
        explain(lastSurfaces,p);
      }catch(err){$('landscape-warning').textContent=`Unable to render the landscape: ${err.message}`;console.error(err)}
    },0));
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(compute,160)}
  function setCheck(id,key){const el=$(id);el.checked=ls[key];el.onchange=()=>{
    ls[key]=el.checked;
    if(key==='compare'){$('landscape-second').hidden=!ls.compare;schedule()}
    else {if(key==='noise')$('landscape-seed-wrap').hidden=!ls.noise;if(lastSurfaces.length)view.configure({surfaces:lastSurfaces,showThreshold:ls.threshold,showNoise:ls.noise,seed:ls.seed,p:parameter()})}
  }}
  function syncSliders(){for(const key of ['lambda','lambdaB','am','bm','as','bs','seed','sigmaScale']){
    const el=$('l-'+key),out=$('lout-'+key);if(el){el.value=get(key);out.textContent=key==='seed'?String(get(key)):Number(get(key)).toFixed(2)}
  }}
  function render(){
    active=true;
    // Ranges are placed once; their current values are kept in shared state.
    if(!$('l-lambda')){
      $('landscape-sliders').innerHTML=slider('lambda',state.lambda);
      $('landscape-second').innerHTML=slider('lambdaB',ls.lambdaB);
      $('landscape-seed-wrap').innerHTML=slider('sigmaScale',state.sigmaScale)+slider('seed',ls.seed);
      $('landscape-advanced').innerHTML=['am','bm','as','bs'].map(key=>slider(key,state[key])).join('');
      for(const key of ['lambda','lambdaB','am','bm','as','bs','seed','sigmaScale'])input(key);
      setCheck('landscape-compare','compare');setCheck('landscape-threshold','threshold');setCheck('landscape-noise','noise');
      $('landscape-presets').querySelectorAll('button').forEach(b=>b.onclick=()=>{state.lambda=Number(b.dataset.landscapePreset);syncSliders();schedule()});
      $('landscape-camera').onclick=()=>view.resetCamera();
      $('landscape-export').onclick=()=>{
        if(!lastSurfaces.length)return;
        const csv=surfaceCsv(lastSurfaces),blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob);
        const a=document.createElement('a');a.href=url;a.download='pd-recovery-landscapes.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
      };
    }
    syncSliders();schedule();
  }
  function hide(){active=false;clearTimeout(timer);token++}
  function reset(){state.lambda=1.0;ls.compare=false;ls.lambdaB=1.4;ls.threshold=true;ls.noise=false;ls.seed=42;state.sigmaScale=1;
    $('landscape-second').hidden=true;$('landscape-seed-wrap').hidden=true;
    for(const [id,key] of [['landscape-compare','compare'],['landscape-threshold','threshold'],['landscape-noise','noise']])$(id).checked=ls[key];
    view.resetCamera();render();
  }
  return {render,hide,reset};
}
