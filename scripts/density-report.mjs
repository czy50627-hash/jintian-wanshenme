import fs from "node:fs/promises";

let prod={records:[]};
try{prod=JSON.parse(await fs.readFile("public/data/places.production.json","utf8"))}catch{}
const verified=(prod.records||[]).filter(p=>p.verificationStatus==="verified"&&p.publishStatus==="published"&&p.isCoordinatePrecise===true);
const counties=["台北","新北","桃園","新竹","苗栗","台中","彰化","南投","雲林","嘉義","台南","高雄","屏東","宜蘭","花蓮","台東","基隆","澎湖","金門","連江"];
const ages=["0-2","3-5","6-8","9-12"];
const matrix={},warnings=[];

for(const county of counties){
  matrix[county]={};
  for(const age of ages){
    const base=verified.filter(p=>p.county===county&&p.ageTags?.includes(age));
    const scenarios={
      [age+"_outdoor_free_clear"]:base.filter(p=>p.outdoor&&p.isFree).length,
      [age+"_outdoor_free_rainy"]:base.filter(p=>p.outdoor&&p.isFree&&(p.covered||p.indoor)).length,
      [age+"_indoor_free_clear"]:base.filter(p=>p.indoor&&p.isFree).length,
      [age+"_indoor_free_rainy"]:base.filter(p=>p.indoor&&p.isFree).length
    };
    Object.assign(matrix[county],scenarios);
    for(const [scenario,count] of Object.entries(scenarios)){
      if(count<3) warnings.push({county,scenario,count,action:count===0?"HONEST_EMPTY_STATE":"SHOW_FEWER_THAN_3",crossCountyProhibited:true});
    }
  }
}

await fs.writeFile("public/data/density-report.json",JSON.stringify({
  evaluatedAt:new Date().toISOString(),
  criteria:"verificationStatus=verified AND publishStatus=published AND isCoordinatePrecise=true",
  verifiedPublished:verified.length,
  densityMatrix:matrix,
  densityGateWarnings:warnings
},null,2));
console.log("density report written; warnings:",warnings.length);
