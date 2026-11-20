"use strict";
// Run after synchronizing both installation layouts.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const layouts=['Content/JavaScript/PBZModsMenu/Mods/PBZTangCombat','package/ProjectPBZ/Content/JavaScript/PBZModsMenu/Mods/PBZTangCombat','package/ProjectPBZ/PBZModLoader/mods/PBZTangCombat'];
for(const name of fs.readdirSync(path.join(root,'mod/PBZTangCombat'))){
    if(!name.endsWith('.js'))continue;
    const expected=fs.readFileSync(path.join(root,'mod/PBZTangCombat',name),'utf8');
    new vm.Script(expected,{filename:name});
    for(const layout of layouts)assert.equal(fs.readFileSync(path.join(root,layout,name),'utf8'),expected,layout+'/'+name);
}
assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,'package/ProjectPBZ/Content/Paks/~mods/PBZTangCombat.json'),'utf8')),JSON.parse(fs.readFileSync(path.join(root,'PBZTangCombat.json'),'utf8')));
for(const layout of ['Content/JavaScript/PBZModsMenu','package/ProjectPBZ/Content/JavaScript/PBZModsMenu'])
    assert.equal(fs.readFileSync(path.join(root,layout,'manager.js'),'utf8'),fs.readFileSync(path.join(root,'integrations/PBZModsMenu/manager.js'),'utf8'));
console.log('Syntax, all three installation copies, and default config verified.');
