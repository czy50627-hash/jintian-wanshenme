const COUNTY_NAMES={
  "台北":"臺北市","新北":"新北市","桃園":"桃園市","新竹":"新竹市","苗栗":"苗栗縣",
  "台中":"臺中市","彰化":"彰化縣","南投":"南投縣","雲林":"雲林縣","嘉義":"嘉義市",
  "台南":"臺南市","高雄":"高雄市","屏東":"屏東縣","宜蘭":"宜蘭縣","花蓮":"花蓮縣",
  "台東":"臺東縣","基隆":"基隆市","澎湖":"澎湖縣","金門":"金門縣","連江":"連江縣"
};
const ALT_NAMES={"新竹":["新竹市","新竹縣"],"嘉義":["嘉義市","嘉義縣"]};
const CACHE_TTL=1000*60*60*24;

function centerOf(el){
  if(Number.isFinite(el.lat)&&Number.isFinite(el.lon)) return {lat:el.lat,lng:el.lon};
  if(Number.isFinite(el.center?.lat)&&Number.isFinite(el.center?.lon)) return {lat:el.center.lat,lng:el.center.lon};
  return null;
}
function normalize(el,county){
  const c=centerOf(el); if(!c) return null;
  const t=el.tags||{};
  const name=t["name:zh"]||t.name||t["name:zh-Hant"]||"未命名公園";
  const isPlayground=t.leisure==="playground"||t.playground==="yes"||/遊戲場|遊樂場/.test(name);
  const inclusive=/共融|inclusive/i.test([name,t.description,t.playground,t.access].filter(Boolean).join(" "));
  return {
    id:"osm-"+el.type+"-"+el.id,
    name,county,
    lat:c.lat,lng:c.lng,isCoordinatePrecise:true,
    category:isPlayground?"playground":"park",
    inclusive,
    address:[t["addr:district"],t["addr:street"],t["addr:housenumber"]].filter(Boolean).join("")||null,
    dataSource:"openstreetmap",
    sourceLabel:"OpenStreetMap 地圖資料",
    sourceUrl:"https://www.openstreetmap.org/"+el.type+"/"+el.id,
    verificationStatus:"mapped",
    publishStatus:"published",
    isFree:null,indoor:false,outdoor:true,covered:null,
    ageTags:[],amenities:{parking:"unknown",stroller:false,diaperStation:false,nursingRoom:false,foodNearby:false}
  };
}
async function queryOverpass(q){
  const urls=["https://overpass-api.de/api/interpreter","https://overpass.kumi.systems/api/interpreter"];
  let last;
  for(const url of urls){
    try{
      const r=await fetch(url,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded;charset=UTF-8"},body:"data="+encodeURIComponent(q)});
      if(!r.ok) throw new Error("overpass "+r.status);
      return await r.json();
    }catch(e){last=e}
  }
  throw last||new Error("Overpass unavailable");
}
function countyQuery(county){
  const names=ALT_NAMES[county]||[COUNTY_NAMES[county]||county];
  const areas=names.map((n,i)=>`area["boundary"="administrative"]["name"="${n}"]->.a${i};`).join("");
  const bodies=names.map((_,i)=>`
    nwr["leisure"="park"](area.a${i});
    nwr["leisure"="playground"](area.a${i});
    nwr["playground"="yes"](area.a${i});
  `).join("");
  return `[out:json][timeout:45];${areas}(${bodies});out center tags;`;
}
export async function fetchCountyParks(county){
  const key="jtw-parks-"+county;
  try{
    const saved=JSON.parse(localStorage.getItem(key)||"null");
    if(saved&&Date.now()-saved.ts<CACHE_TTL&&Array.isArray(saved.records)) return saved.records;
  }catch{}
  const json=await queryOverpass(countyQuery(county));
  const seen=new Set(),records=[];
  for(const el of json.elements||[]){
    const p=normalize(el,county); if(!p||seen.has(p.id)) continue;
    seen.add(p.id); records.push(p);
  }
  records.sort((a,b)=>Number(b.inclusive)-Number(a.inclusive)||a.name.localeCompare(b.name,"zh-Hant"));
  try{localStorage.setItem(key,JSON.stringify({ts:Date.now(),records}))}catch{}
  return records;
}

export async function fetchNearbyParks(lat,lng,radiusM=10000){
  const q=`[out:json][timeout:30];(nwr(around:${radiusM},${lat},${lng})["leisure"="park"];nwr(around:${radiusM},${lat},${lng})["leisure"="playground"];nwr(around:${radiusM},${lat},${lng})["playground"="yes"];);out center tags;`;
  const json=await queryOverpass(q);
  const seen=new Set(),records=[];
  for(const el of json.elements||[]){
    const p=normalize(el,""); if(!p||seen.has(p.id)) continue;
    seen.add(p.id); records.push(p);
  }
  return records;
}
