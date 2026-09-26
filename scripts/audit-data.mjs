import fs from "node:fs/promises";

const read=async p=>JSON.parse(await fs.readFile(p,"utf8"));
const prod=await read("public/data/places.production.json");
const cand=await read("public/data/places.json");
const rows=prod.records||[];
const candidateRows=cand.records||[];
const by=(list,key)=>list.reduce((a,p)=>{const v=p[key]??"unknown";a[v]=(a[v]||0)+1;return a},{});
const paid=rows.filter(p=>p.isFree===false);
const report={
  auditedAt:new Date().toISOString(),
  productionCount:rows.length,
  candidateCount:candidateRows.length,
  verifiedProduction:rows.filter(p=>p.verificationStatus==="verified").length,
  publishedProduction:rows.filter(p=>p.publishStatus==="published").length,
  preciseCoordinateProduction:rows.filter(p=>p.isCoordinatePrecise===true).length,
  productionByCounty:by(rows,"county"),
  productionByCategory:by(rows,"category"),
  officialUrlCoverage:rows.length?rows.filter(p=>p.officialUrl||p.trustLayer?.officialUrl).length/rows.length:0,
  hoursCoverage:rows.length?rows.filter(p=>p.openingHours?.raw||p.hoursRaw).length/rows.length:0,
  paidVenueCount:paid.length,
  paidWithSourceBackedPrice:paid.filter(p=>Number.isFinite(p.priceMin)||Number.isFinite(p.priceMax)||Number.isFinite(p.pricing?.minPrice)||Number.isFinite(p.pricing?.maxPrice)).length,
  warnings:[]
};
if(rows.length===0) report.warnings.push("PRODUCTION_POOL_EMPTY");
if(candidateRows.some(p=>p.isCoordinatePrecise!==true)) report.warnings.push("CANDIDATES_INCLUDE_IMPRECISE_COORDINATES");
await fs.writeFile("public/data/data-audit.json",JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
