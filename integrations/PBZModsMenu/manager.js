"use strict";

const MENU = "PBZModsMenu";
const ID = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const flag = (value) => /^(?:1|on|true|yes)$/i.test(value) ? true : /^(?:0|off|false|no)$/i.test(value) ? false : undefined;

function parseConfig(text) {
    if (typeof text !== "string" || text.length > 65536) throw new Error("Loader config must be text of at most 65536 characters");
    const result = { enabled: true, hotReload: false, mods: Object.create(null), warnings: [] };
    let section = "mods";
    const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
    if (lines.length > 2048) throw new Error("Loader config has too many lines");
    for (let index = 0; index < lines.length; index++) {
        const line = lines[index].replace(/[;#].*$/, "").trim();
        if (!line) continue;
        const heading = /^\[([A-Za-z]+)\]$/.exec(line);
        if (heading) { section = heading[1].toLowerCase(); continue; }
        if (section !== "mods" && section !== "loader") continue;
        const pair = /^([A-Za-z][A-Za-z0-9_-]{0,63})\s*=\s*(\S+)$/.exec(line);
        const value = pair && flag(pair[2]);
        if (!pair || value === undefined) {
            if (result.warnings.length < 20) result.warnings.push("Ignored invalid loader flag at line " + (index + 1));
            continue;
        }
        if (section === "loader") {
            const name = pair[1].toLowerCase();
            if (name === "enabled") result.enabled = value;
            else if (name === "hotreload") result.hotReload = value;
        } else result.mods[pair[1].toLowerCase()] = value;
    }
    return result;
}

function validateManifest(manifest) {
    if (!manifest || manifest.version !== 1 || !Array.isArray(manifest.mods) || manifest.mods.length > 128)
        throw new Error("Unsupported Mods Menu manifest");
    const seen = new Set();
    // a mod listed from another script loader's mods folder, as native discovery writes it (relative to bootstrap.js)
    const other = /^\.\.\/\.\.\/\.\.\/PBZModLoader\/mods\/(?:[A-Za-z0-9_-]{1,64}\/)*[A-Za-z0-9_-]{1,64}$/;
    const mods = manifest.mods.map((mod) => {
        if (!mod || typeof mod.id !== "string" || !ID.test(mod.id) || seen.has(mod.id.toLowerCase()) || typeof mod.enabled !== "boolean" ||
            !(mod.entry === "PBZModsMenu/Mods/" + mod.id + "/main" ||
              mod.id !== MENU && typeof mod.entry === "string" && mod.entry.length <= 187 && other.test(mod.entry)))
            throw new Error("Invalid, duplicate or unsafe Mods Menu entry");
        seen.add(mod.id.toLowerCase());
        return { id: mod.id, entry: mod.entry, enabled: mod.enabled };
    });
    if (!mods.some((mod) => mod.id === MENU)) throw new Error("Mods Menu entry is missing from the manifest");
    return mods.sort((a, b) => a.id === MENU ? -1 : b.id === MENU ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

const RELOADS = 64, STOP_MS = 5000;
const reason = (error) => { try { return String(error && error.message || error).replace(/[\r\n]+/g, " ").slice(0, 400); } catch (_) { return "unreadable error"; } };

// Entry n of a mod for hot reload: case pattern n over the letters of its folder path after the first segment (Mods/<Id>),
// lowest bit on the first letter, so the first 15 change only "Mods". The game's module cache keys on the path as written,
// so each pattern loads main.js again, and its __dirname changes, so relative requires load again too. 0 is the entry itself;
// undefined when the letters have no pattern n.
function variant(entry, n) {
    const first = entry.indexOf("/") + 1, last = entry.lastIndexOf("/");
    const chars = [...entry], letters = [];
    for (let i = first; i < last; i++) if (/[A-Za-z]/.test(chars[i])) letters.push(i);
    if (n >= 2 ** letters.length) return undefined;
    letters.forEach((at, bit) => {
        if (bit < 31 && n & (1 << bit)) chars[at] = chars[at] === chars[at].toLowerCase() ? chars[at].toUpperCase() : chars[at].toLowerCase();
    });
    return chars.join("");
}

function start(manifest, services, state) {
    const mods = validateManifest(manifest);
    const config = parseConfig(services.readConfig());
    state.mods = mods.map((mod) => ({ ...mod, status: "pending" }));
    const log = (message) => { try { services.log(message); } catch (_) {} };
    // read by the menu while it starts, to watch the reload keys; state.reload is set once every entry has started
    state.hotReload = config.enabled && config.hotReload && typeof services.setTimeout === "function";
    config.warnings.forEach(log);
    const on = (mod, flags) => { const override = flags.mods[mod.id.toLowerCase()]; return flags.enabled && (override === undefined ? mod.enabled : override); };
    const instances = new Map(), used = new Map(), bootFailed = new Set();
    let revisions = 0, busy = false, generation = 0; // generation: the run whose callbacks still count
    for (const mod of state.mods) {
        if (!on(mod, config)) {
            mod.status = "disabled";
            log("disabled " + mod.id);
            continue;
        }
        load(mod, mod.entry);
        used.set(mod.id, 1);
        if (mod.status === "failed") bootFailed.add(mod.id);
    }
    state.phase = !config.enabled ? "disabled" : state.mods.some((mod) => mod.status === "failed") ? "degraded" : "ready";
    if (state.hotReload && state.mods[0].status === "loaded") {
        state.reload = () => reload();
        // Optional targeted reload; the existing Ctrl+F5 reload-all behavior stays intact.
        state.reloadMod = (id) => typeof id === "string" && id !== MENU && state.mods.some((m) => m.id === id && m.status === "loaded" && !m.blocked) ? reload(id) : false;
    }
    return state;

    function load(mod, entry) {
        mod.status = "starting";
        delete mod.error;
        try {
            const instance = services.importModule(entry);
            // the menu must confirm; any other entry that returned without throwing runs (mods made for another loader export stop()),
            // so for those a throwing ready or stop getter only loses the confirmation note
            let ready = false, stop = false;
            try {
                ready = services.isReady ? services.isReady(mod.id, instance) : instance && instance.ready === true;
                stop = !ready && !!instance && typeof instance.stop === "function";
            } catch (error) { if (mod.id === MENU) throw error; }
            if (!ready && mod.id === MENU) throw new Error("Entry did not confirm initialization");
            instances.set(mod.id, instance);
            mod.status = "loaded";
            log("loaded " + mod.id + (entry === mod.entry ? "" : " as " + entry) + (ready ? "" : stop ? " (stop export, no start confirmation)" : " (no start confirmation)"));
        } catch (error) {
            mod.status = "failed";
            try { mod.error = String(error && error.message || error).replace(/[\r\n]+/g, " ").slice(0, 400); }
            catch (_) { mod.error = "Entry failed with an unreadable error"; }
            log("failed " + mod.id + ": " + mod.error);
        }
    }

    // Hot reload ([loader] HotReload=On): the menu's key calls this; the work runs on the next timer tick, one reload at a time.
    // Old modules stay in the game's cache, hence the session cap.
    function reload(target) {
        if (busy) { log("hot reload already running, key ignored"); return false; }
        if (revisions >= RELOADS) { log("hot reload limit of " + RELOADS + " per session reached; restart the game"); return false; }
        busy = true;
        try { services.setTimeout(() => run(target), 0); }
        catch (error) { busy = false; log("hot reload not run: " + reason(error)); return false; }
        return true;
    }
    function run(target) {
        const gen = ++generation; // a later run, even one the game timer started twice, turns this one's callbacks stale
        try {
            const flags = parseConfig(services.readConfig()); // the Off/On switches as they are now
            const rev = ++revisions;
            flags.warnings.forEach(log);
            log("hot reload " + rev + " of " + RELOADS + (target ? " target " + target : ""));
            // the menu never reloads; the others stop in reverse start order (instances keeps it), one after the other
            const queue = [...instances.keys()].map((id) => state.mods.find((mod) => mod.id === id)).filter((mod) => mod.id !== MENU && mod.status === "loaded" && (!target || mod.id === target)).reverse();
            const next = () => {
                if (gen !== generation) return; // a stop() settling for a run already given up or replaced
                try {
                    const mod = queue.shift();
                    if (mod) stopOne(mod, flags, next, gen);
                    else restart(flags, rev, target);
                } catch (error) { generation++; busy = false; log("hot reload " + rev + " failed: " + reason(error)); }
            };
            next();
        } catch (error) { busy = false; log("hot reload not run: " + reason(error)); }
    }
    function stopOne(mod, flags, done, gen) {
        if (mod.blocked) return done(); // left as it is until the game restarts
        const instance = instances.get(mod.id);
        let stop;
        try { stop = instance && instance.stop; } catch (_) {}
        if (typeof stop !== "function") { log("kept " + mod.id + ": export stop() to enable hot reload"); return done(); }
        if (on(mod, flags) && variant(mod.entry, used.get(mod.id)) === undefined) {
            log("kept " + mod.id + ": no unused case pattern of its folder path left; restart the game to reload it");
            return done();
        }
        const block = (why) => { mod.blocked = why; log("blocked " + mod.id + ": " + why + "; no more reloads of it this session"); done(); };
        let result, then;
        try {
            result = stop.call(instance);
            then = result && typeof result.then === "function" ? result.then : undefined;
        } catch (error) { return block("stop() threw: " + reason(error)); }
        if (!then) { stopped(mod); return done(); }
        // a stop() that returned a promise: 5 s, then blocked; a resolve after that still marks it stopped. Only the first
        // settle counts, so a promise that resolves twice never stops the instance started after it. Once a later run has
        // replaced this one (gen), a pending settle or timeout changes nothing: that run owns the mod now
        let wait = "pending";
        const live = () => gen === generation;
        const late = () => { wait = "settled"; stopped(mod); log("stopped " + mod.id + " late, not started again this session"); };
        const fail = (why) => { if (wait === "pending" && live()) { wait = "late"; block(why); } };
        try { services.setTimeout(() => fail("stop() did not finish in " + STOP_MS / 1000 + " s"), STOP_MS); }
        catch (error) { fail("stop() returned a promise and the game timer failed: " + reason(error)); }
        try {
            then.call(result, () => {
                if (wait === "late") return late();
                if (wait !== "pending" || !live()) return;
                wait = "settled";
                stopped(mod);
                done();
            }, (error) => {
                if (wait === "late") { wait = "settled"; return log("late stop() of " + mod.id + " failed: " + reason(error)); }
                fail("stop() failed: " + reason(error));
            });
        } catch (error) { fail("stop() threw: " + reason(error)); }
    }
    function stopped(mod) {
        mod.status = "stopped";
        instances.delete(mod.id);
        try { if (services.forget) services.forget(mod.id); } catch (_) {} // the refuse-a-second-start mark (__PBZLoaderEntries)
        log("stopped " + mod.id);
    }
    // in name order: stopped this round, disabled at start, or failed on an earlier reload. Boot failures are never retried.
    function restart(flags, rev, target) {
        for (const mod of state.mods) {
            if (mod.id === MENU || (target && mod.id !== target) || mod.blocked || bootFailed.has(mod.id) || mod.status === "loaded") continue;
            if (!on(mod, flags)) {
                if (mod.status === "stopped") { mod.status = "disabled"; log("disabled " + mod.id); }
                continue;
            }
            const n = used.get(mod.id) || 0, entry = variant(mod.entry, n);
            if (entry === undefined) { log("not started " + mod.id + ": no unused case pattern of its folder path left; restart the game"); continue; }
            used.set(mod.id, n + 1);
            load(mod, entry);
        }
        state.phase = state.mods.some((mod) => mod.status === "failed") ? "degraded" : "ready";
        log("hot reload " + rev + " done: " + state.mods.filter((mod) => mod.status === "loaded").length + " loaded, " +
            state.mods.filter((mod) => mod.status === "failed").length + " failed, " + state.mods.filter((mod) => mod.blocked).length + " blocked");
        busy = false;
    }
}

exports.parseConfig = parseConfig;
exports.validateManifest = validateManifest;
exports.start = start;
exports.variant = variant;
