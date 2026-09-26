import fs from "node:fs/promises";
const files=["public/data/places.json","public/data/verified-taipei-parks.json"];
const all=[];
for(const f of files){
  try{const j=JSON.parse(await fs.readFile(f,"utf8"));all.push(...(j.records||[]))}catch{}
}
const verified=all.filter(p=>p.verificationStatus==="verified"&&p.publishStatus==="published"&&p.isCoordinatePrecise===true);
const counties=[...new Set(all.map(p=>p.county).filter(Boolean))].sort();
const ages=["0-2","3-5","6-8","9-12"];
const report={generatedAt:new Date().toISOString(),verifiedPublished:verified.length,byCounty:{},density:[]};
for(const county of counties){
  const rows=verified.filter(p=>p.county===county);
  report.byCounty[county]=rows.length;
  for(const age of ages){
    const base=rows.filter(p=>p.ageTags?.includes(age));
    const variants=[
      ["all",base],
      ["indoor",base.filter(p=>p.indoor)],
      ["outdoor",base.filter(p=>p.outdoor)],
      ["free",base.filter(p=>p.isFree)],
      ["rainy",base.filter(p=>p.indoor||p.covered)]
    ];
    for(const [segment,list] of variants) report.density.push({county,age,segment,count:list.length});
  }
}
await fs.writeFile("public/data/density-report.json",JSON.stringify(report,null,2));
console.log(JSON.stringify(report.byCounty,null,2));
