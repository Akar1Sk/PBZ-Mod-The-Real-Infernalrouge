"use strict";
// Change only the duration definition of the known HeiMoShang empowerment.
// Existing active specs are not reapplied, refreshed, or granted for free.
exports.create=function(host){
    let lease=null, failed=false, lastKey="";
    function value(o){return o.DurationMagnitude.ScalableFloatMagnitude.Value;}
    function set(o,n){
        // Write back both nested structs: bindings may return copies rather than references.
        const magnitude=o.DurationMagnitude;
        const scalar=magnitude.ScalableFloatMagnitude;
        scalar.Value=n; magnitude.ScalableFloatMagnitude=scalar; o.DurationMagnitude=magnitude;
        if(Math.abs(value(o)-n)>.001)throw Error("Ultimate duration readback failed");
    }
    function restore(){
        if(!lease)return;
        const l=lease;
        if(host.valid(l.object)){
            const n=value(l.object);
            if(Math.abs(n-l.written)<.001)set(l.object,l.original);
            else if(Math.abs(n-l.original)>.001)throw Error("Ultimate duration changed externally; refusing to overwrite");
        }
        lease=null;
    }
    return {
        tick(){
            try{
                const c=host.config();
                const key=JSON.stringify(c);
                if(key!==lastKey){restore();failed=false;lastKey=key;}
                if(failed)return;
                if(!c.enabled || c.seconds===0){restore();host.report({status:"disabled"});return;}
                if(!Number.isFinite(c.seconds)||c.seconds<1||c.seconds>120)throw Error("ultimateSeconds must be 0 (off) or 1..120");
                const ctx=host.context();
                if(!ctx || !ctx.eligible){restore();host.report({status:"waiting-for-Tang"});return;}
                if(lease && (!host.valid(lease.object)||lease.scope!==ctx.scope))restore();
                if(!lease){
                    const o=host.load();
                    if(!host.valid(o))throw Error("HeiMoShang effect default object unavailable");
                    const magnitude=o.DurationMagnitude;
                    if(o.DurationPolicy!==2 || magnitude.MagnitudeCalculationType!==0)throw Error("Ultimate duration is not a static timed effect");
                    const curve=magnitude.ScalableFloatMagnitude.Curve;
                    if(curve && ((curve.CurveTable && host.valid(curve.CurveTable)) || (String(curve.RowName||"None")!=="None")))throw Error("Curve-driven duration is unsupported");
                    const original=value(o);
                    if(!Number.isFinite(original)||Math.abs(original-10)>.001)throw Error("Expected original 10-second duration; found "+original);
                    lease={object:o,original,written:c.seconds,scope:ctx.scope};
                    set(o,c.seconds);
                }
                if(Math.abs(value(lease.object)-c.seconds)>.001)throw Error("Ultimate duration changed during use");
                host.report({status:"duration-definition-verified-awaiting-cast",originalSeconds:lease.original,seconds:value(lease.object),note:"Applies to newly created effects; native cancellation rules remain in effect."});
            }catch(e){
                failed=true;let cleanup="restored";
                try{restore();}catch(error){cleanup=String(error);}
                host.report({status:"error-paused",error:String(e),cleanup});
            }
        },
        stop(){restore();host.report({status:"stopped"});}
    };
};