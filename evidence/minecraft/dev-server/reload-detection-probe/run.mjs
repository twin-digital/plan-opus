// Does `send-command reload` re-evaluate a loaded behavior pack's script module, and for which
// edited files?
//
//   node run.mjs            # writes OUTPUT.txt beside this file
//
// The detector is a thrown Error carrying a token that changes with every edit. That matters: an
// earlier probe used `console.warn` and returned six negatives, and this probe's own output shows
// why — at world load both the WARN line and the ERROR lines reach the console, and on reload only
// the ERROR lines do. A script's `console.warn` is not a reliable detector of a reload; an
// uncaught error is.
//
// One pack, loaded once, then edited and reloaded four times with no restart in between. Cases
// alternate between editing the module's ENTRY file and editing a file the entry imports, so each
// kind has the other beside it in the same server session.

import { execFileSync } from "node:child_process"; import fs from "node:fs"; import os from "node:os"; import path from "node:path";
const DIR = new URL(".", import.meta.url).pathname;
const compose=(...a)=>execFileSync("docker",["compose","-f",path.join(DIR,"compose.yaml"),...a],{encoding:"utf8",maxBuffer:64<<20});
const logs=()=>compose("logs","--no-log-prefix","bedrock").split("\n");
const sleep=(ms)=>Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,ms);
const U="7a5c1e90-0000-4000-8000-00000000beef", M="7b5c1e90-0000-4000-8000-00000000cafe";
const POOL="/data/development_behavior_packs";
console.log("=== environment");
console.log(execFileSync("docker",["compose","version"],{encoding:"utf8"}).trim());
console.log(execFileSync("docker",["version","--format","Docker Engine {{.Server.Version}}"],{encoding:"utf8"}).trim());
console.log(`DOCKER_HOST=${process.env.DOCKER_HOST ?? "(local socket)"}`);
compose("down","-v");
compose("up","-d");
for(let i=0;i<90;i++){ if(logs().some(l=>l.includes("Server started"))) break; sleep(2000); }
console.log(logs().filter(l=>l.includes("Version")).slice(0,1).join("").trim());

const main=(t)=>`import { value } from "./helper.js";\nconsole.warn("[probe] warn ${t}-" + value);\nthrow new Error("PROBE-THROW ${t}-" + value);\n`;
const helper=(n)=>`export const value = "h${n}";\n`;
const put=(rel,body)=>{const t="/tmp/.s";fs.writeFileSync(t,body);compose("cp",t,`bedrock:${POOL}/${U}/${rel}`);};
// deploy
let hN=0;
const d=fs.mkdtempSync(path.join(os.tmpdir(),"tp-")); fs.mkdirSync(path.join(d,"scripts"));
fs.writeFileSync(path.join(d,"scripts/main.js"),main("gen0"));
fs.writeFileSync(path.join(d,"scripts/helper.js"),helper(hN));
fs.writeFileSync(path.join(d,"manifest.json"),JSON.stringify({format_version:2,header:{name:"throw probe",description:"t",uuid:U,version:[1,0,0],min_engine_version:[1,26,0]},modules:[{type:"script",language:"javascript",entry:"scripts/main.js",uuid:M,version:[1,0,0]}],dependencies:[{module_name:"@minecraft/server",version:"2.0.0"}]},null,2));
compose("exec","-T","bedrock","sh","-c",`rm -rf ${POOL}/* && mkdir -p ${POOL}/${U}`);
compose("cp",d+"/.",`bedrock:${POOL}/${U}`);
const lt=path.join(d,"l.json"); fs.writeFileSync(lt,JSON.stringify([{pack_id:U,version:[1,0,0]}]));
compose("cp",lt,`bedrock:/data/worlds/dev/world_behavior_packs.json`);
let b=logs().length; compose("restart","bedrock");
for(let i=0;i<45;i++){sleep(2000);const L=logs().slice(b);if(L.some(x=>x.includes("Server started"))&&L.some(x=>x.includes("Pack Stack"))){sleep(10000);break;}}
console.log("=== at world load:");
console.log(logs().slice(b).filter(l=>l.includes("[Scripting]")).map(l=>"   "+l.trim()).join("\n")||"   <none>");
let gen=0;
for(const kind of ["entry","import","entry","import"]){
  gen++; if(kind==="import") hN++;
  const tok=`gen${gen}`;
  if(kind==="entry") put("scripts/main.js",main(tok)); else put("scripts/helper.js",helper(hN));
  const expect = kind==="entry" ? `${tok}-h${hN}` : `-h${hN}`;
  b=logs().length; compose("exec","-T","bedrock","send-command","reload");
  let found=false;
  for(let i=0;i<25;i++){sleep(2000); if(logs().slice(b).some(l=>l.includes("PROBE-THROW"))){sleep(4000);found=true;break;}}
  const lines=logs().slice(b).filter(l=>l.includes("[Scripting]"));
  const hit=lines.some(l=>l.includes(expect));
  console.log(`\n=== edit ${kind.toUpperCase()} file, expect token containing "${expect}"`);
  console.log(lines.map(l=>"   "+l.trim()).join("\n")||"   <no [Scripting] lines>");
  console.log(`   => re-evaluated with the NEW content: ${hit?"YES":"NO"}`);
}

