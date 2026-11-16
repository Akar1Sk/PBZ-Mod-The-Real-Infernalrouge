"use strict";
// Tang-only runtime configuration and diagnostics. No save or inventory writes.
const UE = require("ue"), host = require("puerts");
const helper = require("Library/TsHelper").default;
const K = UE.KismetSystemLibrary;
const configPath = K.ConvertToAbsolutePath(K.GetProjectContentDirectory() + "Paks/~mods/PBZTangBalance.json");
const reportPath = K.ConvertToAbsolutePath(K.GetProjectSavedDirectory() + "PBZTangBalance-report.json");
const fields = ["Weapon Attack Multipliers", "Weapon Attack Multipliers Normalized"];
const originals = new Map();
let stopped = false, timer, lastReport = "";
function members(v) {
    const out = new Set();
    for (let p=v,n=0;p && p!==Object.prototype && n<3;p=Object.getPrototypeOf(p),n++) {
        for (const k of Object.getOwnPropertyNames(p)) if(k!=="constructor" && !k.startsWith("__")) out.add(k);
    }
    return Array.from(out).slice(0,100);
}
function keyInfo(key) {
    if (key === null || typeof key !== "object") return { label:String(key), value:key };
    const data = {};
    for (const k of members(key)) {
        try { const v=key[k]; if(["string","number","boolean"].includes(typeof v)) data[k]=v; } catch (_) {}
    }
    return { label:typeof data.TagName === "string" ? data.TagName : null, members:members(key), value:data };
}
function readConfig() {
    if (!UE.BlueprintPathsLibrary.FileExists(configPath)) return {enabled:false,multipliers:{}};
    const ref=host.$ref("");
    if (!UE.EasyCsv.LoadStringFromLocalFile(configPath,ref)) throw Error("Cannot read config");
    const c=JSON.parse(String(host.$unref(ref)).replace(/^\uFEFF/,""));
    if (c.target!=="Tang" || typeof c.enabled!=="boolean" || !c.multipliers || Array.isArray(c.multipliers)) throw Error("Invalid Tang config");
    for (const [label,factor] of Object.entries(c.multipliers)) {
        if (!label || typeof factor!=="number" || !Number.isFinite(factor) || factor<1 || factor>2) throw Error("Multiplier must be between 1 and 2");
    }
    return c;
}
function restore() {
    for (const record of originals.values()) for (const entry of record.entries) {
        if (!entry.changed) continue;
        record.map.Add(entry.key,entry.original);
        entry.changed=false;
    }
}
function inspectConfig(object,variant,c,report) {
    if (!object) {report[variant]={missing:true}; return;}
    const out=report[variant]={};
    for (const field of fields) {
        const map=object[field];
        if (!map || typeof map.GetMaxIndex!=="function") {out[field]={missing:true};continue;}
        const id=variant+":"+field;
        let record=originals.get(id);
        if (!record) {
            const entries=[];
            for(let i=0;i<map.GetMaxIndex() && i<32;i++) if(map.IsValidIndex(i)) {
                const key=map.GetKey(i), value=map.Get(key);
                entries.push({key,info:keyInfo(key),original:value,changed:false});
            }
            record={object,map,entries}; originals.set(id,record);
        }
        const requested=Object.keys(c.multipliers);
        if(c.enabled && requested.some(label=>!record.entries.some(e=>e.info.label===label))) throw Error("Requested label missing in "+id);
        if(c.enabled && typeof record.map.Add!=="function") throw Error("Map Add unavailable");
        out[field]={mapMembers:members(record.map),entries:[]};
        for (const entry of record.entries) {
            const factor=c.enabled && Object.prototype.hasOwnProperty.call(c.multipliers,entry.info.label)?c.multipliers[entry.info.label]:1;
            const value=entry.original;
            if(typeof value!=="number" || !Number.isFinite(value)) throw Error("Non-numeric map entry");
            const target=value*factor;
            if(factor!==1 || entry.changed) {
                record.map.Add(entry.key,target);
                entry.changed=factor!==1;
            }
            const actual=record.map.Get(entry.key);
            if(Math.abs(actual-target)>Math.max(1e-5,Math.abs(target)*1e-5)) throw Error("Map readback differs from target");
            out[field].entries.push({key:entry.info,original:value,factor,actual});
        }
    }
}
function tick() {
    if(stopped)return;
    let report={version:5,target:"Tang",status:"diagnostic",resources:{}};
    try {
        const c=readConfig();
        const ctx=host.argv.getByName("GameInstance");
        const bp=helper.getWorldSubsystem(ctx,UE.PBZBackPackSubsystem.StaticClass());
        if(!bp || !bp.MainWeaponInfos) throw Error("Load a save owning Tang");
        const inventory=bp.MainWeaponInfos;
        let owned=false;
        for(let i=0;i<inventory.GetMaxIndex();i++) {
            if(inventory.IsValidIndex(i) && String(inventory.GetKey(i))==="Tang") {owned=true;break;}
        }
        if(!owned) throw Error("Load a save owning Tang");
        report.currentWeaponID=String(bp.CurrentMainWeaponID);
        const row=bp.GetMainWeaponTableData("Tang");
        const soul=row.WeaponSnapSoulData.WeaponConfig.LoadSynchronous(), base=row.WeaponConfig.LoadSynchronous();
        // Capture both original configurations before any write, including shared assets.
        if(!originals.size) {
            const diagnostic={enabled:false,multipliers:{}};
            inspectConfig(soul,"snapSoul",diagnostic,{});
            inspectConfig(base,"base",diagnostic,{});
        }
        inspectConfig(soul,"snapSoul",c,report.resources);
        inspectConfig(base,"base",c,report.resources);
        report.status=c.enabled?"configuration-applied-needs-combat-test":"diagnostic";
    }catch(e){
        report.status="error";report.error=String(e);
        try{restore();report.rollback="restored";}catch(err){report.rollbackError=String(err);}
    }
    const text=JSON.stringify(report);
    if(text!==lastReport){
        report.time=new Date().toISOString();
        try{if(UE.EasyCsv.SaveStringToFileWithFullPath(JSON.stringify(report,null,2),reportPath))lastReport=text;}catch(_){}
    }
    timer=setTimeout(tick,2000);
}
exports.stop=function(){stopped=true;if(timer)clearTimeout(timer);restore();};
exports.ready=true;
timer=setTimeout(tick,5000);