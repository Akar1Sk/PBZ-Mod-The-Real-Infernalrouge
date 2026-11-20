"use strict";
const assert=require('node:assert/strict');
const manager=require('../integrations/PBZModsMenu/manager.js');
function env(options={}){
    const ids=['PBZModsMenu','PBZMapMarkers','PBZTangCombat','PBZWeaponProbe'];
    const manifest={version:1,mods:ids.map(id=>({id,entry:'PBZModsMenu/Mods/'+id+'/main',enabled:true}))};
    const events=[],queue=[],state={};
    manager.start(manifest,{
        readConfig:()=>options.off?'[Loader]\nHotReload=Off':'[Loader]\nHotReload=On',
        log:m=>events.push(['log',m]),setTimeout:fn=>queue.push(fn),
        importModule:entry=>{const id=manifest.mods.find(m=>m.entry.toLowerCase()===entry.toLowerCase()).id;events.push(['load',id,entry]);return {ready:true,stop(){events.push(['stop',id]);if(options.stopFails&&id==='PBZTangCombat')throw Error('cleanup failed');}};}
    },state);
    events.length=0;
    return {state,events,drain(){while(queue.length)queue.shift()();}};
}
exports.run=()=>{
    const cases=[];const test=(n,f)=>{f();cases.push(n);};
    test('Targeted reload stops and imports only Tang, using a fresh cache path',()=>{const e=env();assert.equal(e.state.reloadMod('PBZTangCombat'),true);e.drain();assert.deepEqual(e.events.filter(x=>x[0]==='stop').map(x=>x[1]),['PBZTangCombat']);const loads=e.events.filter(x=>x[0]==='load');assert.equal(loads.length,1);assert.equal(loads[0][1],'PBZTangCombat');assert.notEqual(loads[0][2],'PBZModsMenu/Mods/PBZTangCombat/main');assert(e.state.mods.every(m=>m.status==='loaded'));});
    test('Existing reload-all API still reloads all reloadable mods, never the menu',()=>{const e=env();assert.equal(e.state.reload(),true);e.drain();assert.deepEqual(e.events.filter(x=>x[0]==='load').map(x=>x[1]).sort(),['PBZMapMarkers','PBZTangCombat','PBZWeaponProbe']);});
    test('Unknown/menu targets and concurrent requests are rejected',()=>{const e=env();assert.equal(e.state.reloadMod('PBZModsMenu'),false);assert.equal(e.state.reloadMod('../other'),false);assert.equal(e.state.reloadMod('PBZTangCombat'),true);assert.equal(e.state.reloadMod('PBZTangCombat'),false);e.drain();});
    test('Failed stop blocks reimport and future targeted requests',()=>{const e=env({stopFails:true});e.state.reloadMod('PBZTangCombat');e.drain();assert.equal(e.events.filter(x=>x[0]==='load').length,0);assert.equal(e.state.reloadMod('PBZTangCombat'),false);});
    test('Session cap returns false so caller can use its in-place fallback',()=>{const e=env();for(let i=0;i<64;i++){assert.equal(e.state.reloadMod('PBZTangCombat'),true);e.drain();}assert.equal(e.state.reloadMod('PBZTangCombat'),false);});
    test('Disabled hot reload exposes neither reload API',()=>{const e=env({off:true});assert.equal(e.state.reloadMod,undefined);assert.equal(e.state.reload,undefined);});
    return {passed:cases.length,cases};
};
if(require.main===module)console.log(exports.run());