// ---------------------------------------------------------------- B. an activation-list edit
// Same detector: the pack keeps throwing, so a token that appears after a reload proves the pack
// was still live at that moment.
const putList=(entries)=>{const t="/tmp/.l";fs.writeFileSync(t,JSON.stringify(entries));compose("cp",t,`bedrock:/data/worlds/dev/world_behavior_packs.json`);console.log(`  wrote world_behavior_packs.json = ${JSON.stringify(entries)}`);};
const reloadFor=(needle)=>{const bb=logs().length;compose("exec","-T","bedrock","send-command","reload");
  for(let i=0;i<25;i++){sleep(2000); if(logs().slice(bb).some(l=>l.includes("PROBE-THROW"))){sleep(4000);break;}}
  const ls=logs().slice(bb).filter(l=>l.includes("[Scripting]"));
  return {hit:ls.some(l=>l.includes(needle)), lines:ls};};

console.log("\n=== B: remove the pack from the activation list, edit its script, reload — no restart");
putList([]);
gen++; put("scripts/main.js",main(`gen${gen}`));
let r=reloadFor(`gen${gen}-h${hN}`);
console.log(r.lines.map(l=>"   "+l.trim()).join("\n")||"   <no [Scripting] lines>");
console.log(`   => the delisted pack was still live: ${r.hit?"YES — a list edit does not take effect without a restart":"NO"}`);

console.log("\n=== B2: restart, so the emptied list is read at world load");
b=logs().length; compose("restart","bedrock");
for(let i=0;i<45;i++){sleep(2000);const L=logs().slice(b);if(L.some(x=>x.includes("Server started"))&&L.some(x=>x.includes("Pack Stack"))){sleep(10000);break;}}
console.log(logs().slice(b).filter(l=>l.includes("Pack Stack")||l.includes("[Scripting]")).map(l=>"   "+l.trim()).join("\n"));

// ---------------------------------------------------------------- C. a newly pooled pack
const U2="8a5c1e90-0000-4000-8000-00000000beef", M2="8b5c1e90-0000-4000-8000-00000000cafe";
console.log("\n=== C: pool a second pack and list it, reload — no restart");
const d2=fs.mkdtempSync(path.join(os.tmpdir(),"tp2-")); fs.mkdirSync(path.join(d2,"scripts"));
fs.writeFileSync(path.join(d2,"scripts/main.js"),`throw new Error("PROBE-THROW PACK2-FIRST-RUN");\n`);
fs.writeFileSync(path.join(d2,"manifest.json"),JSON.stringify({format_version:2,header:{name:"throw probe 2",description:"t2",uuid:U2,version:[1,0,0],min_engine_version:[1,26,0]},modules:[{type:"script",language:"javascript",entry:"scripts/main.js",uuid:M2,version:[1,0,0]}],dependencies:[{module_name:"@minecraft/server",version:"2.0.0"}]},null,2));
compose("exec","-T","bedrock","mkdir","-p",`${POOL}/${U2}`);
compose("cp",d2+"/.",`bedrock:${POOL}/${U2}`);
putList([{pack_id:U2,version:[1,0,0]}]);
r=reloadFor("PACK2-FIRST-RUN");
console.log(r.lines.map(l=>"   "+l.trim()).join("\n")||"   <no [Scripting] lines>");
console.log(`   => the newly pooled pack came live on reload: ${r.hit?"YES":"NO — a restart is needed"}`);

console.log("\n=== C2: restart, so the newly pooled pack is read at world load");
b=logs().length; compose("restart","bedrock");
for(let i=0;i<45;i++){sleep(2000);const L=logs().slice(b);if(L.some(x=>x.includes("Server started"))&&L.some(x=>x.includes("Pack Stack"))){sleep(10000);break;}}
console.log(logs().slice(b).filter(l=>l.includes("Pack Stack")||l.includes("[Scripting]")).map(l=>"   "+l.trim()).join("\n"));
fs.rmSync(d2,{recursive:true});
fs.rmSync(d,{recursive:true});
compose("down","-v");
