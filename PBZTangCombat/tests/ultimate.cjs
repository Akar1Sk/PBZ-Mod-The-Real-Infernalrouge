const assert=require('assert');
const create=require('../mod/PBZTangCombat/ultimate.js').create;
function env(options={}){
 let magnitude={MagnitudeCalculationType:0,ScalableFloatMagnitude:{Value:options.baseline??10,Curve:{RowName:'None',CurveTable:null}}};
 const object={DurationPolicy:2,get DurationMagnitude(){return JSON.parse(JSON.stringify(magnitude));},set DurationMagnitude(v){magnitude=JSON.parse(JSON.stringify(v));}};
 let config={enabled:true,seconds:30},ctx={eligible:true,scope:'player1'},report;
 const ctl=create({valid:o=>!!o,context:()=>ctx,config:()=>config,load:()=>object,report:r=>report=r});
 return {ctl,object,get report(){return report;},get value(){return object.DurationMagnitude.ScalableFloatMagnitude.Value;},setConfig:c=>config=c,setContext:c=>ctx=c,external:n=>{magnitude.ScalableFloatMagnitude.Value=n;}};
}
exports.run=()=>{
 const passed=[];const test=(n,f)=>{f();passed.push(n);};
 test('10 -> 30 with copy-returning native structs',()=>{const e=env();e.ctl.tick();assert.equal(e.value,30);assert.equal(e.report.status,'duration-definition-verified-awaiting-cast');});
 test('Repeated ticks stay 30',()=>{const e=env();e.ctl.tick();e.ctl.tick();assert.equal(e.value,30);});
 test('Disable and stop restore original',()=>{const e=env();e.ctl.tick();e.setConfig({enabled:false,seconds:30});e.ctl.tick();assert.equal(e.value,10);const f=env();f.ctl.tick();f.ctl.stop();assert.equal(f.value,10);});
 test('Switch away restores, returning reapplies',()=>{const e=env();e.ctl.tick();e.setContext({eligible:false});e.ctl.tick();assert.equal(e.value,10);e.setContext({eligible:true,scope:'player2'});e.ctl.tick();assert.equal(e.value,30);});
 test('Unexpected baseline remains unchanged',()=>{const e=env({baseline:20});e.ctl.tick();assert.equal(e.value,20);assert.equal(e.report.status,'error-paused');});
 test('External edit preserved',()=>{const e=env();e.ctl.tick();e.external(45);e.ctl.tick();assert.equal(e.value,45);assert.equal(e.report.status,'error-paused');});
 test('Zero disables duration feature',()=>{const e=env();e.ctl.tick();e.setConfig({enabled:true,seconds:0});e.ctl.tick();assert.equal(e.value,10);});
 test('Invalid seconds rejected',()=>{const e=env();e.setConfig({enabled:true,seconds:Infinity});e.ctl.tick();assert.equal(e.value,10);assert.equal(e.report.status,'error-paused');});
 return {passed:passed.length,cases:passed};
};
if(require.main===module)console.log(exports.run());