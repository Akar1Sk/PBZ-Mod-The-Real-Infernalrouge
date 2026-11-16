"use strict";
// Diagnostic only: does not change weapon attributes, hooks, or save data.
const UE = require("ue");
const host = require("puerts");
const TsHelper = require("Library/TsHelper").default;
const UIHelper = require("Library/UIHelper").default;
const K = UE.KismetSystemLibrary;
let timer, stopped = false, tries = 0, snapshotNodes = 0;
function keys(value) {
    const result = new Set();
    for (let p = value, depth = 0; p && depth < 3; p = Object.getPrototypeOf(p), depth++) {
        for (const key of Object.getOwnPropertyNames(p).slice(0, 250))
            if (key !== "constructor" && key !== "__proto__") result.add(key);
    }
    return Array.from(result).slice(0, 250);
}
function snapshot(value, depth, seen) {
    if (++snapshotNodes > 5000) return "[report node limit]";
    if (value == null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
    if (typeof value === "function") return "[function]";
    if (depth <= 0) { try { return String(value).slice(0, 300); } catch (_) { return "[object]"; } }
    if (seen.has(value)) return "[cycle]";
    seen.add(value);
    if (typeof value.GetMaxIndex === "function" && typeof value.IsValidIndex === "function" && typeof value.GetKey === "function" && typeof value.Get === "function") {
        const entries = [];
        for (let i = 0; i < Math.min(value.GetMaxIndex(), 200); i++) if (value.IsValidIndex(i)) {
            const key = value.GetKey(i);
            entries.push({ key: String(key), value: snapshot(value.Get(key), depth - 1, seen) });
        }
        seen.delete(value);
        return { container: "map", entries };
    }
    if (typeof value.Num === "function" && typeof value.Get === "function") {
        const entries = [];
        for (let i = 0; i < Math.min(value.Num(), 100); i++) entries.push(snapshot(value.Get(i), depth - 1, seen));
        seen.delete(value);
        return { container: "array", entries };
    }
    const out = {};
    const members = keys(value);
    if (!members.length) {
        try { out.text = String(value); } catch (_) {}
    }
    if (typeof value.GetPathName === "function") {
        try { out.objectPath = value.GetPathName(); } catch (_) {}
    }
    out.memberNames = members;
    for (const key of keys(value)) {
        if (/^(prototype|caller|callee|arguments)$/.test(key)) continue;
        try { const item = value[key]; if (typeof item !== "function") out[key] = snapshot(item, depth - 1, seen); }
        catch (e) { out[key] = "[unreadable]"; }
    }
    seen.delete(value);
    return out;
}
function write(report) {
    const path = K.ConvertToAbsolutePath(K.GetProjectSavedDirectory() + "PBZWeaponProbe.json");
    if (!UE.EasyCsv.SaveStringToFileWithFullPath(JSON.stringify(report, null, 2), path))
        throw new Error("Cannot save diagnostic report");
}
function run() {
    if (stopped) return;
    tries++; snapshotNodes = 0;
    try {
        const context = host.argv.getByName("GameInstance");
        const backpack = TsHelper.getWorldSubsystem(context, UE.PBZBackPackSubsystem.StaticClass());
        const infos = backpack && backpack.MainWeaponInfos;
        if (!infos || typeof infos.GetMaxIndex !== "function") throw new Error("World or weapon inventory not ready; load a save");
        const ids = [];
        for (let i = 0; i < infos.GetMaxIndex() && ids.length < 200; i++)
            if (infos.IsValidIndex(i)) ids.push(String(infos.GetKey(i)));
        if (!ids.length) throw new Error("No owned main weapons found yet");
        const report = { mode: "diagnostic-only", time: new Date().toISOString(), requestedNames: ["黑伤", "黑魔伤", "黑傷", "黑魔傷"], intendedAttackMultiplier: 1.5, intendedStaggerMultiplier: 1.5, backpackMembers: keys(backpack), currentWeaponID: String(backpack.CurrentMainWeaponID), weaponRuntime: snapshot(backpack.MainWeapons, 3, new Set()), weapons: [] };
        for (const id of ids.filter(id => id === "Tang")) {
            try {
                const data = backpack.GetMainWeaponTableData(id);
                const key = data && data.WeaponName && data.WeaponName.Key;
                const name = key && String(key) !== "None" ? UE.KismetTextLibrary.Conv_TextToString(UIHelper.GetTextByID(key)) : "";
                function inspectResource(pointer) {
                    if (!pointer) return null;
                    try {
                        const object = typeof pointer.LoadSynchronous === "function" ? pointer.LoadSynchronous() : pointer;
                        if (!object) return { missing: true };
                        return snapshot(object, 5, new Set());
                    } catch (e) { return { error: String(e) }; }
                }
                report.battleResources = {
                    baseConfig: inspectResource(data.WeaponConfig),
                    snapSoulConfig: inspectResource(data.WeaponSnapSoulData.WeaponConfig),
                    baseEffectClass: inspectResource(data.DefaultGEData.SoftClassPtr),
                    snapSoulEffectClass: inspectResource(data.DefaultSnapSoulGEData.SoftClassPtr)
                };
                report.weapons.push({ id, name, table: snapshot(data, 6, new Set()), inventory: snapshot(infos.Get(id), 3, new Set()) });
            } catch (e) { report.weapons.push({ id, error: String(e) }); }
        }
        write(report);
        console.log("[PBZWeaponProbe] Wrote PBZWeaponProbe.json; no gameplay values changed");
        if (tries < 120) timer = setTimeout(run, 15000); else stopped = true;
    } catch (e) {
        if (tries === 1 || tries === 120) {
            try { write({ mode: "diagnostic-only", attempt: tries, error: String(e), instruction: "Load a save while this probe is waiting; restart game to retry" }); } catch (_) {}
        }
        if (tries < 120) timer = setTimeout(run, 15000);
        else stopped = true;
    }
}
exports.stop = function () { stopped = true; if (timer && typeof clearTimeout === "function") clearTimeout(timer); };
exports.ready = true;
timer = setTimeout(run, 15000);