"use strict";
const fs=require("fs"),vm=require("vm"),path=require("path"),assert=require("assert");
const dir=path.resolve(__dirname,"../mod/PBZTangCombat");
const source=fs.readFileSync(path.join(dir,"main.js"),"utf8");
const factory=require(path.join(dir,"controller.js")).create;
new vm.Script(source);
function environment(options={}) {
    let current="Tang",clock=10,config={enabled:true,attackMultiplier:1.5,angerMultiplier:1.5,ultimateSeconds:30},report,timers=[],nextHandle=1,descriptor,ini=null;
    const history=[],loaderRequests=[];
    const effect={DurationPolicy:2,DurationMagnitude:{MagnitudeCalculationType:0,ScalableFloatMagnitude:{Value:10,Curve:{RowName:'None',CurveTable:null}}}};
    const counts={added:0,removed:0};
    class Tag {constructor(){this.TagName="None";}}
    class UMap {
        constructor(){this.rows=[];}
        Add(k,v){const row=this.rows.find(x=>x[0].TagName===k.TagName);if(row)row[1]=v;else this.rows.push([k,v]);}
        Get(k){return this.rows.find(x=>x[0].TagName===k.TagName)?.[1];}
        GetMaxIndex(){return this.rows.length*2;}
        IsValidIndex(i){return i%2===0 && i/2<this.rows.length;}
        GetKey(i){return this.rows[i/2][0];}
    }
    const list=rows=>({Num:()=>rows.length,Get:i=>rows[i]});
    const asset={path:"/game/TangConfig"},pawn={path:"/world/pawn"},gi={path:"/gi"};
    const actors=[0,1].map(i=>({path:"/world/weapon"+i,buffs:new Map(),
        AddWeaponBuffWithNiagaraComponents(particles,modifiers,duration){
            assert.equal(duration,30);assert.equal(particles.Num(),0);
            const h=nextHandle++;this.buffs.set(h,modifiers.rows);counts.added++;return h;
        },
        RemoveWeaponBuff(h){if(options.cleanupFails)throw Error('cleanup failed');this.buffs.delete(h);counts.removed++;},
        GetModifiedAttackData(input,out){
            const m=new UMap();for(const [tag,n] of input.rows){let value=n;
                if(!options.ignoreBuff) for(const rows of this.buffs.values()) for(const row of rows)if(row.tag===tag.TagName)value*=row.factor;
                m.Add(tag,value);
            }out.value=m;
        }
    }));
    const bp={get CurrentMainWeaponID(){return current;},GetMainWeaponTableData:id=>{
        assert.equal(id,"Tang");return {WeaponConfig:{LoadSynchronous:()=>asset},WeaponSnapSoulData:{WeaponConfig:{LoadSynchronous:()=>asset}}};
    }};
    const comp={IsInWeaponTransition:()=>false,GetCurrentWeapon:(tag,out,pending,index)=>{
        assert.equal(tag.TagName,"Weapon.Slot.Main");assert.equal(pending,false);
        out.value={WeaponConfig:options.wrongConfig?{path:"/other/config"}:asset,WeaponActors:list(actors)};index.value=0;
    }};
    pawn.GetComponentByClass=()=>comp;
    const UE={GameplayTag:Tag,RuntimeWeaponSingleData:class{},AttackDataModifiers:class{constructor(){this.rows=[];}},BuiltinFloat:{},NiagaraComponent:{},
        NewMap:()=>new UMap(),NewArray:()=>list([]),EGenericValueModifyType:{Multiply:1},
        PBZBackPackSubsystem:{StaticClass:()=>({})},CharacterWeaponsComponent:{StaticClass:()=>({})},
        GameplayStatics:{GetPlayerPawn:()=>pawn,GetTimeSeconds:()=>clock},
        KismetSystemLibrary:{ConvertToAbsolutePath:x=>x,GetProjectContentDirectory:()=>"/content/",GetProjectSavedDirectory:()=>"/saved/",GetPathName:o=>o.path,IsValid:o=>!!o&&!o.dead},
        Class:{Load:()=>({ClassDefaultObject:effect})},
        BlueprintPathsLibrary:{FileExists:p=>p.endsWith("PBZTangCombat.json")||(p.endsWith("PBZTangCombat.ini")&&ini!==null)||(p.endsWith("PBZTangBalance.json")&&options.oldEnabled)},
        EasyCsv:{LoadStringFromLocalFile:(p,r)=>{r.value=p.endsWith("PBZTangCombat.ini")?ini:JSON.stringify(p.endsWith("PBZTangCombat.json")?config:{enabled:true});return true;},SaveStringToFileWithFullPath:(text,file)=>{if(file.endsWith("PBZTangCombat.ini"))ini=text;if(file.endsWith("PBZTangCombat-report.json")){report=JSON.parse(text);history.push(report.status);}return true;}},
        WeaponActorAttackDataModifiersHelper:{AddModifier:(ref,tag,op,factor)=>{assert.equal(op,1);ref.value.rows.push({tag:tag.TagName,factor});}}
    };
    if(options.missingAPI)delete actors[0].AddWeaponBuffWithNiagaraComponents;
    const P={$ref:value=>({value}),$unref:r=>r.value,argv:{getByName:()=>gi}};
    const sandbox={exports:{},require:n=>n==='ue'?UE:n==='puerts'?P:n==='Library/TsHelper'?{default:{getWorldSubsystem:()=>bp}}:n==='./controller'?{create:factory}:['./ultimate','./settings'].includes(n)?require(path.join(dir,n+'.js')):(()=>{throw Error(n);})(),console:{log(){},error(){}},setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout(){timers=[];}};
    if(options.menu)sandbox.PBZModsMenu={push:d=>{descriptor=d;}};
    if(options.loader)sandbox.__PBZModsMenuRuntime={reloadMod:id=>{loaderRequests.push(id);return options.loader==='accept';}};
    vm.runInNewContext(source,sandbox);
    return {counts,actors,effect,history,loaderRequests,get descriptor(){return descriptor;},get report(){return report;},step(){const t=timers.shift();assert(t,'No tick queued');t();},setCurrent:v=>current=v,setTime:v=>clock=v,setConfig:v=>config=v,
        menuSave:c=>{ini=require('../mod/PBZTangCombat/settings.js').serialize(c);for(const k of Object.keys(c))descriptor.onChange(k,c[k]);},stop:()=>sandbox.exports.stop()};
}
exports.run=function(){
    const cases=[];function test(name,fn){fn();cases.push(name);}
    test('Only selected damage channels scale; both actors verified',()=>{const e=environment();e.step();assert.equal(e.report.status,'weapon-calculation-verified-combat-unverified');assert.equal(e.counts.added,2);const a=e.report.evidence[0];assert.equal(a.after['Damage.Attack.Target.PhysicalDamage'],150);assert.equal(a.after['Damage.Attack.Target.AngerDamage'],150);assert.equal(a.after['Damage.Attack.Target.ElementDamage'],100);});
    test('Repeated ticks do not compound; renewal replaces owned handles',()=>{const e=environment();e.step();e.step();assert.equal(e.counts.added,2);e.setTime(31);e.step();assert.equal(e.counts.removed,2);assert.equal(e.counts.added,4);assert(e.actors.every(a=>a.buffs.size===1));});
    test('Other weapon never receives buff; switching away cleans up',()=>{const e=environment();e.setCurrent('LuanYing');e.step();assert.equal(e.counts.added,0);e.setCurrent('Tang');e.step();e.setCurrent('PoJun');e.step();assert(e.actors.every(a=>a.buffs.size===0));});
    test('Disabled and hot-reload stop remove owned handles',()=>{const e=environment();e.step();e.setConfig({enabled:false,attackMultiplier:1.5,angerMultiplier:1.5});e.step();assert.equal(e.report.status,'disabled');assert(e.actors.every(a=>!a.buffs.size));const f=environment();f.step();f.stop();assert(f.actors.every(a=>!a.buffs.size));});
    test('Changing to 10x replaces rather than stacks buffs',()=>{const e=environment();e.step();e.setConfig({enabled:true,attackMultiplier:10,angerMultiplier:10});e.step();assert.equal(e.report.evidence[0].after['Damage.Attack.Target.PhysicalDamage'],1000);assert.equal(e.report.evidence[0].after['Damage.Attack.Target.AngerDamage'],1000);assert(e.actors.every(a=>a.buffs.size===1));});
    test('Ineffective native method rolls back and pauses',()=>{const e=environment({ignoreBuff:true});e.step();assert.equal(e.report.status,'error-paused');assert(e.actors.every(a=>!a.buffs.size));e.step();assert.equal(e.counts.added,1);});
    test('Missing method fails before mutation',()=>{const e=environment({missingAPI:true});e.step();assert.equal(e.report.status,'error-paused');assert.equal(e.counts.added,0);});
    test('Wrong runtime config is rejected',()=>{const e=environment({wrongConfig:true});e.step();assert.equal(e.report.status,'error-paused');assert.equal(e.counts.added,0);});
    test('Old experiment cannot be combined',()=>{const e=environment({oldEnabled:true});e.step();assert.equal(e.report.status,'error-paused');assert.equal(e.counts.added,0);});
    test('Invalid multipliers fail closed',()=>{const e=environment();e.setConfig({enabled:true,attackMultiplier:20,angerMultiplier:1.5});e.step();assert.equal(e.counts.added,0);assert.equal(e.report.status,'error-paused');});
    test('External buffs survive cleanup',()=>{const e=environment();e.actors[0].buffs.set(999,[{tag:'Damage.Attack.Target.PhysicalDamage',factor:1.1}]);e.step();assert.equal(e.report.status,'weapon-calculation-verified-combat-unverified');e.stop();assert(e.actors[0].buffs.has(999));assert.equal(e.actors[0].buffs.size,1);});
    test('Menu saves coalesce into one local reload with new damage and duration',()=>{const e=environment({menu:true});e.step();e.menuSave({enabled:true,attackMultiplier:2,angerMultiplier:3,ultimateSeconds:45});e.step();assert.equal(e.counts.added,4);assert.equal(e.counts.removed,2);assert.equal(e.history.filter(s=>s==='settings-hot-reloaded').length,1);assert.equal(e.report.evidence[0].after['Damage.Attack.Target.PhysicalDamage'],200);assert.equal(e.report.evidence[0].after['Damage.Attack.Target.AngerDamage'],300);assert.equal(e.effect.DurationMagnitude.ScalableFloatMagnitude.Value,45);e.step();assert.equal(e.counts.added,4);e.stop();assert.equal(e.effect.DurationMagnitude.ScalableFloatMagnitude.Value,10);});
    test('Menu disabling removes all owned effects; stale callbacks cannot restart stopped mod',()=>{const e=environment({menu:true});e.step();e.menuSave({enabled:false,attackMultiplier:1.75,angerMultiplier:1.75,ultimateSeconds:30});e.step();assert.equal(e.report.status,'disabled');assert(e.actors.every(a=>!a.buffs.size));assert.equal(e.effect.DurationMagnitude.ScalableFloatMagnitude.Value,10);e.stop();e.descriptor.onChange();assert.equal(e.counts.added,2);});
    test('Failed cleanup blocks new buffs across later ticks',()=>{const e=environment({menu:true,cleanupFails:true});e.step();e.menuSave({enabled:true,attackMultiplier:2,angerMultiplier:2,ultimateSeconds:30});e.step();assert.equal(e.report.status,'settings-reload-failed');e.step();assert.equal(e.counts.added,2);assert.equal(e.effect.DurationMagnitude.ScalableFloatMagnitude.Value,10);});
    test('Supported loader receives a targeted request without also restarting effects',()=>{const e=environment({menu:true,loader:'accept'});e.step();e.menuSave({enabled:true,attackMultiplier:2,angerMultiplier:2,ultimateSeconds:30});e.step();assert.deepEqual(e.loaderRequests,['PBZTangCombat']);assert.equal(e.counts.added,2);e.stop();assert(e.actors.every(a=>!a.buffs.size));});
    test('Declined loader request falls back to replacing effects',()=>{const e=environment({menu:true,loader:'reject'});e.step();e.menuSave({enabled:true,attackMultiplier:2,angerMultiplier:2,ultimateSeconds:30});e.step();assert.deepEqual(e.loaderRequests,['PBZTangCombat']);assert.equal(e.counts.added,4);assert.equal(e.counts.removed,2);assert.equal(e.report.evidence[0].after['Damage.Attack.Target.PhysicalDamage'],200);});
    return {passed:cases.length,cases,limitation:'Mocks verify lifecycle and arithmetic only. Actual PuerTS binding and combat remain untested.'};
};
if(require.main===module)console.log(JSON.stringify(exports.run(),null,2));
