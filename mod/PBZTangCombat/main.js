"use strict";
// PBZModLoader/PBZModsMenu experiment. Only owns temporary buffs on live local Tang actors.
const UE = require("ue"), P = require("puerts"), H = require("Library/TsHelper").default;
const K = UE.KismetSystemLibrary;
const root = K.ConvertToAbsolutePath(K.GetProjectContentDirectory() + "Paks/~mods/");
const reportPath = K.ConvertToAbsolutePath(K.GetProjectSavedDirectory() + "PBZTangCombat-report.json");
const channels = {
    physical:"Damage.Attack.Target.PhysicalDamage", anger:"Damage.Attack.Target.AngerDamage",
    element:"Damage.Attack.Target.ElementDamage", deflect:"Damage.Attack.Target.DeflectAngerDamage"
};
let lastReport="", timer, stopped=false;
function need(value, message) {if (!value) throw Error(message); return value;}
function valid(o) {return !!o && K.IsValid(o);}
function tag(name) {const t=new UE.GameplayTag(); t.TagName=name; return t;}
function textFile(path) {
    if (!UE.BlueprintPathsLibrary.FileExists(path)) return null;
    const ref=P.$ref(""); need(UE.EasyCsv.LoadStringFromLocalFile(path,ref),"Cannot read " + path);
    return String(P.$unref(ref)).replace(/^\uFEFF/,"");
}
function config() {
    const text=textFile(root+"PBZTangCombat.json");
    const c=text ? JSON.parse(text) : {enabled:false,attackMultiplier:1.5,angerMultiplier:1.5};
    need(typeof c.enabled==="boolean", "enabled must be boolean");
    for(const key of ["attackMultiplier","angerMultiplier"]) need(typeof c[key]==="number" && Number.isFinite(c[key]) && c[key]>=1 && c[key]<=10,key+" must be between 1 and 10");
    if(c.enabled) {
        const old=textFile(root+"PBZTangBalance.json");
        need(!old || JSON.parse(old).enabled!==true,"Disable the previous PBZTangBalance experiment first");
    }
    return {enabled:c.enabled,attackMultiplier:c.attackMultiplier,angerMultiplier:c.angerMultiplier};
}
function path(o) {return String(K.GetPathName(o));}
function context() {
    const gi=P.argv.getByName("GameInstance");
    if(!valid(gi)) return null;
    const pawn=UE.GameplayStatics.GetPlayerPawn(gi,0);
    if(!valid(pawn)) return null;
    const bp=H.getWorldSubsystem(pawn,UE.PBZBackPackSubsystem.StaticClass());
    if(!valid(bp)) return null;
    const current=String(bp.CurrentMainWeaponID);
    if(current!=="Tang") return {eligible:false,current};
    // Inspect only this local player's current main-slot runtime data.
    const comp=pawn.GetComponentByClass(UE.CharacterWeaponsComponent.StaticClass());
    need(valid(comp),"Local CharacterWeaponsComponent missing");
    if(comp.IsInWeaponTransition()) return {eligible:false,current};
    const ref=P.$ref(new UE.RuntimeWeaponSingleData()), index=P.$ref(-1);
    comp.GetCurrentWeapon(tag("Weapon.Slot.Main"),ref,false,index);
    const runtime=P.$unref(ref);
    need(runtime && valid(runtime.WeaponConfig),"Current main-slot runtime config missing");
    const row=bp.GetMainWeaponTableData("Tang");
    const base=row.WeaponConfig.LoadSynchronous(), soul=row.WeaponSnapSoulData.WeaponConfig.LoadSynchronous();
    const allowed=[base,soul].filter(valid).map(path);
    const configPath=path(runtime.WeaponConfig);
    need(allowed.includes(configPath),"Runtime weapon config does not match Tang: "+configPath);
    const actors=[];
    for(let i=0;i<runtime.WeaponActors.Num();i++) {
        const actor=runtime.WeaponActors.Get(i);
        need(valid(actor),"Invalid runtime weapon actor"); actors.push(actor);
    }
    return {eligible:true,current,pawn,actors,scope:path(pawn)+"|"+configPath+"|"+P.$unref(index)};
}
function sample(actor) {
    const input=UE.NewMap(UE.GameplayTag,UE.BuiltinFloat);
    for(const value of Object.values(channels)) input.Add(tag(value),100);
    const output=P.$ref(UE.NewMap(UE.GameplayTag,UE.BuiltinFloat));
    actor.GetModifiedAttackData(input,output);
    const result=P.$unref(output), plain={};
    for(let i=0;i<result.GetMaxIndex();i++) if(result.IsValidIndex(i)) {
        const k=result.GetKey(i); plain[String(k.TagName)]=result.Get(k);
    }
    return plain;
}
function close(a,b) {return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a-b)<=Math.max(.001,Math.abs(b)*.0001);}
function verifySample(s) {
    for(const k of Object.values(channels)) need(Number.isFinite(s[k]) && s[k]>0,"Missing/nonpositive synthetic output: "+k);
}
const host={config,context,id:path,sample,verifySample,
    time:c=>UE.GameplayStatics.GetTimeSeconds(c.pawn),
    validate:actor=>{
        for(const method of ["AddWeaponBuffWithNiagaraComponents","RemoveWeaponBuff","GetModifiedAttackData"])
            need(typeof actor[method]==="function","Runtime weapon lacks "+method);
    },
    add:(actor,c)=>{
        const modifiers=P.$ref(new UE.AttackDataModifiers());
        // The reference mod uses EGenericValueModifyType.Multiply=1; require the enum to agree.
        need(UE.EGenericValueModifyType && UE.EGenericValueModifyType.Multiply===1,"Multiply enum differs from reference");
        const lib=UE.WeaponActorAttackDataModifiersHelper;
        need(lib && typeof lib.AddModifier==="function","Attack-data modifier helper unavailable");
        lib.AddModifier(modifiers,tag(channels.physical),UE.EGenericValueModifyType.Multiply,c.attackMultiplier);
        lib.AddModifier(modifiers,tag(channels.anger),UE.EGenericValueModifyType.Multiply,c.angerMultiplier);
        // Finite duration limits impact if a script aborts before it can remove a handle.
        const handle=actor.AddWeaponBuffWithNiagaraComponents(UE.NewArray(UE.NiagaraComponent),P.$unref(modifiers),30);
        need(Number.isInteger(handle) && handle>=0,"Buff returned no removable handle; stop testing for 30 game seconds");
        return {actor,handle};
    },
    remove:r=>{if(valid(r.actor)) r.actor.RemoveWeaponBuff(r.handle,true);},
    verifyChange:(before,after,c)=>{
        verifySample(after);
        for(const [name,key] of Object.entries(channels)) {
            const factor=name==="physical"?c.attackMultiplier:name==="anger"?c.angerMultiplier:1;
            need(close(after[key],before[key]*factor),"Native calculation verification failed for "+name+": "+before[key]+" -> "+after[key]);
        }
    },
    report:state=>{
        const stable=JSON.stringify(state); if(stable===lastReport)return;
        console.log("[PBZTangCombat] "+stable);
        try {
            const result={version:"0.3.0",time:new Date().toISOString(),...state};
            if(UE.EasyCsv.SaveStringToFileWithFullPath(JSON.stringify(result,null,2),reportPath))lastReport=stable;
        }catch(e){console.error("[PBZTangCombat] report write failed: "+String(e));}
    }
};
const controller=require("./controller").create(host);
let ultimateReport="";
const ultimate=require("./ultimate").create({
    valid,context,
    config:()=>{
        const raw=textFile(root+"PBZTangCombat.json"), c=raw?JSON.parse(raw):{};
        return {enabled:c.enabled===true,seconds:c.ultimateSeconds===undefined?0:c.ultimateSeconds};
    },
    load:()=>{
        const cls=UE.Class.Load("/PBZCombatAsset/ActorData/Players/Hun/Weapon/HeiMoShang/GE_Hun_HeiMoShang_Buff.GE_Hun_HeiMoShang_Buff_C");
        need(valid(cls),"HeiMoShang effect class could not be loaded");
        return cls.ClassDefaultObject;
    },
    report:state=>{
        const text=JSON.stringify(state);if(text===ultimateReport)return;
        console.log("[PBZTangCombat Ultimate] "+text);
        try{
            if(UE.EasyCsv.SaveStringToFileWithFullPath(JSON.stringify({time:new Date().toISOString(),...state},null,2),K.ConvertToAbsolutePath(K.GetProjectSavedDirectory()+"PBZTangUltimate-report.json")))ultimateReport=text;
        }catch(e){console.error(String(e));}
    }
});
function tick(){if(stopped)return;controller.tick();ultimate.tick();if(!stopped)timer=setTimeout(tick,250);}
exports.stop=function(){stopped=true;if(timer!==undefined)clearTimeout(timer);try{controller.stop();}finally{ultimate.stop();}};
exports.ready=true;
host.report({status:"loaded-awaiting-local-Tang"});
timer=setTimeout(tick,1000);
