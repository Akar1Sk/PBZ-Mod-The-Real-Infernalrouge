"use strict";
// PBZModsMenu's public descriptor API uses INI/TXT files, not JSON.
const defaults={enabled:true,attackMultiplier:1.25,angerMultiplier:1.25,ultimateSeconds:30};
const keys=Object.keys(defaults);
function validate(c){
    if(typeof c.enabled!=="boolean")throw Error("enabled must be boolean");
    for(const key of ["attackMultiplier","angerMultiplier"])
        if(!Number.isFinite(c[key])||c[key]<1||c[key]>10)throw Error(key+" must be between 1 and 10");
    if(!Number.isFinite(c.ultimateSeconds)||c.ultimateSeconds<0||c.ultimateSeconds>120||(c.ultimateSeconds>0&&c.ultimateSeconds<1))
        throw Error("ultimateSeconds must be 0 (off) or 1..120");
    return c;
}
function parse(text){
    const values={};
    for(const line of text.replace(/^\uFEFF/,"").split(/\r?\n/)){
        const m=/^\s*([A-Za-z0-9_]+)\s*=\s*([^;#]*)(?:[;#].*)?$/.exec(line);
        if(!m||!keys.includes(m[1])||Object.prototype.hasOwnProperty.call(values,m[1]))continue;
        const v=m[2].trim();
        values[m[1]]=m[1]==="enabled"?({on:true,off:false,true:true,false:false,"1":true,"0":false}[v.toLowerCase()]):v===""?NaN:Number(v.replace(",","."));
    }
    // A partially written file must not silently reset an omitted setting.
    for(const key of keys)if(!Object.prototype.hasOwnProperty.call(values,key))throw Error("Missing setting: "+key);
    return validate(values);
}
function serialize(c){
    validate(c);
    return "; PBZTangCombat: saved automatically by the in-game Mods Menu.\r\n"+
        keys.map(k=>k+"="+(k==="enabled"?(c[k]?"On":"Off"):c[k])).join("\r\n")+"\r\n";
}
const label=(en,zh)=>({en,"zh-Hans":zh,"zh-Hant":zh});
exports.defaults=defaults;
exports.parse=parse;
exports.serialize=serialize;
exports.create=function(host){
    let registered=null,stopped=false,lastError="",observed=null,candidate=null;
    // Shared by module instances in this game session only. Not a backup or save file.
    const session=host.session||{};
    const fingerprint=c=>JSON.stringify(keys.map(k=>c[k]));
    const now=()=>host.now?host.now():Date.now();
    function readDisk(){
        const ini=host.read("PBZTangCombat.ini");
        if(ini!==null)return parse(ini);
        const json=host.read("PBZTangCombat.json");
        const c=json?JSON.parse(json):{...defaults,enabled:false};
        // Preserve the old meaning of an absent duration setting.
        return {...c,ultimateSeconds:c.ultimateSeconds===undefined?0:c.ultimateSeconds};
    }
    function read(){
        const disk=readDisk(),accepted=session.accepted;
        if(accepted){
            const key=fingerprint(disk);
            if(key===fingerprint(accepted.values))delete session.accepted;
            else if(accepted.staleKeys.includes(key))return {...accepted.values};
            else delete session.accepted; // A distinct external edit takes precedence.
        }
        return disk;
    }
    function acceptWrite(desired,previousDiskKey){
        const old=session.accepted;
        const staleKeys=[...(old?old.staleKeys:[]),previousDiskKey,...(old?[fingerprint(old.values)]:[])];
        session.accepted={values:{...desired},staleKeys:[...new Set(staleKeys)].slice(-64)};
    }
    function register(menu){
        if(stopped||!menu||typeof menu.push!=="function"||Array.isArray(menu)||menu===registered)return;
        try{
            if(host.read("PBZTangCombat.ini")===null){
                const initial=validate(read());
                if(!host.write("PBZTangCombat.ini",serialize(initial)))throw Error("Cannot create settings file");
            }else validate(read());
            observed=fingerprint(validate(read()));
            menu.push({id:"PBZTangCombat",version:"0.4.4",file:"PBZTangCombat.ini",
                title:label("Hei Mo Shang / Tang","黑伤 / 黑魔伤"),
                description:label("Changes save and reload this mod automatically. Duration affects the next cast.","调整后自动保存并热重载本模组。绝技时长从下一次施放生效。"),
                settings:[
                    {key:"enabled",type:"toggle",default:true,label:label("Enable mod","启用模组"),help:label("Off removes this mod's bonuses and restores the duration definition.","关闭后移除本模组的倍率加成，并恢复原始绝技时长定义。")},
                    {key:"attackMultiplier",type:"number",min:1,max:10,step:0.05,default:1.25,label:label("Physical damage multiplier","伤害倍率"),help:label("1 = original damage. Each step changes the multiplier by 0.05.","1 倍为原始伤害，每步调整 0.05 倍。停止调整后自动保存生效。")},
                    {key:"angerMultiplier",type:"number",min:1,max:10,step:0.05,default:1.25,label:label("Stagger damage multiplier","削韧倍率"),help:label("Scales the AngerDamage channel of the equipped Tang weapon.","调整当前黑伤 / 黑魔伤的 AngerDamage 通道倍率，每步 0.05 倍。")},
                    {key:"ultimateSeconds",type:"number",min:0,max:120,step:1,default:30,label:label("Ultimate duration (seconds)","绝技持续时间（秒）"),help:label("0 = original duration. Applies to the next cast; existing effects and native cancellation rules keep their behavior.","0 为恢复原始时长。新时长从下一次施放生效，不刷新正在持续的绝技；原生提前取消规则仍然有效。")}
                ],
                // Called only after the menu successfully saves its debounced write.
                onChange:()=>{if(!stopped){observed=fingerprint(validate(read()));host.reload("menu-save");}},
                check:()=>stopped?Object.fromEntries(keys.map(k=>[k,label("Mod stopped; reload it to apply settings.","模组已停止，需重新加载后生效。")])):
                    lastError?Object.fromEntries(keys.map(k=>[k,label("Settings could not be saved: "+lastError,"设置保存失败："+lastError)])):{}
            });
            registered=menu;lastError="";
            host.report({status:"menu-registered",file:"PBZTangCombat.ini"});
        }catch(e){
            const error=String(e);
            if(error!==lastError){lastError=error;host.report({status:"menu-error",error});}
        }
    }
    function poll(){
        if(stopped)return;
        try{
            let saved=validate(read()),key=fingerprint(saved);
            // Public value() includes pending edits even when the menu's own write failed.
            // The user requested write-then-reload without a readback gate.
            if(registered&&typeof registered.value==="function"){
                const desired=validate(Object.fromEntries(keys.map(k=>[k,registered.value("PBZTangCombat",k)])));
                const wanted=fingerprint(desired);
                if(wanted===key)candidate=null;
                else if(!candidate||candidate.key!==wanted)candidate={key:wanted,since:now()};
                else if(now()-candidate.since>=750){
                    const previousDiskKey=fingerprint(readDisk());
                    const result=host.write("PBZTangCombat.ini",serialize(desired));
                    if(result!==true)throw Error("Settings write failed; writer returned "+String(result));
                    // Do not read the file here: pass selected values to the replacement instance.
                    acceptWrite(desired,previousDiskKey);
                    saved={...desired};key=wanted;
                    host.report({status:"menu-write-accepted",config:saved,writerResult:result,readbackVerification:"skipped-by-user-request"});
                    candidate=null;
                }
            }
            if(observed!==null&&observed!==key){observed=key;host.reload("config-watch");}
            observed=key;lastError="";
        }catch(e){
            const error=String(e);
            if(error!==lastError){lastError=error;host.report({status:"settings-watch-error",error});}
        }
    }
    return {read,register,poll,stop(){stopped=true;}};
};
