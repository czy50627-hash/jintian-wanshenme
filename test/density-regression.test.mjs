import assert from "node:assert/strict";
import fs from "node:fs";
import { evaluateRecommendations } from "../src/engine/recommend.js";
import { normalizePlace } from "../src/lib/normalizePlace.js";

const json=JSON.parse(fs.readFileSync("public/data/places.production.json","utf8"));
const pool=(json.records||[]).map(normalizePlace);

function prefs(county,overrides={}){
  return {
    selectedCounty:county,userCoords:null,ages:["3-5"],when:"now",maxDriveMinutes:30,
    playStyles:["outdoor","free"],excludedPlaceIds:[],currentRainProb:0,...overrides
  };
}

console.log("--- Density & Fallback Regression Tests ---");

const r1=evaluateRecommendations(pool,prefs("台北"));
if(pool.some(p=>p.county==="台北"&&p.ageTags?.includes("3-5")&&p.outdoor&&p.isFree)){
  assert.ok(r1.hero,"台北戶外免費有資料時應產出首選");
  assert.equal(r1.hero.county,"台北");
  for(const alt of r1.alternatives){assert.equal(alt.county,"台北");assert.equal(alt.verificationStatus,"verified");}
}
console.log("✓ 台北同縣 verified gate");

const r2=evaluateRecommendations(pool,prefs("彰化"));
if(r2.hero){
  assert.equal(r2.hero.county,"彰化");
  for(const alt of r2.alternatives) assert.equal(alt.county,"彰化");
}else{
  assert.match(r2.fallbackNote,/彰化/);
}
console.log("✓ 彰化零跨縣補位");

const r3=evaluateRecommendations(pool,prefs("台北",{currentRainProb:80}));
if(r3.hero) assert.ok(r3.hero.indoor||r3.hero.covered,"雨天首選必須室內或有遮蔽");
for(const alt of r3.alternatives) assert.ok(alt.indoor||alt.covered);
console.log("✓ 雨天 hard filter");

for(const p of pool){
  assert.equal(p.verificationStatus,"verified");
  assert.equal(p.publishStatus,"published");
  assert.equal(p.isCoordinatePrecise,true);
}
console.log("✓ Production pool purity");
