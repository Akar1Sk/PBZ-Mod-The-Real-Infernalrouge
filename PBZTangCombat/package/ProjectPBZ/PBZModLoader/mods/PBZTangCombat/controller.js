"use strict";
// Controller deliberately has no engine dependencies, so lifecycle tests use the same code.
exports.create = function create(host) {
    let records = [], fingerprint = "", failed = false, stopped = false;
    function clear() {
        const remaining = [], errors = [];
        for (const record of records) {
            try { host.remove(record); } catch (e) { remaining.push(record); errors.push(String(e)); }
        }
        records = remaining;
        if (errors.length) throw Error("Owned-buff cleanup failed: " + errors.join("; "));
    }
    function tick() {
        if (stopped) return;
        try {
            const config = host.config();
            const key = JSON.stringify(config);
            if (key !== fingerprint) { clear(); fingerprint = key; failed = false; }
            if (!config.enabled) { clear(); host.report({status:"disabled"}); return; }
            if (failed) return;
            const context = host.context();
            if (!context || !context.eligible) { clear(); host.report({status:"waiting-for-Tang", current:context && context.current}); return; }
            const ids = context.actors.map(host.id).sort();
            if (!ids.length || new Set(ids).size !== ids.length) throw Error("Empty or duplicate runtime weapon actors");
            const now = host.time(context);
            const unchanged = records.length === ids.length && records.every(r => r.scope === context.scope && ids.includes(r.id) && now < r.renewAt && now >= r.createdAt);
            if (unchanged) return;
            clear();
            const evidence = [];
            for (const actor of context.actors) {
                host.validate(actor);
                const before = host.sample(actor);
                host.verifySample(before);
                const record = host.add(actor, config);
                // Own the handle before readback, so any verification error removes it.
                record.id = host.id(actor); record.scope = context.scope;
                record.createdAt = now; record.renewAt = now + 20;
                records.push(record);
                const after = host.sample(actor);
                host.verifyChange(before, after, config);
                evidence.push({actor:record.id, handle:record.handle, before, after});
            }
            host.report({status:"weapon-calculation-verified-combat-unverified", current:context.current, config, evidence});
        } catch (e) {
            failed = true;
            let cleanup = "removed";
            try { clear(); } catch (error) { cleanup = String(error); }
            host.report({status:"error-paused", error:String(e), cleanup, action:"Fix the reported interface issue, then reload the mod. Unidentified effects expire within 30 game seconds."});
        }
    }
    return {tick, stop() {stopped=true; clear(); host.report({status:"stopped"});}};
};