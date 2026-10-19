import assert from 'node:assert/strict';
import test from 'node:test';
import {DEFAULTS,equilibrium,eigen} from '../docs/model.mjs';
import {isFailure,recoveryFromState,computeRecoverySurface,surfaceCsv} from '../docs/landscape-data.mjs';

test('recovery near equilibrium starts at zero',()=>{
  const eq=equilibrium(1.0);
  assert.deepEqual(recoveryFromState(...eq,1.0),{time:0,status:'recovered'});
});
test('failure means BOTH thresholds at the same time',()=>{
  assert.equal(isFailure(0.10,4.0),true);
  assert.equal(isFailure(0.10,2.0),false);
  assert.equal(isFailure(0.2,4.0),false);
  assert.equal(recoveryFromState(.10,4.0,1.0).status,'failure');
});
test('high-load local stability persists and recovery is slower for a small fixed displacement',()=>{
  assert.ok(eigen(1.0)<0 && eigen(1.4)<0);
  const lo=equilibrium(1.0),hi=equilibrium(1.4);
  const a=recoveryFromState(lo[0]+.20,lo[1],1.0,DEFAULTS,{tolerance:.02,maxTime:300,dt:.15});
  const b=recoveryFromState(hi[0]+.20,hi[1],1.4,DEFAULTS,{tolerance:.02,maxTime:300,dt:.15});
  assert.equal(a.status,'recovered');assert.equal(b.status,'recovered');
  assert.ok(b.time>a.time,`expected higher load slower, got ${a.time},${b.time}`);
});
test('surface accurately counts grid outcomes',()=>{
  const surface=computeRecoverySurface(1.0,DEFAULTS,{nM:9,nS:11,dt:.25,maxTime:100});
  assert.equal(surface.cells.length,11);assert.equal(surface.cells[0].length,9);
  assert.equal(Object.values(surface.counts).reduce((a,b)=>a+b),99);
  assert.ok(surface.counts.failure>0);
  const csv=surfaceCsv([surface]);assert.equal(csv.trim().split('\n').length,100);
  assert.ok(csv.startsWith('lambda,M_start,S_start,'));
});
test('invalid equilibrium in failure is distinguished from linear instability',()=>{
  const p={...DEFAULTS,Sc:.7,Mc:.7};
  const sur=computeRecoverySurface(1.0,p,{nM:3,nS:3});
  assert.equal(sur.valid,false);
  assert.equal(sur.counts.invalid,9);
});
