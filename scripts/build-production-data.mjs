import fs from "node:fs/promises";

const sources=[
  "public/data/verified-taipei-parks.json",
  "public/data/verified-newtaipei.json",
  "public/data/verified-taoyuan.json",
  "public/data/verified-taichung.json",
  "public/data/verified-tainan.json",
  "public/data/verified-kaohsiung.json"
];

const records=[];
for(const file of sources){
  try{
    const json=JSON.parse(await fs.readFile(file,"utf8"));
    for(const p of json.records||[]){
      if(p.verificationStatus==="verified"&&p.publishStatus==="published"&&p.isCoordinatePrecise===true) records.push(p);
    }
  }catch{}
}

const dedup=[...new Map(records.map(p=>[p.id,p])).values()];
await fs.writeFile("public/data/places.production.json",JSON.stringify({
  updatedAt:new Date().toISOString(),
  count:dedup.length,
  records:dedup
},null,2));
console.log("production places:",dedup.length);
