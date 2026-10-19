/**
 * Deterministic first-arrival times in the (M,S) plane.
 * These are NOT potential energies, quasipotentials, or basin boundaries.
 * A trajectory is classified as having reached the operational failure set
 * when BOTH S > Sc AND M < Mc, even if the deterministic vector field might
 * later exit that region without the model's first-passage termination rule.
 */
import {DEFAULTS, equilibrium, rk4} from './model.mjs';

export const LANDSCAPE_SETTINGS = Object.freeze({
  Mmin: 0.025, Mmax: 1.10, Smin: 0, Smax: 6.0,
  nM: 30, nS: 34, maxTime: 220, dt: 0.35, tolerance: 0.08
});

export function isFailure(M, S, p=DEFAULTS){return M < p.Mc && S > p.Sc;}

export function recoveryFromState(M0,S0,lambda,p=DEFAULTS,options={}){
  const {maxTime=220,dt=0.35,tolerance=0.08}=options;
  const [Me,Se]=equilibrium(lambda,p);
  if (!Number.isFinite(Me+Se)) return {time:null,status:'invalid'};
  if (isFailure(Me,Se,p)) return {time:null,status:'equilibrium-in-failure'};
  if (isFailure(M0,S0,p)) return {time:null,status:'failure'};
  let M=M0,S=S0;
  if (Math.hypot(M-Me,S-Se)<=tolerance) return {time:0,status:'recovered'};
  const n=Math.ceil(maxTime/dt),h=maxTime/n;
  for(let i=1;i<=n;i++){
    const [m2,s2]=rk4(M,S,h,lambda,p);
    if(!Number.isFinite(m2+s2)||Math.abs(m2+s2)>1e8) return {time:null,status:'diverged'};
    // Failure before recovery, with a discrete first-entry check like the SDE model.
    if(isFailure(m2,s2,p)) return {time:null,status:'failure'};
    const dBefore=Math.hypot(M-Me,S-Se),dAfter=Math.hypot(m2-Me,s2-Se);
    if(dAfter<=tolerance){
      // Interpolate the first crossing, rather than reporting just the time-grid point.
      const q=(dBefore-dAfter)>1e-14 ? Math.max(0,Math.min(1,(dBefore-tolerance)/(dBefore-dAfter))) : 1;
      return {time:((i-1)+q)*h,status:'recovered'};
    }
    M=m2;S=s2;
  }
  return {time:null,status:'censored'};
}

export function computeRecoverySurface(lambda,p=DEFAULTS,options={}){
  const o={...LANDSCAPE_SETTINGS,...options};
  const eq=equilibrium(lambda,p);
  const invalid=!Number.isFinite(eq[0]+eq[1])||isFailure(...eq,p);
  const cells=[];
  for(let j=0;j<o.nS;j++){
    const S=o.Smin+(o.Smax-o.Smin)*j/(o.nS-1);
    const row=[];
    for(let i=0;i<o.nM;i++){
      const M=o.Mmin+(o.Mmax-o.Mmin)*i/(o.nM-1);
      const rec=invalid?{time:null,status:'invalid'}:recoveryFromState(M,S,lambda,p,o);
      row.push({M,S,...rec});
    }
    cells.push(row);
  }
  const counts={recovered:0,censored:0,failure:0,invalid:0};
  for(const row of cells)for(const c of row){if(c.status==='recovered')counts.recovered++;else if(c.status==='censored')counts.censored++;else if(c.status==='failure')counts.failure++;else counts.invalid++;}
  return {lambda,eq,cells,counts,options:o,valid:!invalid};
}

export function surfaceCsv(surfaces){
  const lines=['lambda,M_start,S_start,recovery_time,status,max_time,dt,tolerance'];
  for(const surface of surfaces)for(const row of surface.cells)for(const p of row){
    lines.push([surface.lambda,p.M,p.S,p.time??'',p.status,surface.options.maxTime,surface.options.dt,surface.options.tolerance].join(','));
  }
  return lines.join('\n')+'\n';
}
