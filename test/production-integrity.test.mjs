import assert from "node:assert/strict";
import fs from "node:fs";

const production=JSON.parse(fs.readFileSync("public/data/places.production.json","utf8"));
const candidate=JSON.parse(fs.readFileSync("public/data/places.json","utf8"));

for(const p of production.records||[]){
  assert.equal(p.verificationStatus,"verified",`${p.id}: production must be verified`);
  assert.equal(p.publishStatus,"published",`${p.id}: production must be published`);
  assert.equal(p.isCoordinatePrecise,true,`${p.id}: production must have precise coordinates`);
  assert.ok(p.officialUrl||p.trustLayer?.officialUrl,`${p.id}: missing official URL`);
  assert.ok(p.lastVerifiedAt||p.trustLayer?.lastVerifiedAt,`${p.id}: missing verification date`);
}
const coordCounts=new Map();
for(const p of candidate.records||[]){
  if(p.lat==null||p.lng==null) continue;
  const k=`${Number(p.lat).toFixed(4)},${Number(p.lng).toFixed(4)}`;
  coordCounts.set(k,(coordCounts.get(k)||0)+1);
}
const repeated=[...coordCounts.entries()].filter(([,n])=>n>=5);
assert.equal((production.records||[]).some(p=>p.verificationStatus==="candidate"),false,"candidate leaked into production");
console.log(JSON.stringify({productionCount:production.count||0,candidateCount:candidate.count||candidate.records?.length||0,repeatedCandidateCoordinateClusters:repeated.length},null,2));
